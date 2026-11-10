import { sql, toMs, num } from "./db";
import { priceAt, settledPrices, marketBySlug } from "./polymarket";
import { suiTxRead } from "./tatum";
import { memoFor } from "./sui";
import { readOutcome } from "@/lib/core/outcome";
import { gradeCall, priceWasLive } from "@/lib/core/grade";
import { rememberLater, jobState, newestIn, namespaceFor, credNamespaceFor, userNamespaceFor } from "./memory";
import { callMemory, gradeMemory, standingMemory, lateCorrection, credMemory, parseCred, decisionOutcomeMemory } from "./memoryText";
import { ledgerStandingFor } from "./views";
import { compare } from "./odds";
import { env } from "./env";
import type { Standing } from "@/lib/types";

const memCall = (c: any) => ({
  id: c.id,
  voiceName: c.display_name,
  voiceKind: c.kind,
  source: c.source,
  question: c.question,
  outcomeLabel: c.outcome_label,
  entryPrice: num(c.entry_price),
  lockAt: new Date(c.lock_at).toISOString(),
  rawText: c.raw_text,
  callHash: c.call_hash,
  sealRef: c.seal_ref,
  late: c.status === "late",
});

/** Bookmaker consensus for the called side at lock. Null when there is no key, no match or one book. */
async function bookCloseFor(slug: string, outcomeIndex: 0 | 1): Promise<number | null> {
  if (!env.ODDS_API_KEY) return null;
  try {
    const market = await marketBySlug(slug);
    if (!market) return null;
    const odds = await compare(market);
    return odds.matched && !odds.thin ? (odds.bookProbs?.[outcomeIndex] ?? null) : null;
  } catch {
    return null;
  }
}

