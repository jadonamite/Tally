import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { sql } from "./db";

export const UID_COOKIE = "tally_uid";

/** The anonymous user id from the cookie. Creates one if missing. Only call from route handlers. */
export async function getUid(): Promise<string> {
  const jar = await cookies();
  let uid = jar.get(UID_COOKIE)?.value ?? "";
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
