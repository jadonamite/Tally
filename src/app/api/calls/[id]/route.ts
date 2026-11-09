import { getUid } from "@/server/uid";
import { callsFor } from "@/server/views";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  const call = (await callsFor(uid, undefined, 1000)).find((c) => c.id === id);
  if (!call) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ call });
}
