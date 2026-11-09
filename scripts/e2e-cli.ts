import { sql } from "@/server/db";
import { newId } from "@/server/ids";
import { captureCall } from "@/server/capture";
import { nextCryptoWindows } from "@/server/polymarket";

const uid = "e2e0000000000001";
await sql()`insert into users (id) values (${uid}) on conflict do nothing`;
const vid = newId("v", 6);
await sql()`insert into voices (id, user_id, kind, handle, display_name) values (${vid}, ${uid}, 'other', ${"@e2e" + Date.now()}, 'E2E Voice')`;
const [m] = await nextCryptoWindows();
const id = await captureCall({ userId: uid, voiceId: vid, rawText: "E2E: Up next window", marketSlug: m.slug, outcomeIndex: 0 });
console.log("captured", id, "market", m.slug, "locks", m.lockAt);
console.log(await sql()`select status, seal_ref, sealed_at, entry_price from calls where id = ${id}`);
console.log("Now wait for the window to start and finish (up to 10 minutes), running: npm run sweep");
