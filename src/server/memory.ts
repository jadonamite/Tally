import { MemWal } from "@mysten-incubation/memwal";
import { env } from "./env";
import type { MemoryHit } from "@/lib/types";

let client: MemWal | null = null;

export function memwal(): MemWal {
  if (!client) {
    client = MemWal.create({ key: env.MEMWAL_PRIVATE_KEY, accountId: env.MEMWAL_ACCOUNT_ID, serverUrl: env.MEMWAL_SERVER_URL });
  }
  return client;
}

export const namespaceFor = (userId: string, voiceId: string) => `tally.${userId}.${voiceId}`;

/** Queue a memory. Returns the job id. The relayer finishes it in the background. */
export async function rememberLater(text: string, namespace: string, idempotencyKey: string): Promise<string> {
  const accepted = await memwal().remember(text, namespace, { idempotencyKey });
  return accepted.job_id;
}

/** Blob id once a memory job is done; null while it is still running. Throws if it failed. */
export async function blobForJob(jobId: string): Promise<string | null> {
  const s = await memwal().getRememberStatus(jobId);
  if (s.status === "done" && s.blob_id) return s.blob_id;
  if (s.status === "failed" || s.status === "not_found") throw new Error(`memory job ${jobId} ${s.status}: ${s.error ?? ""}`);
  return null;
}

const TAG = /\s*\[tally:[^\]]*\]\s*$/;

export async function recallFor(namespace: string, query: string, limit = 5): Promise<MemoryHit[]> {
  const r = await memwal().recall({ query, namespace, limit });
  return r.results.map((m) => ({ text: m.text.replace(TAG, ""), blobId: m.blob_id, createdAt: m.created_at ?? null }));
}
