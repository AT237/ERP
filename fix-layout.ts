import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fix() {
  const sections = await db.execute(sql`SELECT id, name FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' ORDER BY position`);
  
  for (const s of sections.rows) {
    if (s.name === 'Document footer') {
      const rows = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${s.id as string}`);
      const config = rows.rows[0].config as any;
      const group = config.blocks.find((b: any) => b.type === 'Group');
      if (!group) continue;

      // Set heightCanShrink on the group block (this is what the rendering code checks)
      group.config.heightCanShrink = true;
      group.config.heightCanGrow = true;
      // Also set on the block-level size props
      group.heightCanShrink = true;
      group.heightCanGrow = true;
      
      console.log('Fixed Group heightCanShrink/heightCanGrow');
      
      await db.execute(sql`UPDATE layout_sections SET config = ${JSON.stringify(config)}::jsonb WHERE id = ${s.id as string}`);
      console.log('Updated section:', s.name);
    }
  }
  
  process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); });
