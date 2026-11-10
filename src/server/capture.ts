import { sql } from "./db";
import { newId, sha256, canonicalJson } from "./ids";
import { marketBySlug, bestAsk } from "./polymarket";
import { sealOnSui, waitForSeal, memoFor } from "./sui";
import { rememberLater, namespaceFor } from "./memory";
import { callMemory } from "./memoryText";
import { compare, type OddsComparison } from "./odds";

export class CaptureError extends Error {}

const LOCK_MARGIN_MS = 30_000; // a seal needs a few seconds; refuse calls this close to the start

export async function captureCall(input: {
  userId: string;
  voiceId: string;
  rawText: string;
  marketSlug: string;
  outcomeIndex: 0 | 1;
}): Promise<string> {
  const rawText = input.rawText.trim();
  if (rawText.length < 1 || rawText.length > 4000) throw new CaptureError("Paste the call (up to 4,000 characters).");

  const voices = (await sql()`select * from voices where id = ${input.voiceId} and user_id = ${input.userId}`) as any[];
  if (!voices.length) throw new CaptureError("That voice isn't yours.");
  const voice = voices[0];
  if (voice.kind === "wallet") throw new CaptureError("Wallet calls are imported, not pasted.");

  const market = await marketBySlug(input.marketSlug);
  if (!market || market.closed) throw new CaptureError("That market isn't open.");
  const lockMs = Date.parse(market.lockAt);
  if (Date.now() > lockMs - LOCK_MARGIN_MS) throw new CaptureError("This market starts too soon or has started. Tally only counts calls sealed before the start.");

  const dup = (await sql()`select id from calls where voice_id = ${voice.id} and condition_id = ${market.conditionId} and outcome_index = ${input.outcomeIndex}`) as any[];
  if (dup.length) throw new CaptureError("This voice already has this call sealed.");

  const outcome = market.outcomes[input.outcomeIndex];
  const entry = await bestAsk(outcome.tokenId);
  const id = newId("c", 8);
  const capturedAt = new Date().toISOString();
  const canonical = canonicalJson({
    v: 1,
    id,
    user: input.userId,
    voice: voice.id,
    text: rawText,
    condition: market.conditionId,
    outcome: input.outcomeIndex,
    captured: capturedAt,
  });
  const hash = sha256(canonical);

  const odds = await compare(market).catch(() => ({ matched: false }) as OddsComparison);
  const bmPrice = odds.matched && !odds.thin ? (odds.bookProbs?.[input.outcomeIndex] ?? null) : null;
  const bmSource = bmPrice === null ? null : `consensus of ${odds.books} bookmakers`;

  // Row first, so nothing is lost if the seal fails.
  await sql()`
    insert into calls (id, user_id, voice_id, source, raw_text, market_slug, condition_id, question, image,
      outcome_index, outcome_label, token_id, lock_at, captured_at, entry_price, canonical, call_hash, seal_kind, status, lock_kind,
      bookmaker_price, bookmaker_source)
    values (${id}, ${input.userId}, ${voice.id}, 'paste', ${rawText}, ${market.slug}, ${market.conditionId}, ${market.question},
      ${market.image}, ${input.outcomeIndex}, ${outcome.label}, ${outcome.tokenId}, ${market.lockAt}, ${capturedAt},
      ${entry}, ${canonical}, ${hash}, 'none', 'unsealed', ${market.lockKind}, ${bmPrice}, ${bmSource})`;

  try {
    const digest = await sealOnSui(hash);
    await sql()`update calls set seal_kind = 'sui', seal_ref = ${digest} where id = ${id} and seal_ref is null`;
    const read = await waitForSeal(digest);
    if (read && read.success && read.payload.includes(memoFor(hash))) {
      const status = read.timestampMs! < lockMs ? "open" : "late";
      await sql()`update calls set sealed_at = ${new Date(read.timestampMs!).toISOString()}, seal_checkpoint = ${read.checkpoint},
                  status = ${status} where id = ${id} and sealed_at is null`;
    }
    // If read is null, the sweep fills sealed_at later (Step 8.4, part 1).
  } catch (e) {
    console.error("seal failed", id, e);
  }

  try {
    const job = await rememberLater(
      callMemory({
        id, voiceName: voice.display_name, voiceKind: voice.kind, source: "paste", question: market.question,
        outcomeLabel: outcome.label, entryPrice: entry, lockAt: market.lockAt, rawText, callHash: hash,
        sealRef: ((await sql()`select seal_ref from calls where id = ${id}`) as any[])[0]?.seal_ref ?? null,
      }),
      namespaceFor(input.userId, voice.id),
      `call:${id}`,
    );
    await sql()`update calls set mem_call_job = ${job} where id = ${id}`;
  } catch (e) {
    console.error("memory queue failed", id, e); // sweep retries
  }
  return id;
}
