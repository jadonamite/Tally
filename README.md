# Tally

Tally learns which tipsters to trust. You forward any call you are shown, Tally seals it before kickoff, and Walrus Memory keeps a credibility score for that voice that the app reads back every time they call again.

Live app: https://tally.namite.xyz

## How it works

You paste a tip from Telegram or X, or follow a Polymarket wallet. Tally calls each source a voice.

When you add a call, Tally hashes it and writes the hash into a Sui mainnet transaction before the market starts. It then reads that transaction back through Tatum, and the call only counts if the checkpoint time is earlier than the start. A call sealed late is kept and shown as late, and it is never graded.

At the start, Tally records the market price. When the market settles, it grades the call on two numbers: whether the voice got a better price than the market had at the start, and what $1 on the call would have returned. Win rate is not a score here, because backing 82¢ favourites wins four times in five and still loses money.

After every grade, Tally writes the voice's credibility score to Walrus Memory: how many sealed calls count, the average against the starting price, the return per $1, and the verdict. The app then recalls the newest credibility memory for each voice and uses that verdict to sort the feed, grey out voices that have not beaten the price, and suggest a stake for the ones that have. A voice with no credibility memory is shown as unproven.

Tally also remembers you. On any open call you can mark it as taken or passed. Each choice is a memory, and when the call is graded a second memory records how your choice turned out. The You tab recalls these and shows how following and passing has gone for each voice.

For sports markets, Tally sets the Polymarket price beside the bookmaker consensus (the median across bookmakers, with each bookmaker's margin removed) and flags the market when the two are 5 points or more apart.

## What lives where

Walrus Memory holds what Tally has learned: every call, every grade, every standing change, each voice's credibility score, and your own decisions. Each voice has its own namespace, and each memory's blob is linked from the screen that uses it.

Sui holds the seal. The checkpoint time is the evidence that a call existed before the start.

Postgres is the working index: it holds the rows the app sorts and joins, and each grade is computed there before it is written to memory.

## Where Tatum is used

Every Sui seal is read back through Tatum's Sui gateway to get its checkpoint, its timestamp and the hash inside it. The "Re-check the seal" button on a call page runs that read again live.

For Polymarket wallets, the trade's Polygon transaction is the seal. Tally reads its block time through Tatum's Polygon RPC (`eth_getTransactionByHash`, then `eth_getBlockByNumber`) and compares it with the market's start.

## See it on the live system

- A sealed call: https://tally.namite.xyz/app/call/c_c1ce2f7943a5ba3d
- Its seal on Sui, checkpoint 343288920, 5m 26s before the start: https://suiscan.xyz/mainnet/tx/CiLENPQ9LD4kMocSbrTgF3NMUgNANe1eW5G3mWo6HVs4
- Its call memory: https://walruscan.com/mainnet/blob/Dc_WXFpqO79Epl9d4GAzlJVhpT-6Ahrd67ypFdMuhCg
- Its grade memory: https://walruscan.com/mainnet/blob/vOy2M6HsAuH40JQ9jJJrYIDhSgutlJh-Fgj05HyfzBY
- A credibility memory the app reads its verdict from (SineNooneEI, 39 sealed calls): https://walruscan.com/mainnet/blob/_FNjtmp428xMICJjSVf_ztMJyxLiAv4hL2n5-S5rjpc
- The live count of memories on Walrus Mainnet: https://tally.namite.xyz/api/memory/stats

## Run it

Node.js 20 or newer.

```bash
git clone https://github.com/jadonamite/Tally.git
cd Tally
npm install
cp .env.example .env.local   # fill in the values below
npm run db:migrate
npm run dev
npm run sweep:loop           # locks, grades and writes memories every 20 seconds
npm test
```

## Configuration

| Variable | Read by | What it is |
|---|---|---|
| `DATABASE_URL` | `src/server/db.ts` | Neon Postgres pooled connection string |
| `TATUM_API_KEY` | `src/server/tatum.ts` | Tatum key for Sui and Polygon reads |
| `MEMWAL_ACCOUNT_ID` | `src/server/memory.ts` | Walrus Memory account object id |
| `MEMWAL_PRIVATE_KEY` | `src/server/memory.ts` | Walrus Memory delegate private key |
| `MEMWAL_SERVER_URL` | `src/server/memory.ts` | Walrus Memory relayer |
| `SUI_SEAL_PRIVATE_KEY` | `src/server/sui.ts` | Key of the address that pays for seals |
| `SUI_EXECUTE_VIA` | `src/server/sui.ts` | `tatum` or `public`: where seal transactions are sent |
| `TATUM_SUI_READ` | `src/server/tatum.ts` | `grpcweb` or `jsonrpc`: how seals are read back |
| `CRON_SECRET` | `src/app/api/cron/sweep/route.ts` | Bearer token for the scheduled sweep |
| `APP_URL` | `.github/workflows/sweep.yml` | Public URL the scheduled sweep calls |
| `EXAMPLE_USER_ID` | `src/server/views.ts`, `src/server/uid.ts` | Owner of the example board new visitors see |
| `OPERATOR_KEY` | `src/server/uid.ts`, `src/app/api/operator/route.ts` | Lets one browser act as the example board's owner |
| `ODDS_API_KEY` | `src/server/odds.ts` | The Odds API key; without it no bookmaker comparison is shown |

## Layout

- `src/app/`: pages and API routes
- `src/components/`: interface components
- `src/lib/core/`: grading, standing, stake sizing and odds matching, with tests in `test/`
- `src/server/`: Polymarket, Tatum, Sui, Walrus Memory, odds, capture, wallet import and the sweep
- `scripts/`: key generation, migration and sweep runners
- `db/`: schema

Interface built from Binary's components.
