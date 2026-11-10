"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketsIcon, PortfolioIcon, YouIcon, SunIcon, MoonIcon, SportsIcon } from "@/components/icons";
import { useTheme } from "@/components/tally/useTheme";
import { CallCard } from "@/components/tally/CallCard";
import { AddCallSheet } from "@/components/tally/AddCallSheet";
import { OddsBoard } from "@/components/tally/OddsBoard";
import { Chip } from "@/components/tally/Chip";
import { api } from "@/lib/api";
import type { CallView, VoiceView, UserScorecard, MemoryHit } from "@/lib/types";
import { STANDING_LABEL, walrusBlobUrl, short, perDollar } from "@/lib/format";
import { recordLine } from "@/lib/core/standing";

type Tab = "calls" | "voices" | "you" | "odds";
const eyebrow = "font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)";
const title = "mt-2 mb-5 text-2xl font-bold tracking-[-0.03em] md:text-3xl";

export default function AppHome() {
  const [theme, toggleTheme] = useTheme();
  const [tab, setTab] = useState<Tab>("calls");
  const [calls, setCalls] = useState<CallView[]>([]);
  const [voices, setVoices] = useState<VoiceView[]>([]);
  const [isExample, setIsExample] = useState(false);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [c, v] = await Promise.all([
      api.calls().catch(() => ({ calls: [], isExampleBoard: false })),
      api.voices().catch(() => ({ voices: [], isExampleBoard: false })),
    ]);
    setCalls(c.calls);
    setVoices(v.voices);
    setIsExample(Boolean(c.isExampleBoard || v.isExampleBoard));
  }, []);

  useEffect(() => {
    api.sweep().catch(() => {}).finally(load);
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    const t2 = setInterval(() => api.sweep().catch(() => {}).finally(load), 30_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  const open = calls.filter((c) => c.status === "open");

  // A4: Feed "For you" group first: open calls from voices the user has taken before
  const voicesTaken = new Set(calls.filter((c) => c.userDecision === "take").map((c) => c.voiceId));
  const forYou = open.filter((c) => voicesTaken.has(c.voiceId));
  const forYouIds = new Set(forYou.map((c) => c.id));

  const earned = open.filter((c) => c.voiceStanding === "earned" && !forYouIds.has(c.id));
  const notEarned = open.filter((c) => (c.voiceStanding === "not_earned" || c.voiceStanding === "tombstoned") && !forYouIds.has(c.id));
  const unproven = open.filter((c) => c.voiceStanding === "unproven" && !forYouIds.has(c.id));
  const graded = calls.filter((c) => c.status === "graded").slice(0, 12);
  const waiting = calls.filter((c) => c.status === "locked").slice(0, 12);

  const Group = ({ label, items, hint }: { label: string; items: CallView[]; hint?: string }) =>
    items.length ? (
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <p className={eyebrow}>{label}</p>
          {hint && <span className="font-mono text-xs text-(--s-sub)">{hint}</span>}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => <CallCard key={c.id} call={c} now={now} onDecisionChange={load} />)}
        </ul>
      </section>
    ) : null;

  return (
    <main className={`${theme === "dark" ? "app-dark" : "app-light"} min-h-dvh bg-(--s-bg) pb-24 text-(--s-text) md:pb-12`}>
      {/* Responsive Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-(--s-line) bg-(--s-bg-blur) px-5 py-3.5 backdrop-blur sm:px-8 md:px-10 lg:px-12">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-85">
            <Logo />
          </Link>
        </div>

        {/* Desktop Tab Switcher */}
        <nav className="hidden items-center gap-1 rounded-full border border-(--s-line) bg-(--s-card) p-1 md:flex">
          {([["calls", "Calls", MarketsIcon], ["voices", "Voices", PortfolioIcon], ["you", "You", YouIcon], ["odds", "Odds", SportsIcon]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
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
            className="hidden min-h-[44px] items-center rounded-full bg-(--s-act) px-5 text-xs font-semibold text-(--s-act-contrast) shadow-sm transition-transform hover:scale-105 active:scale-95 md:inline-flex"
          >
            Add a call
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-(--s-sub) transition-colors hover:text-(--s-text)"
          >
            {theme === "dark" ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <div className="mx-auto w-full max-w-7xl px-5 pt-5 sm:px-8 sm:pt-8 md:px-10">
        {tab === "calls" && (
          <div>
            {isExample && (
              <div className="mb-6 rounded-[22px] border border-(--s-line) bg-(--s-card) p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Chip tone="sub">EXAMPLE BOARD</Chip>
                      <span className="text-xs text-(--s-sub)">Read-only demo record</span>
                    </div>
                    <p className="mt-1 text-xs text-(--s-sub)">
                      You are viewing the example board. You can take or pass on open calls to train your personal Walrus memory, or start your own board.
                    </p>
                  </div>
                  <button
                    onClick={() => setAdding(true)}
                    className="shrink-0 min-h-11 rounded-full bg-(--s-act) px-5 text-xs font-semibold text-(--s-act-contrast) hover:opacity-90"
                  >
                    Start your own
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
              <div>
                <p className={eyebrow}>Before the start</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] md:text-3xl">Live Calls Feed</h2>
              </div>
              <p className="font-mono text-xs text-(--s-sub)">
                Verdicts read from Walrus Memory · Sealed on Sui & Polygon
              </p>
            </div>

            {calls.length === 0 && (
              <p className="rounded-[22px] bg-(--s-card) px-5 py-4 text-sm text-(--s-sub)">
                No calls yet. Paste a prediction you were sent, or follow an on-chain trader from Voices.
              </p>
            )}

            <Group label="For you" items={forYou} hint="From voices you followed before" />
            <Group label="Earned a look" items={earned} />
            <Group label="Unproven" items={unproven} />
            <Group label="Hasn't beaten the price" items={notEarned} />
            <Group label="Started, waiting for the result" items={waiting} />
            <Group label="Just graded" items={graded} />
          </div>
        )}

        {tab === "voices" && <VoicesTab voices={voices} onChange={load} />}
        {tab === "you" && <YouTab />}
        {tab === "odds" && <OddsBoard now={now} />}
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
        {([["calls", "Calls", MarketsIcon], ["voices", "Voices", PortfolioIcon], ["you", "You", YouIcon], ["odds", "Odds", SportsIcon]] as const).map(([id, label, Icon]) => (
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
                <div className="mt-1 flex items-center justify-between text-xs text-(--s-sub)">
                  <span className="font-mono tabular-nums">{recordLine(v)}</span>
                  {v.credBlob && (
                    <span className="font-mono text-[10px] text-(--s-act) underline">
                      memory {short(v.credBlob, 4)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
          {voices.length === 0 && <li className="text-sm text-(--s-sub)">Nobody yet. Add a call, or follow a wallet below.</li>}
        </ul>
      </div>

      <div className="md:col-span-5 lg:col-span-4">
        <div className="sticky top-24 rounded-[22px] bg-(--s-card) p-5">
          <p className="text-sm font-semibold">Follow an on-chain trader</p>
          <p className="mt-1 text-xs leading-relaxed text-(--s-sub)">
            Track any prediction market wallet. Tally timestamps every trade on Polygon through Tatum and grades it against the kickoff price.
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
  const [scorecard, setScorecard] = useState<UserScorecard | null>(null);
  const [memories, setMemories] = useState<MemoryHit[]>([]);

  useEffect(() => {
    api.me().then((r) => {
      setBankroll(String(r.bankroll));
      setScorecard(r.scorecard);
      setMemories(r.userMemories ?? []);
    }).catch(() => {});
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-6 lg:col-span-5 space-y-4">
        <p className={eyebrow}>Preferences & Memory</p>
        <h2 className={title}>You</h2>

        {/* User Scorecard (A4) */}
        {scorecard && (scorecard.taken.total > 0 || scorecard.passed.total > 0) && (
          <div className="rounded-[22px] bg-(--s-card) p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Your Scorecard</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-(--s-bg) p-3">
                <p className="text-xs text-(--s-sub)">Following calls</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {scorecard.taken.won}W - {scorecard.taken.lost}L
                </p>
                <p className="text-xs font-mono tabular-nums text-(--s-sub)">
                  {scorecard.taken.total} taken · {perDollar(scorecard.taken.pnl)}
                </p>
              </div>
              <div className="rounded-xl bg-(--s-bg) p-3">
                <p className="text-xs text-(--s-sub)">Passing calls</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {scorecard.passed.saved} saved
                </p>
                <p className="text-xs font-mono tabular-nums text-(--s-sub)">
                  {scorecard.passed.total} passed · {scorecard.passed.missed} missed wins
                </p>
              </div>
            </div>

            {scorecard.backedVoices.length > 0 && (
              <div className="mt-4 border-t border-(--s-line) pt-3">
                <p className="text-xs font-semibold text-(--s-sub)">Analysts you keep backing</p>
                <ul className="mt-2 space-y-1">
                  {scorecard.backedVoices.slice(0, 5).map((v) => (
                    <li key={v.voiceId} className="flex justify-between text-xs">
                      <span className="font-semibold text-(--s-text)">{v.displayName}</span>
                      <span className="font-mono text-(--s-sub)">{v.count} taken</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
            Tally uses an anonymous essential cookie (`tally_uid`) to keep your bankroll, followed voices, and decisions.
            No sign up, email, or passwords required.
          </p>
        </div>
      </div>

      <div className="md:col-span-6 lg:col-span-7 space-y-4">
        {/* What Tally remembers about you (A4) */}
        <div className="rounded-[22px] bg-(--s-card) p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Walrus Memory: About You</p>
          <p className="mt-1 text-xs text-(--s-sub)">
            Your decisions to follow or pass are remembered permanently on Walrus Memory under your personal namespace.
          </p>
          {memories.length === 0 ? (
            <p className="mt-4 rounded-xl bg-(--s-bg) p-4 text-xs text-(--s-sub)">
              No decisions remembered yet. Pick &ldquo;Take&rdquo; or &ldquo;Pass&rdquo; on any open call in the feed to start training your memory record.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {memories.map((m) => (
                <li key={m.blobId} className="rounded-xl bg-(--s-bg) p-3 text-xs leading-relaxed text-(--s-sub)">
                  <span>{m.text}</span>
                  <a
                    href={walrusBlobUrl(m.blobId)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 font-mono text-[10px] text-(--s-act) underline"
                  >
                    blob {short(m.blobId, 4)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[22px] bg-(--s-card) p-6 text-sm leading-relaxed text-(--s-sub)">
          <p className="font-semibold text-(--s-text)">How Tally scores</p>
          <p className="mt-3">
            Every call commits to Sui mainnet before kickoff. When the event locks, Tally captures the live market price.
            Callers who beat the closing line and deliver positive net profit earn Kelly stake sizing.
            Miss the line and you are benched. Zero fake win rates.
          </p>
          <p className="mt-3">
            Standings calculate dynamically across all historical graded calls on Walrus Memory.
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
