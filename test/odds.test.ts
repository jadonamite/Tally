// Vitest test suite for bookmaker odds matching, de-vigging, and disagreement detection.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOddsCacheForTest,
  compare,
  consensus,
  ODDS_REGION,
  oddsQuota,
  rawImpliedProb,
  setOddsDbForTest,
  setOddsQuotaForTest,
  TheOddsApiSource,
  type OddsCacheRow,
} from "@/server/odds";
import { matchMarketToEvent, normalizeTeamName, teamsMatch } from "@/lib/core/oddsMatch";
import { disagreement } from "@/lib/core/disagree";
import type { PmMarket } from "@/server/polymarket";
import nbaFixture from "./fixtures/odds-nba.fixture.json";
import soccerFixture from "./fixtures/odds-soccer.fixture.json";

describe("rawImpliedProb decimal odds parsing", () => {
  it("accepts decimal odds greater than 1", () => {
    expect(rawImpliedProb(2.0)).toBe(0.5);
    expect(rawImpliedProb(1.25)).toBe(0.8);
  });

  it("rejects non-decimal prices less than or equal to 1", () => {
    expect(rawImpliedProb(1.0)).toBeNull();
    expect(rawImpliedProb(0.5)).toBeNull();
    expect(rawImpliedProb(0)).toBeNull();
    expect(rawImpliedProb(-110)).toBeNull();
  });
});

describe("consensus de-vigging maths", () => {
  it("computes de-vigged implied probability per outcome by hand-computed example", () => {
    // Book 1 (DraftKings): 1.90, 1.90 -> normalized 0.50, 0.50
    // Book 2 (FanDuel): 1.60, 2.40 -> raw 0.625, 0.416667 -> normalized 0.60, 0.40
    // Book 3 (Pinnacle): 1.70, 2.20 -> raw 0.588235, 0.454545 -> normalized 0.5641, 0.4359
    // Medians: Denver [0.50, 0.5641, 0.60] = 0.5641025..., Houston [0.40, 0.4359, 0.50] = 0.4358974...
    const event = nbaFixture[0];
    const res = consensus(event);

    expect(res.books).toBe(3);
    expect(res.thin).toBe(false);
    // Verified: does not round inside consensus; returns exact unrounded float
    expect(res.probs["Denver Nuggets"]).toBeCloseTo(0.5641, 4);
    expect(res.probs["Houston Rockets"]).toBeCloseTo(0.4359, 4);
    expect(res.probs["Denver Nuggets"]).not.toBe(0.5641); // Exact float precision
    expect(Number.isNaN(Date.parse(res.fetchedAt))).toBe(false);
  });

  it("requires at least 2 books to return a result and returns thin: true with 1 book", () => {
    const singleBookEvent = {
      ...nbaFixture[0],
      bookmakers: [nbaFixture[0].bookmakers[0]],
    };
    const res = consensus(singleBookEvent);

    expect(res.books).toBe(1);
    expect(res.thin).toBe(true);
    expect(res.probs).toEqual({});
  });

  it("returns books: 0 and empty probs with 0 books", () => {
    const zeroBookEvent = {
      ...nbaFixture[0],
      bookmakers: [],
    };
    const res = consensus(zeroBookEvent);

    expect(res.books).toBe(0);
    expect(res.thin).toBe(false);
    expect(res.probs).toEqual({});
  });
});

describe("market type matching and real examples", () => {
  const nbaEvent = nbaFixture[0];

  it("matches moneyline when sportsMarketType is moneyline", () => {
    const market = {
      question: "Nuggets vs. Rockets",
      outcomeLabels: ["Nuggets", "Rockets"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: "2026-11-12T01:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: nbaEvent.home_team,
      away: nbaEvent.away_team,
      commence_time: nbaEvent.commence_time,
      hasDraw: false,
    });
    expect(match).not.toBeNull();
    expect(match?.matched).toBe(true);
    expect(match?.isWillXWin).toBe(false);
  });

  it("returns null for spreads markets", () => {
    const market = {
      question: "Spread: Rockets (-4.5)",
      outcomeLabels: ["Rockets", "Nuggets"],
      lockKind: "start" as const,
    sportsMarketType: "spreads",
      gameStartTime: "2026-11-12T01:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: nbaEvent.home_team,
      away: nbaEvent.away_team,
      commence_time: nbaEvent.commence_time,
      hasDraw: false,
    });
    expect(match).toBeNull();
  });

  it("returns null for child_moneyline markets", () => {
    const market = {
      question: "LoL: FENNEL vs Nothin'Here - Game 1 Winner",
      outcomeLabels: ["FENNEL", "Nothin'Here"],
      lockKind: "start" as const,
    sportsMarketType: "child_moneyline",
      gameStartTime: "2026-11-12T01:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: "FENNEL",
      away: "Nothin'Here",
      commence_time: "2026-11-12T01:00:00Z",
      hasDraw: false,
    });
    expect(match).toBeNull();
  });

  it("returns null for championship / futures outrights", () => {
    const market = {
      question: "Will Paris Saint-Germain win the 2026-27 UEFA Champions League Championship?",
      outcomeLabels: ["Yes", "No"],
      lockKind: "start" as const,
    sportsMarketType: null,
      gameStartTime: "2026-11-12T15:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: "Paris Saint-Germain",
      away: "Bayern Munich",
      commence_time: "2026-11-12T15:00:00Z",
      hasDraw: true,
    });
    expect(match).toBeNull();
  });
});

