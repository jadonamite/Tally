import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const text = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const stmt of text.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
  await sql.query(stmt);
  console.log("ok:", stmt.split("\n")[0]);
}
