import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function getTexts(blocks: any[], prefix = ''): void {
  for (const block of blocks) {
    if (block.type === 'Group') {
      console.log(`${prefix}Group ${block.id} (lineType=${block.config?.lineTypeCondition || 'none'}):`);
      getTexts(block.config?.childBlocks || [], prefix + '  ');
    } else {
      const text = block.config?.text || block.config?.src?.substring(0, 30) || '';
      const imageField = block.config?.imageField || '';
      console.log(`${prefix}${block.id} (${block.type}): "${text}"${imageField ? ` [imageField=${imageField}]` : ''}`);
    }
  }
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows: sections } = await client.query(
      `SELECT id, name, position, config FROM layout_sections 
       WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' 
       ORDER BY position`
    );
    
    for (const sec of sections) {
      console.log(`\n=== Section ${sec.position}: ${sec.name} ===`);
      getTexts(sec.config.blocks || []);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
