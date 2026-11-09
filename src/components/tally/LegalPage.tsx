import Link from "next/link";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: Array<{ h: string; p: string[] }> }) {
  return (
    <main className="app-dark mx-auto min-h-dvh max-w-md bg-(--s-bg) px-5 pb-16 pt-4 text-(--s-text)">
      <Link href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold text-(--s-sub)">Back to Tally</Link>
      <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">{title}</h1>
      <p className="mt-1 text-xs text-(--s-sub)">Last updated {updated}</p>
      {sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="text-base font-semibold">{s.h}</h2>
          {s.p.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-(--s-sub)">{p}</p>)}
        </section>
      ))}
      <nav className="mt-10 flex gap-5 text-sm text-(--s-sub)">
        <Link className="min-h-11 inline-flex items-center" href="/terms">Terms</Link>
        <Link className="min-h-11 inline-flex items-center" href="/privacy">Privacy</Link>
        <Link className="min-h-11 inline-flex items-center" href="/cookies">Cookies</Link>
      </nav>
    </main>
  );
}
