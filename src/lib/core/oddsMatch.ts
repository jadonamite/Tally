// Pure matching logic between Polymarket markets and bookmaker events.

export interface PolyMarketMatchInput {
  question: string;
  outcomeLabels: [string, string] | string[];
  gameStartTime?: string | null;
  eventStartTime?: string | null;
  sportsMarketType?: string | null;
  lockAt?: string;
}

export interface BookmakerEventMatchInput {
  id?: string;
  home: string;
  away: string;
  commence_time: string; // ISO
  hasDraw?: boolean;
}

export interface OddsMatch {
  matched: true;
  homeOutcomeIndex: number | null;
  awayOutcomeIndex: number | null;
  isWillXWin: boolean;
  winningTeam?: "home" | "away";
}

const GENERIC_TOKENS = new Set([
  "united", "city", "town", "athletic", "rovers", "real", "club", "fc", "sc", "cf",
  "san", "de", "la", "el", "saint", "st", "county", "wanderers", "hotspur", "state",
]);

const ALIASES: Record<string, string> = {
  "man utd": "manchester united",
  "man united": "manchester united",
  "man city": "manchester city",
  "wolves": "wolverhampton wanderers",
  "wolverhampton": "wolverhampton wanderers",
  "spurs": "tottenham hotspur",
  "tottenham": "tottenham hotspur",
  "psg": "paris saint germain",
  "bvb": "borussia dortmund",
  "dortmund": "borussia dortmund",
  "atleti": "atletico madrid",
  "atletico": "atletico madrid",
  "inter": "inter milan",
  "internazionale": "inter milan",
  "sixers": "philadelphia 76ers",
  "76ers": "philadelphia 76ers",
  "philadelphia sixers": "philadelphia 76ers",
  "blazers": "portland trail blazers",
  "trail blazers": "portland trail blazers",
  "cavs": "cleveland cavaliers",
  "mavs": "dallas mavericks",
  "niners": "san francisco 49ers",
  "49ers": "san francisco 49ers",
  "pats": "new england patriots",
  "patriots": "new england patriots",
  "packers": "green bay packers",
  "chiefs": "kansas city chiefs",
  "nuggets": "denver nuggets",
  "rockets": "houston rockets",
  "celtics": "boston celtics",
  "lakers": "los angeles lakers",
  "clippers": "los angeles clippers",
  "warriors": "golden state warriors",
  "knicks": "new york knicks",
  "nets": "brooklyn nets",
};

// Normalize team names by stripping accents, club suffixes, and punctuation.
export function normalizeTeamName(name: string): string {
  if (!name) return "";
  let s = name.toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/&/g, " and ");
  s = s.replace(/[^\w\s]/g, " ");
  s = s.replace(/\b(fc|cf|sc|afc|ssc|ac|cd|ud)\b/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (ALIASES[s]) s = ALIASES[s];
  return s;
}

// Compare two team names after normalization and alias checks.
export function teamsMatch(a: string, b: string): boolean {
  const normA = normalizeTeamName(a);
  const normB = normalizeTeamName(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const aliasA = ALIASES[normA] || normA;
  const aliasB = ALIASES[normB] || normB;
  if (aliasA === aliasB) return true;

  const tokensA = aliasA.split(" ").filter(Boolean);
  const tokensB = aliasB.split(" ").filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Do not match single generic words like City or United
  if (tokensA.length === 1 && GENERIC_TOKENS.has(tokensA[0])) return false;
  if (tokensB.length === 1 && GENERIC_TOKENS.has(tokensB[0])) return false;

  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  if (!GENERIC_TOKENS.has(lastA) && lastA === aliasB) return true;
  if (!GENERIC_TOKENS.has(lastB) && lastB === aliasA) return true;

  return false;
}

// Parse "Will X win on <date>" patterns from question text.
export function parseWillXWinOnDate(question: string): { team: string; dateStr: string } | null {
  if (!question) return null;
  const m = question.match(/^will\s+(.+?)\s+win(?:\s+(?:vs\.?|against)\s+.+?)?\s+on\s+([^?]+)\??$/i);
  if (!m) return null;
  return { team: m[1].trim(), dateStr: m[2].trim() };
}

// Check if outcome labels indicate a Yes/No binary market.
export function isYesNoMarket(labels: [string, string] | string[]): boolean {
  if (labels.length !== 2) return false;
  const a = labels[0].trim().toLowerCase();
  const b = labels[1].trim().toLowerCase();
  return (a === "yes" && b === "no") || (a === "no" && b === "yes");
}

// Match a Polymarket market against a bookmaker event under strict rules.
export function matchMarketToEvent(
  market: PolyMarketMatchInput,
  event: BookmakerEventMatchInput,
): OddsMatch | null {
  if (!market || !event) return null;
  if (!market.outcomeLabels || market.outcomeLabels.length !== 2) return null;

  // Real kickoff time must be provided and within 3 hours
  const kickoff = market.gameStartTime ?? market.eventStartTime;
  if (!kickoff) return null;
  const marketTime = Date.parse(kickoff);
  const eventTime = Date.parse(event.commence_time);
  if (Number.isNaN(marketTime) || Number.isNaN(eventTime)) return null;
  const diffHours = Math.abs(marketTime - eventTime) / (3600 * 1000);
  if (diffHours > 3) return null;

  // Reject non-moneyline markets like spreads, totals, and child moneylines
  if (market.sportsMarketType && market.sportsMarketType !== "moneyline") {
    return null;
  }

  // Check for the "Will X win on <date>" yes/no form
  const willX = parseWillXWinOnDate(market.question);
  const yesNo = isYesNoMarket(market.outcomeLabels);

  if (willX && yesNo) {
    const matchesHome = teamsMatch(willX.team, event.home);
    const matchesAway = teamsMatch(willX.team, event.away);

    if (matchesHome && matchesAway) return null; // Ambiguous
    if (!matchesHome && !matchesAway) return null;

    const winningTeam = matchesHome ? "home" : "away";
    const yesIndex = market.outcomeLabels[0].trim().toLowerCase() === "yes" ? 0 : 1;
    const noIndex = yesIndex === 0 ? 1 : 0;

    return {
      matched: true,
      homeOutcomeIndex: winningTeam === "home" ? yesIndex : noIndex,
      awayOutcomeIndex: winningTeam === "away" ? yesIndex : noIndex,
      isWillXWin: true,
      winningTeam,
    };
  }

  // Moneyline form requires sportsMarketType === "moneyline"
  if (market.sportsMarketType !== "moneyline") {
    return null;
  }

  // Draw events cannot be matched to regular two-way moneyline markets
  if (event.hasDraw) return null;

  // Two-way moneyline match
  const [label0, label1] = market.outcomeLabels;
  const l0Home = teamsMatch(label0, event.home);
  const l0Away = teamsMatch(label0, event.away);
  const l1Home = teamsMatch(label1, event.home);
  const l1Away = teamsMatch(label1, event.away);

  if (l0Home && l1Away && !l0Away && !l1Home) {
    return {
      matched: true,
      homeOutcomeIndex: 0,
      awayOutcomeIndex: 1,
      isWillXWin: false,
    };
  }

  if (l0Away && l1Home && !l0Home && !l1Away) {
    return {
      matched: true,
      homeOutcomeIndex: 1,
      awayOutcomeIndex: 0,
      isWillXWin: false,
    };
  }

  return null;
}
