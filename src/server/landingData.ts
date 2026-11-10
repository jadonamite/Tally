import { num, sql, toIso } from "./db";
import { env } from "./env";
import { memoryStats } from "./memory";
import { voicesFor } from "./views";
import type { VoiceView } from "@/lib/types";

/** A graded call whose market has a picture, for the floating hero tiles. */
export interface LandingTile {
  id: string;
  image: string;
  question: string;
  outcomeLabel: string;
  result: "won" | "lost" | null;
  pnlPerDollar: number | null;
}

/** The newest Sui-sealed, graded call. Every figure on the seal figure comes from here. */
export interface LandingProof {
  id: string;
  sealedAt: string;
  lockAt: string;
  sealCheckpoint: string | null;
  entryPrice: number | null;
  closePrice: number | null;
  result: "won" | "lost" | "void" | null;
  question: string | null;
}

export interface LandingVoice extends VoiceView {
  /** The market picture from this voice's newest graded call, if it has one. */
  avatar: string | null;
}

export interface LandingCounts {
  graded: number | null;
  voices: number | null;
  memories: number | null;
  namespaces: number | null;
}

export interface LandingData {
  voices: LandingVoice[];
  tiles: LandingTile[];
  proof: LandingProof | null;
  counts: LandingCounts;
}

const EMPTY_COUNTS: LandingCounts = { graded: null, voices: null, memories: null, namespaces: null };

/** A read that is allowed to fail: the page renders without it, never with a made-up value. */
async function safe<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

/**
 * Eight distinct markets, interleaved so the scatter shows a win and a loss side by side.
 * The market picture is the dedupe key, matching how Polymarket reuses images across windows.
 */
function interleave(rows: LandingTile[], limit = 8): LandingTile[] {
  const won = rows.filter((r) => r.result === "won");
  const lost = rows.filter((r) => r.result === "lost");
  const out: LandingTile[] = [];
  for (let i = 0; out.length < limit && (i < won.length || i < lost.length); i++) {
    if (won[i]) out.push(won[i]);
    if (out.length < limit && lost[i]) out.push(lost[i]);
  }
  return out;
}

/**
 * Everything the landing page states as fact. Server only.
 * Each read is isolated, so a database or relayer failure returns an empty list or a null
 * rather than a plausible-looking number.
 */
export async function landingData(): Promise<LandingData> {
  const [voiceList, avatarRows, tileRows, proofRow, counts] = await Promise.all([
    safe(() => voicesFor(env.EXAMPLE_USER_ID), [] as VoiceView[]),
    safe(async () => {
      const rows = (await sql()`
        select distinct on (voice_id) voice_id, image from calls
        where image is not null and status = 'graded'
        order by voice_id, graded_at desc nulls last`) as any[];
      return rows.map((r) => [r.voice_id as string, r.image as string] as const);
    }, [] as ReadonlyArray<readonly [string, string]>),
    safe(async () => {
      const rows = (await sql()`
        select distinct on (image) image, question, outcome_label, result, pnl_per_dollar, id
        from calls
        where image is not null and status = 'graded' and result in ('won','lost')
        order by image, graded_at desc nulls last`) as any[];
      return rows.map(
        (r): LandingTile => ({
          id: r.id,
          image: r.image,
          question: r.question,
          outcomeLabel: r.outcome_label,
          result: r.result,
          pnlPerDollar: num(r.pnl_per_dollar),
        }),
      );
    }, [] as LandingTile[]),
    safe(async () => {
      const rows = (await sql()`
        select id, sealed_at, lock_at, seal_checkpoint, entry_price, close_price, result, question
        from calls
        where seal_kind = 'sui' and status = 'graded' and sealed_at is not null
        order by sealed_at desc nulls last
        limit 1`) as any[];
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        sealedAt: toIso(r.sealed_at)!,
        lockAt: toIso(r.lock_at)!,
        sealCheckpoint: r.seal_checkpoint ?? null,
        entryPrice: num(r.entry_price),
        closePrice: num(r.close_price),
        result: r.result ?? null,
        question: r.question ?? null,
      } satisfies LandingProof;
    }, null as LandingProof | null),
    safe<LandingCounts>(async () => {
      const [graded] = (await sql()`select count(*)::int as n from calls where status = 'graded'`) as any[];
      const [voices] = (await sql()`select count(*)::int as n from voices`) as any[];
      return {
        graded: graded?.n ?? null,
        voices: voices?.n ?? null,
        memories: null,
        namespaces: null,
      } satisfies LandingCounts;
    }, EMPTY_COUNTS),
  ]);

  const memory = await safe(() => memoryStats(), null);
  const avatars = new Map(avatarRows);
  const voices: LandingVoice[] = [...voiceList].filter((v) => v.n > 0).sort((a, b) => (b.pnlPerBet ?? -9) - (a.pnlPerBet ?? -9)).slice(0, 6).map((v) => ({
    ...v,
    avatar: avatars.get(v.id) ?? null,
  }));

  return {
    voices,
    tiles: interleave(tileRows),
    proof: proofRow,
    counts: {
      ...counts,
      memories: memory?.memories ?? null,
      namespaces: memory?.namespaces ?? null,
    },
  };
}
