import { sweep } from "@/server/sweep";
for (;;) {
  try { console.log(new Date().toISOString(), await sweep(50)); } catch (e) { console.error(e); }
  await new Promise((r) => setTimeout(r, 20_000));
}
