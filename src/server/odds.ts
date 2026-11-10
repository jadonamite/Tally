// The Odds API v4 client and consensus probability engine.

import { env } from "./env";
import { sql, toMs } from "./db";
import type { PmMarket } from "./polymarket";
import { matchMarketToEvent } from "@/lib/core/oddsMatch";
import { disagreement } from "@/lib/core/disagree";

export const ODDS_REGION = "eu";
const CACHE_TTL_MS = 15 * 60 * 1000;
export const DB_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export interface OddsCacheRow {
  sport_key: string;
  fetched_at: string | Date;
  remaining: number | null;
  payload: OddsEvent[] | string;
}

export type OddsDbReader = (sportKey: string) => Promise<OddsCacheRow | null>;
export type OddsDbWriter = (
  sportKey: string,
  fetchedAt: Date,
  remaining: number | null,
  payload: OddsEvent[],
) => Promise<void>;

async function defaultDbReader(sportKey: string): Promise<OddsCacheRow | null> {
  const rows = (await sql()`
    select sport_key, fetched_at, remaining, payload
    from odds_cache
    where sport_key = ${sportKey}
    limit 1
  `) as OddsCacheRow[];
  return rows[0] ?? null;
}

async function defaultDbWriter(
  sportKey: string,
  fetchedAt: Date,
  remaining: number | null,
  payload: OddsEvent[],
): Promise<void> {
  await sql()`
    insert into odds_cache (sport_key, fetched_at, remaining, payload)
    values (${sportKey}, ${fetchedAt.toISOString()}, ${remaining}, ${JSON.stringify(payload)}::jsonb)
    on conflict (sport_key) do update set
      fetched_at = excluded.fetched_at,
      remaining = excluded.remaining,
      payload = excluded.payload
  `;
}

let globalDbReader: OddsDbReader = defaultDbReader;
let globalDbWriter: OddsDbWriter = defaultDbWriter;

// Set database reader/writer for testing purposes.
export function setOddsDbForTest(reader?: OddsDbReader | null, writer?: OddsDbWriter | null): void {
  globalDbReader = reader ?? defaultDbReader;
  globalDbWriter = writer ?? defaultDbWriter;
  if (oddsSource instanceof TheOddsApiSource) {
    oddsSource.setDb(globalDbReader, globalDbWriter);
  }
}

let requestsRemaining: number | null = null;

// Return current number of remaining API requests from quota header.
export function oddsQuota(): number | null {
  return requestsRemaining;
}

// Set quota remaining count for testing purposes.
export function setOddsQuotaForTest(val: number | null): void {
  requestsRemaining = val;
}

// Clear in-memory event cache and in-flight promises for testing.
export function clearOddsCacheForTest(): void {
  cache.clear();
  inFlight.clear();
}

export interface OddsOutcome {
  name: string;
  price: number;
}

export interface OddsMarket {
  key: string;
  last_update?: string;
  outcomes: OddsOutcome[];
}

export interface OddsBookmaker {
  key: string;
  title: string;
  last_update?: string;
  markets: OddsMarket[];
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers?: OddsBookmaker[];
}

export interface ConsensusResult {
  probs: Record<string, number>;
  books: number;
  thin?: boolean;
  fetchedAt: string;
}

export interface OddsComparison {
  matched: boolean;
  bookProbs?: [number, number];
  books?: number;
  polyPrices?: [number, number];
  pointsApart?: number;
  disagree?: boolean;
  thin?: boolean;
}

export interface SportInfo {
  key: string;
  active: boolean;
  group: string;
  description: string;
  title: string;
  has_outrights: boolean;
}

export interface OddsSource {
  consensus(event: OddsEvent): ConsensusResult;
  getSports(): Promise<SportInfo[]>;
  getEvents(sportKey: string): Promise<OddsEvent[]>;
  findEventForMarket(market: PmMarket): Promise<OddsEvent | null>;
}

// Supported sport key mappings from Polymarket slugs and sports leagues.
export const SPORT_KEYS: Record<string, string> = {
  nba: "basketball_nba",
  wnba: "basketball_wnba",
  ncaab: "basketball_ncaab",
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  epl: "soccer_epl",
  ucl: "soccer_uefa_champs_league",
  la_liga: "soccer_spain_la_liga",
  bundesliga: "soccer_germany_bundesliga",
  serie_a: "soccer_italy_serie_a",
  ligue_one: "soccer_france_ligue_one",
  mls: "soccer_usa_mls",
  ufc: "mma_mixed_martial_arts",
};

