import { sql } from "@/server/db";
import { standingFor } from "@/server/views";
for (const v of (await sql()`select id, display_name from voices`) as any[]) {
  console.log(v.display_name, await standingFor(v.id));
}
