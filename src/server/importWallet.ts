import { sql } from "./db";
import { newId, sha256, canonicalJson } from "./ids";
import { walletTrades, marketBySlug, type PmMarket } from "./polymarket";
import { polygonTxTime } from "./tatum";

/** Import up to `max` new first-buys for a wallet voice. Returns how many calls were added. */
export async function importWallet(userId: string, voiceId: string, max = 40): Promise<number> {
  const vs = (await sql()`select * from voices where id = ${voiceId} and user_id = ${userId} and kind = 'wallet'`) as any[];
  if (!vs.length) throw new Error("not a wallet voice of this user");
  const voice = vs[0];

  const trades = (await walletTrades(voice.handle))
    .filter((t) => t.side === "BUY" && (t.outcome_index === 0 || t.outcome_index === 1))
    .sort((a, b) => a.timestamp - b.timestamp); // oldest first, so the first buy wins

  const seen = new Set<string>();
  const markets = new Map<string, PmMarket | null>();
  let added = 0;

  for (const t of trades) {
    if (added >= max) break;
    const key = `${t.condition_id.toLowerCase()}:${t.outcome_index}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const exists = (await sql()`select 1 from calls where voice_id = ${voiceId} and condition_id = ${t.condition_id.toLowerCase()} and outcome_index = ${t.outcome_index}`) as any[];
    if (exists.length) continue;

    if (!markets.has(t.slug)) markets.set(t.slug, await marketBySlug(t.slug).catch(() => null));
    const m = markets.get(t.slug);
    if (!m) continue;

    const chain = await polygonTxTime(t.transaction_hash).catch(() => null);
    if (!chain) continue;
    const lockMs = Date.parse(m.lockAt);
    const status = chain.timestampMs < lockMs ? "open" : "late";
    const outcome = m.outcomes[t.outcome_index as 0 | 1];
    const id = newId("c", 8);
    const capturedAt = new Date(t.timestamp * 1000).toISOString();
    const rawText = `Bought ${outcome.label} at ${Math.round(t.price * 100)}c on Polymarket`;
    const canonical = canonicalJson({ v: 1, id, user: userId, voice: voiceId, tx: t.transaction_hash, condition: m.conditionId, outcome: t.outcome_index, captured: capturedAt });

    await sql()`
      insert into calls (id, user_id, voice_id, source, raw_text, market_slug, condition_id, question, image,
        outcome_index, outcome_label, token_id, lock_at, captured_at, entry_price, canonical, call_hash,
        seal_kind, seal_ref, sealed_at, seal_checkpoint, status)
      values (${id}, ${userId}, ${voiceId}, 'wallet', ${rawText}, ${m.slug}, ${m.conditionId}, ${m.question}, ${m.image},
        ${t.outcome_index}, ${outcome.label}, ${outcome.tokenId}, ${m.lockAt}, ${capturedAt}, ${t.price}, ${canonical},
        ${sha256(canonical)}, 'polygon', ${t.transaction_hash}, ${new Date(chain.timestampMs).toISOString()},
        ${String(chain.block)}, ${status})
      on conflict (voice_id, condition_id, outcome_index) do nothing`;
    added++;
  }
  await sql()`update voices set last_import_ts = ${Math.floor(Date.now() / 1000)} where id = ${voiceId}`;
  return added;
}
