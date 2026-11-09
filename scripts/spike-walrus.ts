import { MemWal } from "@mysten-incubation/memwal";

const mw = MemWal.create({
  key: process.env.MEMWAL_PRIVATE_KEY!,
  accountId: process.env.MEMWAL_ACCOUNT_ID!,
  serverUrl: process.env.MEMWAL_SERVER_URL,
});
const ns = "tally.spike.v_spike";
console.log("health:", await mw.health());
const accepted = await mw.remember(
  `Tally spike memory. Voice SpikeVoice called Up on "Bitcoin Up or Down" at 52 cents. ${new Date().toISOString()}`,
  ns,
  { idempotencyKey: "spike-" + Date.now() },
);
console.log("accepted:", accepted);
const done = await mw.waitForRememberJob(accepted.job_id, { timeoutMs: 120_000 });
console.log("done:", done);
const rec = await mw.recall({ query: "what did SpikeVoice call on bitcoin", namespace: ns, limit: 3 });
console.log("recall:", JSON.stringify(rec.results, null, 2));
