import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function replaceInvoiceRefs(text: string): string {
  return text
    .replace(/\{\{invoiceItems\./g, '{{proformaInvoiceItems.')
    .replace(/\{\{invoice\./g, '{{proformaInvoice.');
}

function updateBlockTexts(blocks: any[]): boolean {
  let changed = false;
  for (const block of blocks) {
    if (block.type === 'Group' && block.config?.childBlocks) {
      if (updateBlockTexts(block.config.childBlocks)) changed = true;
    }
    if (block.config?.text && typeof block.config.text === 'string') {
      const newText = replaceInvoiceRefs(block.config.text);
      if (newText !== block.config.text) {
        console.log(`  ${block.id}: "${block.config.text}" -> "${newText}"`);
        block.config.text = newText;
        changed = true;
      }
    }
  }
  return changed;
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
      const config = sec.config;
      const blocks = config.blocks || [];
      
      let changed = updateBlockTexts(blocks);
      
      // Special cases for Document header
      if (sec.position === 0) {
        for (const block of blocks) {
          if (block.config?.text === 'PROFORMA INVOICE {{proformaInvoice.number}}') {
            // Change to use pfiNumber
            block.config.text = 'PROFORMA INVOICE {{proformaInvoice.pfiNumber}}';
            console.log(`  ${block.id}: fixed to use pfiNumber`);
            changed = true;
          }
          // Rename "COMMERCIAL INVOICE" to "PROFORMA INVOICE"
          if (block.config?.text && block.config.text.includes('COMMERCIAL INVOICE')) {
            block.config.text = block.config.text.replace('COMMERCIAL INVOICE', 'PROFORMA INVOICE');
            console.log(`  ${block.id}: COMMERCIAL INVOICE -> PROFORMA INVOICE`);
            changed = true;
          }
        }
      }
      
      // Section 2: Rename labels
      if (sec.position === 2) {
        // Rename section
        sec.name = 'Proforma Details';
        for (const block of blocks) {
          if (block.config?.text === 'Invoice number:') {
            block.config.text = 'PFI number:';
            console.log(`  ${block.id}: "Invoice number:" -> "PFI number:"`);
            changed = true;
          }
          if (block.config?.text === 'Invoice description:') {
            block.config.text = 'PFI description:';
            console.log(`  ${block.id}: "Invoice description:" -> "PFI description:"`);
            changed = true;
          }
        }
      }
      
      if (changed || sec.position === 2) {
        await client.query(
          `UPDATE layout_sections SET config = $1, name = $2 WHERE id = $3`,
          [JSON.stringify(config), sec.name, sec.id]
        );
        console.log(`  -> Updated section ${sec.position}`);
      }
    }
    
    console.log('\n\n=== Verification ===');
    // Re-read and verify
    const { rows: verify } = await client.query(
      `SELECT name, position, config FROM layout_sections 
       WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' 
       ORDER BY position`
    );
    for (const sec of verify) {
      console.log(`\nSection ${sec.position}: ${sec.name}`);
      for (const block of (sec.config.blocks || [])) {
        if (block.type === 'Group') {
          for (const child of (block.config?.childBlocks || [])) {
            if (child.config?.text && (child.config.text.includes('{{') || child.config.text.includes('invoice'))) {
              console.log(`  ${child.id}: "${child.config.text}"`);
            }
          }
        } else {
          if (block.config?.text && (block.config.text.includes('{{') || block.config.text.includes('invoice') || block.config.text.includes('Invoice') || block.config.text.includes('PFI'))) {
            console.log(`  ${block.id}: "${block.config.text}"`);
          }
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
