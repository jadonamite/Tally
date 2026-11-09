import { getUid } from "@/server/uid";
import { callsFor, callView, standingFor, bankrollFor } from "@/server/views";
import { sql } from "@/server/db";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  let call = (await callsFor(uid, undefined, 1000)).find((c) => c.id === id);
  if (!call) {
    const raw = (await sql()`select c.*, v.display_name from calls c join voices v on v.id = c.voice_id where c.id = ${id}`) as any[];
    if (raw.length) {
      const s = await standingFor(raw[0].voice_id);
      const bankroll = await bankrollFor(uid);
      call = callView(raw[0], raw[0].display_name, s, bankroll);
    }
  }
  if (!call) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ call });
}
