import { sql } from "../src/server/db.js";
import { ledgerStandingFor } from "../src/server/views.js";
import { credMemory } from "../src/server/memoryText.js";
import { rememberLater, credNamespaceFor } from "../src/server/memory.js";

const GAMMA = "https://gamma-api.polymarket.com";

interface RawMarket {
  slug: string;
  conditionId: string;
  eventStartTime?: string | null;
  gameStartTime?: string | null;
  endDate?: string | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

async function fetchMarketInfo(cid: string, slug: string): Promise<"start" | "end"> {
  for (const closed of [false, true]) {
    try {
      const byCid = await getJson<RawMarket[]>(`${GAMMA}/markets?condition_ids=${encodeURIComponent(cid)}&closed=${closed}`);
      if (byCid.length) {
        const m = byCid[0];
        return (m.eventStartTime || m.gameStartTime) ? "start" : "end";
      }
    } catch {}
  }

  for (const closed of [false, true]) {
    try {
      const bySlug = await getJson<RawMarket[]>(`${GAMMA}/markets?slug=${encodeURIComponent(slug)}&closed=${closed}`);
      if (bySlug.length) {
        const m = bySlug[0];
        return (m.eventStartTime || m.gameStartTime) ? "start" : "end";
      }
    } catch {}
  }

  return "end";
}

async function main() {
  const rows = (await sql()`select distinct condition_id, market_slug from calls where lock_kind is null`) as any[];
  console.log(`Backfilling lock_kind for ${rows.length} unique markets...`);

  let starts = 0, ends = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const kind = await fetchMarketInfo(r.condition_id, r.market_slug);
    if (kind === "start") starts++; else ends++;
    await sql()`update calls set lock_kind = ${kind} where condition_id = ${r.condition_id}`;
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(`Progress: ${i + 1}/${rows.length} (start: ${starts}, end: ${ends})`);
    }
  }

  console.log(`Done backfilling lock_kind. Total starts: ${starts}, ends: ${ends}.`);

  // Regrade affected rows: for "end" calls, beat-the-price is left blank (null) and graded on profit only.
  const regraded = (await sql()`
    update calls set beat_close = null
    where lock_kind = 'end' and status = 'graded' and beat_close is not null
    returning id
  `) as any[];
  console.log(`Regraded ${regraded.length} rows where lock_kind = 'end'.`);

  // Rebuild standings for all voices
  const voices = (await sql()`select id, user_id, display_name from voices`) as any[];
  for (const v of voices) {
    const s = await ledgerStandingFor(v.id);
    const last = (await sql()`select standing from standings where voice_id = ${v.id} order by at desc limit 1`) as any[];
    const prev = last.length ? last[0].standing : null;

    if (prev !== s.standing) {
      await sql()`insert into standings (voice_id, standing, n, mean_beat_close, pnl_per_bet)
                  values (${v.id}, ${s.standing}, ${s.n}, ${s.meanBeatClose}, ${s.pnlPerBet})`;
      console.log(`Voice ${v.display_name} standing updated: ${prev} -> ${s.standing}`);
    }

    // Refresh credibility memory
    try {
      const credKey = `cred:${v.id}:${s.n}:regrade`;
      const credText = credMemory(v.display_name, v.id, s);
      const credJob = await rememberLater(credText, credNamespaceFor(v.user_id, v.id), credKey);
      await sql()`
        insert into voice_memory (voice_id, pending_job, pending_key)
        values (${v.id}, ${credJob}, ${credKey})
        on conflict (voice_id) do update set pending_job = ${credJob}, pending_key = ${credKey}
      `;
    } catch (e) {
      console.error(`Failed to queue credibility memory for ${v.display_name}:`, e);
    }
  }

  console.log("All standings rebuilt and credibility memories refreshed.");
}

main().catch(console.error);
