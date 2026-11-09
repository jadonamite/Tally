import Link from "next/link";
import { LandingNav } from "@/components/site/nav";
import { ReceiptTiles } from "@/components/site/receipt-tiles";
import { SiteFooter } from "@/components/site/footer";

export const metadata = {
  title: "Tally — Every call on record. Graded at kickoff.",
  description:
    "The cryptographic record for sports and prediction markets. Sealed on Sui, archived to Walrus Memory, verified via Tatum gRPC.",
};

export default function Home() {
  return (
    <>
      <LandingNav />

      <div className="act-light dotgrid dotgrid-light overflow-x-clip">
        <Hero />
      </div>

      <div className="dotgrid dotgrid-dark bg-plane">
        <Callers />
        <Proof />
        <HowItWorks />
        <Close />
        <SiteFooter />
      </div>
    </>
  );
}

/* ── Light band ───────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative mx-auto min-h-[42rem] w-full max-w-7xl overflow-hidden px-6 pb-32 pt-28 sm:min-h-[40rem] sm:px-10 sm:pb-36 sm:pt-6 lg:min-h-[44rem] lg:overflow-visible lg:pb-44">
      <ReceiptTiles />

      <div className="relative z-10 mx-auto max-w-[19rem] text-center sm:max-w-md lg:max-w-2xl">
        <h1 className="mx-auto text-[clamp(2.2rem,6.4vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink lg:leading-[0.98]">
          Every call on record.
          <br />
          Graded at kickoff.
        </h1>

        <p className="mx-auto mt-7 max-w-[27rem] text-[13px] leading-[1.65] text-ink-2">
          The cryptographic record for sports and prediction markets. We lock the price at
          kickoff and seal the receipt on Sui. Beat the closing line and you make the board.
          Miss it and you get benched.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-plane transition-opacity hover:opacity-85"
          >
            Open the app
          </Link>
          <a
            href="#callers"
            className="rounded-full border border-edge px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            See live callers
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Dark band ────────────────────────────────────────────────────────────────────── */

function Band({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">{children}</p>
  );
}

function Heading({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <h2
      className={`mt-5 max-w-3xl text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-[1.03] tracking-[-0.03em] ${
        centered ? "mx-auto text-center" : ""
      }`}
    >
      {children}
    </h2>
  );
}

const FEATURED = [
  {
    name: "SineNooneEI",
    ground: "bg-tile-vermillion",
    status: "Earned",
    metric: "+$0.19",
    metricLabel: "profit per $1",
    sub: "+0.05¢ vs price · 24 won, 15 lost",
    summary: "Consistently beats the closing line across 39 graded calls. Sized with half-Kelly stakes.",
    href: "/app/voice/v_38337de21ff0bb0a",
  },
  {
    name: "Crypto Signals",
    ground: "bg-tile-indigo",
    status: "Sui sealed",
    metric: "9 of 9",
    metricLabel: "graded calls",
    sub: "Bitcoin 5m Up/Down · Checkpoint 343308226",
    summary: "Sealed on Sui mainnet 2m 29s before lock. Verified through Tatum native gRPC.",
    href: "/app/call/c_c1ce2f7943a5ba3d",
  },
  {
    name: "Alpha Trader",
    ground: "bg-tile-chartreuse",
    status: "Benched",
    metric: "-$0.40",
    metricLabel: "loss per $1",
    sub: "-5.0¢ line drag · 7 won, 7 lost",
    summary: "Balanced 50% split on 14 calls, but net negative on high-stake positions. Dimmed in the feed.",
    href: "/app/voice/v_92f1c3ef799e381b",
  },
];

