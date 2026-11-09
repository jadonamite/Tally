const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

// 1. Search: which fields do event.markets carry?
const s = await (await fetch(`${GAMMA}/public-search?q=bitcoin&limit_per_type=3&events_status=active`)).json();
console.log("search event keys:", Object.keys(s.events?.[0] ?? {}));
console.log("search market keys:", Object.keys(s.events?.[0]?.markets?.[0] ?? {}));

// 2. Next 5-minute BTC window
const next = Math.floor(Date.now() / 1000 / 300) * 300 + 300;
const ev = await (await fetch(`${GAMMA}/events?slug=btc-updown-5m-${next}`)).json();
const m = ev[0]?.markets?.[0];
console.log("5m market:", m?.slug, "eventStartTime:", m?.eventStartTime, "endDate:", m?.endDate);
const tokens = JSON.parse(m.clobTokenIds);

// 3. Order book best ask for outcome 0
const book = await (await fetch(`${CLOB}/book?token_id=${tokens[0]}`)).json();
const asks = (book.asks ?? []).map((a: any) => Number(a.price));
console.log("best ask:", asks.length ? Math.min(...asks) : null);

// 4. Price history around 10 minutes ago
const t = Math.floor(Date.now() / 1000) - 600;
const h = await (await fetch(`${CLOB}/prices-history?market=${tokens[0]}&startTs=${t - 900}&endTs=${t}&fidelity=1`)).json();
console.log("history points:", h.history?.length, h.history?.slice(-2));

// 5. Wallet trades (v2)
const w = await (await fetch(`https://data-api.polymarket.com/v2/trades?user=0xadb4ce3b18984d24873784bab9af8e76f1f1bc39&limit=3`)).json();
console.log("trade keys:", Object.keys(w.data?.[0] ?? {}), "pagination:", w.pagination);

export {};

