import { getUid } from "@/server/uid";
import { importWallet } from "@/server/importWallet";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();
  try {
    return Response.json({ added: await importWallet(uid, id, 25) });
  } catch {
    return Response.json({ error: "Couldn't import that wallet." }, { status: 400 });
  }
}
