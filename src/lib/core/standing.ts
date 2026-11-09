import type { Standing, StandingSummary } from "../types";
import { halfKelly } from "./sizing";

export const MIN_SAMPLE = 10;
export const TOMBSTONE_SAMPLE = 20;

export interface GradedRow {
  result: "won" | "lost";
  beatClose: number | null;
  pnlPerDollar: number | null;
  gradedAtMs: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** A voice's standing, from its graded calls only. Rows must already exclude late, unsealed and void calls. */
export function computeStanding(rows: GradedRow[]): StandingSummary {
  const counted = rows.filter((r) => r.pnlPerDollar !== null).sort((a, b) => a.gradedAtMs - b.gradedAtMs);
  const n = counted.length;
  const pnlPerBet = mean(counted.map((r) => r.pnlPerDollar as number));
  const meanBeatClose = mean(counted.filter((r) => r.beatClose !== null).map((r) => r.beatClose as number));
  const won = counted.filter((r) => r.result === "won").length;
  const lost = n - won;

  let standing: Standing;
  if (n < MIN_SAMPLE) {
    standing = "unproven";
  } else {
    const last = counted.slice(-TOMBSTONE_SAMPLE);
    const lastPnl = mean(last.map((r) => r.pnlPerDollar as number)) ?? 0;
    const lastClv = mean(last.filter((r) => r.beatClose !== null).map((r) => r.beatClose as number));
    if (n >= TOMBSTONE_SAMPLE && lastPnl < 0 && lastClv !== null && lastClv < 0) standing = "tombstoned";
    else if ((pnlPerBet ?? 0) > 0 && meanBeatClose !== null && meanBeatClose > 0) standing = "earned";
    else standing = "not_earned";
  }
  return { standing, n, meanBeatClose, pnlPerBet, won, lost };
}

/** Suggested stake in dollars for a new call from this voice. 0 unless earned. */
export function suggestedStake(s: StandingSummary, entry: number | null, bankroll: number): number {
  if (s.standing !== "earned" || s.meanBeatClose === null || entry === null) return 0;
  const q = Math.min(0.99, entry + s.meanBeatClose);
  return Math.round(bankroll * halfKelly(q, entry) * 100) / 100;
}

export function recordLine(s: StandingSummary): string {
  if (s.n === 0) return "No graded calls yet";
  const clv = s.meanBeatClose === null ? "" : `, ${s.meanBeatClose >= 0 ? "beat" : "missed"} the price by ${Math.abs(s.meanBeatClose * 100).toFixed(1)}¢`;
  const pnl = s.pnlPerBet === null ? "" : `, ${s.pnlPerBet >= 0 ? "+" : "−"}$${Math.abs(s.pnlPerBet).toFixed(2)} per $1`;
  return `${s.n} sealed call${s.n === 1 ? "" : "s"}${clv}${pnl}`;
}
