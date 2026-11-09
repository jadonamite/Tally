import { sql, toMs, num } from "./db";
import { priceAt, settledPrices } from "./polymarket";
import { suiTxRead } from "./tatum";
import { memoFor } from "./sui";
import { readOutcome } from "@/lib/core/outcome";
import { gradeCall } from "@/lib/core/grade";
import { rememberLater, blobForJob, namespaceFor } from "./memory";
import { callMemory, gradeMemory, standingMemory } from "./memoryText";
import { standingFor } from "./views";
import type { Standing } from "@/lib/types";

const memCall = (c: any) => ({
  id: c.id, voiceName: c.display_name, voiceKind: c.kind, source: c.source, question: c.question,
  outcomeLabel: c.outcome_label, entryPrice: num(c.entry_price), lockAt: new Date(c.lock_at).toISOString(),
  rawText: c.raw_text, callHash: c.call_hash, sealRef: c.seal_ref,
});

export async function sweep(limit = 25) {
  const counts = { sealsFilled: 0, locked: 0, graded: 0, memQueued: 0, memDone: 0, standings: 0, errors: 0 };
  const touchedVoices = new Set<string>();

  // 1. Seals sent but not yet timestamped.
  for (const c of (await sql()`select * from calls where seal_kind = 'sui' and seal_ref is not null and sealed_at is null limit ${limit}`) as any[]) {
    try {
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
  for (const c of (await sql()`select * from calls where status = 'open' and lock_at <= now() order by lock_at limit ${limit}`) as any[]) {
    try {
      const close = await priceAt(c.token_id, Math.floor(toMs(c.lock_at) / 1000));
      await sql()`update calls set status = 'locked', close_price = ${close} where id = ${c.id} and status = 'open'`;
      counts.locked++;
    } catch { counts.errors++; }
  }

  // 3. Grade: locked calls whose market has settled.
  for (const c of (await sql()`select c.*, v.display_name, v.kind from calls c join voices v on v.id = c.voice_id
                                where c.status = 'locked' order by c.lock_at limit ${limit}`) as any[]) {
    try {
      const prices = await settledPrices(c.condition_id);
      if (!prices) continue;
      const result = readOutcome(prices, c.outcome_index);
      const g = gradeCall(num(c.entry_price), num(c.close_price), result);
      const status = result === "void" ? "void" : "graded";
      await sql()`update calls set status = ${status}, result = ${result}, beat_close = ${g.beatClose},
                  pnl_per_dollar = ${g.pnlPerDollar}, graded_at = now() where id = ${c.id} and status = 'locked'`;
      counts.graded++;
      touchedVoices.add(c.voice_id);
      try {
        const job = await rememberLater(
          gradeMemory(memCall(c), result, num(c.close_price), g.beatClose, g.pnlPerDollar),
          namespaceFor(c.user_id, c.voice_id), `grade:${c.id}`);
        await sql()`update calls set mem_grade_job = ${job} where id = ${c.id}`;
        counts.memQueued++;
      } catch { counts.errors++; }
    } catch { counts.errors++; }
  }

  // 4. Memories never queued (wallet imports, or a failed queue at capture). Skip unsealed calls.
  for (const c of (await sql()`select c.*, v.display_name, v.kind from calls c join voices v on v.id = c.voice_id
                                where c.mem_call_job is null and c.status <> 'unsealed' limit ${limit}`) as any[]) {
    try {
      const job = await rememberLater(callMemory(memCall(c)), namespaceFor(c.user_id, c.voice_id), `call:${c.id}`);
      await sql()`update calls set mem_call_job = ${job} where id = ${c.id} and mem_call_job is null`;
      counts.memQueued++;
    } catch { counts.errors++; }
  }

  // 5. Memory jobs finished: store blob ids.
  for (const c of (await sql()`select id, mem_call_job, mem_call_blob, mem_grade_job, mem_grade_blob from calls
                                where (mem_call_job is not null and mem_call_blob is null)
                                   or (mem_grade_job is not null and mem_grade_blob is null) limit ${limit}`) as any[]) {
    try {
      if (c.mem_call_job && !c.mem_call_blob) {
        const b = await blobForJob(c.mem_call_job);
        if (b) { await sql()`update calls set mem_call_blob = ${b} where id = ${c.id}`; counts.memDone++; }
      }
      if (c.mem_grade_job && !c.mem_grade_blob) {
        const b = await blobForJob(c.mem_grade_job);
        if (b) { await sql()`update calls set mem_grade_blob = ${b} where id = ${c.id}`; counts.memDone++; }
      }
    } catch { counts.errors++; }
  }
  for (const s of (await sql()`select id, mem_job from standings where mem_job is not null and mem_blob is null limit ${limit}`) as any[]) {
    try {
      const b = await blobForJob(s.mem_job);
      if (b) { await sql()`update standings set mem_blob = ${b} where id = ${s.id}`; counts.memDone++; }
    } catch { counts.errors++; }
  }

  // 6. Standings for voices with new grades. Log a row and a memory only when it changes.
  for (const voiceId of touchedVoices) {
    try {
      const s = await standingFor(voiceId);
      const last = (await sql()`select standing from standings where voice_id = ${voiceId} order by at desc limit 1`) as any[];
      const prev: Standing | null = last.length ? last[0].standing : null;
      if (prev === s.standing) continue;
      const v = ((await sql()`select * from voices where id = ${voiceId}`) as any[])[0];
      const inserted = (await sql()`insert into standings (voice_id, standing, n, mean_beat_close, pnl_per_bet)
                       values (${voiceId}, ${s.standing}, ${s.n}, ${s.meanBeatClose}, ${s.pnlPerBet}) returning id`) as any[];
      counts.standings++;
      try {
        const job = await rememberLater(standingMemory(v.display_name, voiceId, prev, s), namespaceFor(v.user_id, voiceId), `standing:${inserted[0].id}`);
        await sql()`update standings set mem_job = ${job} where id = ${inserted[0].id}`;
        counts.memQueued++;
      } catch { counts.errors++; }
    } catch { counts.errors++; }
  }

  return counts;
}
