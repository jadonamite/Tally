import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tally: a pick journal that learns which tipsters to trust",
  description: "A pick journal that seals predictions on-chain before kickoff and learns which tipsters beat the odds over time.",
};

export default function BlogPage() {
  return (
    <main className="app-dark mx-auto min-h-dvh max-w-md bg-(--s-bg) px-5 pb-16 pt-6 text-(--s-text) md:max-w-3xl lg:max-w-4xl md:px-8">
      <Link
        href="/app"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-(--s-sub) hover:text-(--s-text)"
      >
        ← Back to Tally
      </Link>
      <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">
        Tally: a pick journal that learns which tipsters to trust
      </h1>
      <p className="mt-1 text-xs text-(--s-sub)">Jadon · 10 November 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-(--s-sub)">
        Anyone who bets or trades prediction markets gets sent tips. A Telegram channel posts &quot;sure odds&quot;, an account on X claims nine wins from ten, a friend forwards a wallet that &quot;never loses&quot;. The record you are shown is written by the person selling it, after the results are in, and it is almost always a win rate. Win rate is easy to make look good. If you only back 82¢ favourites you win four times in five and still lose money.
      </p>

      <p className="mt-3 text-sm leading-relaxed text-(--s-sub)">
        I built Tally for the person on the receiving end of those tips. It is live at{" "}
        <a
          href="https://tally.namite.xyz"
          target="_blank"
          rel="noreferrer"
          className="text-(--s-act) underline hover:opacity-80"
        >
          https://tally.namite.xyz
        </a>{" "}
        and the code is at{" "}
        <a
          href="https://github.com/jadonamite/Tally"
          target="_blank"
          rel="noreferrer"
          className="text-(--s-act) underline hover:opacity-80"
        >
          https://github.com/jadonamite/Tally
        </a>
        .
      </p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">What it does</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          You forward a call to Tally: you paste the tip, pick the market and the side, and say who sent it. You can also follow a Polymarket wallet, and Tally imports its first buy on each market. Each source is a voice.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Tally seals the call before the market starts. When the market starts it records the price, and when the market settles it grades the call on two numbers: whether the voice got a better price than the market had at the start, and what $1 on the call would have returned. After ten graded calls a voice has a verdict. Voices that beat the price and made money earn a look and a suggested stake. Voices that didn&apos;t are greyed out the next time they call, with their record attached.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          For sports markets, Tally compares the Polymarket price with the median of bookmaker prices from The Odds API with each bookmaker&apos;s margin removed, and flags markets where the two are 5 points or more apart. It only matches straight win markets with a known kickoff; spread and totals markets are refused.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">How it uses Walrus Memory</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Walrus Memory is where Tally keeps what it has learned. Every call, grade and change of standing is written as a memory in that voice&apos;s namespace. After each grade Tally also writes the voice&apos;s credibility score, and this is the memory the app runs on. When the feed loads, the verdict beside each voice is the newest credibility memory recalled from Walrus, and it decides whether the voice&apos;s next call is shown first, greyed out, or given a suggested stake. The blob is linked from the voice page so you can open the memory the verdict came from.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          This is one of those memories, recalled from Mainnet as written:
        </p>
        <blockquote className="my-3 rounded-2xl border-l-2 border-(--s-act) bg-(--s-card) p-4 text-sm leading-relaxed text-(--s-text)">
          Tally credibility. SineNooneEI after 39 sealed calls that count: +0.1¢ against the price at the start on average, +$0.19 per $1, 24 won and 15 lost. Verdict: Earned a look.
        </blockquote>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Recall is also used directly. When you add a new call, the capture sheet asks Walrus what this voice said before about that market and shows the answers before you seal. On a voice page you can ask in plain words, for example &quot;their last bitcoin calls&quot;.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Tally remembers you too. On any open call you can mark it taken or passed. That choice is a memory, and when the call is graded a second memory records how the choice turned out. The You tab recalls them and shows how following and passing has gone for each voice.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          At the time of writing Tally has 740 memories on Walrus Mainnet across 30 namespaces. The live count is at{" "}
          <a
            href="https://tally.namite.xyz/api/memory/stats"
            target="_blank"
            rel="noreferrer"
            className="text-(--s-act) underline hover:opacity-80"
          >
            https://tally.namite.xyz/api/memory/stats
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">How it uses Tatum</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          A record of who said what is only worth keeping if nobody could have edited it after the result. So each call is hashed, and the hash goes into a Sui mainnet transaction before the market starts. Tally then reads that transaction back through Tatum&apos;s Sui gateway and takes the checkpoint time from the chain. If the checkpoint is not earlier than the start, the call is marked late and never graded.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Here is one:{" "}
          <a
            href="https://suiscan.xyz/mainnet/tx/CiLENPQ9LD4kMocSbrTgF3NMUgNANe1eW5G3mWo6HVs4"
            target="_blank"
            rel="noreferrer"
            className="text-(--s-act) underline hover:opacity-80 break-all"
          >
            https://suiscan.xyz/mainnet/tx/CiLENPQ9LD4kMocSbrTgF3NMUgNANe1eW5G3mWo6HVs4
          </a>
          . It was sealed at checkpoint 343288920, 5 minutes 26 seconds before its market started. Its call page has a button that reads the seal through Tatum again while you watch:{" "}
          <a
            href="https://tally.namite.xyz/app/call/c_c1ce2f7943a5ba3d"
            target="_blank"
            rel="noreferrer"
            className="text-(--s-act) underline hover:opacity-80 break-all"
          >
            https://tally.namite.xyz/app/call/c_c1ce2f7943a5ba3d
          </a>
          .
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Wallet calls work the same way with a different chain. The Polymarket trade is a Polygon transaction, so Tally reads its block time through Tatum&apos;s Polygon RPC and compares it with the start. Of 444 wallet buys imported so far, 233 were made after their market had started. Those are kept, shown as late, and count for nothing.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">How it learned over time</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          SineNooneEI is a Polymarket wallet on the example board. Tally imported its buys in batches and graded them as the markets settled.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          After 12 sealed calls, the memory Tally wrote read: moved to &quot;Hasn&apos;t beaten the price&quot;, −0.1¢ against the price on average, −$0.14 per $1. Any new call from that wallet was greyed out.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Ten minutes and 27 more graded calls later the record had turned: +0.1¢ against the price, +$0.19 per $1 across 39 calls. Tally wrote a new standing memory and a new credibility memory, the verdict became &quot;Earned a look&quot;, and the wallet&apos;s next open call moved to the top of the feed with a suggested stake.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Another wallet went the other way. Alpha Trader won 14 of its 21 graded calls and lost $0.25 per $1, because it was paying favourite prices. A win rate would have ranked it above SineNooneEI. Tally greys it out.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Agents pay to ask</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Agents can also query a voice&apos;s record over HTTP. When an agent calls{" "}
          <code className="rounded bg-(--s-card) px-1.5 py-0.5 font-mono text-xs text-(--s-text)">
            GET /api/agent/voices/&lt;id&gt;/record
          </code>{" "}
          with no payment, Tally answers HTTP 402 with the price. The agent pays 0.01 native USDC on Sui mainnet and sends the transaction digest back in the{" "}
          <code className="rounded bg-(--s-card) px-1.5 py-0.5 font-mono text-xs text-(--s-text)">
            X-PAYMENT
          </code>{" "}
          header.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Tally reads the payment through Tatum&apos;s Sui gRPC gateway, checking recipient, amount, coin type, age under 10 minutes, and that the digest was never used before. When a second request tried using the same digest, Tally refused it. Each paid request writes a memory to Walrus in that voice&apos;s namespace. In a live test on Sui mainnet, an agent paid 0.01 USDC and received SineNooneEI&apos;s record:{" "}
          <a
            href="https://suiscan.xyz/mainnet/tx/GB5fQhorBM4SJRzNS4yK8vA15WtykDKxK4upRT929iVx"
            target="_blank"
            rel="noreferrer"
            className="text-(--s-act) underline hover:opacity-80 break-all"
          >
            https://suiscan.xyz/mainnet/tx/GB5fQhorBM4SJRzNS4yK8vA15WtykDKxK4upRT929iVx
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Try it</h2>
        <p className="mt-2 text-sm leading-relaxed text-(--s-sub)">
          Open{" "}
          <a
            href="https://tally.namite.xyz/app"
            target="_blank"
            rel="noreferrer"
            className="text-(--s-act) underline hover:opacity-80"
          >
            https://tally.namite.xyz/app
          </a>
          . You land on the example board. Add a voice of your own, paste the next tip you are sent, and seal it before the start.
        </p>
      </section>

      <nav className="mt-10 flex gap-5 text-sm text-(--s-sub)">
        <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/terms">
          Terms
        </Link>
        <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/privacy">
          Privacy
        </Link>
        <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/cookies">
          Cookies
        </Link>
      </nav>
    </main>
  );
}
