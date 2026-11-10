import { sql, num } from "@/server/db";
import { env } from "@/server/env";
import { namespaceFor, rememberLater } from "@/server/memory";
import {
  AGENT_PRICE_STR,
  parsePaymentHeader,
  SUI_USDC_TYPE,
  verifyAndRecordPayment,
} from "@/server/pay";
import { ledgerStandingFor, voiceMemoryFor } from "@/server/views";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch voice (public voice, read-only)
  const rows = (await sql()`
    select id, user_id, kind, handle, display_name, created_at
    from voices where id = ${id}
  `) as any[];

  if (!rows.length) {
    return Response.json({ error: "Voice not found" }, { status: 404 });
  }

  const voice = rows[0];
  const payTo = env.AGENT_PAY_TO || "0x0000000000000000000000000000000000000000000000000000000000000000";
  const resource = `/api/agent/voices/${id}/record`;
  const description = `Sealed record and Walrus Memory verdict for voice ${voice.display_name}`;

  const x402Response = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "sui-mainnet",
        asset: SUI_USDC_TYPE,
        payTo,
        maxAmountRequired: AGENT_PRICE_STR,
        description,
        resource,
      },
    ],
  };

  // 2. Check for X-PAYMENT header
  const paymentHeader = req.headers.get("x-payment") || req.headers.get("X-PAYMENT");
  if (!paymentHeader) {
    return Response.json(x402Response, { status: 402 });
  }

  const digest = parsePaymentHeader(paymentHeader);
  if (!digest) {
    return Response.json(
      {
        error: "Invalid X-PAYMENT header: expected base64 JSON with { digest }",
        ...x402Response,
      },
      { status: 402 }
    );
  }

  // 3. Verify payment via Tatum and record single-use
  try {
    const verification = await verifyAndRecordPayment({
      digest,
      voiceId: voice.id,
      expectedPayTo: payTo,
    });

    if (!verification.valid) {
      return Response.json(
        {
          error: verification.error || "Payment verification failed",
          ...x402Response,
        },
        { status: 402 }
      );
    }
  } catch (err: any) {
    return Response.json(
      {
        error: `Payment verification error: ${err?.message || "Unknown error"}`,
        ...x402Response,
      },
      { status: 402 }
    );
  }

  // 4. Queue Walrus memory in voice namespace
  const memoryText = `Tally demand. An agent paid $0.01 to check ${voice.display_name}'s record. [tally:paid voice=${voice.id} digest=${digest}]`;
  try {
    await rememberLater(
      memoryText,
      namespaceFor(voice.user_id, voice.id),
      `paid:${digest}`
    );
  } catch (err) {
    console.error("Failed to queue paid Walrus memory:", err);
  }

  // 5. Gather voice memory verdict, ledger numbers, and last 20 graded calls
  const [vm, ledger, calls] = await Promise.all([
    voiceMemoryFor(voice.id),
    ledgerStandingFor(voice.id),
    sql()`
      select id, question, outcome_label, entry_price, close_price, result, seal_ref
      from calls
      where voice_id = ${voice.id} and status = 'graded' and result in ('won', 'lost', 'void')
      order by graded_at desc nulls last, created_at desc
      limit 20
    ` as Promise<any[]>,
  ]);

  const gradedCalls = calls.map((c) => ({
    question: c.question,
    side: c.outcome_label,
    entry: num(c.entry_price),
    priceAtStart: num(c.close_price),
    result: c.result,
    sealRef: c.seal_ref ?? null,
  }));

  const record = {
    name: voice.display_name,
    kind: voice.kind,
    verdict: {
      standing: vm.standing,
      n: vm.n,
      meanBeatClose: vm.meanBeatClose,
      pnlPerBet: vm.pnlPerBet,
      won: vm.won,
      lost: vm.lost,
      blobId: vm.blobId,
      writtenAt: vm.writtenAt,
      recalledAt: vm.recalledAt,
    },
    ledger: {
      standing: ledger.standing,
      n: ledger.n,
      meanBeatClose: ledger.meanBeatClose,
      pnlPerBet: ledger.pnlPerBet,
      won: ledger.won,
      lost: ledger.lost,
    },
    calls: gradedCalls,
  };

  return Response.json({
    paid: true,
    digest,
    voice: {
      id: voice.id,
      name: voice.display_name,
      kind: voice.kind,
      handle: voice.handle,
    },
    ...record,
  });
}
