"use client";

import { useEffect, useState } from "react";
import type { MarketOption, MemoryHit, VoiceView, OddsComparison } from "@/lib/types";
import { api } from "@/lib/api";
import { cents, timeUntil, utcTime, suiTxUrl, STANDING_LABEL, walrusBlobUrl, short } from "@/lib/format";
import { Sheet } from "./Sheet";

const KINDS: [string, string][] = [["telegram", "Telegram"], ["x", "X"], ["other", "Somewhere else"], ["self", "Me"]];
const input = "min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-card) px-4 text-[15px] text-(--s-text) placeholder:text-(--s-sub)";

export function AddCallSheet({ theme, voices, onClose, onSealed }: {
  theme: "light" | "dark"; voices: VoiceView[]; onClose: () => void; onSealed: () => void;
}) {
  const pasteable = voices.filter((v) => v.kind !== "wallet");
  const [voiceId, setVoiceId] = useState<string>(pasteable[0]?.id ?? "new");
  const [newKind, setNewKind] = useState("telegram");
  const [newHandle, setNewHandle] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"crypto" | "search">("crypto");
  const [q, setQ] = useState("");
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [market, setMarket] = useState<MarketOption | null>(null);
  const [side, setSide] = useState<0 | 1 | null>(null);
  const [odds, setOdds] = useState<(OddsComparison & { slug: string }) | null>(null);
  const [memories, setMemories] = useState<MemoryHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; sealedAt: string | null; digest: string | null; lockAt: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (mode === "crypto") api.cryptoMarkets().then((r) => setMarkets(r.markets)).catch(() => setMarkets([])); }, [mode]);
  useEffect(() => {
    if (mode !== "search" || q.trim().length < 2) return;
    const t = setTimeout(() => api.searchMarkets(q).then((r) => setMarkets(r.markets)).catch(() => setMarkets([])), 400);
    return () => clearTimeout(t);
  }, [q, mode]);
  useEffect(() => {
    if (voiceId === "new" || !market) return;
    let live = true;
    api.recall(voiceId, market.question).then((r) => live && setMemories(r.hits)).catch(() => live && setMemories([]));
    return () => { live = false; };
  }, [voiceId, market]);

  useEffect(() => {
    if (!market) return;
    let live = true;
    api.oddsComparison(market.slug)
      .then((r) => live && setOdds({ slug: market.slug, ...r }))
      .catch(() => live && setOdds({ slug: market.slug, matched: false }));
    return () => { live = false; };
  }, [market]);

  const voice = voices.find((v) => v.id === voiceId);

  async function seal() {
    setBusy(true); setError(null);
    try {
      let vid = voiceId;
      if (vid === "new") vid = (await api.addVoice(newKind, newHandle)).id;
      const { id } = await api.capture({ voiceId: vid, rawText: text, marketSlug: market!.slug, outcomeIndex: side! });
      const { call } = await api.call(id);
      setDone({ id, sealedAt: call.sealedAt, digest: call.sealRef, lockAt: call.lockAt });
      onSealed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const lead = done.sealedAt ? Math.round((Date.parse(done.lockAt) - Date.parse(done.sealedAt)) / 1000) : null;
    return (
      <Sheet theme={theme} onClose={onClose}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Sealed on Sui</p>
        <p className="mt-2 text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
          {done.sealedAt ? utcTime(done.sealedAt) : "Waiting for the checkpoint time"}
        </p>
        {lead !== null && <p className="mt-2 text-sm text-(--s-sub) tabular-nums">{Math.floor(lead / 60)}m {lead % 60}s before the start. Read back through Tatum.</p>}
        {done.digest && <a className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-(--s-act)" href={suiTxUrl(done.digest)} target="_blank" rel="noreferrer">See the transaction</a>}
        <a className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast)" href={`/app/call/${done.id}`}>Open the call</a>
      </Sheet>
    );
  }

  const ready = (voiceId !== "new" || (newKind === "self" || newHandle.trim().length >= 2)) && text.trim().length > 0 && market && side !== null;

  return (
    <Sheet theme={theme} onClose={onClose}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">New call</p>
      <h2 className="mt-2 mb-5 text-2xl font-bold tracking-[-0.03em]">Seal what you were sent</h2>

      <label className="text-sm font-semibold">Who sent it</label>
      <select className={`${input} mt-2`} value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
        {pasteable.map((v) => <option key={v.id} value={v.id}>{v.displayName} · {STANDING_LABEL[v.standing]}</option>)}
        <option value="new">Someone new</option>
      </select>
      {voiceId === "new" && (
        <div className="mt-2 flex gap-2">
          <select className={`${input} w-40`} value={newKind} onChange={(e) => setNewKind(e.target.value)}>
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {newKind !== "self" && <input className={input} placeholder="@channel or name" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} />}
        </div>
      )}

      <label className="mt-5 text-sm font-semibold">Their words</label>
      <textarea className={`${input} mt-2 min-h-28 py-3`} placeholder="Paste the call exactly as it was sent" value={text} onChange={(e) => setText(e.target.value)} />

      <label className="mt-5 text-sm font-semibold">Which market</label>
      <div className="mt-2 flex gap-2">
        {(["crypto", "search"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setMarket(null); setSide(null); setMarkets([]); }}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${mode === m ? "bg-(--s-text) text-(--s-bg)" : "bg-(--s-card) text-(--s-sub)"}`}>
            {m === "crypto" ? "Crypto, next 5 min" : "Search"}
          </button>
        ))}
      </div>
      {mode === "search" && <input className={`${input} mt-2`} placeholder="Team, coin, election…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <ul className="mt-2 space-y-2">
        {markets.slice(0, 8).map((m) => (
          <li key={m.slug}>
            <button onClick={() => { setMarket(m); setSide(null); setMemories(null); }}
              className={`min-h-11 w-full rounded-2xl px-4 py-3 text-left text-sm ${market?.slug === m.slug ? "bg-(--s-act-tint) ring-1 ring-(--s-act)" : "bg-(--s-card)"}`}>
              <span className="font-semibold">{m.question}</span>
              <span className="mt-1 block font-mono text-xs tabular-nums text-(--s-sub)">starts in {timeUntil(m.lockAt, now)}</span>
            </button>
          </li>
        ))}
        {markets.length === 0 && <li className="text-sm text-(--s-sub)">{mode === "search" ? "Type at least two letters." : "Loading the next windows."}</li>}
      </ul>

      {market && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {market.outcomes.map((o, i) => (
            <button key={o.label} onClick={() => setSide(i as 0 | 1)}
              className={`min-h-11 rounded-2xl px-4 py-3 text-[15px] font-semibold tabular-nums ${side === i ? (i === 0 ? "bg-(--s-win-tint) text-(--s-win) ring-1 ring-(--s-win)" : "bg-(--s-lose-tint) text-(--s-lose) ring-1 ring-(--s-lose)") : "bg-(--s-card)"}`}>
              {o.label} {cents(o.price)}
            </button>
          ))}
        </div>
      )}

      {market && side !== null && odds?.slug === market.slug && odds.matched && odds.bookProbs && (
        <div className="mt-3 rounded-2xl bg-(--s-card) p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-(--s-text)">
              Bookmakers say {cents(odds.bookProbs[side])}. Polymarket says {cents(market.outcomes[side].price)}.
            </span>
            {odds.disagree && (
              <span className="rounded-full bg-(--s-gold) px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                {Math.round(odds.pointsApart ?? 0)} pts apart
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-(--s-sub)">Consensus of {odds.books} bookmakers, margin removed.</p>
        </div>
      )}

      {voice && market && (
        <div className="mt-5 rounded-[22px] bg-(--s-card) p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Tally remembers</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold">{voice.displayName}: {STANDING_LABEL[voice.standing]}</span>
            {voice.credBlob && (
              <a href={walrusBlobUrl(voice.credBlob)} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-(--s-act) underline">
                blob {short(voice.credBlob, 4)}
              </a>
            )}
          </div>
          {memories === null && <p className="mt-2 text-sm text-(--s-sub)">Looking back…</p>}
          {memories?.length === 0 && <p className="mt-2 text-sm text-(--s-sub)">Nothing from this voice yet.</p>}
          <ul className="mt-2 space-y-2">
            {memories?.slice(0, 3).map((m) => (
              <li key={m.blobId} className="text-xs leading-relaxed text-(--s-sub)">
                {m.text}
                <a href={walrusBlobUrl(m.blobId)} target="_blank" rel="noreferrer" className="ml-1 font-mono text-[11px] text-(--s-act) underline">
                  blob {short(m.blobId, 4)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-(--s-lose)">{error}</p>}
      <button disabled={!ready || busy} onClick={seal}
        className="mt-5 min-h-11 w-full rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) disabled:opacity-40">
        {busy ? "Sealing on Sui…" : "Seal this call"}
      </button>
      <p className="mt-2 text-center text-xs text-(--s-sub)">Only calls sealed before the start are ever graded.</p>
    </Sheet>
  );
}
