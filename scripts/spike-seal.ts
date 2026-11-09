import { createHash } from "node:crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiJsonRpcClient, JsonRpcHTTPTransport } from "@mysten/sui/jsonRpc";

const KEY = process.env.TATUM_API_KEY!;
const kp = Ed25519Keypair.fromSecretKey(process.env.SUI_SEAL_PRIVATE_KEY!);
const hash = createHash("sha256").update("spike " + Date.now()).digest("hex");
const memo = `tally:v1:${hash}`;

const tx = new Transaction();
tx.moveCall({ target: "0x1::string::utf8", arguments: [tx.pure.vector("u8", Array.from(Buffer.from(memo, "utf8")))] });
tx.setSender(kp.toSuiAddress());
tx.setGasBudget(5_000_000);

let digest: string;
if (process.env.SUI_EXECUTE_VIA === "public") {
  const client = new SuiGrpcClient({ network: "mainnet", baseUrl: "https://fullnode.mainnet.sui.io:443" });
  const r = (await client.signAndExecuteTransaction({ transaction: tx, signer: kp, include: { effects: true } })) as any;
  const t = r.Transaction ?? r.FailedTransaction ?? r;
  console.log("execute (public gRPC):", JSON.stringify(t.status));
  digest = t.digest;
} else {
  const client = new SuiJsonRpcClient({
    network: "mainnet",
    transport: new JsonRpcHTTPTransport({ url: "https://sui-mainnet.gateway.tatum.io", rpc: { headers: { "x-api-key": KEY } } }),
  });
  const r = await client.signAndExecuteTransaction({ transaction: tx, signer: kp, options: { showEffects: true } });
  console.log("execute (Tatum JSON-RPC):", r.effects?.status);
  digest = r.digest;
}

console.log("digest:", digest, "memo:", memo);

// Read back through Tatum, polling for the checkpoint timestamp.
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  if (process.env.TATUM_SUI_READ === "grpcweb") {
    try {
      const { GrpcTransport } = await import("@protobuf-ts/grpc-transport");
      const grpc = await import("@grpc/grpc-js");
      const transport = new GrpcTransport({
        host: "sui-mainnet-grpc.gateway.tatum.io:443",
        channelCredentials: grpc.credentials.createSsl(),
        meta: { "x-api-key": KEY },
      });
      const client = new SuiGrpcClient({ network: "mainnet", transport });
      const r = (await client.getTransaction({ digest, include: { effects: true, transaction: true } })) as any;
      const t = r.Transaction ?? r;
      if (t.timestampMs) {
        const inputs = t.transaction?.inputs ?? [];
        const decoded = inputs
          .map((item: any) => (item?.Pure?.bytes ? Buffer.from(item.Pure.bytes, "base64").toString("utf8") : ""))
          .join("|");
        console.log("timestampMs:", t.timestampMs, new Date(Number(t.timestampMs)).toISOString());
        console.log("checkpoint:", t.checkpoint, "status:", t.status?.success ? "success" : "failure");
        console.log("memo found in inputs:", decoded.includes(hash));
        process.exit(0);
      }
    } catch {}
  } else {
    const res = await fetch("https://sui-mainnet.gateway.tatum.io", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sui_getTransactionBlock", params: [digest, { showInput: true, showEffects: true }] }),
    });
    const j = await res.json();
    if (j.result?.timestampMs) {
      const inputs = JSON.stringify(j.result.transaction?.data?.transaction?.inputs ?? []);
      const bytes = (j.result.transaction?.data?.transaction?.inputs ?? [])
        .map((x: any) => (Array.isArray(x.value) ? Buffer.from(x.value).toString("utf8") : String(x.value ?? "")))
        .join("|");
      console.log("timestampMs:", j.result.timestampMs, new Date(Number(j.result.timestampMs)).toISOString());
      console.log("checkpoint:", j.result.checkpoint, "status:", j.result.effects?.status?.status);
      console.log("memo found in inputs:", inputs.includes(hash) || bytes.includes(hash));
      process.exit(0);
    }
  }
}
console.log("no timestamp after 30s");
