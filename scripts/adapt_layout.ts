import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Get all sections for LY-0016
    const { rows: sections } = await client.query(
      `SELECT id, name, position, config FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' ORDER BY position`
    );
    
    for (const sec of sections) {
      const config = sec.config;
      const blocks = config.blocks || [];
      
      console.log(`\n=== Section ${sec.position}: ${sec.name} ===`);
      for (const block of blocks) {
        if (block.type === 'Group') {
          console.log(`  Block ${block.id} (Group):`);
          console.log(`    conditionField: ${block.config?.conditionField}`);
          console.log(`    lineTypeCondition: ${block.config?.lineTypeCondition}`);
          const children = block.config?.childBlocks || [];
          for (const child of children) {
            console.log(`    Child ${child.id}: type=${child.type}, content="${(child.content || '').substring(0, 80)}", field=${child.config?.field || ''}, prefix=${child.config?.prefix || ''}`);
          }
        } else {
          console.log(`  Block ${block.id}: type=${block.type}, content="${(block.content || '').substring(0, 80)}", field=${block.config?.field || ''}, prefix=${block.config?.prefix || ''}`);
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
