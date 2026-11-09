import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiJsonRpcClient, JsonRpcHTTPTransport } from "@mysten/sui/jsonRpc";
import { env } from "./env";
import { suiTxRead, TATUM_SUI_JSONRPC, type SuiTxRead } from "./tatum";

export const memoFor = (hash: string) => `tally:v1:${hash}`;

function keypair() {
  return Ed25519Keypair.fromSecretKey(env.SUI_SEAL_PRIVATE_KEY);
}

export function sealAddress(): string {
  return keypair().toSuiAddress();
}

/** Send one seal transaction. Returns its digest. Throws if the chain rejects it. */
export async function sealOnSui(hash: string): Promise<string> {
  const kp = keypair();
  const tx = new Transaction();
  tx.moveCall({
    target: "0x1::string::utf8",
    arguments: [tx.pure.vector("u8", Array.from(Buffer.from(memoFor(hash), "utf8")))],
  });
  tx.setSender(kp.toSuiAddress());
  tx.setGasBudget(5_000_000);

  if (env.SUI_EXECUTE_VIA === "tatum") {
    const client = new SuiJsonRpcClient({
      network: "mainnet",
      transport: new JsonRpcHTTPTransport({ url: TATUM_SUI_JSONRPC, rpc: { headers: { "x-api-key": env.TATUM_API_KEY } } }),
    });
    const r = await client.signAndExecuteTransaction({ transaction: tx, signer: kp, options: { showEffects: true } });
    if (r.effects?.status.status !== "success") throw new Error(`Seal rejected: ${r.effects?.status.error ?? "unknown"}`);
    return r.digest;
  }

  const client = new SuiGrpcClient({ network: "mainnet", baseUrl: "https://fullnode.mainnet.sui.io:443" });
  const r = (await client.signAndExecuteTransaction({ transaction: tx, signer: kp, include: { effects: true } })) as any;
  if (r.FailedTransaction) throw new Error(`Seal rejected: ${JSON.stringify(r.FailedTransaction.status)}`);
  const t = r.Transaction ?? r;
  return t.digest as string;
}

/** Poll Tatum until the seal has a checkpoint time, up to `maxMs`. */
export async function waitForSeal(digest: string, maxMs = 24_000): Promise<SuiTxRead | null> {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const read = await suiTxRead(digest);
      if (read.timestampMs) return read;
    } catch {}
  }
  return null;
}
