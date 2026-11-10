import { describe, expect, it } from "vitest";
import { readOutcome } from "@/lib/core/outcome";
import { gradeCall, priceWasLive } from "@/lib/core/grade";
import { halfKelly } from "@/lib/core/sizing";
import { computeStanding, suggestedStake, type GradedRow } from "@/lib/core/standing";
import { credMemory, parseCred, decisionMemory, decisionOutcomeMemory } from "@/server/memoryText";

const row = (result: "won" | "lost", entry: number, close: number, i: number): GradedRow => {
  const g = gradeCall(entry, close, result);
  return { result, beatClose: g.beatClose, pnlPerDollar: g.pnlPerDollar, gradedAtMs: i };
};

describe("readOutcome", () => {
  it("reads a normal win and loss", () => {
    expect(readOutcome([1, 0], 0)).toBe("won");
    expect(readOutcome([1, 0], 1)).toBe("lost");
  });
  it("treats 0/0 and splits as void", () => {
    expect(readOutcome([0, 0], 0)).toBe("void");
    expect(readOutcome([0.5, 0.5], 1)).toBe("void");
  });
});

describe("gradeCall", () => {
  it("win at 40c beating a 45c close", () => {
    expect(gradeCall(0.4, 0.45, "won")).toEqual({ beatClose: 0.05, pnlPerDollar: 1.5 });
  });
  it("loss at 82c with close at 80c", () => {
    expect(gradeCall(0.82, 0.8, "lost")).toEqual({ beatClose: -0.02, pnlPerDollar: -1 });
  });
  it("void gives nulls", () => {
    expect(gradeCall(0.5, 0.5, "void")).toEqual({ beatClose: null, pnlPerDollar: null });
  });
  it("missing close keeps pnl", () => {
    expect(gradeCall(0.5, null, "won")).toEqual({ beatClose: null, pnlPerDollar: 1 });
  });
});

describe("halfKelly", () => {
  it("is 0 with no edge", () => expect(halfKelly(0.5, 0.5)).toBe(0));
  it("caps at 2%", () => expect(halfKelly(0.9, 0.5)).toBe(0.02));
  it("small edge", () => expect(halfKelly(0.52, 0.5)).toBeCloseTo(0.02, 5));
});

describe("computeStanding", () => {
  it("is unproven under 10", () => {
    const rows = Array.from({ length: 9 }, (_, i) => row("won", 0.5, 0.55, i));
    expect(computeStanding(rows).standing).toBe("unproven");
  });

  it("the favourite trap: wins 4 in 5 at 82c, makes nothing, is not earned", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i % 5 === 4 ? "lost" : "won", 0.82, 0.82, i));
    const s = computeStanding(rows);
    expect(s.won).toBe(8);
    expect(s.standing).toBe("not_earned"); // beat_close is 0, not > 0
  });

  it("earned: beats the close and profits", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i % 2 ? "won" : "lost", 0.4, 0.45, i));
    const s = computeStanding(rows);
    expect(s.standing).toBe("earned");
    expect(s.pnlPerBet).toBeCloseTo(0.25, 4);
    expect(s.meanBeatClose).toBeCloseTo(0.05, 4);
  });

  it("tombstoned after 20 losing and missing the price", () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(i % 4 === 0 ? "won" : "lost", 0.5, 0.45, i));
    expect(computeStanding(rows).standing).toBe("tombstoned");
  });
});

describe("suggestedStake", () => {
  it("0 unless earned", () => {
    const s = computeStanding([]);
    expect(suggestedStake(s, 0.5, 100)).toBe(0);
  });
  it("earned voice at 40c with +5c edge on $100", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i % 2 ? "won" : "lost", 0.4, 0.45, i));
    expect(suggestedStake(computeStanding(rows), 0.4, 100)).toBe(2); // 2% cap
  });
});

describe("lockKind and B1 grading", () => {
  it("end market call grades on profit only with null beatClose", () => {
    const g = gradeCall(0.5, null, "won");
    expect(g.beatClose).toBeNull();
    expect(g.pnlPerDollar).toBe(1.0);
  });

  it("computeStanding ignores null beatClose for mean beat calculation", () => {
    const rows: GradedRow[] = [
      { result: "won", beatClose: 0.06, pnlPerDollar: 1.0, gradedAtMs: 1 },
      { result: "won", beatClose: null, pnlPerDollar: 1.0, gradedAtMs: 2 },
      ...Array.from({ length: 8 }, (_, i) => ({ result: "lost" as const, beatClose: 0.02, pnlPerDollar: -1.0, gradedAtMs: i + 3 })),
    ];
    const s = computeStanding(rows);
    expect(s.n).toBe(10);
    expect(s.meanBeatClose).toBeDefined();
    // 9 rows have beatClose: (0.06 + 8 * 0.02) / 9 = 0.22 / 9
    expect(s.meanBeatClose).toBeCloseTo(0.22 / 9, 4);
  });
});

describe("credibility and decision memory tags", () => {
  it("credMemory formats and parseCred parses roundtrip", () => {
    const text = credMemory("SineNooneEI", "v_7ef01b7f7493", {
      standing: "earned",
      n: 39,
      meanBeatClose: 0.0005,
      pnlPerBet: 0.19,
      won: 24,
      lost: 15,
    });
    expect(text).toContain("[tally:cred");
    const parsed = parseCred(text);
    expect(parsed).not.toBeNull();
    expect(parsed?.voiceId).toBe("v_7ef01b7f7493");
    expect(parsed?.standing).toBe("earned");
    expect(parsed?.n).toBe(39);
    expect(parsed?.won).toBe(24);
    expect(parsed?.lost).toBe(15);
    expect(parsed?.meanBeatClose).toBeCloseTo(0.0005, 4);
    expect(parsed?.pnlPerBet).toBeCloseTo(0.19, 2);
  });

  it("decisionMemory and decisionOutcomeMemory formats", () => {
    const dec = decisionMemory("take", "Alpha Trader", "Will BTC reach 100k?", "Yes", 0.65, "c_123");
    expect(dec).toContain("decided to follow");
    expect(dec).toContain("[tally:decision call=c_123 choice=take]");

    const out = decisionOutcomeMemory("take", "Alpha Trader", "Will BTC reach 100k?", "won", 0.54, "c_123");
    expect(out).toContain("won");
    expect(out).toContain("[tally:decision-outcome call=c_123 choice=take result=won]");
  });
});

describe("priceWasLive", () => {
  it("is false when the price at lock is already the result", () => {
    expect(priceWasLive(0.001)).toBe(false);
    expect(priceWasLive(0.999)).toBe(false);
    expect(priceWasLive(null)).toBe(false);
  });
  it("is true for a normal kickoff price", () => {
    expect(priceWasLive(0.45)).toBe(true);
    expect(priceWasLive(0.9)).toBe(true);
  });
});
