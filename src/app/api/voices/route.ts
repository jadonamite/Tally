import { getUid } from "@/server/uid";
import { voicesFor } from "@/server/views";
import { sql } from "@/server/db";
import { newId } from "@/server/ids";
import { env } from "@/server/env";
export const dynamic = "force-dynamic";

const KINDS = ["telegram", "x", "wallet", "self", "other"] as const;

export async function GET() {
  const uid = await getUid();
  const hasOwn = (await sql()`select 1 from voices where user_id = ${uid} limit 1`) as any[];
  const isExample = !hasOwn.length && uid !== env.EXAMPLE_USER_ID;
  return Response.json({ voices: await voicesFor(uid), isExampleBoard: isExample });
}

export async function POST(req: Request) {
  const uid = await getUid();
  const b = (await req.json().catch(() => ({}))) as { kind?: string; handle?: string; displayName?: string };
  const kind = KINDS.find((k) => k === b.kind);
  let handle = (b.handle ?? "").trim();
  if (!kind) return Response.json({ error: "Pick where the calls come from." }, { status: 400 });
  if (kind === "wallet") {
    handle = handle.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(handle)) return Response.json({ error: "That isn't a Polygon wallet address." }, { status: 400 });
  } else if (kind === "self") {
    handle = "me";
  } else if (handle.length < 2 || handle.length > 80) {
    return Response.json({ error: "Give the voice a name (2 to 80 characters)." }, { status: 400 });
  }
  const displayName = (b.displayName ?? "").trim() || (kind === "self" ? "Me" : kind === "wallet" ? `Wallet ${handle.slice(0, 6)}…${handle.slice(-4)}` : handle);
  const id = newId("v", 6);
  const rows = (await sql()`insert into voices (id, user_id, kind, handle, display_name)
              values (${id}, ${uid}, ${kind}, ${handle}, ${displayName})
              on conflict (user_id, kind, handle) do update set display_name = voices.display_name
              returning id`) as any[];
  return Response.json({ id: rows[0].id });
}
