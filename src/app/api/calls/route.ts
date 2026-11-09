import { getUid } from "@/server/uid";
import { callsFor } from "@/server/views";
import { captureCall, CaptureError } from "@/server/capture";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const uid = await getUid();
  return Response.json({ calls: await callsFor(uid) });
}

export async function POST(req: Request) {
  const uid = await getUid();
  const b = (await req.json().catch(() => ({}))) as { voiceId?: string; rawText?: string; marketSlug?: string; outcomeIndex?: number };
  if (!b.voiceId || !b.marketSlug || (b.outcomeIndex !== 0 && b.outcomeIndex !== 1)) {
    return Response.json({ error: "Pick a voice, a market and a side." }, { status: 400 });
  }
  try {
    const id = await captureCall({ userId: uid, voiceId: b.voiceId, rawText: b.rawText ?? "", marketSlug: b.marketSlug, outcomeIndex: b.outcomeIndex });
    return Response.json({ id });
  } catch (e) {
    if (e instanceof CaptureError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: "Something went wrong sealing this call." }, { status: 500 });
  }
}
