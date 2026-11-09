import { getUid } from "@/server/uid";
import { bankrollFor } from "@/server/views";
import { sql } from "@/server/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await getUid();
  return Response.json({ bankroll: await bankrollFor(uid) });
}

export async function POST(req: Request) {
  const uid = await getUid();
  const body = (await req.json().catch(() => ({}))) as { bankroll?: number };
  const b = Number(body.bankroll);
  if (!Number.isFinite(b) || b < 1 || b > 1_000_000) return Response.json({ error: "Bankroll must be between $1 and $1,000,000." }, { status: 400 });
  await sql()`update users set bankroll_usd = ${b} where id = ${uid}`;
  return Response.json({ bankroll: b });
}
