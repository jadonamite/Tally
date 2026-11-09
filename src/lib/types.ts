export type VoiceKind = "telegram" | "x" | "wallet" | "self" | "other";
export type Standing = "unproven" | "earned" | "not_earned" | "tombstoned";
export type CallStatus = "open" | "late" | "unsealed" | "locked" | "graded" | "void";
export type Result = "won" | "lost" | "void";

export interface StandingSummary {
  standing: Standing;
  n: number;                    // graded calls that count
  meanBeatClose: number | null; // probability points, e.g. 0.021 = 2.1 cents
  pnlPerBet: number | null;     // dollars per $1
  won: number;
  lost: number;
}

export interface VoiceView extends StandingSummary {
  id: string;
  kind: VoiceKind;
  handle: string;
  displayName: string;
  openCalls: number;
}

export interface CallView {
  id: string;
  voiceId: string;
  voiceName: string;
  voiceStanding: Standing;
  voiceRecord: string;          // one line, e.g. "10 sealed calls, missed the price by 3.1c, -$0.21 per $1"
  source: "paste" | "wallet";
  rawText: string;
  marketSlug: string;
  question: string;
  image: string | null;
  outcomeLabel: string;
  lockAt: string;               // ISO
  capturedAt: string;           // ISO
  entryPrice: number | null;
  sealKind: "sui" | "polygon" | "none";
  sealRef: string | null;
  sealedAt: string | null;      // ISO
  sealCheckpoint: string | null;
  status: CallStatus;
  closePrice: number | null;
  result: Result | null;
  beatClose: number | null;
  pnlPerDollar: number | null;
  suggestedStake: number;       // dollars, 0 unless the voice is earned
  memCallBlob: string | null;
  memGradeBlob: string | null;
  callHash: string;
  canonical: string;
}

export interface MarketOption {
  slug: string;
  question: string;
  image: string | null;
  lockAt: string;
  outcomes: [{ label: string; price: number }, { label: string; price: number }];
}

export interface MemoryHit {
  text: string;
  blobId: string;
  createdAt: string | null;
}
