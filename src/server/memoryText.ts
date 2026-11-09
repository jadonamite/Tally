import { cents, signedCents, perDollar, STANDING_LABEL } from "@/lib/format";
import type { Standing, StandingSummary } from "@/lib/types";

interface CallLike {
  id: string;
  voiceName: string;
  voiceKind: string;
  source: "paste" | "wallet";
  question: string;
  outcomeLabel: string;
  entryPrice: number | null;
  lockAt: string;
  rawText: string;
  callHash: string;
  sealRef: string | null;
}

export function callMemory(c: CallLike): string {
  const how = c.source === "wallet" ? `bought ${c.outcomeLabel}` : `called ${c.outcomeLabel}`;
  const words = c.source === "paste" ? ` Their words: "${c.rawText.slice(0, 500)}".` : "";
  return `Tally call. ${c.voiceName} (${c.voiceKind}) ${how} on "${c.question}" at ${cents(c.entryPrice)}, sealed before the start at ${c.lockAt}.${words} [tally:call id=${c.id} hash=${c.callHash} seal=${c.sealRef ?? "none"}]`;
}

export function gradeMemory(c: CallLike, result: "won" | "lost" | "void", close: number | null, beat: number | null, pnl: number | null): string {
  const r = result === "won" ? "WON" : result === "lost" ? "LOST" : "NO RESULT";
  const vs = beat === null ? "" : ` The price at the start was ${cents(close)}, so they ${beat >= 0 ? "beat" : "missed"} the price by ${signedCents(beat)}.`;
  return `Tally grade. ${c.voiceName} called ${c.outcomeLabel} on "${c.question}" at ${cents(c.entryPrice)}. Result: ${r}.${vs} ${pnl === null ? "" : perDollar(pnl) + "."} [tally:grade id=${c.id}]`;
}

export function standingMemory(voiceName: string, voiceId: string, from: Standing | null, s: StandingSummary): string {
  const prev = from ? STANDING_LABEL[from] : "new";
  return `Tally standing. ${voiceName} moved from "${prev}" to "${STANDING_LABEL[s.standing]}" after ${s.n} sealed calls: ${signedCents(s.meanBeatClose)} against the price on average, ${perDollar(s.pnlPerBet)}. [tally:standing voice=${voiceId}]`;
}
