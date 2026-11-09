# Tally

Tally shows you which tipsters actually beat the odds, graded on what they said before kickoff.

Live app: https://tally.namite.xyz

## How It Works

1. **Capture:** You forward or paste any call: a Telegram tip, an X post, or follow a Polymarket wallet.
2. **Seal on Sui:** Tally computes a canonical SHA-256 hash of the call and records a transaction on Sui mainnet before the market starts. The checkpoint timestamp proves the call existed before kickoff. For Polymarket wallets, the Polygon trade timestamp is the verified on-chain seal.
3. **Store in Walrus Memory:** Every sealed call, grade, and standing change is archived as an encrypted semantic memory in Walrus Memory.
4. **Grade against the price at kickoff:** When the event starts, Tally locks the market price at that exact second. When resolved, Tally grades the voice on two numbers: closing line value (did they beat the price at the start) and profit per dollar, never on raw win rate.

## Proof

A verified call from the live system:
- Call page: https://tally.namite.xyz/app/call/c_c1ce2f7943a5ba3d
- Sui seal: https://suiscan.xyz/mainnet/tx/CiLENPQ9LD4kMocSbrTgF3NMUgNANe1eW5G3mWo6HVs4 (checkpoint 343288920, sealed 5m 26s before market kickoff)
- Walrus call memory: https://walruscan.com/mainnet/blob/Dc_WXFpqO79Epl9d4GAzlJVhpT-6Ahrd67ypFdMuhCg
- Walrus grade memory: https://walruscan.com/mainnet/blob/vOy2M6HsAuH40JQ9jJJrYIDhSgutlJh-Fgj05HyfzBY

## Why It Is Built This Way

Win rate is a misleading metric in prediction markets. A caller who backs 82-cent heavy favourites can win 4 out of 5 calls (80% win rate) while yielding zero profit and negative closing value. Professional prediction scoring evaluates whether a caller consistently beats the closing market price before kickoff.

A database row can be backdated; a blockchain checkpoint cannot. Tally anchors every call commitment on Sui mainnet before the start so nobody can alter predictions after observing the outcome.

Grades and memory could live in a database; Walrus gives portable, encrypted, user-owned memory. The seal is the part a database can't do.

## Where Tatum Is Used

Tatum provides high-reliability blockchain RPC gateways:
- Sui seal read-back: reads back seal transaction blocks via Tatum Sui gRPC to verify checkpoint timestamps and match call payload hashes on chain.
- Polygon trade times: verifies block timestamps for imported Polymarket wallet trades (`eth_getTransactionByHash`).

## Run It

Prerequisites: Node.js 20+ (Node 24 recommended), npm.

```bash
# Clone and install dependencies
git clone https://github.com/jadonamite/Tally.git
cd Tally
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npm run db:migrate

# Start local development server
npm run dev

# Run automated background sweep loop
npm run sweep:loop
```

Run test suite:

```bash
npm test
```

## Configuration

| Variable | Read By | Description |
|---|---|---|
| `DATABASE_URL` | `src/server/db.ts` | Neon Postgres pooled connection string |
| `TATUM_API_KEY` | `src/server/tatum.ts` | Tatum API gateway key for Sui and Polygon RPC |
| `MEMWAL_ACCOUNT_ID` | `src/server/memory.ts` | Walrus Memory account object ID |
| `MEMWAL_PRIVATE_KEY` | `src/server/memory.ts` | Walrus Memory delegate private key |
| `MEMWAL_SERVER_URL` | `src/server/memory.ts` | Walrus Memory relayer endpoint |
| `SUI_SEAL_PRIVATE_KEY` | `src/server/sui.ts` | Ed25519 private key funding Sui seal transactions |
| `SUI_EXECUTE_VIA` | `src/server/sui.ts` | `tatum` to execute through Tatum RPC or `public` for Sui fullnode |
| `TATUM_SUI_READ` | `src/server/tatum.ts` | `jsonrpc` or `grpcweb` for reading transaction blocks |
| `CRON_SECRET` | `src/app/api/cron/sweep/route.ts` | Bearer token authenticating `/api/cron/sweep` triggers |
| `APP_URL` | `.github/workflows/sweep.yml` | Public application URL |

## Layout

- `src/app/`: Next.js App Router pages and API routes
- `src/components/tally/`: UI components (cards, sheets, age gate, legal layout)
- `src/lib/core/`: Pure arithmetic logic (grading, Kelly sizing, standings) and unit tests
- `src/lib/`: Formatting helpers, types, and API client
- `src/server/`: Server-only modules (database, Polymarket, Tatum, Sui, Walrus)
- `scripts/`: CLI tools for key generation, migrations, dependency checks, and sweep execution
- `db/`: Database schema definitions

---

Interface built from Binary's components.
