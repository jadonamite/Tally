import type { CallView, MarketOption, MemoryHit, VoiceView, UserScorecard, OddsComparison, DisagreementItem } from "./types";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  me: () => j<{ bankroll: number; scorecard: UserScorecard; userMemories: MemoryHit[] }>("/api/me"),
  setBankroll: (bankroll: number) => j<{ bankroll: number }>("/api/me", { method: "POST", body: JSON.stringify({ bankroll }) }),
  decide: (callId: string, choice: "take" | "pass") => j<{ ok: boolean; choice: "take" | "pass" }>("/api/decisions", { method: "POST", body: JSON.stringify({ callId, choice }) }),
  memoryStats: () => j<{ memories: number; namespaces: number }>("/api/memory/stats"),
  voices: () => j<{ voices: VoiceView[]; isExampleBoard?: boolean }>("/api/voices"),
  addVoice: (kind: string, handle: string, displayName?: string) => j<{ id: string }>("/api/voices", { method: "POST", body: JSON.stringify({ kind, handle, displayName }) }),
  voice: (id: string) => j<{ voice: VoiceView; calls: CallView[] }>(`/api/voices/${id}`),
  recall: (id: string, q: string) => j<{ hits: MemoryHit[]; error?: string }>(`/api/voices/${id}/recall?q=${encodeURIComponent(q)}`),
  importWallet: (id: string) => j<{ added: number }>(`/api/voices/${id}/import`, { method: "POST" }),
  calls: () => j<{ calls: CallView[]; isExampleBoard?: boolean }>("/api/calls"),
  call: (id: string) => j<{ call: CallView }>(`/api/calls/${id}`),
  verify: (id: string) => j<Record<string, unknown>>(`/api/calls/${id}/verify`),
  capture: (b: { voiceId: string; rawText: string; marketSlug: string; outcomeIndex: 0 | 1 }) => j<{ id: string }>("/api/calls", { method: "POST", body: JSON.stringify(b) }),
  cryptoMarkets: () => j<{ markets: MarketOption[] }>("/api/markets/crypto"),
  searchMarkets: (q: string) => j<{ markets: MarketOption[] }>(`/api/markets/search?q=${encodeURIComponent(q)}`),
  oddsComparison: (slug: string) => j<OddsComparison>(`/api/markets/odds?slug=${encodeURIComponent(slug)}`),
  disagreements: () => j<{ markets: DisagreementItem[] }>("/api/markets/disagreements"),
  sweep: () => j<Record<string, unknown>>("/api/sweep", { method: "POST" }),
  age: () => j<{ state: "ok" | "blocked" | "unknown" }>("/api/age"),
  submitAge: (dob: string) => j<{ ok: boolean }>("/api/age", { method: "POST", body: JSON.stringify({ dob }) }),
};
