import Link from "next/link";

const TILES = [
  {
    slot: 1,
    ground: "bg-tile-ink",
    ink: "text-white",
    sub: "text-white/60",
    badgeBg: "bg-white/15 text-emerald-400",
    title: "SineNooneEI",
    metric: "+19¢",
    label: "per $1",
    tag: "Earned",
    detail: false,
    href: "/app/voice/v_38337de21ff0bb0a",
  },
  {
    slot: 2,
    ground: "bg-tile-indigo",
    ink: "text-white",
    sub: "text-white/70",
    badgeBg: "bg-white/20 text-white",
    title: "Crypto Signals",
    metric: "343M",
    label: "Sui ckpt",
    tag: "Sealed early",
    detail: false,
    href: "/app/call/c_c1ce2f7943a5ba3d",
  },
  {
    slot: 3,
    ground: "bg-tile-vermillion",
    ink: "text-white",
    sub: "text-white/70",
    badgeBg: "bg-black/20 text-white",
    title: "Walrus Memory",
    summary: "355 decentralized call and grade blobs indexed on-chain.",
    metric: "355+",
    label: "blobs",
    tag: "Tatum gRPC",
    detail: true,
    href: "/app",
  },
  {
    slot: 4,
    ground: "bg-tile-cyan",
    ink: "text-[#0a0a0a]",
    sub: "text-black/55",
    badgeBg: "bg-black/10 text-rose-700",
    title: "Alpha Trader",
    metric: "-40¢",
    label: "per $1",
    tag: "Benched",
    detail: false,
    href: "/app/voice/v_92f1c3ef799e381b",
  },
  {
    slot: 5,
    ground: "bg-tile-chartreuse",
    ink: "text-[#0a0a0a]",
    sub: "text-black/55",
    badgeBg: "bg-black/10 text-[#0a0a0a]",
    title: "Closing line edge",
    summary: "Graded at kickoff price. Half-Kelly stake sizing for real edge.",
    metric: "+0.05¢",
    label: "vs price",
    tag: "Receipt",
    detail: true,
    href: "/app",
  },
] as const;

export function ReceiptTiles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      {TILES.map((tile) => (
        <div
          key={tile.slot}
          className={`hero-tile hero-tile-${tile.slot} ${tile.ground} overflow-hidden`}
        >
          <Link
            href={tile.href}
            aria-label={`${tile.title} — ${tile.metric} ${tile.label}`}
            className="flex h-full w-full flex-col justify-between p-2.5 sm:p-3 lg:p-4"
          >
            <div className="flex items-center justify-between gap-1">
              <span className={`truncate font-mono text-[9px] uppercase tracking-[0.16em] ${tile.sub}`}>
                {tile.title}
              </span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${tile.badgeBg}`}>
                {tile.tag}
              </span>
            </div>

            {tile.detail && (
              <p className={`hidden text-[11px] font-medium leading-snug line-clamp-2 lg:block ${tile.ink} my-auto`}>
                {tile.summary}
              </p>
            )}

            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-semibold tabular-nums leading-none lg:text-2xl ${tile.ink}`}>
                {tile.metric}
              </span>
              <span className={`font-mono text-[9px] uppercase tracking-[0.18em] ${tile.sub}`}>
                {tile.label}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
