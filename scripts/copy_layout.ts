import pg from 'pg';
import crypto from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const { rows: srcSections } = await client.query(
      `SELECT id, section_type, name, position, config FROM layout_sections WHERE layout_id = 'ba775d65-a8b3-485c-a8ae-6358e96b837e' ORDER BY position`
    );
    console.log(`LY-0013 has ${srcSections.length} sections`);
    
    await client.query(`DELETE FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd'`);
    console.log('Deleted old LY-0016 sections');
    
    for (const sec of srcSections) {
      const newId = crypto.randomUUID();
      await client.query(
        `INSERT INTO layout_sections (id, layout_id, section_type, name, position, config) VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId, '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd', sec.section_type, sec.name, sec.position, JSON.stringify(sec.config)]
      );
      console.log(`  Copied section ${sec.position}: ${sec.name} -> ${newId}`);
    }
    
    console.log('\nDone copying. Now reading back...');
    
    const { rows: newSections } = await client.query(
      `SELECT id, name, position FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' ORDER BY position`
    );
    console.log('\nLY-0016 new sections:');
    for (const s of newSections) {
      console.log(`  ${s.position}: ${s.name} (${s.id})`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
