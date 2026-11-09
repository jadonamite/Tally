"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/tally/useTheme";
import { CallCard } from "@/components/tally/CallCard";
import { api } from "@/lib/api";
import type { CallView, MemoryHit, VoiceView } from "@/lib/types";
import { STANDING_LABEL, signedCents, perDollar, walrusBlobUrl, short } from "@/lib/format";

export default function VoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [theme] = useTheme();
  const [voice, setVoice] = useState<VoiceView | null>(null);
  const [calls, setCalls] = useState<CallView[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemoryHit[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    api.voice(id).then((r) => { setVoice(r.voice); setCalls(r.calls); }).catch(() => {});
    api.recall(id, "").then((r) => setHits(r.hits)).catch(() => setHits([]));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [id]);

  const ask = () => { setHits(null); api.recall(id, q).then((r) => setHits(r.hits)).catch(() => setHits([])); };

  return (
    <main className={`${theme === "dark" ? "app-dark" : "app-light"} mx-auto min-h-dvh max-w-md bg-(--s-bg) px-5 pb-16 pt-4 text-(--s-text)`}>
      <Link href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold text-(--s-sub)">Back</Link>
      {voice && (
        <>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">{voice.kind}</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em]">{voice.displayName}</h1>
          <p className={`mt-1 text-lg font-semibold ${voice.standing === "earned" ? "text-(--s-win)" : voice.standing === "unproven" ? "text-(--s-sub)" : "text-(--s-lose)"}`}>{STANDING_LABEL[voice.standing]}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([[String(voice.n), "sealed calls graded"], [signedCents(voice.meanBeatClose), "vs the price"], [perDollar(voice.pnlPerBet).replace(" per $1", ""), "per $1 staked"]] as const).map(([v, l]) => (
              <div key={l} className="rounded-[22px] bg-(--s-card) p-4">
                <p className="text-xl font-semibold tabular-nums">{v}</p>
                <p className="mt-0.5 text-xs text-(--s-sub)">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-(--s-sub) tabular-nums">{voice.won} won, {voice.lost} lost. Not the score.</p>

          <section className="mt-6 rounded-[22px] bg-(--s-card) p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Tally remembers</p>
            <p className="mt-1 text-xs text-(--s-sub)">Every call, grade and change of standing is stored in Walrus Memory. Ask it anything about this voice.</p>
            <div className="mt-3 flex gap-2">
              <input className="min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-bg) px-4 text-[15px]" placeholder="Their last bitcoin calls" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
              <button onClick={ask} className="min-h-11 rounded-full bg-(--s-text) px-5 text-sm font-semibold text-(--s-bg)">Ask</button>
            </div>
            {hits === null && <p className="mt-3 text-sm text-(--s-sub)">Looking back…</p>}
            <ul className="mt-3 space-y-3">
              {hits?.map((h) => (
                <li key={h.blobId} className="text-sm leading-relaxed">
                  {h.text}
                  <a href={walrusBlobUrl(h.blobId)} target="_blank" rel="noreferrer" className="ml-1 font-mono text-[11px] text-(--s-sub) underline">blob {short(h.blobId, 4)}</a>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-6 mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Every sealed call</p>
          <ul className="space-y-2">{calls.map((c) => <CallCard key={c.id} call={c} now={now} />)}</ul>
        </>
      )}
    </main>
  );
}
