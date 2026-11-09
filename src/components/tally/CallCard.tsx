import Link from "next/link";
import type { CallView } from "@/lib/types";
import { cents, signedCents, perDollar, STATUS_CHIP, STANDING_LABEL, timeUntil, usd } from "@/lib/format";
import { Chip } from "./Chip";
import { PickIcon } from "@/components/icons";

export function CallCard({ call, now }: { call: CallView; now: number }) {
  const dim = call.status === "open" && (call.voiceStanding === "not_earned" || call.voiceStanding === "tombstoned");
  const chip =
    call.status === "graded" && call.result
      ? { label: call.result === "won" ? "WON" : "LOST", tone: call.result === "won" ? ("win" as const) : ("lose" as const) }
      : STATUS_CHIP[call.status];

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
        <p className="mt-2 text-xs text-(--s-sub)">
          <span className="font-semibold text-(--s-text)">{call.voiceName}</span> · {STANDING_LABEL[call.voiceStanding]} · {call.voiceRecord}
        </p>
        {call.status === "open" && call.suggestedStake > 0 && (
          <p className="mt-2 text-xs font-semibold text-(--s-win)">Suggested stake {usd(call.suggestedStake)} (half-Kelly, 2% cap)</p>
        )}
      </Link>
    </li>
  );
}
