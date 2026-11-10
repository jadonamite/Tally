// Calculate points apart and disagreement flag between Polymarket and bookmaker probabilities.
export interface DisagreementResult {
  pointsApart: number;
  disagree: boolean;
}

// Compare Polymarket price and bookmaker implied probability.
export function disagreement(polyPrice: number, bookProb: number): DisagreementResult {
  if (!Number.isFinite(polyPrice) || !Number.isFinite(bookProb)) {
    return { pointsApart: 0, disagree: false };
  }
  const pointsApart = Number((Math.abs(polyPrice - bookProb) * 100).toFixed(2));
  const disagree = pointsApart >= 5;
  return { pointsApart, disagree };
}
