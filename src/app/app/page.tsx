"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketsIcon, PortfolioIcon, YouIcon, SunIcon, MoonIcon } from "@/components/icons";
import { useTheme } from "@/components/tally/useTheme";
import { CallCard } from "@/components/tally/CallCard";
import { AddCallSheet } from "@/components/tally/AddCallSheet";
import { Chip } from "@/components/tally/Chip";
import { AgeGate } from "@/components/tally/AgeGate";
import { ConsentNotice } from "@/components/tally/ConsentNotice";
import { api } from "@/lib/api";
import type { CallView, VoiceView } from "@/lib/types";
import { STANDING_LABEL } from "@/lib/format";
import { recordLine } from "@/lib/core/standing";

type Tab = "calls" | "voices" | "you";
const eyebrow = "font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)";
const title = "mt-2 mb-5 text-2xl font-bold tracking-[-0.03em] md:text-3xl";

export default function AppHome() {
  const [theme, toggleTheme] = useTheme();
  const [tab, setTab] = useState<Tab>("calls");
  const [calls, setCalls] = useState<CallView[]>([]);
  const [voices, setVoices] = useState<VoiceView[]>([]);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [c, v] = await Promise.all([api.calls().catch(() => ({ calls: [] })), api.voices().catch(() => ({ voices: [] }))]);
    setCalls(c.calls); setVoices(v.voices);
  }, []);

  useEffect(() => {
    api.sweep().catch(() => {}).finally(load);
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    const t2 = setInterval(() => api.sweep().catch(() => {}).finally(load), 30_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  const open = calls.filter((c) => c.status === "open");
  const earned = open.filter((c) => c.voiceStanding === "earned");
  const notEarned = open.filter((c) => c.voiceStanding === "not_earned" || c.voiceStanding === "tombstoned");
  const unproven = open.filter((c) => c.voiceStanding === "unproven");
  const graded = calls.filter((c) => c.status === "graded").slice(0, 12);
  const waiting = calls.filter((c) => c.status === "locked").slice(0, 12);

  const Group = ({ label, items }: { label: string; items: CallView[] }) =>
    items.length ? (
      <section className="mb-8">
        <p className={`${eyebrow} mb-3`}>{label}</p>
        <ul className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => <CallCard key={c.id} call={c} now={now} />)}
        </ul>
      </section>
    ) : null;

  return (
    <main className={`${theme === "dark" ? "app-dark" : "app-light"} min-h-dvh bg-(--s-bg) pb-24 text-(--s-text) md:pb-12`}>
      <AgeGate theme={theme} />

      {/* Responsive Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-(--s-line) bg-(--s-bg-blur) px-5 py-3.5 backdrop-blur md:px-8 md:py-3.5 lg:px-12">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-85">
            <Logo />
          </Link>
        </div>

        {/* Desktop Tab Switcher */}
        <nav className="hidden items-center gap-1 rounded-full border border-(--s-line) bg-(--s-card) p-1 md:flex">
          {([["calls", "Calls", MarketsIcon], ["voices", "Voices", PortfolioIcon], ["you", "You", YouIcon]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-full px-5 py-1.5 text-xs font-semibold transition ${
                tab === id ? "bg-(--s-text) text-(--s-bg)" : "text-(--s-sub) hover:text-(--s-text)"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAdding(true)}
            className="hidden min-h-10 items-center rounded-full bg-(--s-act) px-5 text-xs font-semibold text-(--s-act-contrast) shadow-sm transition-transform hover:scale-105 active:scale-95 md:inline-flex"
          >
            Add a call
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-full text-(--s-sub) transition-colors hover:text-(--s-text)"
          >
            {theme === "dark" ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <div className="mx-auto w-full max-w-md px-5 pt-5 md:max-w-4xl lg:max-w-6xl xl:max-w-7xl md:px-8 md:pt-8">
        {tab === "calls" && (
          <div>
            <div className="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
              <div>
                <p className={eyebrow}>Before the start</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] md:text-3xl">Live Calls Feed</h2>
              </div>
              <p className="font-mono text-xs text-(--s-sub)">
                Sealed on Sui & Polygon · Graded on kickoff price
              </p>
            </div>

            {calls.length === 0 && (
              <p className="rounded-[22px] bg-(--s-card) px-5 py-4 text-sm text-(--s-sub)">
                No calls yet. Paste one you were sent, or follow a Polymarket wallet from Voices.
              </p>
            )}

            <Group label="Earned a look" items={earned} />
            <Group label="Unproven" items={unproven} />
            <Group label="Hasn't beaten the price" items={notEarned} />
            <Group label="Started, waiting for the result" items={waiting} />
            <Group label="Just graded" items={graded} />
          </div>
        )}

        {tab === "voices" && <VoicesTab voices={voices} onChange={load} />}
        {tab === "you" && <YouTab />}
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-5 z-20 min-h-12 rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] md:hidden"
      >
        Add a call
      </button>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-(--s-line) bg-(--s-bg-blur) backdrop-blur md:hidden">
        {([["calls", "Calls", MarketsIcon], ["voices", "Voices", PortfolioIcon], ["you", "You", YouIcon]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
              tab === id ? "text-(--s-act-soft)" : "text-(--s-sub)"
            }`}
          >
            <Icon className={`h-6 w-6 transition ${tab === id ? "scale-110" : ""}`} />
            {label}
          </button>
        ))}
      </nav>

      {adding && <AddCallSheet theme={theme} voices={voices} onClose={() => setAdding(false)} onSealed={load} />}
      <ConsentNotice />
    </main>
  );
}

function VoicesTab({ voices, onChange }: { voices: VoiceView[]; onChange: () => void }) {
  const [wallet, setWallet] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function follow() {
    setBusy(true); setMsg(null);
    try {
      const { id } = await api.addVoice("wallet", wallet.trim());
      const { added } = await api.importWallet(id);
      setMsg(`Imported ${added} calls. Grading starts now.`);
      setWallet(""); onChange();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't follow that wallet."); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-7 lg:col-span-8">
        <p className={eyebrow}>Who you follow</p>
        <h2 className={title}>Voices</h2>
        <ul className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
          {voices.map((v) => (
            <li key={v.id} className="rounded-[22px] bg-(--s-card) transition-colors hover:border hover:border-(--s-line)">
              <Link href={`/app/voice/${v.id}`} className="block min-h-11 p-4">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-semibold truncate">{v.displayName}</p>
                  <Chip tone={v.standing === "earned" ? "win" : v.standing === "unproven" ? "sub" : "lose"}>
                    {STANDING_LABEL[v.standing].toUpperCase()}
                  </Chip>
                </div>
                <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">{recordLine(v)}</p>
              </Link>
            </li>
          ))}
          {voices.length === 0 && <li className="text-sm text-(--s-sub)">Nobody yet. Add a call, or follow a wallet below.</li>}
        </ul>
      </div>

      <div className="md:col-span-5 lg:col-span-4">
        <div className="sticky top-24 rounded-[22px] bg-(--s-card) p-5">
          <p className="text-sm font-semibold">Follow a Polymarket wallet</p>
          <p className="mt-1 text-xs leading-relaxed text-(--s-sub)">
            Every first buy is timestamped on Polygon. Tally checks the time through Tatum and grades it on kickoff price.
          </p>
          <input
            className="mt-4 min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-bg) px-4 text-[15px]"
            placeholder="0x…"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
          <button
            disabled={busy || wallet.trim().length < 42}
            onClick={follow}
            className="mt-3 min-h-11 w-full rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) disabled:opacity-40"
          >
            {busy ? "Importing…" : "Follow"}
          </button>
          {msg && <p className="mt-3 text-xs text-(--s-sub)">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function YouTab() {
  const [bankroll, setBankroll] = useState<string>("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.me().then((r) => setBankroll(String(r.bankroll))).catch(() => {}); }, []);

  return (
    <div className="grid gap-6 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-6 lg:col-span-5 space-y-4">
        <p className={eyebrow}>Settings</p>
        <h2 className={title}>You</h2>
        <div className="rounded-[22px] bg-(--s-card) p-5">
          <label className="text-sm font-semibold">Bankroll for stake suggestions</label>
          <p className="mt-1 text-xs text-(--s-sub)">Tally never holds money. This sizes the suggestion: half-Kelly, capped at 2%.</p>
          <div className="mt-3 flex gap-2">
            <input
              inputMode="decimal"
              className="min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-bg) px-4 text-[15px] tabular-nums"
              value={bankroll}
              onChange={(e) => { setBankroll(e.target.value); setSaved(false); }}
            />
            <button
              onClick={() => api.setBankroll(Number(bankroll)).then(() => setSaved(true)).catch(() => {})}
              className="min-h-11 rounded-full bg-(--s-text) px-5 text-sm font-semibold text-(--s-bg)"
            >
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        <div className="rounded-[22px] bg-(--s-card) p-5 text-sm leading-relaxed text-(--s-sub)">
          <p className="font-semibold text-(--s-text)">Anonymous device session</p>
          <p className="mt-1 text-xs">
            Tally uses an anonymous essential cookie (`tally_uid`) to keep your bankroll and followed voices.
            No sign up, email, or passwords required.
          </p>
        </div>
      </div>

      <div className="md:col-span-6 lg:col-span-7">
        <div className="rounded-[22px] bg-(--s-card) p-6 text-sm leading-relaxed text-(--s-sub)">
          <p className="font-semibold text-(--s-text)">How Tally scores</p>
          <p className="mt-3">
            A call counts only if it was sealed before the market started. At kickoff, Tally locks the market price.
            A voice that consistently gets in before the price moves their way, and makes money on it, earns a look.
            Win rate is not the score: backing heavy favourites wins often and makes nothing.
          </p>
          <p className="mt-3">
            A voice needs 10 graded calls before Tally computes its standing.
          </p>
          <div className="mt-6 border-t border-(--s-line) pt-4">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-(--s-sub)">
              <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/terms">Terms</Link>
              <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/privacy">Privacy</Link>
              <Link className="min-h-11 inline-flex items-center hover:text-(--s-text)" href="/cookies">Cookies</Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
