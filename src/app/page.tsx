import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Tally — Tipsters graded on what they said before kickoff",
  description: "Cryptographic receipts for prediction market calls. Sealed on Sui, archived to Walrus Memory, read back through Tatum.",
};

export default function LandingPage() {
  return (
    <div className="app-dark min-h-dvh bg-(--s-bg) text-(--s-text)">
      {/* Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-(--s-line) bg-(--s-bg-blur) px-6 py-4 backdrop-blur lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-(--s-sub) md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-(--s-text)">How it works</a>
          <a href="#proof" className="transition-colors hover:text-(--s-text)">On-chain proof</a>
          <a href="#standings" className="transition-colors hover:text-(--s-text)">Live records</a>
          <a href="https://github.com/jadonamite/Tally" target="_blank" rel="noreferrer" className="transition-colors hover:text-(--s-text)">GitHub</a>
        </nav>
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center rounded-full bg-(--s-act) px-6 text-sm font-semibold text-(--s-act-contrast) shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Launch App
        </Link>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center md:pb-28 md:pt-24 lg:px-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-(--s-sub)">
          On-Chain Prediction Tracking
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.4rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">
          Tipsters graded on what they said <br className="hidden sm:inline" />
          <span className="text-(--s-gold)">before kickoff</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-(--s-sub) md:text-lg">
          Anyone can claim a 9-1 week after the final whistle. Tally computes a SHA-256 hash of the call,
          seals it on Sui mainnet before kickoff, archives it to Walrus Memory, and grades it against the closing price.
          Permanent cryptographic receipts. Zero fake win rates.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/app"
            className="inline-flex min-h-12 items-center rounded-full bg-(--s-text) px-8 text-[15px] font-semibold text-(--s-bg) transition-transform hover:scale-105"
          >
            Open Tally
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex min-h-12 items-center rounded-full border border-(--s-line) bg-(--s-card) px-7 text-[15px] font-semibold text-(--s-text) transition-colors hover:border-(--s-text)"
          >
            How it works
          </a>
          <Link
            href="/app/call/c_c1ce2f7943a5ba3d"
            className="inline-flex min-h-12 items-center rounded-full border border-(--s-line) px-6 text-[15px] font-semibold text-(--s-sub) transition-colors hover:text-(--s-text)"
          >
            View live Sui seal
          </Link>
        </div>

        {/* Live Call Preview Grid */}
        <div className="mt-16 grid gap-4 text-left md:grid-cols-3">
          <div className="rounded-[22px] border border-(--s-line) bg-(--s-card) p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-(--s-win)">EARNED A LOOK</span>
              <span className="rounded-full bg-(--s-gold-tint) px-2 py-0.5 font-mono text-[10px] font-bold text-(--s-gold)">39 GRADED</span>
            </div>
            <p className="mt-3 text-base font-semibold">SineNooneEI</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">+0.05¢ vs price · +$0.19 per $1</p>
            <p className="mt-3 text-xs leading-relaxed text-(--s-sub)">
              Wins 24 of 39 calls. Profits because they enter below the closing line. Sized with half-Kelly stakes.
            </p>
          </div>

          <div className="rounded-[22px] border border-(--s-line) bg-(--s-card) p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-(--s-lose)">NOT EARNED</span>
              <span className="rounded-full bg-(--s-card) px-2 py-0.5 font-mono text-[10px] font-bold text-(--s-sub)">14 GRADED</span>
            </div>
            <p className="mt-3 text-base font-semibold">Alpha Trader</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">+5.0¢ vs price · -$0.40 per $1</p>
            <p className="mt-3 text-xs leading-relaxed text-(--s-sub)">
              50% win rate (7 won, 7 lost), but lost net funds on high-stake positions. Dimmed in the feed.
            </p>
          </div>

          <div className="rounded-[22px] border border-(--s-line) bg-(--s-card) p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-(--s-gold)">SUI SEALED</span>
              <span className="font-mono text-[10px] text-(--s-sub)">CHECKPOINT 343308226</span>
            </div>
            <p className="mt-3 text-base font-semibold">Crypto Signals</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">BTC Up · 5m Window</p>
            <p className="mt-3 text-xs leading-relaxed text-(--s-sub)">
              Sealed 2m 29s before kickoff on Sui mainnet. Verified through Tatum gRPC before the market locked.
            </p>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="border-t border-(--s-line) py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-(--s-sub)">The Pipeline</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">How Tally grades with truth.</h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[22px] bg-(--s-card) p-6">
              <span className="font-mono text-2xl font-bold text-(--s-gold)">01</span>
              <h3 className="mt-4 text-lg font-semibold">Capture Anywhere</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
                Forward a Telegram tip, drop a link from X, or follow any Polymarket trader wallet on Polygon.
              </p>
            </div>

            <div className="rounded-[22px] bg-(--s-card) p-6">
              <span className="font-mono text-2xl font-bold text-(--s-gold)">02</span>
              <h3 className="mt-4 text-lg font-semibold">Seal on Sui</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
                SHA-256 hash committed to Sui mainnet before the market starts. Tatum reads back the block checkpoint.
              </p>
            </div>

            <div className="rounded-[22px] bg-(--s-card) p-6">
              <span className="font-mono text-2xl font-bold text-(--s-gold)">03</span>
              <h3 className="mt-4 text-lg font-semibold">Walrus Memory</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
                Archived into encrypted semantic memory. Ask anything about a voice and recall real decentralized blobs.
              </p>
            </div>

            <div className="rounded-[22px] bg-(--s-card) p-6">
              <span className="font-mono text-2xl font-bold text-(--s-gold)">04</span>
              <h3 className="mt-4 text-lg font-semibold">Closing Line Value</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
                Price is locked at kickoff. Graded on closing line edge and profit per dollar, never raw win rate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Built This Way / Proof Section */}
      <section id="proof" className="border-t border-(--s-line) bg-(--s-card) py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-(--s-sub)">Why It Matters</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                The favourite trap and the math of prediction.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-(--s-sub)">
                In sports and prediction markets, win rate is a marketing trick. A tipster who backs 82-cent heavy favourites
                wins 4 out of 5 calls (80% win rate), yet makes zero profit and yields negative edge.
              </p>
              <p className="mt-3 text-base leading-relaxed text-(--s-sub)">
                A database row can be backdated by a server admin; a Sui checkpoint cannot.
                Tally anchors every call commit on Sui mainnet before kickoff so no record can be faked after observing the game.
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/app"
                  className="inline-flex min-h-11 items-center rounded-full bg-(--s-act) px-6 text-sm font-semibold text-(--s-act-contrast)"
                >
                  Explore the App
                </Link>
                <Link
                  href="/app/call/c_c1ce2f7943a5ba3d"
                  className="inline-flex min-h-11 items-center rounded-full border border-(--s-line) bg-(--s-bg) px-5 text-sm font-semibold text-(--s-text)"
                >
                  Inspect Live Receipt
                </Link>
              </div>
            </div>

            <div className="rounded-[26px] border border-(--s-line) bg-(--s-bg) p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-(--s-sub)">Live Receipt Sample</p>
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-(--s-line) pb-2">
                  <span className="text-(--s-sub)">Market</span>
                  <span className="text-right text-(--s-text)">Bitcoin 5m Up/Down</span>
                </div>
                <div className="flex justify-between border-b border-(--s-line) pb-2">
                  <span className="text-(--s-sub)">Sealed On</span>
                  <span className="text-right text-(--s-gold)">Sui Mainnet</span>
                </div>
                <div className="flex justify-between border-b border-(--s-line) pb-2">
                  <span className="text-(--s-sub)">Checkpoint</span>
                  <span className="text-right">343288920</span>
                </div>
                <div className="flex justify-between border-b border-(--s-line) pb-2">
                  <span className="text-(--s-sub)">Before Kickoff</span>
                  <span className="text-right text-(--s-win)">True (5m 26s early)</span>
                </div>
                <div className="flex justify-between border-b border-(--s-line) pb-2">
                  <span className="text-(--s-sub)">Verified Via</span>
                  <span className="text-right">Tatum Sui gRPC</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-(--s-sub)">Memory Blob</span>
                  <span className="text-right text-(--s-act)">MK7SylYh6Pc6...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-(--s-line) py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row lg:px-10">
          <Logo />
          <nav className="flex flex-wrap gap-6 text-xs text-(--s-sub)">
            <Link href="/terms" className="hover:text-(--s-text)">Terms</Link>
            <Link href="/privacy" className="hover:text-(--s-text)">Privacy</Link>
            <Link href="/cookies" className="hover:text-(--s-text)">Cookies</Link>
            <a href="https://github.com/jadonamite/Tally" target="_blank" rel="noreferrer" className="hover:text-(--s-text)">
              GitHub
            </a>
          </nav>
          <p className="text-xs text-(--s-sub)">Built for Tatum x Walrus Hackathon</p>
        </div>
      </footer>
    </div>
  );
}
