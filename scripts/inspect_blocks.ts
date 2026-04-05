import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Get Invoice Details section and Document header to see the actual field references
    const { rows: sections } = await client.query(
      `SELECT id, name, position, config FROM layout_sections 
       WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' 
       AND position IN (0, 2, 4, 5)
       ORDER BY position`
    );
    
    for (const sec of sections) {
      console.log(`\n=== Section ${sec.position}: ${sec.name} ===`);
      const blocks = sec.config.blocks || [];
      for (const block of blocks) {
        if (block.type === 'Group') {
          console.log(`\nGroup ${block.id}:`);
          console.log(JSON.stringify({ conditionField: block.config?.conditionField, lineTypeCondition: block.config?.lineTypeCondition, conditionValue: block.config?.conditionValue }));
          for (const child of (block.config?.childBlocks || [])) {
            console.log(`  Child ${child.id}: ${JSON.stringify({ content: child.content, field: child.config?.field, prefix: child.config?.prefix, imageField: child.config?.imageField, src: child.config?.src?.substring(0, 50) }, null, 0)}`);
          }
        } else {
          console.log(`Block ${block.id}: ${JSON.stringify({ type: block.type, content: block.content, field: block.config?.field, prefix: block.config?.prefix, src: block.config?.src?.substring(0, 50) }, null, 0)}`);
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