// Calculate median value from an array of numbers.
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 !== 0) return s[mid];
  return (s[mid - 1] + s[mid]) / 2;
}

// Convert decimal odds price to raw implied probability.
export function rawImpliedProb(price: number): number | null {
  if (price > 1) return 1 / price;
  return null;
}

// De-vig bookmaker odds to consensus implied probabilities across books.
export function consensus(event: OddsEvent): ConsensusResult {
  const fetchedAt = new Date().toISOString();
  if (!event || !event.bookmakers || event.bookmakers.length === 0) {
    return { probs: {}, books: 0, thin: false, fetchedAt };
  }

  const outcomeProbs: Record<string, number[]> = {};
  let validBooks = 0;

  for (const bookmaker of event.bookmakers) {
    const market = bookmaker.markets?.find((m) => m.key === "h2h");
    if (!market || !market.outcomes || market.outcomes.length < 2) continue;

    const rawList: Array<{ name: string; raw: number }> = [];
    let sumRaw = 0;

    for (const outcome of market.outcomes) {
      const raw = rawImpliedProb(outcome.price);
      if (raw === null || raw <= 0) continue;
      rawList.push({ name: outcome.name, raw });
      sumRaw += raw;
    }

    if (rawList.length !== market.outcomes.length || sumRaw <= 0) continue;

    for (const item of rawList) {
      const normalized = item.raw / sumRaw;
      if (!outcomeProbs[item.name]) outcomeProbs[item.name] = [];
      outcomeProbs[item.name].push(normalized);
    }
    validBooks++;
  }

  if (validBooks === 0) {
    return { probs: {}, books: 0, thin: false, fetchedAt };
  }

  if (validBooks === 1) {
    return { probs: {}, books: 1, thin: true, fetchedAt };
  }

  const probs: Record<string, number> = {};
  for (const [name, list] of Object.entries(outcomeProbs)) {
    probs[name] = median(list);
  }

  return { probs, books: validBooks, thin: false, fetchedAt };
}

// Infer relevant sport key from Polymarket market slug and question.
export function inferSportKey(slug: string, question: string): string | null {
  const s = slug.toLowerCase();
  const q = question.toLowerCase();

  if (s.startsWith("nba-") || q.includes("nba")) return SPORT_KEYS.nba;
  if (s.startsWith("wnba-") || q.includes("wnba")) return SPORT_KEYS.wnba;
  if (s.startsWith("ncaab-") || q.includes("ncaab")) return SPORT_KEYS.ncaab;
  if (s.startsWith("nfl-") || q.includes("nfl")) return SPORT_KEYS.nfl;
  if (s.startsWith("ncaaf-") || q.includes("ncaaf")) return SPORT_KEYS.ncaaf;
  if (s.startsWith("mlb-") || q.includes("mlb")) return SPORT_KEYS.mlb;
  if (s.startsWith("nhl-") || q.includes("nhl")) return SPORT_KEYS.nhl;
  if (s.startsWith("epl-") || q.includes("premier league") || q.includes("epl")) return SPORT_KEYS.epl;
  if (s.startsWith("ucl-") || q.includes("champions league") || q.includes("ucl")) return SPORT_KEYS.ucl;
  if (s.startsWith("la-liga-") || q.includes("la liga")) return SPORT_KEYS.la_liga;
  if (s.startsWith("bundesliga-") || q.includes("bundesliga")) return SPORT_KEYS.bundesliga;
  if (s.startsWith("serie-a-") || q.includes("serie a")) return SPORT_KEYS.serie_a;
  if (s.startsWith("ligue-one-") || q.includes("ligue 1") || q.includes("ligue one")) return SPORT_KEYS.ligue_one;
  if (s.startsWith("mls-") || q.includes("mls")) return SPORT_KEYS.mls;
  if (s.startsWith("ufc-") || q.includes("ufc") || q.includes("mma")) return SPORT_KEYS.ufc;

  return null;
}

