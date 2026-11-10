import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { sql } from "../src/server/db";
import { env } from "../src/server/env";
import { TATUM_SUI_JSONRPC } from "../src/server/tatum";
import { SUI_USDC_TYPE } from "../src/server/pay";

interface AcceptsClause {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  description?: string;
  resource?: string;
}

interface X402Response {
  x402Version: number;
  accepts: AcceptsClause[];
  error?: string;
}

/**
 * Invoke the record endpoint either via HTTP fetch (if a dev server is up)
 * or by directly invoking the Next.js route handler (next start-free execution).
 */
async function callEndpoint(
  baseUrl: string,
  voiceId: string,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  const url = `${baseUrl}/api/agent/voices/${voiceId}/record`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: headers || {},
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (err: any) {
    // If fetch failed due to connection refused or timeout, fall back to direct route invocation
    const isConnRefused =
      err?.code === "ECONNREFUSED" ||
      err?.cause?.code === "ECONNREFUSED" ||
      err?.message?.includes("fetch failed") ||
      err?.name === "TimeoutError";

    if (isConnRefused) {
      const { GET } = await import("../src/app/api/agent/voices/[id]/record/route");
      const request = new Request(url, {
        method: "GET",
        headers: headers || {},
      });
      const res = await GET(request, { params: Promise.resolve({ id: voiceId }) });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    }
    throw err;
  }
}

async function resolveVoiceId(requested?: string): Promise<string> {
  if (requested) return requested;

  try {
    const rows = (await sql()`
      select id from voices order by created_at desc limit 1
    `) as any[];
    if (rows.length && rows[0].id) {
      return rows[0].id;
    }
  } catch {}

  // Fallback default voice id
  return "v_7ef01b7f7493";
}

function loadSigner(isDry: boolean): Ed25519Keypair {
  const key = env.AGENT_CLIENT_KEY;
  if (key && key.trim()) {
    try {
      return Ed25519Keypair.fromSecretKey(key.trim());
    } catch (err: any) {
      console.warn(`Warning: Could not parse AGENT_CLIENT_KEY: ${err?.message || err}`);
    }
  }

  if (isDry) {
    // Ephemeral keypair for dry run simulation
    return new Ed25519Keypair();
  }

  throw new Error("AGENT_CLIENT_KEY environment variable is required to sign and broadcast live payments.");
}

async function main() {
  const args = process.argv.slice(2);
  const isDry = args.includes("--dry");
  const voiceIdx = args.indexOf("--voice");
  const requestedVoice = voiceIdx !== -1 && args[voiceIdx + 1] ? args[voiceIdx + 1] : undefined;
  const urlIdx = args.indexOf("--url");
  const baseUrl = (urlIdx !== -1 && args[urlIdx + 1]) || "http://localhost:3000";

  const voiceId = await resolveVoiceId(requestedVoice);
  console.log(`Querying voice record for: ${voiceId}`);

  // Step 1: Initial request with no payment -> expect HTTP 402
  console.log(`Sending GET /api/agent/voices/${voiceId}/record (unpaid)...`);
  const initial = await callEndpoint(baseUrl, voiceId);

  console.log(`HTTP ${initial.status} Response:`);
  console.log(JSON.stringify(initial.data, null, 2));

  if (initial.status !== 402) {
    console.error(`Expected HTTP 402 Payment Required, got HTTP ${initial.status}`);
    process.exit(1);
  }

  const x402 = initial.data as X402Response;
  const accepts = x402?.accepts?.[0];
  if (!accepts) {
    console.error("Malformed 402 response: missing accepts specification");
    process.exit(1);
  }

  console.log("\nPayment Requirements Received:");
  console.log(`  Network:  ${accepts.network}`);
  console.log(`  Asset:    ${accepts.asset}`);
  console.log(`  Pay To:   ${accepts.payTo}`);
  console.log(`  Amount:   ${accepts.maxAmountRequired} raw units ($0.01 USDC)`);

  // Step 2: Build USDC transfer transaction with @mysten/sui
  const signer = loadSigner(isDry);
  const senderAddress = signer.toSuiAddress();
  const amount = BigInt(accepts.maxAmountRequired || "10000");
  const asset = accepts.asset || SUI_USDC_TYPE;
  const payTo = accepts.payTo;

  const tx = new Transaction();
  const coin = tx.add(coinWithBalance({ balance: amount, type: asset }));
  tx.transferObjects([coin], payTo);
  tx.setSender(senderAddress);

  if (isDry) {
    console.log("\n[--dry mode] Payment transaction constructed successfully:");
    console.log(`  Sender:    ${senderAddress}`);
    console.log(`  Recipient: ${payTo}`);
    console.log(`  Coin Type: ${asset}`);
    console.log(`  Amount:    ${amount.toString()} units ($0.01 USDC)`);
    console.log("  Commands:", JSON.stringify(tx.getData().commands, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    console.log("\nDry run completed. Stopping before chain submission as requested.");
    process.exit(0);
  }

  // Live payment execution
  console.log(`\nSigning and broadcasting live payment from ${senderAddress}...`);
  const client = new SuiGrpcClient({ network: "mainnet", baseUrl: "https://fullnode.mainnet.sui.io:443" });
  const r = (await client.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true } })) as any;
  if (r.FailedTransaction) throw new Error(`Payment rejected: ${JSON.stringify(r.FailedTransaction.status)}`);
  const digest = (r.Transaction ?? r).digest as string;
  // The server reads the payment through Tatum; give the checkpoint a moment to land there.
  await new Promise((res) => setTimeout(res, 6000));
  console.log(`Payment confirmed on Sui mainnet. Digest: ${digest}`);

  // Step 3: Retry request with X-PAYMENT header
  const xPaymentPayload = Buffer.from(JSON.stringify({ digest })).toString("base64");
  console.log(`Retrying GET with X-PAYMENT header (${digest})...`);

  const paid = await callEndpoint(baseUrl, voiceId, {
    "X-PAYMENT": xPaymentPayload,
  });

  console.log(`\nHTTP ${paid.status} Response:`);
  console.log(JSON.stringify(paid.data, null, 2));

  if (paid.status !== 200) {
    console.error(`Paid request failed with status HTTP ${paid.status}`);
    process.exit(1);
  }

  console.log("\nSealed voice record received successfully.");
}

main().catch((err) => {
  console.error("Fatal error in agent-client:", err);
  process.exit(1);
});
