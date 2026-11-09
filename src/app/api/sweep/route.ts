// sweep/route.ts — called by the app when it opens; at most once per 20 s per server instance
import { sweep } from "@/server/sweep";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let lastRun = 0;
export async function POST() {
  if (Date.now() - lastRun < 20_000) return Response.json({ skipped: true });
  lastRun = Date.now();
  return Response.json(await sweep(15));
}
