const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const DATA = "https://data-api.polymarket.com/v2";

export interface PmMarket {
  slug: string;
  conditionId: string;
  question: string;
  image: string | null;
  closed: boolean;
  lockAt: string; // ISO
  /** "start" when the market has a kickoff; "end" when the only time it has is when it closes. */
  lockKind: "start" | "end";
  sportsMarketType?: string | null;
  gameStartTime?: string | null;
  outcomes: [{ label: string; tokenId: string; price: number }, { label: string; tokenId: string; price: number }];
}

interface RawMarket {
  slug: string;
  conditionId: string;
  question: string;
  image?: string;
  outcomes: string;
  outcomePrices: string;
  clobTokenIds: string;
  closed?: boolean;
  endDate?: string;
  eventStartTime?: string | null;
  gameStartTime?: string | null;
  sportsMarketType?: string | null;
}

/** Gamma's time fields come in two formats; return ISO or null. */
function iso(s: string | null | undefined): string | null {
  if (!s) return null;
  let t = Date.parse(s);
  if (Number.isNaN(t)) t = Date.parse(s.replace(" ", "T").replace(/\+00$/, "+00:00"));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function normalize(raw: RawMarket): PmMarket | null {
  let labels: string[], prices: string[], tokens: string[];
  try {
    labels = JSON.parse(raw.outcomes);
    prices = JSON.parse(raw.outcomePrices);
    tokens = JSON.parse(raw.clobTokenIds);
  } catch {
    return null;
  }
  if (labels.length !== 2 || prices.length !== 2 || tokens.length !== 2) return null;
  const start = iso(raw.eventStartTime) ?? iso(raw.gameStartTime);
  const lockAt = start ?? iso(raw.endDate);
  if (!lockAt) return null;
  return {
    slug: raw.slug,
    conditionId: raw.conditionId.toLowerCase(),
    question: raw.question,
    image: raw.image ?? null,
    closed: raw.closed ?? false,
    lockAt,
    lockKind: start ? "start" : "end",
    sportsMarketType: raw.sportsMarketType ?? null,
    gameStartTime: start,
    outcomes: [
      { label: labels[0], tokenId: tokens[0], price: Number(prices[0]) },
      { label: labels[1], tokenId: tokens[1], price: Number(prices[1]) },
    ],
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

/** Gamma's `closed` is a strict filter, so ask live first, then resolved. */
export async function marketBySlug(slug: string): Promise<PmMarket | null> {
  for (const closed of [false, true]) {
    const raw = await getJson<RawMarket[]>(`${GAMMA}/markets?slug=${encodeURIComponent(slug)}&closed=${closed}`);
    if (raw.length) return normalize(raw[0]);
  }
  return null;
}

/** Settled final prices for a market, or null if it hasn't settled. */
export async function settledPrices(conditionId: string): Promise<[number, number] | null> {
  const raw = await getJson<RawMarket[]>(`${GAMMA}/markets?condition_ids=${encodeURIComponent(conditionId)}&closed=true`);
  if (!raw.length) return null;
  try {
    const p = (JSON.parse(raw[0].outcomePrices) as string[]).map(Number);
    return p.length === 2 ? [p[0], p[1]] : null;
  } catch {
    return null;
  }
}

/** Active binary markets matching a search, that start more than 2 minutes from now. */
export async function searchMarkets(q: string): Promise<PmMarket[]> {
  const res = await getJson<{ events?: Array<{ markets?: Array<{ slug?: string }> }> }>(
    `${GAMMA}/public-search?q=${encodeURIComponent(q)}&limit_per_type=8&events_status=active`,
  );
  const slugs = [...new Set((res.events ?? []).flatMap((e) => (e.markets ?? []).map((m) => m.slug).filter(Boolean) as string[]))].slice(0, 12);
  const markets = await Promise.all(slugs.map((s) => marketBySlug(s).catch(() => null)));
  const soon = Date.now() + 120_000;
  return markets.filter((m): m is PmMarket => !!m && !m.closed && Date.parse(m.lockAt) > soon);
}

/** The next two 5-minute up/down windows for BTC, ETH, SOL, XRP. Used for the demo. */
export async function nextCryptoWindows(): Promise<PmMarket[]> {
  const base = Math.floor(Date.now() / 1000 / 300) * 300;
  const out: PmMarket[] = [];
  for (const asset of ["btc", "eth", "sol", "xrp"]) {
    for (const start of [base + 300, base + 600]) {
      try {
        const ev = await getJson<Array<{ markets?: RawMarket[] }>>(`${GAMMA}/events?slug=${asset}-updown-5m-${start}`);
        const raw = ev[0]?.markets?.[0];
        const m = raw ? normalize(raw) : null;
        if (m && !m.closed && Date.parse(m.lockAt) > Date.now() + 60_000) out.push(m);
      } catch {}
    }
  }
  return out;
}

/** Cheapest sell offer for a token right now, or null when the book is empty. */
export async function bestAsk(tokenId: string): Promise<number | null> {
  const book = await getJson<{ asks?: Array<{ price: string }> }>(`${CLOB}/book?token_id=${tokenId}`);
  const asks = (book.asks ?? []).map((a) => Number(a.price)).filter((p) => p > 0 && p < 1);
  return asks.length ? Math.min(...asks) : null;
}

/** Last recorded price at or before `tsSec`, looking back up to 15 minutes. */
export async function priceAt(tokenId: string, tsSec: number): Promise<number | null> {
  const h = await getJson<{ history?: Array<{ t: number; p: number }> }>(
    `${CLOB}/prices-history?market=${tokenId}&startTs=${tsSec - 900}&endTs=${tsSec}&fidelity=1`,
  );
  const pts = (h.history ?? []).filter((x) => x.t <= tsSec).sort((a, b) => a.t - b.t);
  return pts.length ? Number(pts[pts.length - 1].p) : null;
}

export interface WalletTrade {
  side: "BUY" | "SELL";
  token_id: string;
  condition_id: string;
  price: number;
  timestamp: number; // unix seconds
  title: string;
  slug: string;
  outcome: string;
  outcome_index: number;
  transaction_hash: string;
}

/** A wallet's trades, newest first, paging back up to `maxPages` pages of 200. */
export async function walletTrades(wallet: string, maxPages = 10): Promise<WalletTrade[]> {
  const out: WalletTrade[] = [];
  for (let page = 0; page < maxPages; page++) {
    const res = await getJson<{ data?: WalletTrade[]; has_more?: boolean }>(
      `${DATA}/trades?user=${wallet.toLowerCase()}&limit=200&offset=${page * 200}`,
    );
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < 200 || res.has_more === false) break;
  }
  return out;
}
