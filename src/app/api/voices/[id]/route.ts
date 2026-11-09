import { getUid } from "@/server/uid";
import { voicesFor, callsFor } from "@/server/views";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  const voice = (await voicesFor(uid)).find((v) => v.id === id);
  if (!voice) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ voice, calls: await callsFor(uid, id, 200) });
}
