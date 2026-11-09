"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** Stage coordinates. The SVG paths and the tile positions share this box. */
const W = 1600;
const H = 1000;

const PATHS = [
  "M 110 700 C 420 440, 860 170, 1240 150 S 1520 180, 1570 250",
  "M 330 190 C 520 420, 780 610, 1080 780 S 1430 910, 1560 770",
  "M 40 360 C 220 300, 400 380, 560 470",
];

const TILES = [
  { id: "sine", name: "SineNooneEI", stat: "+19¢", label: "per $1", path: 0, start: 0.06, tilt: -12, href: "/app/voice/v_38337de21ff0bb0a" },
  { id: "crypto", name: "Crypto Signals", stat: "343M", label: "Sui ckpt", path: 0, start: 0.42, tilt: 9, href: "/app/call/c_c1ce2f7943a5ba3d" },
  { id: "walrus", name: "Walrus", stat: "355+", label: "blobs", path: 0, start: 0.78, tilt: -6, href: "/app" },
  { id: "alpha", name: "Alpha Trader", stat: "-40¢", label: "per $1", path: 1, start: 0.3, tilt: 14, href: "/app/voice/v_92f1c3ef799e381b" },
  { id: "tatum", name: "Tatum gRPC", stat: "0.2s", label: "read", path: 1, start: 0.62, tilt: -10, href: "/app" },
  { id: "btc", name: "BTC 5m", stat: "UP", label: "sealed", path: 1, start: 0.94, tilt: 7, href: "/app" },
  { id: "edge", name: "Kickoff Edge", stat: "+0.05¢", label: "vs close", path: 2, start: 0.2, tilt: -16, href: "/app" },
  { id: "kelly", name: "Kelly", stat: "2%", label: "max cap", path: 2, start: 0.72, tilt: 11, href: "/app" },
];

const LAP_S = 46;

export function HeroStage() {
  const stage = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const tiles = useRef<(HTMLAnchorElement | null)[]>([]);
  const paused = useRef<boolean[]>(TILES.map(() => false));

  useEffect(() => {
    const box = stage.current;
    if (!box) return;
    const lengths = paths.current.map((p) => p?.getTotalLength() ?? 0);
    const longest = Math.max(...lengths);
    const progress = TILES.map((t) => t.start);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let size = { w: box.clientWidth, h: box.clientHeight };
    const ro = new ResizeObserver(() => {
      size = { w: box.clientWidth, h: box.clientHeight };
      if (reduce) place(0);
    });
    ro.observe(box);

    let last = performance.now();
    let raf = 0;

    function place(dt: number) {
      TILES.forEach((tile, i) => {
        const el = tiles.current[i];
        const path = paths.current[tile.path];
        if (!el || !path) return;
        const len = lengths[tile.path];
        if (!paused.current[i]) progress[i] = (progress[i] + (dt / LAP_S) * (longest / len)) % 1;
        const t = progress[i];
        const pt = path.getPointAtLength(t * len);
        const ahead = path.getPointAtLength(Math.min(len, t * len + 2));
        const heading = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
        const x = (pt.x / W) * size.w;
        const y = (pt.y / H) * size.h;
        const edge = Math.min(t, 1 - t);
        const opacity = Math.min(1, edge / 0.07);
        const rot = tile.tilt + heading * 0.08;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
        el.style.opacity = String(opacity);
      });
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      place(dt);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) place(0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={stage} className="stage relative mx-auto aspect-square sm:aspect-[16/9.5] w-full max-w-[1500px] overflow-hidden">
      <div className="stage-grain pointer-events-none absolute inset-0" />

      {/* The word, with an echo above and below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="stage-word stage-word-ghost animate-fade-in" style={{ animationDelay: "250ms" }}>
          Tally
        </span>
        <span className="stage-word stage-word-solid animate-word-rise relative z-[1]">Tally</span>
        <span className="stage-word stage-word-ghost animate-fade-in" style={{ animationDelay: "400ms" }}>
          Tally
        </span>
      </div>

      <svg
        aria-hidden
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {PATHS.map((d, i) => (
          <g key={d}>
            <path
              ref={(el) => {
                paths.current[i] = el;
              }}
              d={d}
              fill="none"
              stroke="var(--lime)"
              strokeOpacity={i === 2 ? 0.45 : 0.75}
              strokeWidth={1.6}
              strokeDasharray="3 6"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {/* Path ends, drawn in HTML so they stay square when the SVG stretches. */}
      {PATHS.map((d) => {
        const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
        const ends = [
          [nums[0], nums[1]],
          [nums[nums.length - 2], nums[nums.length - 1]],
        ];
        return ends.map(([x, y]) => (
          <span
            key={`${d}-${x}-${y}`}
            aria-hidden
            className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 bg-lime"
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
          />
        ));
      })}

      <div aria-hidden className="absolute inset-0">
        {TILES.map((tile, i) => (
          <Link
            key={tile.id}
            href={tile.href}
            tabIndex={-1}
            ref={(el) => {
              tiles.current[i] = el;
            }}
            onPointerEnter={() => (paused.current[i] = true)}
            onPointerLeave={() => (paused.current[i] = false)}
            className="stage-tile absolute left-0 top-0 z-[2] flex flex-col items-center justify-center p-2 text-center opacity-0 transition-[background-color] duration-200"
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-ink-3 truncate max-w-full">
              {tile.name}
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-lime mt-0.5">
              {tile.stat}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-ink-3">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
