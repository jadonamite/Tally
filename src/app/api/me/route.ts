import { getUid } from "@/server/uid";
import { bankrollFor } from "@/server/views";
import { sql, num } from "@/server/db";
import { newestIn, userNamespaceFor } from "@/server/memory";
import type { UserScorecard, MemoryHit } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await getUid();
  const bankroll = await bankrollFor(uid);

  // Recalled memories about the user from Walrus Memory
  let userMemories: MemoryHit[] = [];
  try {
    const hits = await newestIn(userNamespaceFor(uid), 10);
    userMemories = hits.map((h) => ({
      text: h.text.replace(/\s*\[tally:[^\]]*\]\s*$/, ""),
      blobId: h.blobId,
      createdAt: h.createdAt,
    }));
  } catch {
    userMemories = [];
  }

  // Scorecard from user decisions
  const decs = (await sql()`
    select d.choice, d.at, c.status, c.result, c.pnl_per_dollar, c.voice_id, v.display_name
    from decisions d
    join calls c on c.id = d.call_id
    join voices v on v.id = c.voice_id
    where d.user_id = ${uid}
  `) as any[];

  let takenTotal = 0, takenWon = 0, takenLost = 0, takenPnl = 0;
  let passedTotal = 0, passedSaved = 0, passedMissed = 0;
  const voiceCounts = new Map<string, { voiceId: string; displayName: string; count: number }>();

  for (const d of decs) {
    if (d.choice === "take") {
      takenTotal++;
      if (d.status === "graded") {
        if (d.result === "won") {
          takenWon++;
          takenPnl += (num(d.pnl_per_dollar) ?? 0);
        } else if (d.result === "lost") {
          takenLost++;
          takenPnl += (num(d.pnl_per_dollar) ?? -1);
        }
      }
      const existing = voiceCounts.get(d.voice_id) || { voiceId: d.voice_id, displayName: d.display_name, count: 0 };
      existing.count++;
      voiceCounts.set(d.voice_id, existing);
    } else {
      passedTotal++;
      if (d.status === "graded") {
        if (d.result === "lost") {
          passedSaved++;
        } else if (d.result === "won") {
          passedMissed++;
        }
      }
    }
  }

  const scorecard: UserScorecard = {
    taken: {
      total: takenTotal,
      won: takenWon,
      lost: takenLost,
      pnl: Math.round(takenPnl * 100) / 100,
    },
    passed: {
      total: passedTotal,
      saved: passedSaved,
      missed: passedMissed,
    },
    backedVoices: Array.from(voiceCounts.values()).sort((a, b) => b.count - a.count),
  };

  return Response.json({
    bankroll,
    scorecard,
    userMemories,
  });
}

export async function POST(req: Request) {
  const uid = await getUid();
  const body = (await req.json().catch(() => ({}))) as { bankroll?: number };
  const b = Number(body.bankroll);
  if (!Number.isFinite(b) || b < 1 || b > 1_000_000) return Response.json({ error: "Bankroll must be between $1 and $1,000,000." }, { status: 400 });
  await sql()`update users set bankroll_usd = ${b} where id = ${uid}`;
  return Response.json({ bankroll: b });
}
