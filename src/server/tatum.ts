import { SuiGrpcClient } from "@mysten/sui/grpc";
import { env } from "./env";

export const TATUM_SUI_JSONRPC = "https://sui-mainnet.gateway.tatum.io";
const TATUM_SUI_GRPC_HOST = "sui-mainnet-grpc.gateway.tatum.io:443";
const TATUM_POLYGON = "https://polygon-mainnet.gateway.tatum.io";

// Free plan is 3 requests per second. Space calls 350 ms apart within one process.
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 350;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.TATUM_API_KEY },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }
    const j = (await res.json()) as { result?: T; error?: { message: string } };
    if (j.error) throw new Error(`Tatum ${method}: ${j.error.message}`);
    if (!res.ok) throw new Error(`Tatum ${method}: HTTP ${res.status}`);
    return j.result as T;
  }
  throw new Error(`Tatum ${method}: 429 rate limit exceeded`);
}

/** Block time of a Polygon transaction, read through Tatum. Null if not found. */
export async function polygonTxTime(txHash: string): Promise<{ block: number; timestampMs: number } | null> {
  const tx = await rpc<{ blockNumber: string | null } | null>(TATUM_POLYGON, "eth_getTransactionByHash", [txHash]);
  if (!tx?.blockNumber) return null;
  const block = await rpc<{ timestamp: string }>(TATUM_POLYGON, "eth_getBlockByNumber", [tx.blockNumber, false]);
  return { block: parseInt(tx.blockNumber, 16), timestampMs: parseInt(block.timestamp, 16) * 1000 };
}

export interface SuiTxRead {
  success: boolean;
  timestampMs: number | null;
  checkpoint: string | null;
  payload: string; // everything readable from the inputs, for memo matching
}

/** Read a Sui transaction through Tatum: status, checkpoint time and inputs. */
export async function suiTxRead(digest: string): Promise<SuiTxRead> {
  if (env.TATUM_SUI_READ === "grpcweb") {
    await throttle();
    const { GrpcTransport } = await import("@protobuf-ts/grpc-transport");
    const grpc = await import("@grpc/grpc-js");
    const transport = new GrpcTransport({
      host: TATUM_SUI_GRPC_HOST,
      channelCredentials: grpc.credentials.createSsl(),
      meta: { "x-api-key": env.TATUM_API_KEY },
    });
    const client = new SuiGrpcClient({ network: "mainnet", transport });
    const r = (await client.getTransaction({ digest, include: { effects: true, transaction: true } })) as any;
    const t = r.Transaction ?? r;
    const inputs = t.transaction?.inputs ?? [];
    const decoded = inputs
      .map((i: any) => (i?.Pure?.bytes ? Buffer.from(i.Pure.bytes, "base64").toString("utf8") : ""))
      .join("|");
    return {
      success: t.status?.success === true,
      timestampMs: t.timestampMs ? Number(t.timestampMs) : null,
      checkpoint: t.checkpoint ? String(t.checkpoint) : null,
      payload: decoded + "|" + JSON.stringify(inputs),
    };
  }
  const r = await rpc<any>(TATUM_SUI_JSONRPC, "sui_getTransactionBlock", [digest, { showInput: true, showEffects: true }]);
  const inputs = r?.transaction?.data?.transaction?.inputs ?? [];
  const decoded = inputs
    .map((x: any) => (Array.isArray(x.value) ? Buffer.from(x.value).toString("utf8") : String(x.value ?? "")))
    .join("|");
  return {
    success: r?.effects?.status?.status === "success",
    timestampMs: r?.timestampMs ? Number(r.timestampMs) : null,
    checkpoint: r?.checkpoint ? String(r.checkpoint) : null,
    payload: decoded + "|" + JSON.stringify(inputs),
  };
}
