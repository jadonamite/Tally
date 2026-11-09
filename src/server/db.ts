import { neon } from "@neondatabase/serverless";
import { env } from "./env";

let _sql: ReturnType<typeof neon> | null = null;

/** Tagged-template SQL. Usage: await sql()`select * from calls where id = ${id}` */
export function sql() {
  if (!_sql) _sql = neon(env.DATABASE_URL);
  return _sql;
}

export const toIso = (v: unknown): string | null =>
  v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();

export const toMs = (v: unknown): number => (v instanceof Date ? v.getTime() : Date.parse(String(v)));

export const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
