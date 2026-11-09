# Tally

Tally shows you which tipsters actually beat the odds, graded on what they said before kickoff.

Live app: https://tally-markets.vercel.app

## How It Works

1. **Capture:** You forward or paste any call: a Telegram tip, an X post, or follow a Polymarket wallet.
2. **Seal on Sui:** Tally computes a canonical SHA-256 hash of the call and records a transaction on Sui mainnet before the market starts. The checkpoint timestamp proves the call existed before kickoff. For Polymarket wallets, the Polygon trade timestamp serves as the verified on-chain seal.
3. **Store in Walrus Memory:** Every sealed call, grade, and standing change is archived as an encrypted semantic memory in Walrus Memory.
4. **Grade against the price at kickoff:** When the event starts, Tally locks the market price at that exact second. When resolved, Tally grades the voice on two numbers: closing line value (did they beat the price at the start) and profit per dollar, never on raw win rate.

## Why It Is Built This Way

Win rate is a misleading metric in prediction markets. A caller who backs 82-cent heavy favourites can win 4 out of 5 calls (80% win rate) while yielding zero profit and negative closing value. Professional prediction scoring evaluates whether a caller consistently beats the closing market price before kickoff.

A database row can be backdated; a blockchain checkpoint cannot. Tally anchors every call commitment on Sui mainnet before the start so nobody can alter predictions after observing the outcome.

Grades and memory could live in a database; Walrus gives portable, encrypted, user-owned memory. The seal is the part a database can't do.

## Where Tatum Is Used

Tatum provides high-reliability blockchain RPC gateways:
- **Sui RPC:** Reads back seal transaction blocks to verify checkpoint timestamps and match call payload hashes on-chain.
- **Polygon RPC:** Verifies block timestamps for imported Polymarket wallet trades (`eth_getTransactionByHash`, `eth_getBlockByNumber`).

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

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection string |
| `TATUM_API_KEY` | Tatum API gateway key for Sui and Polygon RPC |
| `MEMWAL_ACCOUNT_ID` | Walrus Memory account object ID (`0x...`) |
| `MEMWAL_PRIVATE_KEY` | Walrus Memory delegate private key |
| `MEMWAL_SERVER_URL` | Walrus Memory relayer endpoint (`https://relayer.memory.walrus.xyz`) |
| `SUI_SEAL_PRIVATE_KEY` | Ed25519 private key funding Sui seal transactions |
| `SUI_EXECUTE_VIA` | `tatum` to execute through Tatum RPC or `public` for Sui fullnode |
| `TATUM_SUI_READ` | `jsonrpc` or `grpcweb` for reading transaction blocks |
| `CRON_SECRET` | Bearer token authenticating `/api/cron/sweep` triggers |
| `APP_URL` | Public application URL |

## Layout

- `src/app/` — Next.js App Router pages and API routes
- `src/components/tally/` — UI components (cards, sheets, age gate, legal layout)
- `src/lib/core/` — Pure arithmetic logic (grading, Kelly sizing, standings) and unit tests
- `src/lib/` — Formatting helpers, types, and API client
- `src/server/` — Server-only modules (database, Polymarket, Tatum, Sui, Walrus)
- `scripts/` — CLI tools for key generation, migrations, dependency checks, and sweep execution
- `db/` — Database schema definitions

---

Interface built from Binary's components.
