"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";

export interface NavItem {
  href: string;
  label: string;
}

export function NavBar({
  links,
  surface = "pill",
  action,
}: {
  links: NavItem[];
  surface?: "light" | "dark" | "pill" | "pill-light";
  action: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const onDark = surface === "dark" || surface === "pill";
  const isPill = surface === "pill" || surface === "pill-light";

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <div ref={root} className="relative">
      <div
        className={
          !isPill
            ? "relative flex items-center justify-between gap-3"
            : onDark
              ? "relative flex items-center justify-between gap-3 rounded-full border border-white/15 bg-tile-ink/95 px-4 py-2 shadow-[0_10px_36px_-12px_rgba(0,0,0,0.45)] supports-[backdrop-filter]:bg-tile-ink/65 supports-[backdrop-filter]:backdrop-blur-xl sm:px-6 motion-safe:transition-colors motion-safe:duration-300"
              : "relative flex items-center justify-between gap-3 rounded-full border border-black/10 bg-plane/95 px-4 py-2 shadow-[0_10px_36px_-12px_rgba(0,0,0,0.22)] supports-[backdrop-filter]:bg-plane/70 supports-[backdrop-filter]:backdrop-blur-xl sm:px-6 motion-safe:transition-colors motion-safe:duration-300"
        }
      >
        {/* Left: links from md up, the toggle below it. */}
        <div className="flex items-center">
          <nav aria-label="Sections" className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                pathname={pathname}
                onDark={onDark}
              />
            ))}
          </nav>
          <MenuToggle
            open={menuOpen}
            onDark={onDark}
            onToggle={() => setMenuOpen((v) => !v)}
            className="lg:hidden"
          />
        </div>

        {/* Absolutely centred mark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Link
            href="/"
            aria-label="Tally home"
            className="pointer-events-auto inline-flex items-center"
          >
            <Logo className="text-xl" />
          </Link>
        </div>

        <div className="flex shrink-0 items-center">{action}</div>
      </div>

      <MobileMenu
        open={menuOpen}
        onDark={onDark}
        links={links}
        pathname={pathname}
        onNavigate={() => setMenuOpen(false)}
      />
    </div>
  );
}

function MenuToggle({
  open,
  onDark,
  onToggle,
  className = "",
}: {
  open: boolean;
  onDark: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const bar = `absolute left-1/2 h-[1.5px] w-[18px] -translate-x-1/2 rounded-full motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${
    onDark ? "bg-white" : "bg-ink"
  }`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      className={`relative -ml-2 h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full ${className}`}
    >
      <span
        className={`${bar} ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[calc(50%-5px)] -translate-y-1/2"}`}
      />
      <span
        className={`${bar} top-1/2 -translate-y-1/2 motion-safe:transition-opacity ${open ? "scale-x-0 opacity-0" : "opacity-100"}`}
      />
      <span
        className={`${bar} ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[calc(50%+5px)] -translate-y-1/2"}`}
      />
    </button>
  );
}

function MobileMenu({
  open,
  onDark,
  links,
  pathname,
  onNavigate,
}: {
  open: boolean;
  onDark: boolean;
  links: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`absolute left-0 top-[calc(100%+10px)] z-50 w-56 origin-top-left rounded-3xl border p-2 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.45)] lg:hidden motion-safe:transition-[opacity,transform,visibility] motion-safe:duration-200 motion-safe:ease-out ${
        onDark
          ? "border-white/15 bg-tile-ink/95 supports-[backdrop-filter]:bg-tile-ink/85 supports-[backdrop-filter]:backdrop-blur-xl"
          : "border-rule bg-surface"
      } ${open ? "visible scale-100 opacity-100" : "invisible scale-75 opacity-0"}`}
      aria-hidden={!open}
    >
      <nav aria-label="Sections" className="flex flex-col">
        {links.map((link, i) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              tabIndex={open ? undefined : -1}
              style={{
                transitionDelay: open ? `${60 + i * 45}ms` : `${(links.length - 1 - i) * 35}ms`,
              }}
              className={`flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-medium motion-safe:transition-[opacity,transform] motion-safe:duration-200 ${
                open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              } ${
                active
                  ? "text-lime"
                  : onDark
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-ink-2 hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
  onDark = false,
}: {
  href: string;
  label: string;
  pathname: string;
  onDark?: boolean;
}) {
  const active = pathname === href;
  const base = "whitespace-nowrap text-[13px] font-medium transition-colors min-h-[44px] inline-flex items-center";

  if (active) return <Link href={href} className={`${base} text-lime`}>{label}</Link>;

  return (
    <Link
      href={href}
      className={`${base} ${onDark ? "text-white/70 hover:text-white" : "text-ink-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
}
