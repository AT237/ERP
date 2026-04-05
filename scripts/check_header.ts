import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT config FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' AND position = 0`
    );
    const blocks = rows[0].config.blocks;
    for (const b of blocks) {
      if (b.config?.text) console.log(`${b.id}: "${b.config.text}"`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