function Callers() {
  return (
    <Band id="callers">
      <Eyebrow>Live on the board</Eyebrow>
      <Heading>Three callers on record right now.</Heading>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {FEATURED.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex flex-col overflow-hidden rounded-[22px] border border-rule bg-surface transition-colors hover:border-edge"
          >
            <div className={`relative aspect-[16/10] ${item.ground} p-6 flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white/90">
                  {item.name}
                </span>
                <span className="rounded-full bg-black/25 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  {item.status}
                </span>
              </div>
              <div>
                <p className="font-mono text-4xl font-semibold tabular-nums text-white">
                  {item.metric}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/75 mt-1">
                  {item.metricLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6">
              <p className="font-mono text-xs text-ink-3 tabular-nums">{item.sub}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{item.summary}</p>
              <p className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent group-hover:underline">
                View verified history
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Band>
  );
}

function Proof() {
  return (
    <Band id="proof">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>Where the receipts live</Eyebrow>
          <Heading>Sui Mainnet. Walrus Memory. Tatum gRPC.</Heading>
          <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-2">
            Sub-second verification meets permanent decentralized storage. Every call is
            hashed and committed to Sui mainnet before kickoff, archived to Walrus Memory,
            and queried through Tatum gRPC.
          </p>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-2">
            Over 350 calls and grades sit live on Walrus Memory right now. Anyone can
            audit them with natural language or inspect the raw block sequence on Sui scan.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/app"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-plane transition-opacity hover:opacity-85"
            >
              Explore the board
            </Link>
            <Link
              href="/app/call/c_c1ce2f7943a5ba3d"
              className="rounded-full border border-edge px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              Inspect live receipt
            </Link>
          </div>
        </div>

        <div className="rounded-[26px] border border-rule bg-surface p-6 font-mono text-xs sm:p-8">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <span className="text-[11px] uppercase tracking-wider text-ink-3">Live On-Chain Seal</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              CONFIRMED
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            <div className="flex justify-between border-b border-rule/50 pb-2.5">
              <span className="text-ink-3">Market</span>
              <span className="text-right text-ink font-medium">Bitcoin 5m Up/Down</span>
            </div>
            <div className="flex justify-between border-b border-rule/50 pb-2.5">
              <span className="text-ink-3">Network</span>
              <span className="text-right text-accent font-medium">Sui Mainnet</span>
            </div>
            <div className="flex justify-between border-b border-rule/50 pb-2.5">
              <span className="text-ink-3">Checkpoint</span>
              <span className="text-right text-ink tabular-nums">343308226</span>
            </div>
            <div className="flex justify-between border-b border-rule/50 pb-2.5">
              <span className="text-ink-3">Kickoff Timing</span>
              <span className="text-right text-emerald-400 font-medium">Sealed 2m 29s early</span>
            </div>
            <div className="flex justify-between border-b border-rule/50 pb-2.5">
              <span className="text-ink-3">Read Node</span>
              <span className="text-right text-ink">Tatum Native gRPC</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-ink-3">Walrus Blob</span>
              <span className="text-right text-accent truncate max-w-[180px]">MK7SylYh6Pc6t3qP</span>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}

const STEPS = [
  {
    title: "Capture anywhere",
    body: "Forward a Telegram tip, drop a link from X, or track any on-chain wallet. Tally pulls the prediction and timestamps it immediately.",
  },
  {
    title: "Sealed on Sui",
    body: "A SHA-256 hash commits to Sui mainnet before kickoff. Tatum gRPC confirms the block checkpoint before the market locks.",
  },
  {
    title: "Walrus Memory",
    body: "Every call and grade archives into decentralized memory. Natural language recall lets anyone audit a caller's full history.",
  },
  {
    title: "Closing line edge",
    body: "Graded strictly against the kickoff price and net profit per dollar. Callers with real edge earn half-Kelly stake suggestions.",
  },
];

function HowItWorks() {
  return (
    <Band id="how">
      <Eyebrow>How it works</Eyebrow>
      <Heading>One prediction, sealed early, settled on the numbers.</Heading>

      <ol className="mt-12 grid gap-10 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t border-edge pt-6">
            <p className="font-mono text-[11px] tabular-nums tracking-[0.2em] text-accent">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function Close() {
  return (
    <Band>
      <div className="rounded-[28px] border border-rule bg-surface p-10 text-center sm:p-16">
        <Heading centered>Check any record right now.</Heading>
        <p className="mx-auto mt-5 max-w-prose text-base leading-relaxed text-ink-2">
          Over 350 cryptographic receipts on Sui mainnet and Walrus Memory. Free to query,
          impossible to fake.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-block rounded-full bg-ink px-8 py-3.5 text-sm font-medium text-plane transition-opacity hover:opacity-85"
        >
          Open the app
        </Link>
      </div>
    </Band>
  );
}
