import { sql } from "../src/server/db.js";
import { ledgerStandingFor } from "../src/server/views.js";
import { credMemory, parseCred } from "../src/server/memoryText.js";
import { rememberLater, newestIn, credNamespaceFor } from "../src/server/memory.js";

async function main() {
  const voices = (await sql()`select id, user_id, display_name from voices`) as any[];
  console.log(`Checking ${voices.length} voices for credibility memories...`);

  for (const v of voices) {
    const s = await ledgerStandingFor(v.id);
    const existing = (await sql()`select * from voice_memory where voice_id = ${v.id}`) as any[];
    if (existing.length && existing[0].blob_id) {
      console.log(`Voice ${v.display_name} (${v.id}) already has memory blob ${existing[0].blob_id}`);
      continue;
    }

    const ns = credNamespaceFor(v.user_id, v.id);
    try {
      const newest = await newestIn(ns, 1);
      if (newest.length > 0) {
        const parsed = parseCred(newest[0].text);
        if (parsed) {
          await sql()`
            insert into voice_memory (voice_id, standing, n, mean_beat_close, pnl_per_bet, won, lost, blob_id, written_at, recalled_at)
            values (${v.id}, ${parsed.standing}, ${parsed.n}, ${parsed.meanBeatClose}, ${parsed.pnlPerBet}, ${parsed.won}, ${parsed.lost}, ${newest[0].blobId}, ${newest[0].createdAt ? new Date(newest[0].createdAt).toISOString() : new Date().toISOString()}, now())
            on conflict (voice_id) do update set
              standing = excluded.standing,
              n = excluded.n,
              mean_beat_close = excluded.mean_beat_close,
              pnl_per_bet = excluded.pnl_per_bet,
              won = excluded.won,
              lost = excluded.lost,
              blob_id = excluded.blob_id,
              written_at = excluded.written_at,
              recalled_at = excluded.recalled_at,
              pending_job = null
          `;
          console.log(`Voice ${v.display_name} (${v.id}): linked existing credibility blob ${newest[0].blobId}`);
          continue;
        }
      }
    } catch (e) {
      console.log(`Namespace check failed for ${ns}:`, e);
    }

    // Queue credibility memory
    const credKey = `cred:${v.id}:${s.n}`;
    const text = credMemory(v.display_name, v.id, s);
    const job = await rememberLater(text, ns, credKey);
    await sql()`
      insert into voice_memory (voice_id, pending_job, pending_key)
      values (${v.id}, ${job}, ${credKey})
      on conflict (voice_id) do update set pending_job = ${job}, pending_key = ${credKey}
    `;
    console.log(`Voice ${v.display_name} (${v.id}): queued credibility memory job ${job}`);
  }

  console.log("Done checking voices.");
}

main().catch(console.error);
