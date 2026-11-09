"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/tally/useTheme";
import { api } from "@/lib/api";
import type { CallView } from "@/lib/types";
import { cents, signedCents, perDollar, utcTime, suiTxUrl, polygonTxUrl, walrusBlobUrl, polymarketUrl, short } from "@/lib/format";

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [theme] = useTheme();
  const [call, setCall] = useState<CallView | null>(null);
  const [check, setCheck] = useState<Record<string, unknown> | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { api.call(id).then((r) => setCall(r.call)).catch(() => {}); }, [id]);

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-4 border-b border-(--s-line) py-3 text-sm last:border-0">
      <span className="text-(--s-sub)">{k}</span><span className="text-right font-mono tabular-nums">{v}</span>
    </div>
  );
  const link = (href: string, text: string) => <a className="text-(--s-act) underline" href={href} target="_blank" rel="noreferrer">{text}</a>;

  return (
    <main className={`${theme === "dark" ? "app-dark" : "app-light"} mx-auto min-h-dvh max-w-md bg-(--s-bg) px-5 pb-16 pt-4 text-(--s-text)`}>
      <Link href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold text-(--s-sub)">Back</Link>
      {call && (
        <>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">{call.voiceName}</p>
          <h1 className="mt-1 text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">{call.question}</h1>
          <p className="mt-2 text-lg font-semibold text-(--s-gold)">{call.outcomeLabel} at {cents(call.entryPrice)}</p>
          {call.source === "paste" && <blockquote className="mt-4 rounded-[22px] bg-(--s-card) p-4 text-sm leading-relaxed whitespace-pre-wrap">{call.rawText}</blockquote>}

          <section className="mt-4 rounded-[22px] bg-(--s-card) px-4">
            <Row k="Status" v={call.status.toUpperCase()} />
            <Row k="Market starts" v={utcTime(call.lockAt)} />
            <Row k={call.sealKind === "polygon" ? "Bought on Polygon" : "Sealed on Sui"} v={call.sealedAt ? utcTime(call.sealedAt) : "pending"} />
            {call.sealRef && <Row k="Transaction" v={link(call.sealKind === "polygon" ? polygonTxUrl(call.sealRef) : suiTxUrl(call.sealRef), short(call.sealRef))} />}
            {call.sealCheckpoint && <Row k={call.sealKind === "polygon" ? "Block" : "Checkpoint"} v={call.sealCheckpoint} />}
            <Row k="Price at the start" v={cents(call.closePrice)} />
            {call.result && <Row k="Result" v={call.result.toUpperCase()} />}
            {call.status === "graded" && <Row k="Against the price" v={signedCents(call.beatClose)} />}
            {call.status === "graded" && <Row k="Profit" v={perDollar(call.pnlPerDollar)} />}
            {call.memCallBlob && <Row k="Memory (call)" v={link(walrusBlobUrl(call.memCallBlob), short(call.memCallBlob, 4))} />}
            {call.memGradeBlob && <Row k="Memory (grade)" v={link(walrusBlobUrl(call.memGradeBlob), short(call.memGradeBlob, 4))} />}
            <Row k="Market" v={link(polymarketUrl(call.marketSlug), "Polymarket")} />
          </section>

          <section className="mt-4 rounded-[22px] bg-(--s-card) p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">Check it yourself</p>
            <p className="mt-2 text-xs text-(--s-sub)">This exact text was hashed with SHA-256. The hash is inside the transaction above.</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-(--s-bg) p-3 font-mono text-[11px] leading-relaxed">{call.canonical}</pre>
            <p className="mt-2 break-all font-mono text-[11px] text-(--s-sub)">sha256 {call.callHash}</p>
            <button onClick={() => { setChecking(true); api.verify(call.id).then(setCheck).finally(() => setChecking(false)); }}
              className="mt-3 min-h-11 w-full rounded-full bg-(--s-text) px-5 text-sm font-semibold text-(--s-bg)">
              {checking ? "Reading the chain through Tatum…" : "Re-check the seal now"}
            </button>
            {check && (
              <ul className="mt-3 space-y-1 font-mono text-xs">
                <li>hash matches text: {String(check.hashMatches)}</li>
                {"memoOnChain" in check && <li>hash found on chain: {String(check.memoOnChain)}</li>}
                <li>chain time: {String(check.chainTime)}</li>
                <li>before the start: {String(check.beforeStart)}</li>
                <li>read via: {String(check.readVia)}</li>
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
