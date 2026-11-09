// cron/sweep/route.ts — called by GitHub Actions
import { sweep } from "@/server/sweep";
import { env } from "@/server/env";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await sweep(25));
}
