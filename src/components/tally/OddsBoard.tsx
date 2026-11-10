"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DisagreementItem } from "@/lib/types";
import { cents, polymarketUrl, timeUntil } from "@/lib/format";
import { Chip } from "./Chip";

export function OddsBoard({ now: nowProp }: { now?: number }) {
  const [markets, setMarkets] = useState<DisagreementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localNow, setLocalNow] = useState(() => Date.now());

  useEffect(() => {
    if (nowProp !== undefined) return;
    const timer = setInterval(() => setLocalNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [nowProp]);

  const now = nowProp ?? localNow;

  useEffect(() => {
    let active = true;
    function fetchDisagreements() {
      api.disagreements()
        .then((res) => {
          if (active) {
            setMarkets(res.markets ?? []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setMarkets([]);
            setLoading(false);
          }
        });
    }

    fetchDisagreements();
    const interval = setInterval(fetchDisagreements, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const sorted = [...markets].sort((a, b) => b.pointsApart - a.pointsApart);

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--s-sub)">
          Bookmakers vs Polymarket
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] md:text-3xl">
          Where the prices disagree
        </h2>
        <p className="mt-1 text-xs text-(--s-sub)">
          Median of bookmaker prices with each margin removed, beside the onchain price.
        </p>
      </div>

      {loading && (
        <p className="rounded-[22px] bg-(--s-card) px-5 py-4 text-sm text-(--s-sub)">
          Loading...
        </p>
      )}

      {!loading && sorted.length === 0 && (
        <p className="rounded-[22px] bg-(--s-card) px-5 py-4 text-sm text-(--s-sub)">
          No matched sports markets right now.
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((m) => {
            const until = timeUntil(m.lockAt, now);
            const startsIn = until === "started" ? "started" : `starts in ${until}`;
            const pts = Number(m.pointsApart.toFixed(1));

            return (
              <li
                key={m.slug}
                className="rounded-[22px] border border-transparent bg-(--s-card) transition-colors hover:border-(--s-line)"
              >
                <a
                  href={polymarketUrl(m.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="block min-h-[44px] p-4"
                >
                  <div className="flex items-start gap-3">
                    {m.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-(--s-text)">
                          {m.question}
                        </p>
                        <Chip tone={m.disagree ? "gold" : "sub"}>
                          {`${pts} pts apart`}
                        </Chip>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs tabular-nums text-(--s-sub)">
                        <span>{startsIn}</span>
                        <span>·</span>
                        <span>
                          {m.books} {m.books === 1 ? "bookmaker" : "bookmakers"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {([0, 1] as const).map((idx) => {
                      const outcome = m.outcomes?.[idx];
                      const label = outcome?.label ?? (idx === 0 ? "Yes" : "No");
                      const poly = m.polyPrices?.[idx] ?? outcome?.price ?? null;
                      const book = m.bookProbs?.[idx] ?? null;

                      return (
                        <div
                          key={idx}
                          className="rounded-xl bg-(--s-bg) p-2.5 text-xs"
                        >
                          <p className="truncate font-semibold text-(--s-text)">
                            {label}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono tabular-nums text-xs text-(--s-sub)">
                            <span>
                              Polymarket{" "}
                              <span className="font-semibold text-(--s-text)">
                                {cents(poly)}
                              </span>
                            </span>
                            <span>
                              Bookmaker consensus{" "}
                              <span className="font-semibold text-(--s-text)">
                                {cents(book)}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
