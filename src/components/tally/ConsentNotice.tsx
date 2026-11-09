"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function ConsentNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { setShow(localStorage.getItem("tally.cookies") !== "ok"); } catch { setShow(true); }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-36 z-30 mx-auto max-w-md px-5">
      <div className="rounded-[22px] border border-(--s-line) bg-(--s-card) p-4 text-sm shadow-2xl">
        <p>Tally uses only the cookies it needs to work: one to recognise your device and one for the age check. No tracking. <Link href="/cookies" className="underline">Cookie policy</Link></p>
        <button onClick={() => { try { localStorage.setItem("tally.cookies", "ok"); } catch {} setShow(false); }}
          className="mt-3 min-h-11 w-full rounded-full bg-(--s-text) px-5 text-sm font-semibold text-(--s-bg)">OK</button>
      </div>
    </div>
  );
}
