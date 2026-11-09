import { searchMarkets } from "@/server/polymarket";
import type { MarketOption } from "@/lib/types";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ markets: [] });
  const ms = await searchMarkets(q).catch(() => []);
  const markets: MarketOption[] = ms.map((m) => ({
    slug: m.slug, question: m.question, image: m.image, lockAt: m.lockAt,
    outcomes: [{ label: m.outcomes[0].label, price: m.outcomes[0].price }, { label: m.outcomes[1].label, price: m.outcomes[1].price }],
  }));
  return Response.json({ markets });
}