export async function sweep(limit = 25) {
  const counts = { sealsFilled: 0, locked: 0, graded: 0, memQueued: 0, memDone: 0, standings: 0, errors: 0 };
  // Stop starting new work after 45 s so the run ends inside the 60 s limit.
  const deadline = Date.now() + 45_000;
  const over = () => Date.now() > deadline;
  const touchedVoices = new Set<string>();

  // 1. Seals sent but not yet timestamped. Select least recently tried first.
  for (const c of (await sql()`
    select * from calls where seal_kind = 'sui' and seal_ref is not null and sealed_at is null
    order by coalesce(tried_at, '1970-01-01'::timestamptz) asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const read = await suiTxRead(c.seal_ref);
      if (read.timestampMs && read.success && read.payload.includes(memoFor(c.call_hash))) {
        const status = read.timestampMs < toMs(c.lock_at) ? "open" : "late";
        await sql()`update calls set sealed_at = ${new Date(read.timestampMs).toISOString()}, seal_checkpoint = ${read.checkpoint},
                    status = ${status} where id = ${c.id} and sealed_at is null`;
        counts.sealsFilled++;
      }
    } catch { counts.errors++; }
  }

  // 2. Lock: open calls whose market has started. Record the price at the start.
  for (const c of (await sql()`
    select * from calls where status = 'open' and lock_at <= now()
    order by coalesce(tried_at, '1970-01-01'::timestamptz) asc, lock_at asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const close = await priceAt(c.token_id, Math.floor(toMs(c.lock_at) / 1000));
      const bmClose = await bookCloseFor(c.market_slug, c.outcome_index);
      await sql()`update calls set status = 'locked', close_price = ${close}, bookmaker_close = ${bmClose} where id = ${c.id} and status = 'open'`;
      counts.locked++;
    } catch { counts.errors++; }
  }

  // 3. Grade: locked calls whose market has settled.
  for (const c of (await sql()`
    select c.*, v.display_name, v.kind, v.user_id from calls c join voices v on v.id = c.voice_id
    where c.status = 'locked' order by coalesce(c.tried_at, '1970-01-01'::timestamptz) asc, c.lock_at asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const prices = await settledPrices(c.condition_id);
      if (!prices) continue;
      const result = readOutcome(prices, c.outcome_index);
      const g = gradeCall(num(c.entry_price), num(c.close_price), result);
      const beatClose = c.lock_kind === "end" || !priceWasLive(num(c.close_price)) ? null : g.beatClose;
      const status = result === "void" ? "void" : "graded";
      await sql()`update calls set status = ${status}, result = ${result}, beat_close = ${beatClose},
                  pnl_per_dollar = ${g.pnlPerDollar}, graded_at = now() where id = ${c.id} and status = 'locked'`;
      counts.graded++;
      touchedVoices.add(c.voice_id);
      try {
        const job = await rememberLater(
          gradeMemory(memCall(c), result, num(c.close_price), beatClose, g.pnlPerDollar, num(c.bookmaker_close)),
          namespaceFor(c.user_id, c.voice_id), `grade:${c.id}`);
        await sql()`update calls set mem_grade_job = ${job} where id = ${c.id}`;
        counts.memQueued++;
      } catch { counts.errors++; }

      // Outcomes for decisions made on this call (A4)
      try {
        const decs = (await sql()`select * from decisions where call_id = ${c.id} and outcome_job is null`) as any[];
        for (const d of decs) {
          const job = await rememberLater(
            decisionOutcomeMemory(d.choice, c.display_name, c.question, result, g.pnlPerDollar, c.id),
            userNamespaceFor(d.user_id),
            `dec-out:${d.user_id}:${c.id}`
          );
          await sql()`update decisions set outcome_job = ${job} where user_id = ${d.user_id} and call_id = ${c.id}`;
          counts.memQueued++;
        }
      } catch { counts.errors++; }
    } catch { counts.errors++; }
  }

  // 4. Call memories never queued (wallet imports, or a failed queue at capture). Skip unsealed calls.
  for (const c of (await sql()`
    select c.*, v.display_name, v.kind, v.user_id from calls c join voices v on v.id = c.voice_id
    where c.mem_call_job is null and c.status <> 'unsealed'
    order by coalesce(c.tried_at, '1970-01-01'::timestamptz) asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const job = await rememberLater(callMemory(memCall(c)), namespaceFor(c.user_id, c.voice_id), `call:${c.id}`);
      await sql()`update calls set mem_call_job = ${job} where id = ${c.id} and mem_call_job is null`;
      counts.memQueued++;
    } catch { counts.errors++; }
  }

  // 5. Grade memories never queued (A1).
  for (const c of (await sql()`
    select c.*, v.display_name, v.kind, v.user_id from calls c join voices v on v.id = c.voice_id
    where c.status = 'graded' and c.mem_grade_job is null
    order by coalesce(c.tried_at, '1970-01-01'::timestamptz) asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const job = await rememberLater(
        gradeMemory(memCall(c), c.result, num(c.close_price), num(c.beat_close), num(c.pnl_per_dollar)),
        namespaceFor(c.user_id, c.voice_id),
        `grade:${c.id}`
      );
      await sql()`update calls set mem_grade_job = ${job} where id = ${c.id} and mem_grade_job is null`;
      counts.memQueued++;
    } catch { counts.errors++; }
  }

  // 6. Correcting memories for late calls already recorded (A1).
  for (const c of (await sql()`
    select c.*, v.display_name, v.kind, v.user_id from calls c join voices v on v.id = c.voice_id
    where c.status = 'late' and c.mem_call_blob is not null and c.mem_fix_job is null and c.mem_fix_blob is null
    order by coalesce(c.tried_at, '1970-01-01'::timestamptz) asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      const job = await rememberLater(lateCorrection(memCall(c)), namespaceFor(c.user_id, c.voice_id), `fix:${c.id}`);
      await sql()`update calls set mem_fix_job = ${job} where id = ${c.id} and mem_fix_job is null`;
      counts.memQueued++;
    } catch { counts.errors++; }
  }

  // 7. Check memory jobs on calls (call, grade, fix).
  for (const c of (await sql()`
    select c.*, v.display_name, v.kind, v.user_id from calls c join voices v on v.id = c.voice_id
    where (c.mem_call_job is not null and c.mem_call_blob is null)
       or (c.mem_grade_job is not null and c.mem_grade_blob is null)
       or (c.mem_fix_job is not null and c.mem_fix_blob is null)
    order by coalesce(c.tried_at, '1970-01-01'::timestamptz) asc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      await sql()`update calls set tried_at = now() where id = ${c.id}`;
      if (c.mem_call_job && !c.mem_call_blob) {
        const st = await jobState(c.mem_call_job);
        if (st.state === "done") {
          await sql()`update calls set mem_call_blob = ${st.blobId} where id = ${c.id}`;
          counts.memDone++;
        } else if (st.state === "failed" && c.mem_retries < 1) {
          const newJob = await rememberLater(callMemory(memCall(c)), namespaceFor(c.user_id, c.voice_id), `call:${c.id}:retry`);
          await sql()`update calls set mem_call_job = ${newJob}, mem_retries = mem_retries + 1 where id = ${c.id}`;
        }
      }
      if (c.mem_grade_job && !c.mem_grade_blob) {
        const st = await jobState(c.mem_grade_job);
        if (st.state === "done") {
          await sql()`update calls set mem_grade_blob = ${st.blobId} where id = ${c.id}`;
          counts.memDone++;
        } else if (st.state === "failed" && c.mem_retries < 1) {
          const newJob = await rememberLater(
            gradeMemory(memCall(c), c.result, num(c.close_price), num(c.beat_close), num(c.pnl_per_dollar)),
            namespaceFor(c.user_id, c.voice_id),
            `grade:${c.id}:retry`
          );
          await sql()`update calls set mem_grade_job = ${newJob}, mem_retries = mem_retries + 1 where id = ${c.id}`;
        }
      }
      if (c.mem_fix_job && !c.mem_fix_blob) {
        const st = await jobState(c.mem_fix_job);
        if (st.state === "done") {
          await sql()`update calls set mem_fix_blob = ${st.blobId} where id = ${c.id}`;
          counts.memDone++;
        } else if (st.state === "failed" && c.mem_retries < 1) {
          const newJob = await rememberLater(lateCorrection(memCall(c)), namespaceFor(c.user_id, c.voice_id), `fix:${c.id}:retry`);
          await sql()`update calls set mem_fix_job = ${newJob}, mem_retries = mem_retries + 1 where id = ${c.id}`;
        }
      }
    } catch { counts.errors++; }
  }

  // 8a. Standings never queued (A1).
  for (const s of (await sql()`
    select s.*, v.display_name, v.user_id,
           (select p.standing from standings p where p.voice_id = s.voice_id and p.at < s.at order by p.at desc limit 1) as prev_standing
    from standings s join voices v on v.id = s.voice_id
    where s.mem_job is null order by s.at desc limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      const job = await rememberLater(
        standingMemory(s.display_name, s.voice_id, s.prev_standing ?? null, {
          standing: s.standing,
          n: s.n,
          meanBeatClose: num(s.mean_beat_close),
          pnlPerBet: num(s.pnl_per_bet),
          won: 0,
          lost: 0,
        }),
        namespaceFor(s.user_id, s.voice_id),
        `standing:${s.id}`
      );
      await sql()`update standings set mem_job = ${job} where id = ${s.id}`;
      counts.memQueued++;
    } catch { counts.errors++; }
  }

  // 8b. Pending standing jobs.
  for (const s of (await sql()`
    select s.*, v.display_name, v.user_id,
           (select p.standing from standings p where p.voice_id = s.voice_id and p.at < s.at order by p.at desc limit 1) as prev_standing
    from standings s join voices v on v.id = s.voice_id
    where s.mem_job is not null and s.mem_blob is null limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      const st = await jobState(s.mem_job);
      if (st.state === "done") {
        await sql()`update standings set mem_blob = ${st.blobId} where id = ${s.id}`;
        counts.memDone++;
      } else if (st.state === "failed" && s.mem_retries < 1) {
        const newJob = await rememberLater(
          standingMemory(s.display_name, s.voice_id, s.prev_standing ?? null, {
            standing: s.standing,
            n: s.n,
            meanBeatClose: num(s.mean_beat_close),
            pnlPerBet: num(s.pnl_per_bet),
            won: 0,
            lost: 0,
          }),
          namespaceFor(s.user_id, s.voice_id),
          `standing:${s.id}:retry`
        );
        await sql()`update standings set mem_job = ${newJob}, mem_retries = mem_retries + 1 where id = ${s.id}`;
      }
    } catch { counts.errors++; }
  }

  // 9. Pending decision jobs (A4).
  for (const d of (await sql()`
    select * from decisions
    where (mem_job is not null and mem_blob is null)
       or (outcome_job is not null and outcome_blob is null) limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      if (d.mem_job && !d.mem_blob) {
        const st = await jobState(d.mem_job);
        if (st.state === "done") {
          await sql()`update decisions set mem_blob = ${st.blobId} where user_id = ${d.user_id} and call_id = ${d.call_id}`;
          counts.memDone++;
        }
      }
      if (d.outcome_job && !d.outcome_blob) {
        const st = await jobState(d.outcome_job);
        if (st.state === "done") {
          await sql()`update decisions set outcome_blob = ${st.blobId} where user_id = ${d.user_id} and call_id = ${d.call_id}`;
          counts.memDone++;
        }
      }
    } catch { counts.errors++; }
  }

  // 10. Standings & Credibility memories for touched voices (A2).
  for (const voiceId of touchedVoices) {
    try {
      const s = await ledgerStandingFor(voiceId);
      const last = (await sql()`select standing from standings where voice_id = ${voiceId} order by at desc limit 1`) as any[];
      const prev: Standing | null = last.length ? last[0].standing : null;
      const v = ((await sql()`select * from voices where id = ${voiceId}`) as any[])[0];
      if (!v) continue;

      if (prev !== s.standing) {
        const inserted = (await sql()`insert into standings (voice_id, standing, n, mean_beat_close, pnl_per_bet)
                         values (${voiceId}, ${s.standing}, ${s.n}, ${s.meanBeatClose}, ${s.pnlPerBet}) returning id`) as any[];
        counts.standings++;
        try {
          const job = await rememberLater(standingMemory(v.display_name, voiceId, prev, s), namespaceFor(v.user_id, voiceId), `standing:${inserted[0].id}`);
          await sql()`update standings set mem_job = ${job} where id = ${inserted[0].id}`;
          counts.memQueued++;
        } catch { counts.errors++; }
      }

      // Credibility memory (A2)
      try {
        const credKey = `cred:${voiceId}:${s.n}`;
        const credText = credMemory(v.display_name, voiceId, s);
        const credJob = await rememberLater(credText, credNamespaceFor(v.user_id, voiceId), credKey);
        await sql()`
          insert into voice_memory (voice_id, pending_job, pending_key)
          values (${voiceId}, ${credJob}, ${credKey})
          on conflict (voice_id) do update set pending_job = ${credJob}, pending_key = ${credKey}
        `;
        counts.memQueued++;
      } catch { counts.errors++; }
    } catch { counts.errors++; }
  }

  // 11. Refresh voice_memory from Walrus Memory (A3).
  for (const vm of (await sql()`
    select vm.*, v.user_id, v.display_name from voice_memory vm join voices v on v.id = vm.voice_id
    where vm.pending_job is not null limit ${limit}`) as any[]) {
    if (over()) break;
    try {
      const st = await jobState(vm.pending_job);
      if (st.state === "done") {
        const newest = await newestIn(credNamespaceFor(vm.user_id, vm.voice_id), 1);
        if (newest.length > 0) {
          const parsed = parseCred(newest[0].text);
          if (parsed && parsed.voiceId === vm.voice_id) {
            await sql()`
              update voice_memory set
                standing = ${parsed.standing},
                n = ${parsed.n},
                mean_beat_close = ${parsed.meanBeatClose},
                pnl_per_bet = ${parsed.pnlPerBet},
                won = ${parsed.won},
                lost = ${parsed.lost},
                blob_id = ${newest[0].blobId},
                written_at = ${newest[0].createdAt ? new Date(newest[0].createdAt).toISOString() : new Date().toISOString()},
                recalled_at = now(),
                pending_job = null
              where voice_id = ${vm.voice_id}
            `;
            counts.memDone++;
          }
        }
      } else if (st.state === "failed" && vm.retries < 1) {
        const s = await ledgerStandingFor(vm.voice_id);
        const retryKey = `${vm.pending_key}:retry`;
        const newJob = await rememberLater(credMemory(vm.display_name, vm.voice_id, s), credNamespaceFor(vm.user_id, vm.voice_id), retryKey);
        await sql()`update voice_memory set pending_job = ${newJob}, pending_key = ${retryKey}, retries = retries + 1 where voice_id = ${vm.voice_id}`;
      }
    } catch { counts.errors++; }
  }

  return counts;
}
