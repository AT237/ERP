import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Dump section 0 and 2 blocks with full content JSON
    const { rows: sections } = await client.query(
      `SELECT id, name, position, config FROM layout_sections 
       WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' 
       AND position IN (0, 2, 5)
       ORDER BY position`
    );
    
    for (const sec of sections) {
      console.log(`\n=== Section ${sec.position}: ${sec.name} ===`);
      for (const block of (sec.config.blocks || [])) {
        if (block.type === 'Group') continue;
        console.log(`\n--- ${block.id} (${block.type}) ---`);
        console.log('content:', JSON.stringify(block.content));
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
