import { getUid } from "@/server/uid";
import { sql, num } from "@/server/db";
import { rememberLater, userNamespaceFor } from "@/server/memory";
import { decisionMemory } from "@/server/memoryText";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const uid = await getUid();
  const body = (await req.json().catch(() => ({}))) as { callId?: string; choice?: "take" | "pass" };
  if (!body.callId || (body.choice !== "take" && body.choice !== "pass")) {
    return Response.json({ error: "Choose take or pass on a valid call." }, { status: 400 });
  }

  const calls = (await sql()`
    select c.*, v.display_name from calls c join voices v on v.id = c.voice_id where c.id = ${body.callId}
  `) as any[];
  if (!calls.length) {
    return Response.json({ error: "Call not found." }, { status: 404 });
  }

  const c = calls[0];
  if (c.status !== "open") {
    return Response.json({ error: "This call has already started." }, { status: 400 });
  }
  const choice = body.choice;

  await sql()`
    insert into decisions (user_id, call_id, choice, at)
    values (${uid}, ${c.id}, ${choice}, now())
    on conflict (user_id, call_id) do update set choice = ${choice}, at = now()
  `;

  try {
    const text = decisionMemory(choice, c.display_name, c.question, c.outcome_label, num(c.entry_price), c.id);
    const key = `dec:${uid}:${c.id}`;
    const job = await rememberLater(text, userNamespaceFor(uid), key);
    await sql()`update decisions set mem_job = ${job} where user_id = ${uid} and call_id = ${c.id}`;
  } catch (err) {
    console.error("Failed to queue decision memory:", err);
  }

  return Response.json({ ok: true, choice });
}
