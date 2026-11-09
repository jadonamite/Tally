import { nextCryptoWindows } from "@/server/polymarket";
import type { MarketOption } from "@/lib/types";
export const dynamic = "force-dynamic";

export async function GET() {
  const ms = await nextCryptoWindows().catch(() => []);
  const markets: MarketOption[] = ms.map((m) => ({
    slug: m.slug, question: m.question, image: m.image, lockAt: m.lockAt,
    outcomes: [{ label: m.outcomes[0].label, price: m.outcomes[0].price }, { label: m.outcomes[1].label, price: m.outcomes[1].price }],
  }));
  return Response.json({ markets });
}
