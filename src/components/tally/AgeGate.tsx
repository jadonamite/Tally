"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function AgeGate({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const [state, setState] = useState<"loading" | "ok" | "blocked" | "unknown">("loading");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.age().then((r) => setState(r.state)).catch(() => setState("unknown")); }, []);
  if (state === "ok" || state === "loading") return null;

  return (
    <div className={`${theme === "dark" ? "app-dark" : "app-light"} fixed inset-0 z-50 flex items-center justify-center bg-(--s-bg) p-6 text-(--s-text)`}>
      <div className="w-full max-w-sm">
        {state === "blocked" ? (
          <p className="text-lg font-semibold">Tally isn&apos;t available to you.</p>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-[-0.03em]">Your date of birth</p>
            <input type="date" className="mt-4 min-h-11 w-full rounded-2xl border border-(--s-line) bg-(--s-card) px-4 text-[15px]" value={dob} onChange={(e) => setDob(e.target.value)} />
            {error && <p className="mt-2 text-sm text-(--s-lose)">{error}</p>}
            <button disabled={!dob} onClick={() => api.submitAge(dob).then((r) => setState(r.ok ? "ok" : "blocked")).catch((e) => setError(e.message))}
              className="mt-4 min-h-11 w-full rounded-full bg-(--s-act) px-5 text-[15px] font-semibold text-(--s-act-contrast) disabled:opacity-40">
              Continue
            </button>
            <p className="mt-3 text-xs text-(--s-sub)">We keep only whether you can use Tally, never the date.</p>
          </>
        )}
      </div>
    </div>
  );
}
