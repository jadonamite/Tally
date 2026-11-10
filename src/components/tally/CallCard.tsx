"use client";

import { useState } from "react";
import Link from "next/link";
import type { CallView } from "@/lib/types";
import { cents, signedCents, perDollar, STATUS_CHIP, STANDING_LABEL, timeUntil, usd, walrusBlobUrl, short } from "@/lib/format";
import { Chip } from "./Chip";
import { PickIcon } from "@/components/icons";
import { api } from "@/lib/api";

export function CallCard({ call, now, onDecisionChange }: { call: CallView; now: number; onDecisionChange?: () => void }) {
  const [decision, setDecision] = useState<"take" | "pass" | null>(call.userDecision ?? null);
  const [deciding, setDeciding] = useState(false);

  const dim = call.status === "open" && (call.voiceStanding === "not_earned" || call.voiceStanding === "tombstoned");
  const chip =
    call.status === "graded" && call.result
      ? { label: call.result === "won" ? "WON" : "LOST", tone: call.result === "won" ? ("win" as const) : ("lose" as const) }
      : STATUS_CHIP[call.status];

  const handleDecide = async (e: React.MouseEvent, choice: "take" | "pass") => {
    e.preventDefault();
    e.stopPropagation();
    setDeciding(true);
    try {
      await api.decide(call.id, choice);
      setDecision(choice);
      onDecisionChange?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeciding(false);
    }
  };

  return (
    <li className={`rounded-[22px] bg-(--s-card) transition-opacity ${dim ? "opacity-55" : ""}`}>
      <Link href={`/app/call/${call.id}`} className="block min-h-11 p-4">
        <div className="flex items-start gap-2">
          {call.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={call.image} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          )}
          <p className="flex-1 text-sm font-semibold leading-snug">{call.question}</p>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <p className="mt-1 font-mono text-xs tabular-nums text-(--s-sub)">
          <span className="inline-flex items-center gap-1 font-semibold text-(--s-gold)">
            <PickIcon className="h-3.5 w-3.5" />
            {call.outcomeLabel}
          </span>
          {` at ${cents(call.entryPrice)}`}
          {call.status === "open" && ` · starts in ${timeUntil(call.lockAt, now)}`}
          {call.status === "graded" && ` · ${signedCents(call.beatClose)} vs price · ${perDollar(call.pnlPerDollar)}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-(--s-sub)">
          <p>
            <span className="font-semibold text-(--s-text)">{call.voiceName}</span> · {STANDING_LABEL[call.voiceStanding]} · {call.voiceRecord}
          </p>
          {call.credBlob && (
            <a
              href={walrusBlobUrl(call.credBlob)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[11px] text-(--s-act) underline hover:opacity-80"
              title="Verdict recalled from Walrus Memory"
            >
              from memory {short(call.credBlob, 4)}
            </a>
          )}
        </div>
        {call.status === "open" && call.suggestedStake > 0 && (
          <p className="mt-2 text-xs font-semibold text-(--s-win)">Suggested stake {usd(call.suggestedStake)} (half-Kelly, 2% cap)</p>
        )}

        {/* User Decision (Taking it vs Passing) */}
        {call.status === "open" && (
          <div className="mt-3 flex items-center justify-between border-t border-(--s-line) pt-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                disabled={deciding}
                onClick={(e) => handleDecide(e, "take")}
                className={`min-h-8 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  decision === "take"
                    ? "bg-(--s-win) text-white"
                    : "bg-(--s-bg) text-(--s-text) hover:bg-(--s-line)"
                }`}
              >
                {decision === "take" ? "Taking it" : "Take"}
              </button>
              <button
                disabled={deciding}
                onClick={(e) => handleDecide(e, "pass")}
                className={`min-h-8 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  decision === "pass"
                    ? "bg-(--s-sub) text-white"
                    : "bg-(--s-bg) text-(--s-text) hover:bg-(--s-line)"
                }`}
              >
                {decision === "pass" ? "Passing" : "Pass"}
              </button>
            </div>
            {decision && call.userDecisionBlob && (
              <a
                href={walrusBlobUrl(call.userDecisionBlob)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-[10px] text-(--s-sub) underline"
              >
                blob {short(call.userDecisionBlob, 4)}
              </a>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}
