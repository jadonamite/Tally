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

/** A voice's calls, grades and standing changes. */
export const namespaceFor = (userId: string, voiceId: string) => `tally.${userId}.${voiceId}`;
/** A voice's credibility scores only, so the newest memory in it is always the current verdict. */
export const credNamespaceFor = (userId: string, voiceId: string) => `tally.${userId}.${voiceId}.cred`;
/** What Tally remembers about the user: who they follow, what they took and passed on. */
export const userNamespaceFor = (userId: string) => `tally.${userId}.me`;

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

/** Where a memory job stands. "failed" covers jobs the relayer no longer knows. */
export async function jobState(jobId: string): Promise<{ state: "done"; blobId: string } | { state: "pending" } | { state: "failed" }> {
  const s = await memwal().getRememberStatus(jobId);
  if (s.status === "done" && s.blob_id) return { state: "done", blobId: s.blob_id };
  if (s.status === "failed" || s.status === "not_found") return { state: "failed" };
  return { state: "pending" };
}

const TAG = /\s*\[tally:[^\]]*\]\s*$/;

export async function recallFor(namespace: string, query: string, limit = 5): Promise<MemoryHit[]> {
  const r = await memwal().recall({ query, namespace, limit });
  return r.results.map((m) => ({ text: m.text.replace(TAG, ""), blobId: m.blob_id, createdAt: m.created_at ?? null }));
}

/** The newest memories in a namespace, text untouched (tags included). */
export async function newestIn(namespace: string, limit = 3): Promise<Array<{ text: string; blobId: string; createdAt: string | null }>> {
  const r = await memwal().recall({ query: "Tally", namespace, limit, sort: "recent" });
  return r.results.map((m) => ({ text: m.text, blobId: m.blob_id, createdAt: m.created_at ?? null }));
}

/** How many memories and namespaces this account holds on Walrus, counted by the relayer. */
export async function memoryStats(): Promise<{ memories: number; namespaces: number }> {
  let cursor: string | undefined;
  let more = true;
  let memories = 0;
  let namespaces = 0;
  while (more) {
    const page = await memwal().listNamespaces({ cursor });
    for (const ns of page.namespaces) {
      if (!ns.name.startsWith("tally.")) continue;
      namespaces++;
      memories += ns.memory_count;
    }
    cursor = page.next_cursor ?? undefined;
    more = page.has_more && !!cursor;
  }
  return { memories, namespaces };
}
