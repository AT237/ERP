import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function check() {
  // Find the correct document footer section
  const sections = await db.execute(sql`SELECT id, name FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' AND name LIKE '%footer%' ORDER BY position`);
  console.log('Footer sections:');
  for (const s of sections.rows) {
    console.log(`  ${s.id} - ${s.name}`);
  }
  
  // Find the one with the Group
  for (const s of sections.rows) {
    const rows = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${s.id as string}`);
    const config = rows.rows[0].config as any;
    const group = config.blocks?.find((b: any) => b.type === 'Group');
    if (group) {
      console.log(`\nFound Group in section: ${s.name} (${s.id})`);
      console.log('Group collapseEmpty:', group.config?.collapseEmpty);
      console.log('Group canGrow:', group.config?.canGrow);
      console.log('Group canShrink:', group.config?.canShrink);
      console.log('Section canGrow:', config.canGrow);
      console.log('Section canShrink:', config.canShrink);
      console.log('');
      
      const children = group.config?.childBlocks || [];
      console.log(`Children: ${children.length}`);
      for (const c of children) {
        const t = (c.config?.text || '').substring(0, 45).padEnd(45);
        console.log(`  ${t} x=${c.position?.x} y=${c.position?.y} hideEmpty=${c.config?.hideWhenEmpty || false} hideField=${c.config?.hideWhenFieldEmpty || 'NONE'}`);
      }
    }
  }
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
