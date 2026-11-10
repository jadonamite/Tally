import { getUid } from "@/server/uid";
import { voicesFor, callsFor, voiceMemoryFor, ledgerStandingFor } from "@/server/views";
import { sql } from "@/server/db";
import type { VoiceKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  let voice = (await voicesFor(uid)).find((v) => v.id === id);
  if (!voice) {
    const raw = (await sql()`
      select v.*, (select count(*) from calls c where c.voice_id = v.id and c.status = 'open')::int as open_calls
      from voices v where v.id = ${id}
    `) as any[];
    if (raw.length) {
      const v = raw[0];
      const vm = await voiceMemoryFor(v.id);
      const ledger = await ledgerStandingFor(v.id);
      voice = {
        ...vm,
        id: v.id,
        kind: v.kind as VoiceKind,
        handle: v.handle,
        displayName: v.display_name,
        openCalls: v.open_calls,
        credBlob: vm.blobId,
        credWrittenAt: vm.writtenAt,
        credRecalledAt: vm.recalledAt,
        ledgerStanding: ledger,
      };
    }
  }
  if (!voice) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ voice, calls: await callsFor(uid, id, 200) });
}
