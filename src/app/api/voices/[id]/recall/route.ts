import { getUid } from "@/server/uid";
import { sql } from "@/server/db";
import { recallFor, namespaceFor } from "@/server/memory";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  let v = (await sql()`select display_name, user_id from voices where id = ${id} and user_id = ${uid}`) as any[];
  if (!v.length) v = (await sql()`select display_name, user_id from voices where id = ${id}`) as any[];
  if (!v.length) return Response.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("q")?.trim() || `${v[0].display_name} calls and results`;
  try {
    return Response.json({ hits: await recallFor(namespaceFor(v[0].user_id, id), q.slice(0, 300), 5) });
  } catch {
    return Response.json({ hits: [], error: "Memory is slow to answer right now." });
  }
}
