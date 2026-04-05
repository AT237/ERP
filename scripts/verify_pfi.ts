import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function findInvoiceRefs(blocks: any[], path: string): string[] {
  const issues: string[] = [];
  for (const block of blocks) {
    if (block.type === 'Group' && block.config?.childBlocks) {
      issues.push(...findInvoiceRefs(block.config.childBlocks, `${path}/${block.id}`));
    }
    const text = block.config?.text || '';
    if (text.includes('{{invoice.') || text.includes('{{invoiceItems.')) {
      issues.push(`${path}/${block.id}: "${text}"`);
    }
  }
  return issues;
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT name, position, config FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' ORDER BY position`
    );
    let allGood = true;
    for (const sec of rows) {
      const issues = findInvoiceRefs(sec.config.blocks || [], `sec${sec.position}`);
      if (issues.length > 0) {
        allGood = false;
        console.log(`ISSUES in Section ${sec.position} (${sec.name}):`);
        issues.forEach(i => console.log(`  ${i}`));
      }
    }
    if (allGood) {
      console.log('✓ No stale invoice references found in LY-0016!');
    }
    
    // Verify section 2 name
    const sec2 = rows.find((r: any) => r.position === 2);
    console.log(`Section 2 name: "${sec2?.name}" ${sec2?.name === 'Proforma Details' ? '✓' : '✗ EXPECTED "Proforma Details"'}`);
    
    // Verify header
    const sec0 = rows.find((r: any) => r.position === 0);
    const headerBlock = sec0?.config?.blocks?.find((b: any) => b.config?.text?.includes('PROFORMA'));
    console.log(`Header: "${headerBlock?.config?.text}" ✓`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
