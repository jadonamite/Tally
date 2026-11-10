import { memoryStats } from "@/server/memory";
export const dynamic = "force-dynamic";

// Memory and namespace counts as the Walrus Memory relayer reports them.
export async function GET() {
  try {
    return Response.json(await memoryStats());
  } catch {
    return Response.json({ memories: null, namespaces: null }, { status: 503 });
  }
}
