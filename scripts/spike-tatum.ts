const KEY = process.env.TATUM_API_KEY!;

async function rpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await res.text();
  return { http: res.status, body: text.slice(0, 300) };
}

console.log("SUI checkpoint:", await rpc("https://sui-mainnet.gateway.tatum.io", "sui_getLatestCheckpointSequenceNumber", []));
console.log("SUI gas price:", await rpc("https://sui-mainnet.gateway.tatum.io", "suix_getReferenceGasPrice", []));
console.log("POLYGON block:", await rpc("https://polygon-mainnet.gateway.tatum.io", "eth_blockNumber", []));