// Parse JSON payload or return array if already parsed.
function parsePayload(payload: unknown): OddsEvent[] {
  if (Array.isArray(payload)) return payload as OddsEvent[];
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed)) return parsed as OddsEvent[];
    } catch {
      return [];
    }
  }
  return [];
}

// In-memory cache for event responses to respect API rate limits.
const cache = new Map<string, { data: OddsEvent[]; ts: number }>();

// In-flight promise map for deduplicating concurrent fetches.
const inFlight = new Map<string, Promise<OddsEvent[]>>();

// The Odds API v4 client implementation.
export class TheOddsApiSource implements OddsSource {
  public dbReader: OddsDbReader;
  public dbWriter: OddsDbWriter;

  constructor(options?: { dbReader?: OddsDbReader; dbWriter?: OddsDbWriter }) {
    this.dbReader = options?.dbReader ?? globalDbReader;
    this.dbWriter = options?.dbWriter ?? globalDbWriter;
  }

  // Set injected database reader and writer.
  setDb(reader?: OddsDbReader | null, writer?: OddsDbWriter | null): void {
    this.dbReader = reader ?? defaultDbReader;
    this.dbWriter = writer ?? defaultDbWriter;
  }

  // Compute consensus probabilities from an event.
  consensus(event: OddsEvent): ConsensusResult {
    return consensus(event);
  }

  // Fetch in-season active sports from The Odds API.
  async getSports(): Promise<SportInfo[]> {
    const key = env.ODDS_API_KEY;
    if (!key) return [];
    if (requestsRemaining !== null && requestsRemaining < 20) return [];

    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(key)}`);
      const rem = res.headers.get("x-requests-remaining");
      if (rem !== null) {
        const parsed = parseInt(rem, 10);
        if (!Number.isNaN(parsed)) requestsRemaining = parsed;
      }
      if (!res.ok) return [];
      return (await res.json()) as SportInfo[];
    } catch {
      return [];
    }
  }

  // Fetch upcoming events and odds for a specific sport.
  async getEvents(sportKey: string): Promise<OddsEvent[]> {
    if (!sportKey) return [];

    const cached = cache.get(sportKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }

    if (inFlight.has(sportKey)) {
      return inFlight.get(sportKey)!;
    }

    const fetchPromise = (async (): Promise<OddsEvent[]> => {
      try {
        let row: OddsCacheRow | null = null;
        try {
          row = await this.dbReader(sportKey);
        } catch {
          // If the table does not exist yet (query throws), fall back to in-memory silently.
          row = null;
        }

        if (row && row.fetched_at) {
          const fetchedAtMs = toMs(row.fetched_at);
          const ageMs = Date.now() - fetchedAtMs;
          if (!Number.isNaN(fetchedAtMs) && ageMs >= 0 && ageMs < DB_CACHE_TTL_MS) {
            const data = parsePayload(row.payload);
            const remainingDbTtl = DB_CACHE_TTL_MS - ageMs;
            const memTtl = Math.min(CACHE_TTL_MS, Math.max(0, remainingDbTtl));
            cache.set(sportKey, { data, ts: Date.now() - (CACHE_TTL_MS - memTtl) });
            return data;
          }
        }

        const staleRowData = row ? parsePayload(row.payload) : (cached ? cached.data : null);
        const key = env.ODDS_API_KEY;

        if (!key || (requestsRemaining !== null && requestsRemaining < 20)) {
          if (staleRowData) {
            cache.set(sportKey, { data: staleRowData, ts: Date.now() });
            return staleRowData;
          }
          return cached ? cached.data : [];
        }

        try {
          const url = `https://api.the-odds-api.com/v4/sports/${encodeURIComponent(sportKey)}/odds/?apiKey=${encodeURIComponent(key)}&regions=${ODDS_REGION}&markets=h2h&oddsFormat=decimal`;
          const res = await fetch(url);
          const rem = res.headers.get("x-requests-remaining");
          if (rem !== null) {
            const parsed = parseInt(rem, 10);
            if (!Number.isNaN(parsed)) requestsRemaining = parsed;
          }

          if (!res.ok) {
            if (staleRowData) {
              cache.set(sportKey, { data: staleRowData, ts: Date.now() });
              return staleRowData;
            }
            return cached ? cached.data : [];
          }

          const data = (await res.json()) as OddsEvent[];

