"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";

const PILL_BAND_PX = 64;

const LINKS = [
  { href: "/#callers", label: "Callers" },
  { href: "/#proof", label: "Proof" },
  { href: "/#how", label: "How it works" },
];

export function LandingNav() {
  const [revealed, setRevealed] = useState(false);
  const [overLight, setOverLight] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setRevealed(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const light = document.querySelector(".act-light");
    if (!light) return;
    const observer = new IntersectionObserver(([entry]) => setOverLight(entry.isIntersecting), {
      rootMargin: `-${PILL_BAND_PX}px 0px 0px 0px`,
      threshold: 0,
    });
    observer.observe(light);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="act-light relative z-20 w-full bg-transparent">
        <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:px-10">
          <Bar />
        </div>
      </header>

      <div ref={sentinel} aria-hidden className="h-0 w-full" />

      {revealed && (
        <div
          className={`fixed inset-x-0 top-3 z-40 px-4 sm:top-4 sm:px-6 ${
            overLight ? "act-light" : ""
          } bg-transparent`}
        >
          <div className="mx-auto w-full max-w-7xl">
            <Bar floating />
          </div>
        </div>
      )}
    </>
  );
}

function Bar({ floating = false }: { floating?: boolean }) {
  return (
    <nav
      className={`flex items-center justify-between gap-4 ${
        floating
          ? "rounded-full border border-edge/70 bg-surface/85 px-4 py-2.5 backdrop-blur-md sm:px-5"
          : ""
      }`}
    >
      <Link href="/" className="shrink-0" aria-label="Tally, home">
        <Logo />
      </Link>

      <div className="hidden items-center gap-7 sm:flex">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </div>

      <Link
        href="/app"
        className="shrink-0 rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-plane transition-opacity hover:opacity-85"
      >
        Open app
      </Link>
    </nav>
  );
}
