const MAX_STAKE_FRACTION = 0.02;

/** Half-Kelly, capped at 2% of bankroll. 0 whenever the edge is not positive. */
export function halfKelly(q: number, pricePaid: number): number {
  if (pricePaid <= 0 || pricePaid >= 1) return 0;
  const edge = q - pricePaid;
  if (edge <= 0) return 0;
  const f = 0.5 * (edge / (1 - pricePaid));
  return Math.min(Math.max(f, 0), MAX_STAKE_FRACTION);
}

export { MAX_STAKE_FRACTION };
