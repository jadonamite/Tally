import { cookies } from "next/headers";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";
import { env } from "./env";

export const UID_COOKIE = "tally_uid";
export const OPERATOR_COOKIE = "tally_operator";

/** Signed proof that this browser may act as the example board's owner. Null when no operator key is set. */
export function signOperatorToken(userId: string): string | null {
  const key = env.OPERATOR_KEY;
  if (!key) return null;
  return createHmac("sha256", key).update(userId).digest("hex");
}

export function verifyOperatorToken(userId: string, token: string): boolean {
  const expected = signOperatorToken(userId);
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** The anonymous user id from the cookie. Creates one if missing. Only call from route handlers. */
export async function getUid(): Promise<string> {
  const jar = await cookies();
  let uid = jar.get(UID_COOKIE)?.value ?? "";
  const operatorToken = jar.get(OPERATOR_COOKIE)?.value ?? "";

  // C2: Close the cookie hole: the example owner id is refused as a visitor cookie
  // unless a second signed cookie is present.
  if (uid === env.EXAMPLE_USER_ID && !verifyOperatorToken(uid, operatorToken)) {
    uid = "";
  }

  if (!/^[a-f0-9]{16}$/.test(uid)) {
    uid = randomBytes(8).toString("hex");
    jar.set(UID_COOKIE, uid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
    });
  }
  await sql()`insert into users (id) values (${uid}) on conflict (id) do nothing`;
  return uid;
}
