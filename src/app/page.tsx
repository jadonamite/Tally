import Link from "next/link";
import { NavBar } from "@/components/site/nav-bar";
import { AppFooter } from "@/components/site/app-footer";
import { HeroStage } from "@/components/landing/hero-stage";

export const revalidate = 60;

const NAV = [
  { href: "/app", label: "Board" },
  { href: "/#scoreboard", label: "Scoreboard" },
  { href: "/#edge", label: "The Edge" },
  { href: "/#proof", label: "Receipts" },
];

const TOP_VOICES = [
  {
    id: "v_38337de21ff0bb0a",
    name: "SineNooneEI",
    summary: "39 graded calls · +0.05¢ vs price · 24 won, 15 lost",
    standing: "Earned",
    metric: "+$0.19",
    metricSub: "per $1 staked",
    score: 0.82,
    control: false,
  },
  {
    id: "v_crypto",
    name: "Crypto Signals",
    summary: "9 graded calls · Bitcoin 5m · Checkpoint 343308226",
    standing: "Sui Sealed",
    metric: "9 of 9",
    metricSub: "sealed early",
    score: 0.55,
    control: false,
  },
  {
    id: "v_92f1c3ef799e381b",
    name: "Alpha Trader",
    summary: "14 graded calls · -5.0¢ line drag · 7 won, 7 lost",
    standing: "Benched",
    metric: "-$0.40",
    metricSub: "loss per $1",
    score: 0.18,
    control: true,
  },
];

