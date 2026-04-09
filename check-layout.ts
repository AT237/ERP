import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function check() {
  const sections = await db.execute(sql`SELECT id, name FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' ORDER BY position`);
  
  for (const s of sections.rows) {
    if (s.name === 'Proforma Details') {
      const rows = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${s.id as string}`);
      const config = rows.rows[0].config as any;
      console.log('=== Proforma Details Section ===');
      console.log('canGrow:', config.canGrow);
      console.log('canShrink:', config.canShrink);
      console.log('');
      for (const b of config.blocks) {
        console.log(`${b.type}: "${(b.config?.text || '').substring(0, 50)}" pos=(${b.position?.x},${b.position?.y}) hideEmpty=${b.config?.hideWhenEmpty || false} hideField=${b.config?.hideWhenFieldEmpty || 'NONE'} canGrow=${b.config?.heightCanGrow} canShrink=${b.config?.heightCanShrink}`);
      }
    }
  }
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
