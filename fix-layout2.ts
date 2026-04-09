import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fixOtherBlocks() {
  const docFooterId = 'fa6fde74-903c-4f87-ada5-c273b9c2adb0';
  const rows = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${docFooterId}`);
  const config = rows.rows[0].config as any;
  
  // Fix all non-group blocks too
  for (const b of config.blocks) {
    if (b.type !== 'Group') {
      console.log(`Block: "${(b.config.text || '').substring(0, 50)}" type=${b.type}`);
      b.config.heightCanGrow = true;
      b.config.heightCanShrink = true;
      
      // For notes label and content, set hideWhenFieldEmpty to notes field
      if (b.config.text && b.config.text.includes('{{proformaInvoice.notes}}')) {
        b.config.hideWhenEmpty = true;
        b.config.hideWhenFieldEmpty = 'proformaInvoice.notes';
      }
      if (b.config.text === 'Notes:') {
        b.config.hideWhenFieldEmpty = 'proformaInvoice.notes';
      }
      // signoff
      if (b.config.text && b.config.text.includes('Kind regards')) {
        b.config.hideWhenFieldEmpty = 'proformaInvoice.signoffName';
      }
    }
  }
  
  await db.execute(sql`UPDATE layout_sections SET config = ${JSON.stringify(config)}::jsonb WHERE id = ${docFooterId}`);
  console.log('\nUpdated non-group blocks');

  // Also check the "Kind regards" text - should use signoffName variable
  const verify = await db.execute(sql`SELECT config FROM layout_sections WHERE id = ${docFooterId}`);
  const vc = verify.rows[0].config as any;
  for (const b of vc.blocks) {
    if (b.type !== 'Group') {
      console.log(`  "${(b.config.text || '').substring(0, 60)}" hideField=${b.config.hideWhenFieldEmpty || 'NONE'} grow=${b.config.heightCanGrow} shrink=${b.config.heightCanShrink}`);
    }
  }
  
  process.exit(0);
}

fixOtherBlocks().catch(e => { console.error(e); process.exit(1); });
