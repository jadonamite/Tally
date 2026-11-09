import { sealOnSui, waitForSeal, memoFor, sealAddress } from "@/server/sui";
import { nextCryptoWindows, bestAsk } from "@/server/polymarket";
import { rememberLater, blobForJob, recallFor } from "@/server/memory";
import { sha256 } from "@/server/ids";

console.log("seal address:", sealAddress());
const w = await nextCryptoWindows();
console.log("windows:", w.map((m) => `${m.slug} lock ${m.lockAt}`));
console.log("best ask:", await bestAsk(w[0].outcomes[0].tokenId));
const hash = sha256("check " + Date.now());
const digest = await sealOnSui(hash);
const read = await waitForSeal(digest);
console.log("seal:", digest, read?.timestampMs, "memo ok:", read?.payload.includes(memoFor(hash)));
const job = await rememberLater("Tally check memory for CheckVoice.", "tally.check.v_check", "check-" + Date.now());
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const blob = await blobForJob(job);
  if (blob) { console.log("blob:", blob); break; }
}
console.log("recall:", await recallFor("tally.check.v_check", "CheckVoice"));
