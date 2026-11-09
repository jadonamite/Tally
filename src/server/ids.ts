import { createHash, randomBytes } from "node:crypto";

export const newId = (prefix: "v" | "c", bytes: number) => `${prefix}_${randomBytes(bytes).toString("hex")}`;
export const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** Stable JSON: keys sorted, no whitespace. This exact string is what gets hashed and sealed. */
export function canonicalJson(obj: Record<string, string | number>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(Object.fromEntries(keys.map((k) => [k, obj[k]])));
}
