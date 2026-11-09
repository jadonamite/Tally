import type { CallView, MarketOption, MemoryHit, VoiceView } from "./types";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  me: () => j<{ bankroll: number }>("/api/me"),
  setBankroll: (bankroll: number) => j<{ bankroll: number }>("/api/me", { method: "POST", body: JSON.stringify({ bankroll }) }),
  voices: () => j<{ voices: VoiceView[] }>("/api/voices"),
  addVoice: (kind: string, handle: string, displayName?: string) => j<{ id: string }>("/api/voices", { method: "POST", body: JSON.stringify({ kind, handle, displayName }) }),
  voice: (id: string) => j<{ voice: VoiceView; calls: CallView[] }>(`/api/voices/${id}`),
  recall: (id: string, q: string) => j<{ hits: MemoryHit[]; error?: string }>(`/api/voices/${id}/recall?q=${encodeURIComponent(q)}`),
  importWallet: (id: string) => j<{ added: number }>(`/api/voices/${id}/import`, { method: "POST" }),
  calls: () => j<{ calls: CallView[] }>("/api/calls"),
  call: (id: string) => j<{ call: CallView }>(`/api/calls/${id}`),
  verify: (id: string) => j<Record<string, unknown>>(`/api/calls/${id}/verify`),
  capture: (b: { voiceId: string; rawText: string; marketSlug: string; outcomeIndex: 0 | 1 }) => j<{ id: string }>("/api/calls", { method: "POST", body: JSON.stringify(b) }),
  cryptoMarkets: () => j<{ markets: MarketOption[] }>("/api/markets/crypto"),
  searchMarkets: (q: string) => j<{ markets: MarketOption[] }>(`/api/markets/search?q=${encodeURIComponent(q)}`),
  sweep: () => j<Record<string, unknown>>("/api/sweep", { method: "POST" }),
  age: () => j<{ state: "ok" | "blocked" | "unknown" }>("/api/age"),
  submitAge: (dob: string) => j<{ ok: boolean }>("/api/age", { method: "POST", body: JSON.stringify({ dob }) }),
};