          try {
            await this.dbWriter(sportKey, new Date(), requestsRemaining, data);
          } catch {
            // Silently fall back if table does not exist.
          }

          cache.set(sportKey, { data, ts: Date.now() });
          return data;
        } catch {
          if (staleRowData) {
            cache.set(sportKey, { data: staleRowData, ts: Date.now() });
            return staleRowData;
          }
          return cached ? cached.data : [];
        }
      } finally {
        inFlight.delete(sportKey);
      }
    })();

    inFlight.set(sportKey, fetchPromise);
    return fetchPromise;
  }

  // Match a Polymarket market against bookmaker events with uniqueness check.
  async findEventForMarket(market: PmMarket): Promise<OddsEvent | null> {
    const key = env.ODDS_API_KEY;
    if (!key || !market) return null;

    const targetSport = inferSportKey(market.slug, market.question);
    if (!targetSport) return null;

    const events = await this.getEvents(targetSport);
    const matching: OddsEvent[] = [];

    for (const ev of events) {
      const hasDraw = ev.bookmakers?.some((b) =>
        b.markets?.some((m) => m.key === "h2h" && m.outcomes?.some((o) => o.name.toLowerCase() === "draw")),
      );
      const match = matchMarketToEvent(
        {
          question: market.question,
          outcomeLabels: [market.outcomes[0].label, market.outcomes[1].label],
          gameStartTime: market.gameStartTime,
          sportsMarketType: market.sportsMarketType,
        },
        {
          id: ev.id,
          home: ev.home_team,
          away: ev.away_team,
          commence_time: ev.commence_time,
          hasDraw,
        },
      );
      if (match) matching.push(ev);
    }

    // Require exactly one matching event inside the time window.
    if (matching.length === 1) return matching[0];
    return null;
  }
}

// Default export of odds source instance.
export const oddsSource: OddsSource = new TheOddsApiSource();

// Compare a Polymarket market against bookmaker consensus odds.
export async function compare(market: PmMarket, eventInput?: OddsEvent): Promise<OddsComparison> {
  const event = eventInput ?? (await oddsSource.findEventForMarket(market).catch(() => null));
  if (!event) return { matched: false };

  const hasDraw = event.bookmakers?.some((b) =>
    b.markets?.some((m) => m.key === "h2h" && m.outcomes?.some((o) => o.name.toLowerCase() === "draw")),
  );

  const match = matchMarketToEvent(
    {
      question: market.question,
      outcomeLabels: [market.outcomes[0].label, market.outcomes[1].label],
      gameStartTime: market.gameStartTime,
      sportsMarketType: market.sportsMarketType,
    },
    {
      id: event.id,
      home: event.home_team,
      away: event.away_team,
      commence_time: event.commence_time,
      hasDraw,
    },
  );

  if (!match) return { matched: false };

  const cons = oddsSource.consensus(event);
  const polyPrices: [number, number] = [market.outcomes[0].price, market.outcomes[1].price];

  if (cons.books < 2) {
    return {
      matched: true,
      books: cons.books,
      thin: cons.thin ?? (cons.books === 1),
      polyPrices,
    };
  }

  let bookProb0: number | null = null;
  let bookProb1: number | null = null;

  if (match.isWillXWin && match.winningTeam) {
    const winningTeam = match.winningTeam === "home" ? event.home_team : event.away_team;
    const p = cons.probs[winningTeam];
    if (p === undefined) return { matched: false };
    bookProb0 = p;
    bookProb1 = 1 - p;
  } else {
    const homeProb = cons.probs[event.home_team];
    const awayProb = cons.probs[event.away_team];
    if (homeProb === undefined || awayProb === undefined) return { matched: false };

    if (match.homeOutcomeIndex === 0) {
      bookProb0 = homeProb;
      bookProb1 = awayProb;
    } else {
      bookProb0 = awayProb;
      bookProb1 = homeProb;
    }
  }

  const roundedBookProbs: [number, number] = [
    Number(bookProb0.toFixed(4)),
    Number(bookProb1.toFixed(4)),
  ];

  const { pointsApart, disagree } = disagreement(polyPrices[0], roundedBookProbs[0]);

  return {
    matched: true,
    bookProbs: roundedBookProbs,
    books: cons.books,
    polyPrices,
    pointsApart,
    disagree,
    thin: false,
  };
}
