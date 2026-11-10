import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { UID_COOKIE, OPERATOR_COOKIE, signOperatorToken } from "@/server/uid";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";

  if (!env.OPERATOR_KEY || key !== env.OPERATOR_KEY) {
    return Response.json({ error: "Invalid operator key." }, { status: 403 });
  }

  const jar = await cookies();
  const exampleId = env.EXAMPLE_USER_ID;

  jar.set(UID_COOKIE, exampleId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  jar.set(OPERATOR_COOKIE, signOperatorToken(exampleId)!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return redirect("/app");
}
