// API route returning bookmaker consensus odds and disagreement against Polymarket prices for a market slug.

import { marketBySlug } from "@/server/polymarket";
import { compare } from "@/server/odds";

export const dynamic = "force-dynamic";

// Handle GET requests with slug query parameter.
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) return Response.json({ matched: false });

  const market = await marketBySlug(slug).catch(() => null);
  if (!market) return Response.json({ matched: false });

  const result = await compare(market).catch(() => null);
  if (!result || !result.matched) return Response.json({ matched: false });

  return Response.json(result);
}
