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
const title = "mt-2 mb-5 text-2xl font-bold tracking-[-0.03em]";

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
  const graded = calls.filter((c) => c.status === "graded").slice(0, 10);
  const waiting = calls.filter((c) => c.status === "locked").slice(0, 10);

  const Group = ({ label, items }: { label: string; items: CallView[] }) =>
    items.length ? (
      <section className="mb-6">
        <p className={`${eyebrow} mb-2`}>{label}</p>
        <ul className="space-y-2">{items.map((c) => <CallCard key={c.id} call={c} now={now} />)}</ul>
      </section>
    ) : null;

  return (
    <main className={`${theme === "dark" ? "app-dark" : "app-light"} mx-auto w-full min-w-0 min-h-dvh max-w-md bg-(--s-bg) pb-24 text-(--s-text)`}>
      <AgeGate theme={theme} />
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-(--s-line) bg-(--s-bg-blur) px-5 py-3.5 backdrop-blur">
        <Logo />
        <button onClick={toggleTheme} aria-label="Toggle theme" className="flex h-11 w-11 items-center justify-center rounded-full text-(--s-sub) hover:text-(--s-text)">
          {theme === "dark" ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
        </button>
      </header>

      {tab === "calls" && (
        <div className="px-5 pt-5">
          <p className={eyebrow}>Before the start</p>
          <h2 className={title}>This round</h2>
          {calls.length === 0 && (
            <p className="rounded-[22px] bg-(--s-card) px-4 py-3.5 text-sm text-(--s-sub)">No calls yet. Paste one you were sent, or follow a Polymarket wallet from Voices.</p>
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

      <button onClick={() => setAdding(true)}
        className="fixed bottom-20 right-5 z-20 min-h-12 rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
        Add a call
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-(--s-line) bg-(--s-bg-blur) backdrop-blur">
        {([["calls", "Calls", MarketsIcon], ["voices", "Voices", PortfolioIcon], ["you", "You", YouIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${tab === id ? "text-(--s-act-soft)" : "text-(--s-sub)"}`}>
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
    <div className="px-5 pt-5">
      <p className={eyebrow}>Who you follow</p>
      <h2 className={title}>Voices</h2>
      <ul className="space-y-2">
        {voices.map((v) => (
          <li key={v.id} className="rounded-[22px] bg-(--s-card)">
            <Link href={`/app/voice/${v.id}`} className="block min-h-11 p-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-semibold">{v.displayName}</p>
                <Chip tone={v.standing === "earned" ? "win" : v.standing === "unproven" ? "sub" : "lose"}>{STANDING_LABEL[v.standing].toUpperCase()}</Chip>
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">{recordLine(v)}</p>
            </Link>
          </li>
        ))}
        {voices.length === 0 && <li className="text-sm text-(--s-sub)">Nobody yet. Add a call, or follow a wallet below.</li>}
      </ul>
      <div className="mt-6 rounded-[22px] bg-(--s-card) p-4">
        <p className="text-sm font-semibold">Follow a Polymarket wallet</p>
        <p className="mt-1 text-xs text-(--s-sub)">Every first buy is already timestamped on Polygon. Tally checks the time through Tatum and grades it the same way.</p>
        <input className="mt-3 min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-bg) px-4 text-[15px]" placeholder="0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <button disabled={busy || wallet.trim().length < 42} onClick={follow}
          className="mt-3 min-h-11 w-full rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) disabled:opacity-40">
          {busy ? "Importing…" : "Follow"}
        </button>
        {msg && <p className="mt-2 text-sm text-(--s-sub)">{msg}</p>}
      </div>
    </div>
  );
}

function YouTab() {
  const [bankroll, setBankroll] = useState<string>("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.me().then((r) => setBankroll(String(r.bankroll))).catch(() => {}); }, []);
  return (
    <div className="px-5 pt-5">
      <p className={eyebrow}>Settings</p>
      <h2 className={title}>You</h2>
      <div className="rounded-[22px] bg-(--s-card) p-4">
        <label className="text-sm font-semibold">Bankroll for stake suggestions</label>
        <p className="mt-1 text-xs text-(--s-sub)">Tally never holds or moves money. This only sizes the suggestion: half-Kelly, never above 2%.</p>
        <div className="mt-3 flex gap-2">
          <input inputMode="decimal" className="min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-bg) px-4 text-[15px] tabular-nums" value={bankroll} onChange={(e) => { setBankroll(e.target.value); setSaved(false); }} />
          <button onClick={() => api.setBankroll(Number(bankroll)).then(() => setSaved(true)).catch(() => {})} className="min-h-11 rounded-full bg-(--s-text) px-5 text-sm font-semibold text-(--s-bg)">{saved ? "Saved" : "Save"}</button>
        </div>
      </div>
      <div className="mt-4 rounded-[22px] bg-(--s-card) p-4 text-sm leading-relaxed text-(--s-sub)">
        <p className="font-semibold text-(--s-text)">How Tally scores</p>
        <p className="mt-2">A call counts only if it was sealed before the market started. At the start, Tally records the price. A voice that keeps getting in before the price moves their way, and makes money on it, earns a look. Win rate is not the score: backing heavy favourites wins often and makes nothing.</p>
        <p className="mt-2">A voice needs 10 graded calls before Tally judges it.</p>
      </div>
      <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-(--s-sub)">
        <Link className="min-h-11 inline-flex items-center" href="/terms">Terms</Link>
        <Link className="min-h-11 inline-flex items-center" href="/privacy">Privacy</Link>
        <Link className="min-h-11 inline-flex items-center" href="/cookies">Cookies</Link>
      </nav>
    </div>
  );
}
