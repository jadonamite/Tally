import type { CallStatus, Standing } from "./types";

export const cents = (p: number | null) =>
  p === null ? "–" : `${(p * 100).toFixed(p < 0.1 || p > 0.9 ? 1 : 0)}¢`;

export const signedCents = (d: number | null) =>
  d === null ? "–" : `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(1)}¢`;

export const perDollar = (v: number | null) =>
  v === null ? "–" : `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)} per $1`;

export const usd = (v: number) => `$${v.toFixed(2)}`;

export const STANDING_LABEL: Record<Standing, string> = {
  earned: "Earned a look",
  not_earned: "Hasn't beaten the price",
  unproven: "Not enough sealed calls",
  tombstoned: "Losing over its last 20",
};

export const STATUS_CHIP: Record<CallStatus, { label: string; tone: "win" | "lose" | "sub" | "gold" }> = {
  open: { label: "SEALED", tone: "gold" },
  locked: { label: "STARTED", tone: "sub" },
  graded: { label: "GRADED", tone: "sub" },
  void: { label: "NO RESULT", tone: "sub" },
  late: { label: "LATE", tone: "lose" },
  unsealed: { label: "UNSEALED", tone: "lose" },
};

export function timeUntil(iso: string, now = Date.now()): string {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (s <= 0) return "started";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
}

export const utcTime = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";

export const short = (s: string, n = 6) => (s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`);

export const suiTxUrl = (d: string) => `https://suiscan.xyz/mainnet/tx/${d}`;
export const polygonTxUrl = (h: string) => `https://polygonscan.com/tx/${h}`;
export const walrusBlobUrl = (b: string) => `https://walruscan.com/mainnet/blob/${b}`;
export const polymarketUrl = (slug: string) => `https://polymarket.com/market/${slug}`;
