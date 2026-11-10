import { describe, expect, it } from "vitest";
import {
  AGENT_PRICE_RAW,
  parsePaymentHeader,
  SUI_USDC_TYPE,
  verifyPaymentTx,
  type SuiTxBlockResponse,
} from "@/server/pay";

// Hand-written transaction test fixtures (marked as hand-written)
const RECIPIENT_ADDR = "0x000000000000000000000000000000000000000000000000000000000000beef";
const SENDER_ADDR = "0x000000000000000000000000000000000000000000000000000000000000cafe";
const TEST_DIGEST = "9zXmBwQ1x4hD4s7bUvPqRe2jWkLmTnYo6ZgAsDfGhJkL";

/**
 * Creates a hand-written SuiTransactionBlock response fixture.
 */
function createHandwrittenTx(overrides?: Partial<SuiTxBlockResponse>): SuiTxBlockResponse {
  const now = Date.now();
  return {
    digest: TEST_DIGEST,
    timestampMs: String(now - 60_000), // 1 minute ago
    effects: {
      status: { status: "success" },
    },
    transaction: {
      data: {
        sender: SENDER_ADDR,
      },
    },
    balanceChanges: [
      {
        owner: { AddressOwner: RECIPIENT_ADDR },
        coinType: SUI_USDC_TYPE,
        amount: "10000",
      },
      {
        owner: { AddressOwner: SENDER_ADDR },
        coinType: SUI_USDC_TYPE,
        amount: "-10000",
      },
    ],
    ...overrides,
  };
}

describe("pure verification logic against hand-written transaction shapes", () => {
  it("accepts a valid hand-written transaction with exact price", async () => {
    const tx = createHandwrittenTx();
    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
      nowMs: Date.now(),
    });

    expect(result.valid).toBe(true);
    expect(result.amount).toBe(AGENT_PRICE_RAW);
    expect(result.payer).toBe(SENDER_ADDR);
    expect(result.digest).toBe(TEST_DIGEST);
  });

  it("accepts a payment that exceeds the minimum amount ($0.01 = 10,000 units)", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: RECIPIENT_ADDR },
          coinType: SUI_USDC_TYPE,
          amount: "50000", // $0.05
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(true);
    expect(result.amount).toBe(50000n);
  });

  it("rejects an underpaid transaction (< 10,000 units)", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: RECIPIENT_ADDR },
          coinType: SUI_USDC_TYPE,
          amount: "9999", // 1 unit short
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Insufficient USDC credited");
  });

  it("rejects when credit is sent to the wrong recipient", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: "0x000000000000000000000000000000000000000000000000000000000000dead" },
          coinType: SUI_USDC_TYPE,
          amount: "10000",
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Insufficient USDC credited");
  });

  it("normalizes recipient addresses with unpadded or mixed case representations", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: "0xbeef" }, // unpadded
          coinType: SUI_USDC_TYPE,
          amount: "10000",
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects non-USDC coin types (e.g. SUI coin)", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: RECIPIENT_ADDR },
          coinType: "0x2::sui::SUI",
          amount: "10000",
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Insufficient USDC credited");
  });

  it("rejects spoofed or other network USDC coin types", async () => {
    const tx = createHandwrittenTx({
      balanceChanges: [
        {
          owner: { AddressOwner: RECIPIENT_ADDR },
          coinType: "0x1111111111111111111111111111111111111111111111111111111111111111::usdc::USDC",
          amount: "10000",
        },
      ],
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Insufficient USDC credited");
  });

  it("rejects failed transactions on chain", async () => {
    const tx = createHandwrittenTx({
      effects: {
        status: { status: "failure", error: "MoveAbort" },
      },
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("status: failure");
  });

  it("rejects transactions older than 10 minutes", async () => {
    const now = Date.now();
    const elevenMinutesAgo = now - 11 * 60 * 1000;
    const tx = createHandwrittenTx({
      timestampMs: String(elevenMinutesAgo),
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
      nowMs: now,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Transaction is too old");
  });

  it("accepts transactions under 10 minutes old (e.g. 9 minutes)", async () => {
    const now = Date.now();
    const nineMinutesAgo = now - 9 * 60 * 1000;
    const tx = createHandwrittenTx({
      timestampMs: String(nineMinutesAgo),
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
      nowMs: now,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects transactions with missing or invalid timestamp", async () => {
    const tx = createHandwrittenTx({
      timestampMs: null,
    });

    const result = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("missing timestamp");
  });

  it("rejects replays using the isDigestUsed check", async () => {
    const usedDigests = new Set<string>();
    const isDigestUsed = (d: string) => usedDigests.has(d);

    const tx = createHandwrittenTx();

    // First use: passes
    const firstResult = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
      isDigestUsed,
    });
    expect(firstResult.valid).toBe(true);

    // Record digest
    usedDigests.add(tx.digest!);

    // Replay attempt: rejected
    const replayResult = await verifyPaymentTx({
      tx,
      expectedPayTo: RECIPIENT_ADDR,
      isDigestUsed,
    });
    expect(replayResult.valid).toBe(false);
    expect(replayResult.error).toContain("already used");
  });
});

describe("parsePaymentHeader", () => {
  it("parses base64 encoded JSON { digest }", () => {
    const payload = JSON.stringify({ digest: "0x123abc" });
    const b64 = Buffer.from(payload).toString("base64");
    expect(parsePaymentHeader(b64)).toBe("0x123abc");
  });

  it("parses raw JSON string { digest }", () => {
    expect(parsePaymentHeader('{"digest":"0x456def"}')).toBe("0x456def");
  });

  it("parses plain digest string", () => {
    expect(parsePaymentHeader("9zXmBwQ1x4hD4s7bUvPqRe2jWkLmTnYo6ZgAsDfGhJkL")).toBe(
      "9zXmBwQ1x4hD4s7bUvPqRe2jWkLmTnYo6ZgAsDfGhJkL"
    );
  });

  it("returns null on null, undefined, or empty header", () => {
    expect(parsePaymentHeader(null)).toBeNull();
    expect(parsePaymentHeader(undefined)).toBeNull();
    expect(parsePaymentHeader("")).toBeNull();
    expect(parsePaymentHeader("   ")).toBeNull();
  });
});
