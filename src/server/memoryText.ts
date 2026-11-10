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
  late?: boolean;
}

export function callMemory(c: CallLike): string {
  const how = c.source === "wallet" ? `bought ${c.outcomeLabel}` : `called ${c.outcomeLabel}`;
  const words = c.source === "paste" ? ` Their words: "${c.rawText.slice(0, 500)}".` : "";
  const when = c.late
    ? `after the market had started at ${c.lockAt}, so it does not count toward their record`
    : `sealed before the start at ${c.lockAt}`;
  return `Tally call. ${c.voiceName} (${c.voiceKind}) ${how} on "${c.question}" at ${cents(c.entryPrice)}, ${when}.${words} [tally:call id=${c.id} hash=${c.callHash} seal=${c.sealRef ?? "none"}${c.late ? " late=1" : ""}]`;
}

/** Corrects an earlier call memory that said "sealed before the start" for a late call. */
export function lateCorrection(c: CallLike): string {
  return `Tally correction. ${c.voiceName}'s ${c.outcomeLabel} on "${c.question}" was made after the market started at ${c.lockAt}. It does not count toward their record, and an earlier memory saying it was sealed before the start is wrong. [tally:late id=${c.id}]`;
}

export function gradeMemory(c: CallLike, result: "won" | "lost" | "void", close: number | null, beat: number | null, pnl: number | null, bmClose?: number | null): string {
  const r = result === "won" ? "WON" : result === "lost" ? "LOST" : "NO RESULT";
  const vs = beat === null ? "" : ` The price at the start was ${cents(close)}, so they ${beat >= 0 ? "beat" : "missed"} the price by ${signedCents(beat)}.`;
  const bm = bmClose !== null && bmClose !== undefined && c.entryPrice !== null
    ? ` Against bookmaker consensus (${cents(bmClose)}), they ${bmClose - c.entryPrice >= 0 ? "beat" : "missed"} by ${signedCents(bmClose - c.entryPrice)}.`
    : "";
  return `Tally grade. ${c.voiceName} called ${c.outcomeLabel} on "${c.question}" at ${cents(c.entryPrice)}. Result: ${r}.${vs}${bm} ${pnl === null ? "" : perDollar(pnl) + "."} [tally:grade id=${c.id}]`;
}

export function standingMemory(voiceName: string, voiceId: string, from: Standing | null, s: StandingSummary): string {
  const prev = from ? STANDING_LABEL[from] : "new";
  return `Tally standing. ${voiceName} moved from "${prev}" to "${STANDING_LABEL[s.standing]}" after ${s.n} sealed calls: ${signedCents(s.meanBeatClose)} against the price on average, ${perDollar(s.pnlPerBet)}. [tally:standing voice=${voiceId}]`;
}

/** The credibility score Tally reads back to decide who to trust. One per voice per graded count. */
export function credMemory(voiceName: string, voiceId: string, s: StandingSummary): string {
  const vs = s.meanBeatClose === null ? "no price comparison yet" : `${signedCents(s.meanBeatClose)} against the price at the start on average`;
  return `Tally credibility. ${voiceName} after ${s.n} sealed call${s.n === 1 ? "" : "s"} that count: ${vs}, ${perDollar(s.pnlPerBet)}, ${s.won} won and ${s.lost} lost. Verdict: ${STANDING_LABEL[s.standing]}. [tally:cred voice=${voiceId} n=${s.n} clv=${s.meanBeatClose ?? "na"} pnl=${s.pnlPerBet ?? "na"} won=${s.won} lost=${s.lost} standing=${s.standing}]`;
}

const STANDINGS: Standing[] = ["unproven", "earned", "not_earned", "tombstoned"];

/** Read a credibility memory's tag back into numbers. Null if the text is not one. */
export function parseCred(text: string): (StandingSummary & { voiceId: string }) | null {
  const m = text.match(/\[tally:cred ([^\]]+)\]/);
  if (!m) return null;
  const kv = Object.fromEntries(m[1].split(/\s+/).map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
  const standing = STANDINGS.find((s) => s === kv.standing);
  const n = Number(kv.n), won = Number(kv.won), lost = Number(kv.lost);
  if (!standing || !kv.voice || !Number.isInteger(n) || !Number.isInteger(won) || !Number.isInteger(lost)) return null;
  const f = (v: string | undefined) => (v === undefined || v === "na" || !Number.isFinite(Number(v)) ? null : Number(v));
  return { voiceId: kv.voice, standing, n, won, lost, meanBeatClose: f(kv.clv), pnlPerBet: f(kv.pnl) };
}

export function decisionMemory(choice: "take" | "pass", voiceName: string, question: string, outcomeLabel: string, entry: number | null, callId: string): string {
  const verb = choice === "take" ? "decided to follow" : "decided to pass on";
  return `Tally about you. You ${verb} ${voiceName}'s call ${outcomeLabel} on "${question}" at ${cents(entry)}. [tally:decision call=${callId} choice=${choice}]`;
}

export function decisionOutcomeMemory(choice: "take" | "pass", voiceName: string, question: string, result: "won" | "lost" | "void", pnl: number | null, callId: string): string {
  const r = result === "won" ? "won" : result === "lost" ? "lost" : "had no result";
  const moral =
    result === "void" ? "" :
    choice === "take" ? ` Following it returned ${perDollar(pnl)}.` :
    result === "won" ? ` Passing cost you ${perDollar(pnl)}.` : " Passing saved you $1 per $1.";
  return `Tally about you. The ${voiceName} call on "${question}" that you ${choice === "take" ? "followed" : "passed on"} ${r}.${moral} [tally:decision-outcome call=${callId} choice=${choice} result=${result}]`;
}
