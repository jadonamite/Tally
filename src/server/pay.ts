import { normalizeSuiAddress } from "@mysten/sui/utils";
import { sql } from "./db";
import { env } from "./env";

/**
 * Native Circle USDC coin type on Sui mainnet.
 * Reference: Circle Official Documentation
 * https://developers.circle.com/stablecoins/docs/sui-on-chain-details
 */
export const SUI_USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

/** Minimum USDC payment required in raw atomic units (6 decimals: 10,000 = $0.01 USDC). */
export const AGENT_PRICE_RAW = 10_000n;
export const AGENT_PRICE_STR = "10000";

/** Max age of a payment transaction before it is considered expired (10 minutes). */
export const MAX_TX_AGE_MS = 10 * 60 * 1000;

export interface SuiBalanceChangeOwner {
  AddressOwner?: string;
  ObjectOwner?: string;
  Shared?: { initial_shared_version: number | string };
  [key: string]: unknown;
}

export interface SuiBalanceChange {
  owner: SuiBalanceChangeOwner | string;
  coinType: string;
  amount: string;
}

export interface SuiTxBlockResponse {
  digest?: string;
  timestampMs?: string | number | null;
  effects?: {
    status?: {
      status?: "success" | "failure";
      error?: string;
    };
    [key: string]: unknown;
  };
  transaction?: {
    data?: {
      sender?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  balanceChanges?: SuiBalanceChange[];
  [key: string]: unknown;
}

export interface VerifyPaymentTxOptions {
  tx: SuiTxBlockResponse;
  expectedPayTo: string;
  expectedCoinType?: string;
  minAmount?: bigint;
  nowMs?: number;
  maxAgeMs?: number;
  isDigestUsed?: (digest: string) => boolean | Promise<boolean>;
}

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  payer?: string;
  amount?: bigint;
  digest?: string;
  timestampMs?: number;
}

export function normalizeSuiCoinType(coinType: string): string {
  const parts = coinType.split("::");
  if (parts.length >= 3) {
    try {
      const pkg = normalizeSuiAddress(parts[0]);
      return [pkg, ...parts.slice(1)].join("::");
    } catch {
      return coinType.toLowerCase();
    }
  }
  return coinType.toLowerCase();
}

export function extractOwnerAddress(owner: SuiBalanceChange["owner"]): string | null {
  if (!owner) return null;
  if (typeof owner === "string") return owner;
  if (typeof owner === "object" && "AddressOwner" in owner && typeof owner.AddressOwner === "string") {
    return owner.AddressOwner;
  }
  return null;
}

/**
 * Pure verification logic for a Sui payment transaction.
 * Validates:
 * 1. Transaction execution status is success
 * 2. Transaction timestamp is under 10 minutes old
 * 3. Balance changes credit the expected recipient with at least the required amount of USDC
 * 4. Replay check (if digest checker is provided)
 */
export async function verifyPaymentTx(opts: VerifyPaymentTxOptions): Promise<PaymentVerificationResult> {
  const {
    tx,
    expectedPayTo,
    expectedCoinType = SUI_USDC_TYPE,
    minAmount = AGENT_PRICE_RAW,
    nowMs = Date.now(),
    maxAgeMs = MAX_TX_AGE_MS,
    isDigestUsed,
  } = opts;

  if (!tx) {
    return { valid: false, error: "Empty transaction response" };
  }

  const digest = tx.digest || "";

  // 1. Replay check if callback is provided
  if (isDigestUsed && digest) {
    const used = await isDigestUsed(digest);
    if (used) {
      return { valid: false, error: "Transaction digest already used", digest };
    }
  }

  // 2. Status must be success
  const status = tx.effects?.status?.status;
  if (status !== "success") {
    return {
      valid: false,
      error: `Transaction failed with status: ${status ?? "unknown"}`,
      digest,
    };
  }

  // 3. Timestamp & age check (under 10 minutes old)
  if (tx.timestampMs === undefined || tx.timestampMs === null) {
    return { valid: false, error: "Transaction missing timestamp", digest };
  }

  const txTime = Number(tx.timestampMs);
  if (isNaN(txTime) || txTime <= 0) {
    return { valid: false, error: "Invalid transaction timestamp", digest };
  }

  const age = nowMs - txTime;
  if (age > maxAgeMs) {
    return {
      valid: false,
      error: `Transaction is too old (${Math.round(age / 1000)}s > ${maxAgeMs / 1000}s limit)`,
      digest,
      timestampMs: txTime,
    };
  }

  // Allow 60 seconds future clock skew
  if (age < -60_000) {
    return {
      valid: false,
      error: "Transaction timestamp is too far in the future",
      digest,
      timestampMs: txTime,
    };
  }

  // 4. Balance changes check
  const balanceChanges = tx.balanceChanges;
  if (!Array.isArray(balanceChanges) || balanceChanges.length === 0) {
    return { valid: false, error: "Transaction contains no balance changes", digest };
  }

  let normalizedRecipient: string;
  try {
    normalizedRecipient = normalizeSuiAddress(expectedPayTo);
  } catch {
    normalizedRecipient = expectedPayTo.toLowerCase();
  }

  const targetCoin = normalizeSuiCoinType(expectedCoinType);

  let creditedAmount = 0n;
  for (const change of balanceChanges) {
    const rawOwner = extractOwnerAddress(change.owner);
    if (!rawOwner) continue;

    let changeOwner: string;
    try {
      changeOwner = normalizeSuiAddress(rawOwner);
    } catch {
      changeOwner = rawOwner.toLowerCase();
    }

    if (changeOwner === normalizedRecipient && normalizeSuiCoinType(change.coinType) === targetCoin) {
      try {
        const amt = BigInt(change.amount);
        if (amt > 0n) {
          creditedAmount += amt;
        }
      } catch {
        // Skip malformed amounts
      }
    }
  }

  if (creditedAmount < minAmount) {
    return {
      valid: false,
      error: `Insufficient USDC credited to recipient: received ${creditedAmount}, required ${minAmount}`,
      digest,
      amount: creditedAmount,
    };
  }

  // Extract payer
  let payer = tx.transaction?.data?.sender;
  if (!payer) {
    // Fallback: look for debit on the target coin type
    for (const change of balanceChanges) {
      if (normalizeSuiCoinType(change.coinType) === targetCoin) {
        try {
          if (BigInt(change.amount) < 0n) {
            const candidate = extractOwnerAddress(change.owner);
            if (candidate) {
              payer = candidate;
              break;
            }
          }
        } catch {}
      }
    }
  }

  let normalizedPayer = "unknown";
  if (payer) {
    try {
      normalizedPayer = normalizeSuiAddress(payer);
    } catch {
      normalizedPayer = payer;
    }
  }

  return {
    valid: true,
    payer: normalizedPayer,
    amount: creditedAmount,
    digest,
    timestampMs: txTime,
  };
}

/** Rate limiter slot for Tatum API calls */
let nextTatumSlot = 0;
async function throttleTatum() {
  const now = Date.now();
  const wait = Math.max(0, nextTatumSlot - now);
  nextTatumSlot = Math.max(now, nextTatumSlot) + 350;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

/**
 * Read a Sui transaction through Tatum's JSON-RPC using sui_getTransactionBlock
 * with showBalanceChanges: true, showEffects: true, showInput: true.
 */
export async function readSuiTxWithBalanceChanges(digest: string): Promise<SuiTxBlockResponse | null> {
  await throttleTatum();
  const { SuiGrpcClient } = await import("@mysten/sui/grpc");
  const { GrpcTransport } = await import("@protobuf-ts/grpc-transport");
  const grpc = await import("@grpc/grpc-js");
  const transport = new GrpcTransport({
    host: "sui-mainnet-grpc.gateway.tatum.io:443",
    channelCredentials: grpc.credentials.createSsl(),
    meta: { "x-api-key": env.TATUM_API_KEY },
  });
  const client = new SuiGrpcClient({ network: "mainnet", transport });
  let r: any;
  try {
    r = await client.getTransaction({ digest, include: { effects: true, transaction: true, balanceChanges: true } });
  } catch (e) {
    if (/not found/i.test(String(e))) return null;
    throw e;
  }
  const t = r.Transaction ?? r;
  return {
    digest: t.digest ?? digest,
    timestampMs: t.timestampMs ?? null,
    effects: { status: { status: t.status?.success === true ? "success" : "failure" } },
    transaction: { data: { sender: t.transaction?.sender } },
    balanceChanges: (t.balanceChanges ?? []).map((b: any) => ({
      owner: b.address ?? b.owner,
      coinType: b.coinType,
      amount: String(b.amount),
    })),
  };
}

/**
 * Insert payment record into agent_payments table.
 * Primary key is digest: insert first, reject on conflict.
 * Returns true if inserted, false if already exists (replay).
 */
export async function insertAgentPayment(payment: {
  digest: string;
  voiceId: string;
  payer: string;
  amount: bigint;
}): Promise<boolean> {
  try {
    await sql()`
      insert into agent_payments (digest, voice_id, payer, amount)
      values (${payment.digest}, ${payment.voiceId}, ${payment.payer}, ${payment.amount.toString()})
    `;
    return true;
  } catch (err: any) {
    const msg = String(err?.message || "");
    // Check for unique / primary key violation (PostgreSQL 23505)
    if (err?.code === "23505" || msg.includes("duplicate key") || msg.includes("unique")) {
      return false;
    }
    throw err;
  }
}

/**
 * Parse the X-PAYMENT header into a digest string.
 * Supports:
 * - base64 encoded JSON string: `{"digest":"..."}`
 * - raw JSON string: `{"digest":"..."}`
 * - raw digest string
 */
export function parsePaymentHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  // Try base64 decoded JSON
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    const json = JSON.parse(decoded);
    if (json && typeof json.digest === "string" && json.digest.trim()) {
      return json.digest.trim();
    }
  } catch {}