export default function Landing() {
  return (
    <div className="dotgrid dotgrid-dark flex min-h-screen flex-col bg-plane text-ink">
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto w-full max-w-5xl">
          <NavBar
            links={NAV}
            surface="pill"
            action={
              <Link
                href="/app"
                className="hidden min-h-[44px] items-center rounded-full bg-lime px-5 text-sm font-medium text-[#0d0d0d] sm:inline-flex"
              >
                Open the board
              </Link>
            }
          />
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 pt-6 sm:pt-10">
          <HeroStage />
          <div className="mx-auto -mt-[2vw] max-w-2xl px-2 text-center">
            <h1 className="text-[clamp(1.75rem,3.8vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
              Grade every market caller before kickoff. Sized with real edge.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Anyone can claim a winning streak after the final whistle. Tally seals every call on
              Sui mainnet before the start, anchors it into Walrus Memory, and holds every voice to
              mathematical proof.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="inline-flex min-h-[48px] items-center rounded-full bg-lime px-7 font-medium text-[#0d0d0d] transition-opacity hover:opacity-90"
              >
                See who&apos;s earned
              </Link>
              <Link
                href="/app"
                className="inline-flex min-h-[48px] items-center rounded-full border border-edge px-7 font-medium hover:border-ink-3 transition-colors"
              >
                Live calls
              </Link>
            </div>
          </div>
        </section>

        {/* Band 1: The Scoreboard */}
        <Band id="scoreboard">
          <Kicker>The scoreboard</Kicker>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Every caller, scored on the events that already happened.
          </h2>
          <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-ink-2">
            Backing heavy favourites at 80 cents looks like an 80% win rate while bleeding money every
            week. Tally grades closing line value and net profit per dollar, call after call, so
            you see exactly who beats the price.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            {TOP_VOICES.map((s, i) => (
              <Link
                key={s.id}
                href={s.id.startsWith("v_") ? `/app/voice/${s.id}` : "/app"}
                className="grid min-h-[68px] grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-rule px-5 last:border-b-0 hover:bg-surface-raised sm:grid-cols-[2.5rem_1.4fr_9rem_8rem] sm:px-7 transition-colors"
              >
                <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                        s.standing === "Earned"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : s.standing === "Sui Sealed"
                            ? "bg-lime/15 text-lime"
                            : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {s.standing}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-ink-3 mt-0.5">{s.summary}</span>
                </span>
                <span className="hidden sm:block">
                  <Meter value={s.score} control={s.control} />
                </span>
                <span className={`text-right font-mono tnum ${s.control ? "text-ink-3" : "text-ink"}`}>
                  <span className="font-semibold">{s.metric}</span>
                  <span className="block text-[10px] text-ink-3">{s.metricSub}</span>
                </span>
              </Link>
            ))}
          </div>
        </Band>

        {/* Band 2: The Kickoff Edge */}
        <Band id="edge">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.25fr]">
            <div>
              <Kicker>The kickoff edge</Kicker>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                Markets close. The cryptographic seal doesn&apos;t.
              </h2>
              <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-ink-2">
                Every prediction commits a SHA-256 digest to Sui mainnet before the market locks.
                Tatum gRPC confirms the block checkpoint before kickoff, locking the time and price
                in stone.
              </p>
              <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-ink-2">
                When the market settles, Tally pulls the kickoff line. Callers who consistently beat
                the closing line print real mathematical profit. Those who don&apos;t get benched.
              </p>
            </div>
            <SealTape />
          </div>
        </Band>

        {/* Band 3: The Size */}
        <Band id="size">
          <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
            <FlowBars />
            <div>
              <Kicker>The size</Kicker>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                A great call, sized for mathematical edge.
              </h2>
              <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-ink-2">
                A voice with edge shouldn&apos;t bet the house, and a voice without edge shouldn&apos;t
                bet a cent. Tally runs half-Kelly sizing on every earned caller, capped at 2% of
                bankroll, so you harvest the edge without blowing up.
              </p>
              <Link
                href="/app"
                className="mt-8 inline-flex min-h-[48px] items-center rounded-full border border-edge px-6 font-medium hover:border-ink-3 transition-colors"
              >
                Size a call
              </Link>
            </div>
          </div>
        </Band>

        {/* Band 4: Built for Truth */}
        <Band id="proof">
          <Kicker>Built for verification</Kicker>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Ask anything. Inspect every receipt on chain.
          </h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <p className="max-w-prose text-[17px] leading-relaxed text-ink-2">
              Every call and grade archives into Walrus Memory as decentralized blobs. Anyone can query
              a voice&apos;s history using natural language, or verify the exact SHA-256 seal on Sui
              through Tatum gRPC.
            </p>
            <p className="max-w-prose text-[17px] leading-relaxed text-ink-2">
              Over 350 calls and grades sit on Walrus right now. No deleted tweets, no edited
              spreadsheets, no post-game excuses. Just unalterable cryptographic truth.
            </p>
          </div>

          <pre className="mt-10 overflow-x-auto rounded-2xl border border-rule bg-surface p-6 font-mono text-[13px] leading-relaxed text-ink-2">
            <span className="text-ink-3">GET</span> <span className="text-ink">/api/calls/c_c1ce2f7943a5ba3d/verify</span>
            {"\n\n"}
            {"{\n"}
            {"  "}<span className="text-lime">&quot;hashMatches&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;memoOnChain&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;beforeStart&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;checkpoint&quot;</span>{": 343308226,\n"}
            {"  "}<span className="text-lime">&quot;readVia&quot;</span>{": \"Tatum Sui gRPC\"\n"}
            {"}"}
          </pre>
        </Band>

        {/* Closing Callout Stage */}
        <section className="relative overflow-hidden px-4 py-28 text-center sm:py-36">
          <p
            aria-hidden
            className="stage stage-word stage-word-ghost pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center opacity-80"
          >
            Tally
          </p>
          <div className="relative">
            <h2 className="text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1] tracking-[-0.04em]">
              Kickoff is already locked.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/app"
                className="inline-flex min-h-[48px] items-center rounded-full bg-lime px-7 font-medium text-[#0d0d0d] transition-opacity hover:opacity-90"
              >
                See who&apos;s earned
              </Link>
              <Link
                href="/app"
                className="inline-flex min-h-[48px] items-center rounded-full border border-edge px-7 font-medium hover:border-ink-3 transition-colors"
              >
                Open the board
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

function Band({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-5xl px-6">{children}</div>
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">{children}</p>;
}

function Meter({ value, control }: { value: number; control?: boolean }) {
  const w = Math.max(0.04, Math.min(1, value));
  return (
    <span className="block h-1.5 w-full rounded-full bg-rule">
      <span
        className={`block h-full rounded-full ${control ? "bg-ink-3" : "bg-lime"}`}
        style={{ width: `${w * 100}%` }}
      />
    </span>
  );
}

/** Graphic showing a sealed call ahead of the kickoff lock and final settlement. */
function SealTape() {
  const W = 720;
  const H = 340;
  const pad = { l: 20, r: 20, t: 36, b: 50 };

  return (
    <figure className="rounded-2xl border border-rule bg-surface p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sui seal kickoff line chart">
        <defs>
          <pattern id="seal-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.9" fill="rgba(196, 242, 48, 0.22)" />
          </pattern>
        </defs>

        <rect x={pad.l} y={pad.t - 16} width={340} height={H - pad.t - pad.b + 16} fill="url(#seal-dots)" />
        <line x1={pad.l} x2={W - pad.r} y1={170} y2={170} stroke="var(--ink-3)" strokeDasharray="3 5" />
        <text x={pad.l + 6} y={160} fill="var(--ink-3)" fontSize="13" fontFamily="var(--font-mono)">
          Entry price 40¢
        </text>

        <polyline
          points="20,210 100,195 200,185 360,150 480,120 600,90 700,60"
          fill="none"
          stroke="var(--lime)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        <line x1={360} x2={360} y1={pad.t - 16} y2={H - pad.b} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 4" />
        <text x={352} y={pad.t - 2} textAnchor="end" fill="var(--lime)" fontSize="13" fontFamily="var(--font-mono)">
          Sealed 2m 29s early
        </text>

        <circle cx={360} cy={150} r="6" fill="var(--lime)" />
        <text x={360} y={H - pad.b + 20} textAnchor="middle" fill="var(--ink)" fontSize="13" fontFamily="var(--font-mono)">
          Kickoff line 45¢ (+5¢ edge)
        </text>

        <circle cx={700} cy={60} r="6" fill="var(--good)" />
        <text x={700} y={H - pad.b + 20} textAnchor="end" fill="var(--good)" fontSize="13" fontFamily="var(--font-mono)">
          Settled WON 100¢
        </text>

        <text x={pad.l} y={H - 8} fill="var(--ink-3)" fontSize="12" fontFamily="var(--font-mono)">
          Sui Mainnet Checkpoint 343308226 · Tatum gRPC
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-ink-3">Bitcoin 5m window · Sealed on Sui before market lock.</figcaption>
    </figure>
  );
}

/** Graphic showing 48h call volume and Kelly sizing allocation. */
function FlowBars() {
  const W = 720;
  const H = 320;
  const heights = [24, 38, 45, 62, 50, 75, 90, 82, 110, 130, 95, 120, 145, 160, 140, 175, 190, 210, 185, 230, 215, 240, 260, 250];
  const gap = 4;
  const bw = (W - gap * (heights.length - 1)) / heights.length;
  const base = H - 44;

  return (
    <figure className="rounded-2xl border border-rule bg-surface p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Kelly stake sizing distribution">
        {heights.map((h, i) => {
          const xi = i * (bw + gap);
          return (
            <g key={i}>
              <rect x={xi} y={base - h} width={bw} height={h} rx="1.5" fill="var(--surface-raised)" stroke="var(--rule)" />
              <rect x={xi} y={base - h * 0.22} width={bw} height={h * 0.22} rx="1.5" fill="var(--lime)" />
            </g>
          );
        })}
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--edge)" />
        <text x="0" y={H - 14} fill="var(--ink-3)" fontSize="13" fontFamily="var(--font-mono)">
          Calls graded over 48h
        </text>
        <text x={W} y={H - 14} textAnchor="end" fill="var(--lime)" fontSize="13" fontFamily="var(--font-mono)">
          Half-Kelly stake slice (max 2% cap)
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-ink-3">Mathematical sizing for voices with proven edge.</figcaption>
    </figure>
  );
}