describe("time window and kickoff time", () => {
  it("returns null if kickoff time is missing", () => {
    const market = {
      question: "Nuggets vs. Rockets",
      outcomeLabels: ["Denver Nuggets", "Houston Rockets"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: null,
    };
    const match = matchMarketToEvent(market, {
      home: "Houston Rockets",
      away: "Denver Nuggets",
      commence_time: "2026-11-12T01:00:00Z",
      hasDraw: false,
    });
    expect(match).toBeNull();
  });

  it("matches events within 3 hours of kickoff", () => {
    const market = {
      question: "Nuggets vs. Rockets",
      outcomeLabels: ["Denver Nuggets", "Houston Rockets"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: "2026-11-12T03:00:00Z", // 2 hours after 01:00:00Z
    };
    const match = matchMarketToEvent(market, {
      home: "Houston Rockets",
      away: "Denver Nuggets",
      commence_time: "2026-11-12T01:00:00Z",
      hasDraw: false,
    });
    expect(match).not.toBeNull();
    expect(match?.matched).toBe(true);
  });

  it("rejects events more than 3 hours apart from kickoff", () => {
    const market = {
      question: "Nuggets vs. Rockets",
      outcomeLabels: ["Denver Nuggets", "Houston Rockets"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: "2026-11-12T05:00:00Z", // 4 hours after 01:00:00Z
    };
    const match = matchMarketToEvent(market, {
      home: "Houston Rockets",
      away: "Denver Nuggets",
      commence_time: "2026-11-12T01:00:00Z",
      hasDraw: false,
    });
    expect(match).toBeNull();
  });
});

describe("3-way to Will X win on date matching", () => {
  const soccerEvent = soccerFixture[0];

  it("rejects 3-way draw bookmaker market against regular 2-way Polymarket market", () => {
    const market = {
      question: "Arsenal vs Chelsea",
      outcomeLabels: ["Arsenal", "Chelsea"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: "2026-11-12T15:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      id: soccerEvent.id,
      home: soccerEvent.home_team,
      away: soccerEvent.away_team,
      commence_time: soccerEvent.commence_time,
      hasDraw: true,
    });
    expect(match).toBeNull();
  });

  it("matches Will X win on date without requiring opponent in question", () => {
    const market = {
      question: "Will Arsenal win on November 12?",
      outcomeLabels: ["Yes", "No"],
      gameStartTime: "2026-11-12T15:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      id: soccerEvent.id,
      home: soccerEvent.home_team,
      away: soccerEvent.away_team,
      commence_time: soccerEvent.commence_time,
      hasDraw: true,
    });

    expect(match).not.toBeNull();
    expect(match?.matched).toBe(true);
    expect(match?.isWillXWin).toBe(true);
    expect(match?.winningTeam).toBe("home");
    expect(match?.homeOutcomeIndex).toBe(0);
    expect(match?.awayOutcomeIndex).toBe(1);
  });
});

describe("name normalisation", () => {
  it("normalises case differences", () => {
    expect(teamsMatch("denver nuggets", "Denver Nuggets")).toBe(true);
  });

  it("strips accents and diacritics", () => {
    expect(normalizeTeamName("Atlético Madrid")).toBe("atletico madrid");
    expect(teamsMatch("Atlético Madrid", "Atletico Madrid")).toBe(true);
  });

  it("strips club prefixes and suffixes like FC, CF, SC", () => {
    expect(normalizeTeamName("Arsenal FC")).toBe("arsenal");
    expect(normalizeTeamName("Real Madrid CF")).toBe("real madrid");
    expect(teamsMatch("Arsenal FC", "Arsenal")).toBe(true);
  });

  it("handles common short names and aliases", () => {
    expect(teamsMatch("Houston Rockets", "Rockets")).toBe(true);
    expect(teamsMatch("Tottenham Hotspur", "Spurs")).toBe(true);
    expect(teamsMatch("Philadelphia 76ers", "Sixers")).toBe(true);
  });
});

describe("ambiguous returns null", () => {
  it("returns null when only a generic city is provided without nickname", () => {
    expect(teamsMatch("Los Angeles", "Los Angeles Lakers")).toBe(false);
  });

  it("returns null when only one team matches in a two-way market", () => {
    const market = {
      question: "Nuggets vs. Celtics",
      outcomeLabels: ["Denver Nuggets", "Boston Celtics"],
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      gameStartTime: "2026-11-12T01:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: "Houston Rockets",
      away: "Denver Nuggets",
      commence_time: "2026-11-12T01:00:00Z",
      hasDraw: false,
    });
    expect(match).toBeNull();
  });

  it("returns null when team does not match either side in Will X win question", () => {
    const market = {
      question: "Will Liverpool win on November 12?",
      outcomeLabels: ["Yes", "No"],
      gameStartTime: "2026-11-12T15:00:00Z",
    };
    const match = matchMarketToEvent(market, {
      home: "Arsenal",
      away: "Chelsea",
      commence_time: "2026-11-12T15:00:00Z",
      hasDraw: true,
    });
    expect(match).toBeNull();
  });
});

describe("uniqueness check and findEventForMarket", () => {
  it("returns null when multiple events match in the time window", async () => {
    const source = new TheOddsApiSource();
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "dummy-test-key";

    const duplicateEvents = [
      {
        id: "ev1",
        sport_key: "basketball_nba",
        commence_time: "2026-11-12T01:00:00Z",
        home_team: "Houston Rockets",
        away_team: "Denver Nuggets",
        bookmakers: nbaFixture[0].bookmakers,
      },
      {
        id: "ev2",
        sport_key: "basketball_nba",
        commence_time: "2026-11-12T02:00:00Z",
        home_team: "Houston Rockets",
        away_team: "Denver Nuggets",
        bookmakers: nbaFixture[0].bookmakers,
      },
    ];

    source.getEvents = async () => duplicateEvents;

    try {
      const match = await source.findEventForMarket({
        slug: "nba-den-hou-2026-11-12",
        conditionId: "0x123",
        question: "Nuggets vs. Rockets",
        image: null,
        closed: false,
        lockAt: "2026-11-12T01:00:00Z",
        gameStartTime: "2026-11-12T01:00:00Z",
        lockKind: "start" as const,
    sportsMarketType: "moneyline",
        outcomes: [
          { label: "Nuggets", tokenId: "1", price: 0.5 },
          { label: "Rockets", tokenId: "2", price: 0.5 },
        ],
      });
      expect(match).toBeNull();
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("returns the event when exactly one event matches in the time window", async () => {
    const source = new TheOddsApiSource();
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "dummy-test-key";

    source.getEvents = async () => [nbaFixture[0]];

    try {
      const match = await source.findEventForMarket({
        slug: "nba-den-hou-2026-11-12",
        conditionId: "0x123",
        question: "Nuggets vs. Rockets",
        image: null,
        closed: false,
        lockAt: "2026-11-12T01:00:00Z",
        gameStartTime: "2026-11-12T01:00:00Z",
        lockKind: "start" as const,
    sportsMarketType: "moneyline",
        outcomes: [
          { label: "Nuggets", tokenId: "1", price: 0.5 },
          { label: "Rockets", tokenId: "2", price: 0.5 },
        ],
      });
      expect(match).not.toBeNull();
      expect(match?.id).toBe(nbaFixture[0].id);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("returns null without fetching when sport cannot be inferred", async () => {
    const source = new TheOddsApiSource();
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "dummy-test-key";

    let fetched = false;
    source.getEvents = async () => {
      fetched = true;
      return [];
    };

    try {
      const match = await source.findEventForMarket({
        slug: "non-sports-market-slug",
        conditionId: "0x123",
        question: "Will it rain tomorrow in Paris?",
        image: null,
        closed: false,
        lockAt: "2026-11-12T01:00:00Z",
        gameStartTime: "2026-11-12T01:00:00Z",
        lockKind: "start" as const,
    sportsMarketType: "moneyline",
        outcomes: [
          { label: "Yes", tokenId: "1", price: 0.5 },
          { label: "No", tokenId: "2", price: 0.5 },
        ],
      });
      expect(match).toBeNull();
      expect(fetched).toBe(false);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });
});

describe("quota management and configuration", () => {
  beforeEach(() => {
    clearOddsCacheForTest();
    setOddsQuotaForTest(null);
  });

  it("uses eu as constant region", () => {
    expect(ODDS_REGION).toBe("eu");
  });

  it("stops fetching and returns empty or cached data when quota is under 20", async () => {
    const source = new TheOddsApiSource();
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-key";

    setOddsQuotaForTest(19);
    expect(oddsQuota()).toBe(19);

    try {
      const res = await source.getEvents("basketball_nba");
      expect(res).toEqual([]);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
      setOddsQuotaForTest(null);
    }
  });
});

describe("unified compare function", () => {
  it("compares market with bookmaker consensus and rounds at the edge", async () => {
    const market: PmMarket = {
      slug: "nba-den-hou-2026-11-12",
      conditionId: "0x123",
      question: "Nuggets vs. Rockets",
      image: null,
      closed: false,
      lockAt: "2026-11-12T01:00:00Z",
      gameStartTime: "2026-11-12T01:00:00Z",
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      outcomes: [
        { label: "Denver Nuggets", tokenId: "1", price: 0.50 },
        { label: "Houston Rockets", tokenId: "2", price: 0.50 },
      ],
    };

    const res = await compare(market, nbaFixture[0]);

    expect(res.matched).toBe(true);
    expect(res.books).toBe(3);
    expect(res.thin).toBe(false);
    expect(res.polyPrices).toEqual([0.50, 0.50]);
    // Rounded at the edge to 4 decimal places
    expect(res.bookProbs).toEqual([0.5641, 0.4359]);
    expect(res.pointsApart).toBe(6.41);
    expect(res.disagree).toBe(true);
  });

  it("returns thin: true and no bookProbs when event has only 1 bookmaker", async () => {
    const singleBookEvent = {
      ...nbaFixture[0],
      bookmakers: [nbaFixture[0].bookmakers[0]],
    };
    const market: PmMarket = {
      slug: "nba-den-hou-2026-11-12",
      conditionId: "0x123",
      question: "Nuggets vs. Rockets",
      image: null,
      closed: false,
      lockAt: "2026-11-12T01:00:00Z",
      gameStartTime: "2026-11-12T01:00:00Z",
      lockKind: "start" as const,
    sportsMarketType: "moneyline",
      outcomes: [
        { label: "Denver Nuggets", tokenId: "1", price: 0.50 },
        { label: "Houston Rockets", tokenId: "2", price: 0.50 },
      ],
    };

    const res = await compare(market, singleBookEvent);

    expect(res.matched).toBe(true);
    expect(res.books).toBe(1);
    expect(res.thin).toBe(true);
    expect(res.bookProbs).toBeUndefined();
  });

  it("returns matched: false when market does not match event", async () => {
    const market: PmMarket = {
      slug: "nba-den-hou-2026-11-12",
      conditionId: "0x123",
      question: "Spread: Rockets (-4.5)",
      image: null,
      closed: false,
      lockAt: "2026-11-12T01:00:00Z",
      gameStartTime: "2026-11-12T01:00:00Z",
      lockKind: "start" as const,
    sportsMarketType: "spreads",
      outcomes: [
        { label: "Rockets", tokenId: "1", price: 0.50 },
        { label: "Nuggets", tokenId: "2", price: 0.50 },
      ],
    };

    const res = await compare(market, nbaFixture[0]);
    expect(res.matched).toBe(false);
  });
});

describe("no-key returns null", () => {
  it("returns empty arrays or null without throwing when key is missing", async () => {
    const source = new TheOddsApiSource();
    const prevKey = process.env.ODDS_API_KEY;
    delete process.env.ODDS_API_KEY;

    try {
      const sports = await source.getSports();
      expect(sports).toEqual([]);

      const events = await source.getEvents("basketball_nba");
      expect(events).toEqual([]);

      const matched = await source.findEventForMarket({
        slug: "nba-den-hou-2026-11-09",
        conditionId: "0x123",
        question: "Nuggets vs. Rockets",
        image: null,
        closed: false,
        lockAt: "2026-11-10T01:30:00Z",
        gameStartTime: "2026-11-10T01:30:00Z",
        lockKind: "start" as const,
    sportsMarketType: "moneyline",
        outcomes: [
          { label: "Nuggets", tokenId: "1", price: 0.5 },
          { label: "Rockets", tokenId: "2", price: 0.5 },
        ],
      });
      expect(matched).toBeNull();
    } finally {
      if (prevKey !== undefined) {
        process.env.ODDS_API_KEY = prevKey;
      }
    }
  });
});

describe("disagreement", () => {
  it("flags disagreement at 5 points or more", () => {
    expect(disagreement(0.40, 0.45)).toEqual({ pointsApart: 5, disagree: true });
    expect(disagreement(0.35, 0.42)).toEqual({ pointsApart: 7, disagree: true });
  });

  it("does not flag disagreement under 5 points", () => {
    expect(disagreement(0.40, 0.44)).toEqual({ pointsApart: 4, disagree: false });
    expect(disagreement(0.50, 0.50)).toEqual({ pointsApart: 0, disagree: false });
  });
});

describe("odds database cache", () => {
  beforeEach(() => {
    clearOddsCacheForTest();
    setOddsQuotaForTest(null);
    setOddsDbForTest(null, null);
    vi.restoreAllMocks();
  });

  it("fresh row -> no fetch", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const freshRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      remaining: 450,
      payload: nbaFixture,
    };

    const mockReader = vi.fn().mockResolvedValue(freshRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(mockReader).toHaveBeenCalledWith("basketball_nba");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockWriter).not.toHaveBeenCalled();
      expect(res).toEqual(nbaFixture);

      const secondRes = await source.getEvents("basketball_nba");
      expect(mockReader).toHaveBeenCalledTimes(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(secondRes).toEqual(nbaFixture);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("stale row -> one fetch and an upsert", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const staleRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      remaining: 400,
      payload: [],
    };

    const mockReader = vi.fn().mockResolvedValue(staleRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(nbaFixture), {
        status: 200,
        headers: { "x-requests-remaining": "399" },
      }),
    );

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(mockReader).toHaveBeenCalledWith("basketball_nba");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledTimes(1);
      expect(mockWriter).toHaveBeenCalledWith(
        "basketball_nba",
        expect.any(Date),
        399,
        nbaFixture,
      );
      expect(res).toEqual(nbaFixture);
      expect(oddsQuota()).toBe(399);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("fetch failure -> stale row returned", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const staleData = nbaFixture;
    const staleRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      remaining: 350,
      payload: staleData,
    };

    const mockReader = vi.fn().mockResolvedValue(staleRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API network error"));

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(mockReader).toHaveBeenCalledWith("basketball_nba");
      expect(mockWriter).not.toHaveBeenCalled();
      expect(res).toEqual(staleData);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("fetch failure with HTTP error status -> stale row returned", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const staleData = nbaFixture;
    const staleRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      remaining: 350,
      payload: staleData,
    };

    const mockReader = vi.fn().mockResolvedValue(staleRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Too Many Requests", { status: 429 }),
    );

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(mockReader).toHaveBeenCalledWith("basketball_nba");
      expect(mockWriter).not.toHaveBeenCalled();
      expect(res).toEqual(staleData);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("quota under 20 -> stale row returned without fetching", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    setOddsQuotaForTest(15);
    const staleData = nbaFixture;
    const staleRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      remaining: 15,
      payload: staleData,
    };

    const mockReader = vi.fn().mockResolvedValue(staleRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(mockReader).toHaveBeenCalledWith("basketball_nba");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockWriter).not.toHaveBeenCalled();
      expect(res).toEqual(staleData);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("missing table -> still works", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const mockReader = vi.fn().mockRejectedValue(new Error('relation "odds_cache" does not exist'));
    const mockWriter = vi.fn().mockRejectedValue(new Error('relation "odds_cache" does not exist'));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(nbaFixture), {
        status: 200,
        headers: { "x-requests-remaining": "450" },
      }),
    );

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const res = await source.getEvents("basketball_nba");

      expect(res).toEqual(nbaFixture);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const secondRes = await source.getEvents("basketball_nba");
      expect(secondRes).toEqual(nbaFixture);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });

  it("in-flight de-duplication: concurrent calls share a single fetch", async () => {
    const prevKey = process.env.ODDS_API_KEY;
    process.env.ODDS_API_KEY = "test-odds-key";

    const staleRow: OddsCacheRow = {
      sport_key: "basketball_nba",
      fetched_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      remaining: 400,
      payload: [],
    };

    const mockReader = vi.fn().mockResolvedValue(staleRow);
    const mockWriter = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(nbaFixture), {
        status: 200,
        headers: { "x-requests-remaining": "399" },
      }),
    );

    try {
      const source = new TheOddsApiSource({ dbReader: mockReader, dbWriter: mockWriter });
      const [res1, res2] = await Promise.all([
        source.getEvents("basketball_nba"),
        source.getEvents("basketball_nba"),
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(res1).toEqual(nbaFixture);
      expect(res2).toEqual(nbaFixture);
    } finally {
      if (prevKey !== undefined) process.env.ODDS_API_KEY = prevKey;
      else delete process.env.ODDS_API_KEY;
    }
  });
});