  // Try direct JSON
  try {
    const json = JSON.parse(trimmed);
    if (json && typeof json.digest === "string" && json.digest.trim()) {
      return json.digest.trim();
    }
  } catch {}

  // Fallback: direct digest string if it looks like a hash
  if (trimmed.length >= 32 && !trimmed.includes("{") && !trimmed.includes(" ")) {
    return trimmed;
  }

  return null;
}

export interface VerifyAndRecordOptions {
  digest: string;
  voiceId: string;
  expectedPayTo: string;
  minAmount?: bigint;
}

/**
 * Orchestrates verification and atomic record insertion:
 * 1. Reads the transaction from Tatum
 * 2. Runs pure verification checks (status, age, balance changes)
 * 3. Inserts into agent_payments table (rejecting replays on conflict)
 */
export async function verifyAndRecordPayment(opts: VerifyAndRecordOptions): Promise<PaymentVerificationResult> {
  const { digest, voiceId, expectedPayTo, minAmount = AGENT_PRICE_RAW } = opts;

  const tx = await readSuiTxWithBalanceChanges(digest);
  if (!tx) {
    return { valid: false, error: `Transaction ${digest} not found on chain`, digest };
  }

  // Ensure tx has digest
  if (!tx.digest) {
    tx.digest = digest;
  }

  const result = await verifyPaymentTx({
    tx,
    expectedPayTo,
    minAmount,
  });

  if (!result.valid) {
    return result;
  }

  // Insert first, reject on conflict
  const inserted = await insertAgentPayment({
    digest,
    voiceId,
    payer: result.payer || "unknown",
    amount: result.amount || minAmount,
  });

  if (!inserted) {
    return {
      valid: false,
      error: `Transaction digest ${digest} has already been used`,
      digest,
    };
  }

  return result;
}
