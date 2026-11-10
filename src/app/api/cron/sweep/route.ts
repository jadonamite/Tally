// cron/sweep/route.ts — called by GitHub Actions and Vercel Cron
import { sweep } from "@/server/sweep";
import { env } from "@/server/env";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await sweep(25));
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await sweep(25));
}
