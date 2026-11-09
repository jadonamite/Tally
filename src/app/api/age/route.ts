import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

const CUTOFF = 18; // [NEEDS CLARIFICATION: lawyer to confirm]

export async function POST(req: Request) {
  const jar = await cookies();
  if (jar.get("tally_age")?.value === "blocked") return Response.json({ ok: false });
  const { dob } = (await req.json().catch(() => ({}))) as { dob?: string };
  const d = dob ? new Date(dob + "T00:00:00Z") : null;
  if (!d || Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return Response.json({ error: "Enter a real date." }, { status: 400 });
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  const ok = age >= CUTOFF;
  jar.set("tally_age", ok ? "ok" : "blocked", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return Response.json({ ok }); // the date of birth is not stored anywhere
}

export async function GET() {
  const v = (await cookies()).get("tally_age")?.value;
  return Response.json({ state: v === "ok" ? "ok" : v === "blocked" ? "blocked" : "unknown" });
}
