import type { Result } from "../types";

const r4 = (x: number) => Math.round(x * 10_000) / 10_000;

/** Beat-the-price and profit per $1 for one resolved call. Void calls get nulls. */
export function gradeCall(entry: number | null, close: number | null, result: Result) {
  if (result === "void") return { beatClose: null, pnlPerDollar: null };
  const beatClose = entry !== null && close !== null ? r4(close - entry) : null;
  const pnlPerDollar =
    entry !== null && entry > 0 && entry < 1 ? r4(result === "won" ? 1 / entry - 1 : -1) : null;
  return { beatClose, pnlPerDollar };
}

/** False when the price at lock was already at an extreme: the outcome was known by then, so "beating" it means nothing. */
export function priceWasLive(close: number | null): boolean {
  return close !== null && close > 0.03 && close < 0.97;
}
