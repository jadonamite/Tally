import { sql, toIso, toMs, num } from "./db";
import { computeStanding, recordLine, suggestedStake, type GradedRow } from "@/lib/core/standing";
import type { CallView, StandingSummary, VoiceView, VoiceKind } from "@/lib/types";
import { env } from "./env";

export interface MemoryVerdict extends StandingSummary {
  blobId: string | null;
  writtenAt: string | null;
  recalledAt: string | null;
}

/** The ledger computes each grade and historical standing across all graded calls. */
export async function ledgerStandingFor(voiceId: string): Promise<StandingSummary> {
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

/**
 * The app reads its verdict from Walrus Memory (A3).
 * Table voice_memory holds the last credibility memory Walrus returned for each voice.
 * No credibility memory means "unproven, nothing remembered yet".
 */
export async function voiceMemoryFor(voiceId: string): Promise<MemoryVerdict> {
  const rows = (await sql()`
    select standing, n, mean_beat_close, pnl_per_bet, won, lost, blob_id, written_at, recalled_at
    from voice_memory where voice_id = ${voiceId} and blob_id is not null
  `) as any[];
  if (!rows.length || !rows[0].standing) {
    return {
      standing: "unproven",
      n: 0,
      meanBeatClose: null,
      pnlPerBet: null,
      won: 0,
      lost: 0,
      blobId: null,
      writtenAt: null,
      recalledAt: null,
    };
  }
  const r = rows[0];
  return {
    standing: r.standing,
    n: r.n,
    meanBeatClose: num(r.mean_beat_close),
    pnlPerBet: num(r.pnl_per_bet),
    won: r.won,
    lost: r.lost,
    blobId: r.blob_id,
    writtenAt: toIso(r.written_at),
    recalledAt: toIso(r.recalled_at),
  };
}

/** Default standing used by screens is the Walrus Memory verdict. */
export async function standingFor(voiceId: string): Promise<StandingSummary> {
  return voiceMemoryFor(voiceId);
}

export async function bankrollFor(userId: string): Promise<number> {
  const r = (await sql()`select bankroll_usd from users where id = ${userId}`) as any[];
  return r.length ? Number(r[0].bankroll_usd) : 100;
}

export async function voicesFor(userId: string): Promise<VoiceView[]> {
  const exampleId = env.EXAMPLE_USER_ID;
  let rows = (await sql()`
    select v.*, (select count(*) from calls c where c.voice_id = v.id and c.status = 'open')::int as open_calls
    from voices v where v.user_id = ${userId} order by v.created_at`) as any[];
  if (!rows.length && userId !== exampleId) {
    rows = (await sql()`
      select v.*, (select count(*) from calls c where c.voice_id = v.id and c.status = 'open')::int as open_calls
      from voices v where v.user_id = ${exampleId} order by v.created_at`) as any[];
  }
  const out: VoiceView[] = [];
  for (const v of rows) {
    const vm = await voiceMemoryFor(v.id);
    const ledger = await ledgerStandingFor(v.id);
    out.push({
      ...vm,
      id: v.id,
      kind: v.kind as VoiceKind,
      handle: v.handle,
      displayName: v.display_name,
      openCalls: v.open_calls,
      credBlob: vm.blobId,
      credWrittenAt: vm.writtenAt,
      credRecalledAt: vm.recalledAt,
      ledgerStanding: ledger,
    });
  }
  const order = { earned: 0, unproven: 1, not_earned: 2, tombstoned: 3 } as const;
  return out.sort((a, b) => order[a.standing] - order[b.standing] || b.n - a.n);
}

export function callView(r: any, voiceName: string, vm: MemoryVerdict, bankroll: number): CallView {
  const entry = num(r.entry_price);
  return {
    id: r.id,
    voiceId: r.voice_id,
    voiceName,
    voiceStanding: vm.standing,
    voiceRecord: recordLine(vm),
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
    suggestedStake: r.status === "open" ? suggestedStake(vm, entry, bankroll) : 0,
    bookmakerPrice: num(r.bookmaker_price),
    bookmakerClose: num(r.bookmaker_close),
    bookmakerSource: r.bookmaker_source ?? null,
    memCallBlob: r.mem_call_blob ?? null,
    memGradeBlob: r.mem_grade_blob ?? null,
    memFixBlob: r.mem_fix_blob ?? null,
    credBlob: vm.blobId,
    userDecision: r.user_choice ?? null,
    userDecisionBlob: r.user_choice_blob ?? null,
    callHash: r.call_hash,
    canonical: r.canonical,
  };
}

/** Calls for a user (optionally one voice), newest first, with each voice's live memory verdict. */
export async function callsFor(userId: string, voiceId?: string, limit = 100): Promise<CallView[]> {
  const exampleId = env.EXAMPLE_USER_ID;
  let targetUser = userId;
  if (voiceId) {
    const v = (await sql()`select user_id from voices where id = ${voiceId}`) as any[];
    if (v.length) targetUser = v[0].user_id;
  } else {
    const hasAny = (await sql()`select 1 from calls where user_id = ${userId} limit 1`) as any[];
    if (!hasAny.length) targetUser = exampleId;
  }
  const rows = (voiceId
    ? await sql()`
        select c.*, v.display_name,
               (select choice from decisions d where d.user_id = ${userId} and d.call_id = c.id) as user_choice,
               (select mem_blob from decisions d where d.user_id = ${userId} and d.call_id = c.id) as user_choice_blob
        from calls c join voices v on v.id = c.voice_id
        where c.user_id = ${targetUser} and c.voice_id = ${voiceId}
        order by c.created_at desc limit ${limit}`
    : await sql()`
        select c.*, v.display_name,
               (select choice from decisions d where d.user_id = ${userId} and d.call_id = c.id) as user_choice,
               (select mem_blob from decisions d where d.user_id = ${userId} and d.call_id = c.id) as user_choice_blob
        from calls c join voices v on v.id = c.voice_id
        where c.user_id = ${targetUser}
        order by c.created_at desc limit ${limit}`) as any[];
  const bankroll = await bankrollFor(userId);
  const cache = new Map<string, MemoryVerdict>();
  const out: CallView[] = [];
  for (const r of rows) {
    if (!cache.has(r.voice_id)) cache.set(r.voice_id, await voiceMemoryFor(r.voice_id));
    out.push(callView(r, r.display_name, cache.get(r.voice_id)!, bankroll));
  }
  return out;
}
