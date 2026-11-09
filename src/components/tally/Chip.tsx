export function Chip({ tone, children }: { tone: "win" | "lose" | "sub" | "gold"; children: React.ReactNode }) {
  const tones = {
    win: "bg-(--s-card) text-(--s-win)",
    lose: "bg-(--s-card) text-(--s-lose)",
    sub: "bg-(--s-card) text-(--s-sub)",
    gold: "bg-(--s-gold-tint) text-(--s-gold)",
  };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums ${tones[tone]}`}>{children}</span>;
}
