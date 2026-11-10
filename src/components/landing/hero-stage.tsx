"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { LandingTile } from "@/server/landingData";

/** Stage coordinates. The SVG paths and the tile positions share this box. */
const W = 1600;
const H = 1000;

const PATHS = [
  "M 110 700 C 420 440, 860 170, 1240 150 S 1520 180, 1570 250",
  "M 330 190 C 520 420, 780 610, 1080 780 S 1430 910, 1560 770",
  "M 40 360 C 220 300, 400 380, 560 470",
];

const SLOTS = [
  { path: 0, start: 0.06, tilt: -12 },
  { path: 0, start: 0.42, tilt: 9 },
  { path: 0, start: 0.78, tilt: -6 },
  { path: 1, start: 0.3, tilt: 14 },
  { path: 1, start: 0.62, tilt: -10 },
  { path: 1, start: 0.94, tilt: 7 },
  { path: 2, start: 0.2, tilt: -16 },
  { path: 2, start: 0.72, tilt: 11 },
];

const LAP_S = 46;

export interface HeroStageProps {
  tiles?: LandingTile[];
}

export function HeroStage({ tiles = [] }: HeroStageProps) {
  const stage = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const paused = useRef<boolean[]>([]);

  const activeTiles = useMemo(
    () =>
      tiles.slice(0, SLOTS.length).map((t, i) => ({
        ...t,
        ...SLOTS[i],
      })),
    [tiles],
  );

  useEffect(() => {
    paused.current = activeTiles.map(() => false);
    const box = stage.current;
    if (!box || activeTiles.length === 0) return;

    const lengths = paths.current.map((p) => p?.getTotalLength() ?? 0);
    const longest = Math.max(...lengths);
    const progress = activeTiles.map((t) => t.start);
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
      activeTiles.forEach((tile, i) => {
        const el = tileRefs.current[i];
        const path = paths.current[tile.path];
        if (!el || !path) return;
        const len = lengths[tile.path];
        if (!len) return;
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
  }, [activeTiles]);

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
        {activeTiles.map((tile, i) => {
          const status = tile.result ? ` · ${tile.result}` : "";
          const line = `${tile.outcomeLabel}${status}`;
          return (
            <Link
              key={tile.id}
              href={`/app/call/${tile.id}`}
              tabIndex={-1}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              onPointerEnter={() => (paused.current[i] = true)}
              onPointerLeave={() => (paused.current[i] = false)}
              className="stage-tile absolute left-0 top-0 z-[2] flex flex-col items-center justify-center p-1 text-center opacity-0 transition-[background-color] duration-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.image}
                alt={tile.question}
                width={128}
                height={128}
                className="h-[56%] w-[56%] rounded-full object-cover shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]"
              />
              <span className="mt-1 block max-w-[92%] truncate font-mono text-[9px] font-medium tracking-tight text-ink-2">
                {line}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
