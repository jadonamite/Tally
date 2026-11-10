import Link from "next/link";
import { NavBar } from "@/components/site/nav-bar";
import { AppFooter } from "@/components/site/app-footer";
import { HeroStage } from "@/components/landing/hero-stage";
import { landingData, type LandingProof, type LandingVoice } from "@/server/landingData";
import { signedCents, perDollar, cents, STANDING_LABEL } from "@/lib/format";

export const revalidate = 60;

const NAV = [
  { href: "/app", label: "Board" },
  { href: "/#scoreboard", label: "Scoreboard" },
  { href: "/#edge", label: "The Edge" },
  { href: "/#proof", label: "Receipts" },
];

export default async function Landing() {
  const { voices, tiles, proof, counts } = await landingData();

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
          <HeroStage tiles={tiles} />
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
            {voices.map((v, i) => {
              const standingLabel = STANDING_LABEL[v.standing] ?? v.standing;
              const clv = v.meanBeatClose !== null ? `${signedCents(v.meanBeatClose)} vs price · ` : "";
              const summary = `${v.n} graded calls · ${clv}${v.won} won, ${v.lost} lost`;
              const metric = v.pnlPerBet !== null ? perDollar(v.pnlPerBet).replace(" per $1", "") : "--";
              const isEarned = v.standing === "earned";
              return (
                <Link
                  key={v.id}
                  href={`/app/voice/${v.id}`}
                  className="grid min-h-[68px] grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-rule px-5 last:border-b-0 hover:bg-surface-raised sm:grid-cols-[2.5rem_1.4fr_9rem_8rem] sm:px-7 transition-colors"
                >
                  <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      {v.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={v.avatar}
                          alt=""
                          width={24}
                          height={24}
                          className="h-6 w-6 rounded-full object-cover shrink-0"
                        />
                      ) : null}
                      <span className="truncate font-medium">{v.displayName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                          isEarned
                            ? "bg-good/15 text-good"
                            : v.standing === "unproven"
                              ? "bg-lime/15 text-lime"
                              : "bg-critical/15 text-critical"
                        }`}
                      >
                        {standingLabel}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-ink-3 mt-0.5">{summary}</span>
                  </span>
                  <span className="hidden sm:block">
                    <Meter value={isEarned ? 0.82 : v.standing === "unproven" ? 0.55 : 0.18} control={!isEarned} />
                  </span>
                  <span className={`text-right font-mono tnum ${!isEarned ? "text-ink-3" : "text-ink"}`}>
                    <span className="font-semibold">{metric}</span>
                    <span className="block text-[10px] text-ink-3">per $1 staked</span>
                  </span>
                </Link>
              );
            })}
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
            <SealTape proof={proof} />
          </div>
        </Band>

        {/* Band 3: The Size */}
        <Band id="size">
          <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
            <FlowBars voices={voices} />
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
              {counts.memories !== null && counts.namespaces !== null ? (
                <>
                  Over {counts.memories.toLocaleString()} decentralized memories across {counts.namespaces} namespaces sit on Walrus right now. No deleted tweets, no edited spreadsheets, no post-game excuses. Just unalterable cryptographic truth.
                </>
              ) : (
                <>
                  Decentralized memories sit on Walrus right now. No deleted tweets, no edited spreadsheets, no post-game excuses. Just unalterable cryptographic truth.
                </>
              )}
            </p>
          </div>

          <pre className="mt-10 overflow-x-auto rounded-2xl border border-rule bg-surface p-6 font-mono text-[13px] leading-relaxed text-ink-2">
            <span className="text-ink-3">GET</span> <span className="text-ink">/api/calls/{proof?.id ?? "c_16b938747ad3bb62"}/verify</span>
            {"\n\n"}
            {"{\n"}
            {"  "}<span className="text-lime">&quot;hashMatches&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;chain&quot;</span>{": \"sui\",\n"}
            {"  "}<span className="text-lime">&quot;success&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;memoOnChain&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;chainTime&quot;</span>{`: ${JSON.stringify(proof?.sealedAt ?? "2026-11-09T09:09:09.146Z")},\n`}
            {"  "}<span className="text-lime">&quot;beforeStart&quot;</span>{": true,\n"}
            {"  "}<span className="text-lime">&quot;checkpoint&quot;</span>{`: ${JSON.stringify(proof?.sealCheckpoint ?? "343308632")},\n`}
            {"  "}<span className="text-lime">&quot;readVia&quot;</span>{": \"Tatum\"\n"}
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
    <section id={id} className="scroll-mt-28 py-24 sm:scroll-mt-36 sm:py-32">
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
function SealTape({ proof }: { proof: LandingProof | null }) {
  const W = 720;
  const H = 340;
  const pad = { l: 20, r: 20, t: 36, b: 50 };

  if (!proof) {
    return (
      <figure className="rounded-2xl border border-rule bg-surface p-4 sm:p-6 flex items-center justify-center min-h-[340px]">
        <p className="font-mono text-sm text-ink-3">Seals confirm on Sui mainnet before market lock.</p>
      </figure>
    );
  }

  const entry = proof.entryPrice ?? 0.5;
  const close = proof.closePrice ?? entry;
  const edge = close - entry;
  const isWon = proof.result === "won";
  const isLost = proof.result === "lost";

  const earlySeconds = Math.max(
    0,
    Math.round((new Date(proof.lockAt).getTime() - new Date(proof.sealedAt).getTime()) / 1000)
  );
  const earlyLabel =
    earlySeconds >= 60
      ? `${Math.floor(earlySeconds / 60)}m ${earlySeconds % 60}s early`
      : `${earlySeconds}s early`;

  const priceToY = (p: number) => Math.round(260 - Math.min(Math.max(p, 0), 1) * 200);
  const entryY = priceToY(entry);
  const closeY = priceToY(close);
  const settleY = isWon ? 60 : isLost ? 260 : 160;

  const edgeLabel = `${signedCents(edge)} edge`;

  return (
    <figure className="rounded-2xl border border-rule bg-surface p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sui seal kickoff line chart">
        <defs>
          <pattern id="seal-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.9" fill="rgba(196, 242, 48, 0.22)" />
          </pattern>
        </defs>

        <rect x={pad.l} y={pad.t - 16} width={340} height={H - pad.t - pad.b + 16} fill="url(#seal-dots)" />
        <line x1={pad.l} x2={W - pad.r} y1={entryY} y2={entryY} stroke="var(--ink-3)" strokeDasharray="3 5" />
        <text x={pad.l + 6} y={entryY - 10} fill="var(--ink-3)" fontSize="13" fontFamily="var(--font-mono)">
          Entry price {cents(entry)}
        </text>

        <polyline
          points={`${pad.l},${entryY} 100,${entryY} 200,${Math.round((entryY + closeY) / 2)} 360,${closeY} 480,${Math.round((closeY + settleY) / 2)} 600,${Math.round((closeY + settleY * 2) / 3)} 700,${settleY}`}
          fill="none"
          stroke="var(--lime)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        <line x1={360} x2={360} y1={pad.t - 16} y2={H - pad.b} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 4" />
        <text x={352} y={pad.t - 2} textAnchor="end" fill="var(--lime)" fontSize="13" fontFamily="var(--font-mono)">
          Sealed {earlyLabel}
        </text>

        <circle cx={360} cy={closeY} r="6" fill="var(--lime)" />
        <text x={360} y={H - pad.b + 20} textAnchor="middle" fill="var(--ink)" fontSize="13" fontFamily="var(--font-mono)">
          Kickoff line {cents(close)} ({edgeLabel})
        </text>

        <circle cx={700} cy={settleY} r="6" fill={isWon ? "var(--good)" : "var(--critical)"} />
        <text
          x={700}
          y={H - pad.b + 20}
          textAnchor="end"
          fill={isWon ? "var(--good)" : "var(--critical)"}
          fontSize="13"
          fontFamily="var(--font-mono)"
        >
          Settled {isWon ? "WON 100¢" : isLost ? "LOST 0¢" : proof.result?.toUpperCase() ?? "SETTLED"}
        </text>

        <text x={pad.l} y={H - 8} fill="var(--ink-3)" fontSize="12" fontFamily="var(--font-mono)">
          Sui Mainnet Checkpoint {proof.sealCheckpoint ?? "–"} · Tatum gRPC
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-ink-3">
        {proof.question ? `${proof.question} · ` : ""}Sealed on Sui before market lock.
      </figcaption>
    </figure>
  );
}

/** Graphic showing graded calls per voice and Kelly sizing allocation. */
function FlowBars({ voices }: { voices: LandingVoice[] }) {
  const W = 720;
  const H = 320;
  const base = H - 48;
  const pad = 24;

  const active = voices.filter((v) => v.n > 0);
  const displayVoices = active.length > 0 ? active : voices;
  const maxN = Math.max(...displayVoices.map((v) => v.n), 1);
  const count = displayVoices.length;
  const gap = count > 1 ? Math.min(32, Math.floor((W - pad * 2) / (count * 4))) : 0;
  const bw = Math.min(72, Math.floor((W - pad * 2 - gap * (count - 1)) / count));
  const totalW = bw * count + gap * (count - 1);
  const startX = Math.floor((W - totalW) / 2);

  return (
    <figure className="rounded-2xl border border-rule bg-surface p-4 sm:p-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Kelly stake sizing distribution">
        {displayVoices.map((v, i) => {
          const xi = startX + i * (bw + gap);
          const barH = Math.max(16, Math.round((v.n / maxN) * 180));
          const hasEdge = (v.pnlPerBet ?? 0) > 0;
          const stakeRatio = hasEdge ? Math.min(1, Math.max(0.18, (v.pnlPerBet ?? 0) * 1.5)) : 0;
          const sliceH = Math.round(barH * stakeRatio);

          return (
            <g key={v.id}>
              <rect
                x={xi}
                y={base - barH}
                width={bw}
                height={barH}
                rx="3"
                fill="var(--surface-raised)"
                stroke="var(--rule)"
              />
              {sliceH > 0 && (
                <rect
                  x={xi}
                  y={base - sliceH}
                  width={bw}
                  height={sliceH}
                  rx="3"
                  fill="var(--lime)"
                />
              )}
              <text
                x={xi + bw / 2}
                y={base - barH - 8}
                textAnchor="middle"
                fill={hasEdge ? "var(--lime)" : "var(--ink-3)"}
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {v.pnlPerBet !== null ? perDollar(v.pnlPerBet).replace(" per $1", "") : "–"}
              </text>
              <text
                x={xi + bw / 2}
                y={base + 16}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {v.displayName.length > 10 ? `${v.displayName.slice(0, 9)}…` : v.displayName}
              </text>
              <text
                x={xi + bw / 2}
                y={base + 30}
                textAnchor="middle"
                fill="var(--ink-3)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {v.n} calls
              </text>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--edge)" />
        <text x="0" y={H - 6} fill="var(--ink-3)" fontSize="11" fontFamily="var(--font-mono)">
          Calls graded per voice
        </text>
        <text x={W} y={H - 6} textAnchor="end" fill="var(--lime)" fontSize="11" fontFamily="var(--font-mono)">
          Half-Kelly stake slice (max 2% cap)
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-ink-3">Mathematical sizing for voices with proven edge.</figcaption>
    </figure>
  );
}
