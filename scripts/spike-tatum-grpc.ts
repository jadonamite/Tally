import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import * as grpc from "@grpc/grpc-js";

const transport = new GrpcTransport({
  host: "sui-mainnet-grpc.gateway.tatum.io:443",
  channelCredentials: grpc.credentials.createSsl(),
  meta: { "x-api-key": process.env.TATUM_API_KEY! },
});

const client = new SuiGrpcClient({
  network: "mainnet",
  transport,
});

const digest = process.argv[2];
if (!digest) {
  console.error("Usage: tsx scripts/spike-tatum-grpc.ts <digest>");
  process.exit(1);
}

const r = await client.getTransaction({ digest, include: { effects: true, transaction: true } });
console.log(JSON.stringify(r).slice(0, 600));
