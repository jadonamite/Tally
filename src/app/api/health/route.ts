import { sql } from "@/server/db";
import { memwal } from "@/server/memory";
import { sealAddress } from "@/server/sui";
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {};
  try { await sql()`select 1`; out.db = "ok"; } catch (e) { out.db = String(e); }
  try { out.walrus = await memwal().health(); } catch (e) { out.walrus = String(e); }
  try { out.sealAddress = sealAddress(); } catch (e) { out.sealAddress = String(e); }
  return Response.json(out);
}
