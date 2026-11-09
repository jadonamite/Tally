import type { Result } from "../types";

/**
 * Read a settled market's outcome from its final prices. Normally ["0","1"]. A market that
 * settled with no winner reports ["0","0"]; a split reports two near-equal prices. Both are void.
 */
export function readOutcome(prices: [number, number], outcome: 0 | 1): Result {
  const [a, b] = prices;
  if (a + b < 0.5) return "void";
  if (Math.abs(a - b) < 0.02) return "void";
  return prices[outcome] > 0.5 ? "won" : "lost";
}
