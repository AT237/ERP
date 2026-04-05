import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function extractPlaceholders(content: any): string[] {
  const results: string[] = [];
  if (!content) return results;
  const str = JSON.stringify(content);
  const matches = str.match(/\{[^{}]+\}/g) || [];
  return matches;
}

function getTextContent(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.type === 'doc' && content.content) {
    return content.content.map((p: any) => {
      if (p.content) return p.content.map((c: any) => c.text || '').join('');
      return '';
    }).join(' | ');
  }
  return JSON.stringify(content).substring(0, 100);
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
      const blocks = sec.config.blocks || [];
      for (const block of blocks) {
        const text = getTextContent(block.content);
        const placeholders = extractPlaceholders(block.content);
        if (block.type === 'Group') {
          console.log(`  Group ${block.id} (lineType=${block.config?.lineTypeCondition || 'none'}):`);
          for (const child of (block.config?.childBlocks || [])) {
            const childText = getTextContent(child.content);
            const childPH = extractPlaceholders(child.content);
            const hasImg = child.config?.imageField ? ` [imageField=${child.config.imageField}]` : '';
            console.log(`    ${child.id}: "${childText}" ${childPH.length ? '-> ' + childPH.join(', ') : ''}${hasImg}`);
          }
        } else {
          const hasImg = block.config?.imageField ? ` [imageField=${block.config.imageField}]` : '';
          console.log(`  ${block.id} (${block.type}): "${text}" ${placeholders.length ? '-> ' + placeholders.join(', ') : ''}${hasImg}`);
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
