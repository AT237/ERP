import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fixLayout() {
  const docFooterId = 'fa6fde74-903c-4f87-ada5-c273b9c2adb0';
  
  const rows = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${docFooterId}`);
  if (rows.rows.length === 0) {
    console.log('Section not found!');
    process.exit(1);
  }
  
  const config = rows.rows[0].config as any;
  console.log('Blocks in section:', config.blocks.length);
  
  const group = config.blocks.find((b: any) => b.type === 'Group');
  if (!group) {
    console.log('No Group block found! Block types:', config.blocks.map((b: any) => b.type));
    
    // Check if group blocks are missing - maybe need to rebuild
    for (const b of config.blocks) {
      console.log(`  ${b.type}: "${(b.config.text || '').substring(0, 50)}" at (${b.position.x}, ${b.position.y})`);
      if (b.type === 'Group' && b.config?.childBlocks) {
        console.log(`    children: ${b.config.childBlocks.length}`);
      }
    }
    process.exit(1);
  }
  
  const children = group.config.childBlocks;
  console.log(`Group has ${children.length} children`);
  
  // Fix all children
  for (const c of children) {
    const text = c.config.text || '';
    const isLabel = c.position.x === 0;
    const isValue = c.position.x === 30;

    c.config.heightCanGrow = true;
    c.config.heightCanShrink = true;

    if (isValue) {
      const fieldMatch = text.match(/\{\{proformaInvoice\.(\w+)\}\}/);
      if (fieldMatch) {
        c.config.hideWhenEmpty = true;
        c.config.hideWhenFieldEmpty = `proformaInvoice.${fieldMatch[1]}`;
      }
    }

    if (isLabel) {
      const sameY = children.find((ch: any) => ch.position.x === 30 && ch.position.y === c.position.y);
      if (sameY) {
        const fieldMatch = (sameY.config.text || '').match(/\{\{proformaInvoice\.(\w+)\}\}/);
        if (fieldMatch) {
          c.config.hideWhenFieldEmpty = `proformaInvoice.${fieldMatch[1]}`;
        }
      }
    }
  }

  group.config.canGrow = true;
  group.config.canShrink = true;
  
  config.canGrow = true;
  config.canShrink = true;

  await db.execute(sql`UPDATE layout_sections SET config = ${JSON.stringify(config)}::jsonb WHERE id = ${docFooterId}`);

  // Verify
  const verify = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${docFooterId}`);
  const vc = verify.rows[0].config as any;
  const vg = vc.blocks.find((b: any) => b.type === 'Group');
  console.log('\n=== Verification ===');
  for (const c of vg.config.childBlocks) {
    const t = (c.config.text || '').substring(0, 45).padEnd(45);
    const h = (c.config.hideWhenFieldEmpty || 'NONE').padEnd(45);
    console.log(`${t} hide=${h} grow=${c.config.heightCanGrow} shrink=${c.config.heightCanShrink}`);
  }
  console.log(`\nSection: canGrow=${vc.canGrow} canShrink=${vc.canShrink}`);
  console.log(`Group: canGrow=${vg.config.canGrow} canShrink=${vg.config.canShrink}`);
  
  console.log('\nDone!');
  process.exit(0);
}

fixLayout().catch(e => { console.error(e); process.exit(1); });
