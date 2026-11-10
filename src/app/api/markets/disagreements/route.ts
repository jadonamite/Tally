// API route returning active sports markets with the largest disagreements between Polymarket and bookmakers.

import { normalize, type PmMarket } from "@/server/polymarket";
import { compare, inferSportKey, oddsSource } from "@/server/odds";

export const dynamic = "force-dynamic";

const GAMMA = "https://gamma-api.polymarket.com";

interface RawEvent {
  markets?: Parameters<typeof normalize>[0][];
}

interface DisagreementMarket {
  slug: string;
  question: string;
  image: string | null;
  lockAt: string;
  outcomes: Array<{ label: string; price: number }>;
  polyPrices: [number, number];
  bookProbs: [number, number];
  books: number;
  pointsApart: number;
  disagree: boolean;
}

// Fetch active sports markets from Polymarket Gamma API.
async function getActiveSportsMarkets(): Promise<PmMarket[]> {
  try {
    const res = await fetch(`${GAMMA}/events?tag_id=1&closed=false&limit=50&order=volume24hr&ascending=false`);
    if (!res.ok) return [];
    const events = (await res.json()) as RawEvent[];
    const now = Date.now();
    const out: PmMarket[] = [];

    for (const ev of events) {
      for (const raw of ev.markets ?? []) {
        const m = normalize(raw);
        if (m && !m.closed && Date.parse(m.lockAt) > now) {
          out.push(m);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

// Handle GET requests returning top 20 active markets sorted by points apart.
export async function GET() {
  const markets = await getActiveSportsMarkets();
  if (markets.length === 0) return Response.json({ markets: [] });

  const uniqueSports = new Set<string>();
  for (const m of markets) {
    const sport = inferSportKey(m.slug, m.question);
    if (sport) uniqueSports.add(sport);
  }

  // Pre-fetch each inferred sport at most once per request.
  await Promise.all(Array.from(uniqueSports).map((sport) => oddsSource.getEvents(sport)));

  const rows: DisagreementMarket[] = [];

  for (const market of markets) {
    const comparison = await compare(market).catch(() => null);
    if (!comparison || !comparison.matched || comparison.thin || !comparison.bookProbs) {
      continue;
    }

    rows.push({
      slug: market.slug,
      question: market.question,
      image: market.image,
      lockAt: market.lockAt,
      outcomes: [
        { label: market.outcomes[0].label, price: market.outcomes[0].price },
        { label: market.outcomes[1].label, price: market.outcomes[1].price },
      ],
      polyPrices: comparison.polyPrices ?? [market.outcomes[0].price, market.outcomes[1].price],
      bookProbs: comparison.bookProbs,
      books: comparison.books ?? 0,
      pointsApart: comparison.pointsApart ?? 0,
      disagree: comparison.disagree ?? false,
    });
  }

  rows.sort((a, b) => b.pointsApart - a.pointsApart);
  return Response.json({ markets: rows.slice(0, 20) });
}
