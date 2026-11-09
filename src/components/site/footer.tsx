import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Open the app", href: "/app" },
      { label: "Live callers", href: "/#callers" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    title: "Verifiers",
    links: [
      { label: "Sui Mainnet", href: "https://suiscan.xyz/mainnet" },
      { label: "Walrus Memory", href: "https://relayer.memory.walrus.xyz" },
      { label: "Tatum gRPC", href: "https://tatum.io" },
    ],
  },
  {
    title: "Protocol",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "GitHub", href: "https://github.com/jadonamite/Tally" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden pt-16">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <div className="relative z-2 grid gap-8 py-7 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <p className="select-none text-2xl font-bold italic leading-none tracking-[-0.04em]">
              <span className="text-ink">TAL</span>
              <span className="text-ink-3">LY</span>
            </p>
            <p className="mt-3.5 max-w-[34ch] text-sm leading-relaxed text-ink-2">
              Every call on record. Sealed on Sui before kickoff, archived to Walrus Memory, and verified through Tatum. No deleted posts. No altered records.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                {column.title}
              </h3>
              {column.links.map((link) =>
                link.href.startsWith("http") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-1 text-[14.5px] text-ink-2 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block py-1 text-[14.5px] text-ink-2 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>

        <div aria-hidden className="footer-mark-wrap">
          <div className="footer-mark">Tally</div>
        </div>

        <div className="relative z-2 flex flex-wrap items-center justify-between gap-3 border-t border-rule py-6 text-[13.5px] text-ink-2">
          <span>© {new Date().getFullYear()} Tally. Graded on kickoff price, sealed on Sui.</span>
          <div className="flex items-center gap-3.5">
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <span aria-hidden className="opacity-40">
              |
            </span>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <span aria-hidden className="opacity-40">
              |
            </span>
            <Link href="/cookies" className="transition-colors hover:text-ink">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
