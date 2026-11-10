import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lime">
            Sui Mainnet · Walrus Memory · Tatum gRPC
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-ink-3">
            Every call sealed before the start. Graded against the kickoff price. Over 350 cryptographic receipts verified on-chain.
          </p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/cookies", label: "Cookies" },
            { href: "/blog", label: "Blog" },
            { href: "https://github.com/jadonamite/Tally", label: "GitHub" },
          ].map((link) =>
            link.href.startsWith("http") ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-[44px] items-center whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
