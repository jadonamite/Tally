import { sql, toIso, toMs, num } from "./db";
import { computeStanding, recordLine, suggestedStake, type GradedRow } from "@/lib/core/standing";
import type { CallView, StandingSummary, VoiceView, VoiceKind } from "@/lib/types";

export async function standingFor(voiceId: string): Promise<StandingSummary> {
  const rows = (await sql()`
    select result, beat_close, pnl_per_dollar, graded_at from calls
    where voice_id = ${voiceId} and status = 'graded' and result in ('won','lost')`) as any[];
  const graded: GradedRow[] = rows.map((r) => ({
    result: r.result,
    beatClose: num(r.beat_close),
    pnlPerDollar: num(r.pnl_per_dollar),
    gradedAtMs: toMs(r.graded_at),
  }));
  return computeStanding(graded);
}

export async function bankrollFor(userId: string): Promise<number> {
  const r = (await sql()`select bankroll_usd from users where id = ${userId}`) as any[];
  return r.length ? Number(r[0].bankroll_usd) : 100;
}

export async function voicesFor(userId: string): Promise<VoiceView[]> {
  const rows = (await sql()`
    select v.*, (select count(*) from calls c where c.voice_id = v.id and c.status = 'open')::int as open_calls
    from voices v where v.user_id = ${userId} order by v.created_at`) as any[];
  const out: VoiceView[] = [];
  for (const v of rows) {
    const s = await standingFor(v.id);
    out.push({ ...s, id: v.id, kind: v.kind as VoiceKind, handle: v.handle, displayName: v.display_name, openCalls: v.open_calls });
  }
  const order = { earned: 0, unproven: 1, not_earned: 2, tombstoned: 3 } as const;
  return out.sort((a, b) => order[a.standing] - order[b.standing] || b.n - a.n);
}

export function callView(r: any, voiceName: string, s: StandingSummary, bankroll: number): CallView {
  const entry = num(r.entry_price);
  return {
    id: r.id,
    voiceId: r.voice_id,
    voiceName,
    voiceStanding: s.standing,
    voiceRecord: recordLine(s),
    source: r.source,
    rawText: r.raw_text,
    marketSlug: r.market_slug,
    question: r.question,
    image: r.image ?? null,
    outcomeLabel: r.outcome_label,
    lockAt: toIso(r.lock_at)!,
    capturedAt: toIso(r.captured_at)!,
    entryPrice: entry,
    sealKind: r.seal_kind,
    sealRef: r.seal_ref ?? null,
    sealedAt: toIso(r.sealed_at),
    sealCheckpoint: r.seal_checkpoint ?? null,
    status: r.status,
    closePrice: num(r.close_price),
    result: r.result ?? null,
    beatClose: num(r.beat_close),
    pnlPerDollar: num(r.pnl_per_dollar),
    suggestedStake: r.status === "open" ? suggestedStake(s, entry, bankroll) : 0,
    memCallBlob: r.mem_call_blob ?? null,
    memGradeBlob: r.mem_grade_blob ?? null,
    callHash: r.call_hash,
    canonical: r.canonical,
  };
}

/** Calls for a user (optionally one voice), newest first, with each voice's live standing. */
export async function callsFor(userId: string, voiceId?: string, limit = 100): Promise<CallView[]> {
  const rows = (voiceId
    ? await sql()`select c.*, v.display_name from calls c join voices v on v.id = c.voice_id
                  where c.user_id = ${userId} and c.voice_id = ${voiceId} order by c.created_at desc limit ${limit}`
    : await sql()`select c.*, v.display_name from calls c join voices v on v.id = c.voice_id
                  where c.user_id = ${userId} order by c.created_at desc limit ${limit}`) as any[];
  const bankroll = await bankrollFor(userId);
  const cache = new Map<string, StandingSummary>();
  const out: CallView[] = [];
  for (const r of rows) {
    if (!cache.has(r.voice_id)) cache.set(r.voice_id, await standingFor(r.voice_id));
    out.push(callView(r, r.display_name, cache.get(r.voice_id)!, bankroll));
  }
  return out;
}
