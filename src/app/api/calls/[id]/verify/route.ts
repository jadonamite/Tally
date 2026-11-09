import { getUid } from "@/server/uid";
import { sql, toMs } from "@/server/db";
import { sha256 } from "@/server/ids";
import { suiTxRead, polygonTxTime } from "@/server/tatum";
import { memoFor } from "@/server/sui";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  let rows = (await sql()`select * from calls where id = ${id} and user_id = ${uid}`) as any[];
  if (!rows.length) rows = (await sql()`select * from calls where id = ${id}`) as any[];
  if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
  const c = rows[0];
  const hashMatches = sha256(c.canonical) === c.call_hash;
  if (c.seal_kind === "sui" && c.seal_ref) {
    const r = await suiTxRead(c.seal_ref);
    return Response.json({
      hashMatches,
      chain: "sui",
      success: r.success,
      memoOnChain: r.payload.includes(memoFor(c.call_hash)),
      chainTime: r.timestampMs ? new Date(r.timestampMs).toISOString() : null,
      beforeStart: r.timestampMs !== null && r.timestampMs < toMs(c.lock_at),
      checkpoint: r.checkpoint,
      readVia: "Tatum",
    });
  }
  if (c.seal_kind === "polygon" && c.seal_ref) {
    const t = await polygonTxTime(c.seal_ref);
    return Response.json({
      hashMatches,
      chain: "polygon",
      success: !!t,
      chainTime: t ? new Date(t.timestampMs).toISOString() : null,
      beforeStart: !!t && t.timestampMs < toMs(c.lock_at),
      checkpoint: t ? String(t.block) : null,
      readVia: "Tatum",
    });
  }
  return Response.json({ hashMatches, chain: null, success: false });
}
