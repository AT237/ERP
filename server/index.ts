import express, { type Request, Response, NextFunction } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { storage } from "./storage";
import { hashPassword } from "./auth";

const execAsync = promisify(exec);

async function runGithubBackup(reason: string = "scheduled") {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    log("GitHub backup skipped: GITHUB_TOKEN not set");
    return;
  }
  const repoUrl = `https://${token}@github.com/AT237/ERP.git`;
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        await execAsync(`pg_dump "${dbUrl}" --no-password -f database_backup.sql`);
        log("Database exported to database_backup.sql");
      } catch (dbError: any) {
        log(`Database export warning: ${dbError.message}`);
      }
    }

    await execAsync('git config user.email "auto-backup@replit.com"');
    await execAsync('git config user.name "Auto Backup"');
    await execAsync(`git remote set-url origin ${repoUrl}`);
    await execAsync("git add -A");
    try {
      await execAsync(`git commit -m "Auto backup [${reason}] ${now}"`);
    } catch {
      // Nothing to commit is fine
    }
    await execAsync("git push origin main");
    log(`GitHub backup success: pushed at ${now} (${reason})`);
  } catch (error: any) {
    log(`GitHub backup failed: ${error.message}`);
  }
}

function scheduleDailyBackup() {
  setTimeout(() => {
    runGithubBackup("startup");
  }, 60 * 1000);

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const msUntilNext = next.getTime() - now.getTime();
    log(`GitHub backup scheduled: next run in ${Math.round(msUntilNext / 60000)} minutes`);
    setTimeout(() => {
      runGithubBackup("daily-02:00");
      scheduleNext();
    }, msUntilNext);
  };
  scheduleNext();
}

async function seedProductionDatabase() {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM customers");
    const count = parseInt(result.rows[0].count, 10);
    if (count > 0) {
      log("Production database already has data, skipping seed");
      return;
    }
    log("Production database is empty, importing seed data...");
    const possiblePaths = [
      join(import.meta.dirname, "seed-data.sql"),
      join(process.cwd(), "server", "seed-data.sql"),
      join(process.cwd(), "dist", "seed-data.sql"),
    ];
    let sql = "";
    for (const p of possiblePaths) {
      try {
        sql = readFileSync(p, "utf-8");
        log(`Seed file found at: ${p}`);
        break;
      } catch { }
    }
    if (!sql) {
      log("Seed file not found in any location");
      return;
    }
    const statements = sql.split("\n").filter(line => 
      line.startsWith("INSERT INTO") || line.startsWith("SELECT pg_catalog.setval") || line.startsWith("SELECT setval")
    );
    let imported = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        imported++;
      } catch (err: any) {
        log(`Seed warning: ${err.message?.substring(0, 100)}`);
      }
    }
    log(`Seed complete: ${imported} records imported`);
  } catch (err: any) {
    log(`Seed error: ${err.message}`);
  }
}

async function fixQuotationTotals() {
  try {
    const result = await pool.query(`
      UPDATE quotations q SET
        total_amount = sub.line_sum,
        subtotal = sub.line_sum
      FROM (
        SELECT quotation_id, COALESCE(SUM(CAST(line_total AS numeric)), 0) as line_sum
        FROM quotation_items
        GROUP BY quotation_id
      ) sub
      WHERE q.id = sub.quotation_id
        AND CAST(q.total_amount AS numeric) != sub.line_sum
    `);
    if (result.rowCount && result.rowCount > 0) {
      log(`Fixed ${result.rowCount} quotation(s) with incorrect totals`);
    }
  } catch (err: any) {
    log(`Quotation totals fix warning: ${err.message}`);
  }
}

async function ensureSeedLayouts() {
  try {
    const layoutIds = [
      '57f6cf12-da83-46ce-b93e-c39f34c3f090',
      '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd',
    ];
    const existing = await pool.query(
      `SELECT id FROM document_layouts WHERE id = ANY($1)`,
      [layoutIds]
    );
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const missing = layoutIds.filter(id => !existingIds.has(id));
    if (missing.length === 0) return;

    const possiblePaths = [
      join(import.meta.dirname, "seed-data.sql"),
      join(process.cwd(), "server", "seed-data.sql"),
      join(process.cwd(), "dist", "seed-data.sql"),
    ];
    let sqlContent = "";
    for (const p of possiblePaths) {
      try {
        sqlContent = readFileSync(p, "utf-8");
        break;
      } catch { }
    }
    if (!sqlContent) return;

    const missingSet = new Set(missing);
    const lines = sqlContent.split("\n").filter(line =>
      line.startsWith("INSERT INTO") &&
      (line.includes("document_layouts") || line.includes("layout_sections"))
    );

    let imported = 0;
    for (const line of lines) {
      const hasRelevantId = [...missingSet].some(id => line.includes(id));
      if (hasRelevantId) {
        try {
          await pool.query(line);
          imported++;
        } catch (err: any) {
          if (!err.message?.includes("duplicate key")) {
            log(`Layout seed warning: ${err.message?.substring(0, 100)}`);
          }
        }
      }
    }
    if (imported > 0) {
      log(`Ensured ${imported} missing layout records (${missing.length} layout(s))`);
    }
  } catch (err: any) {
    log(`Layout seed error: ${err.message}`);
  }
}

async function ensureDbFunctions() {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_proforma_invoice_number() RETURNS text LANGUAGE plpgsql AS $$
      DECLARE
          current_year integer := EXTRACT(YEAR FROM NOW());
          pattern text := '^PFI-' || current_year || '-[0-9]{3}$';
          next_num integer := 1;
          used_numbers integer[];
          n integer;
      BEGIN
          SELECT array_agg((regexp_match(proforma_number, 'PFI-' || current_year || '-([0-9]{3})'))[1]::integer ORDER BY 1)
          INTO used_numbers
          FROM proforma_invoices
          WHERE proforma_number ~ pattern;

          IF used_numbers IS NOT NULL THEN
              FOREACH n IN ARRAY used_numbers LOOP
                  IF n = next_num THEN
                      next_num := next_num + 1;
                  ELSE
                      EXIT;
                  END IF;
              END LOOP;
          END IF;

          RETURN 'PFI-' || current_year || '-' || LPAD(next_num::text, 3, '0');
      END;
      $$;
    `);
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_quotation_request_number() RETURNS text LANGUAGE plpgsql AS $$
      DECLARE
          current_year integer := EXTRACT(YEAR FROM NOW());
          pattern text := '^QR-' || current_year || '-[0-9]{3}$';
          next_num integer := 1;
          used_numbers integer[];
          n integer;
      BEGIN
          SELECT array_agg((regexp_match(request_number, 'QR-' || current_year || '-([0-9]{3})'))[1]::integer ORDER BY 1)
          INTO used_numbers
          FROM quotation_requests
          WHERE request_number ~ pattern;

          IF used_numbers IS NOT NULL THEN
              FOREACH n IN ARRAY used_numbers LOOP
                  IF n = next_num THEN
                      next_num := next_num + 1;
                  ELSE
                      EXIT;
                  END IF;
              END LOOP;
          END IF;

          RETURN 'QR-' || current_year || '-' || LPAD(next_num::text, 3, '0');
      END;
      $$;
    `);
  } catch (err: any) {
    log(`DB functions warning: ${err.message}`);
  }
}

async function syncSequences() {
  try {
    const sequenceMap: Record<string, { table: string; column: string }> = {
      'project_number_seq': { table: 'projects', column: 'project_number' },
      'invoice_number_seq': { table: 'invoices', column: 'invoice_number' },
      'quotation_number_seq': { table: 'quotations', column: 'quotation_number' },
      'work_order_number_seq': { table: 'work_orders', column: 'work_order_number' },
      'customer_number_seq': { table: 'customers', column: 'customer_number' },
    };
    for (const [seqName, { table, column }] of Object.entries(sequenceMap)) {
      try {
        const maxResult = await pool.query(
          `SELECT COALESCE(MAX(REGEXP_REPLACE(${column}, '[^0-9]', '', 'g')::int), 0) as max_num FROM ${table}`
        );
        const maxNum = maxResult.rows[0].max_num;
        if (maxNum > 0) {
          const seqResult = await pool.query(`SELECT last_value, is_called FROM ${seqName}`);
          const currentVal = seqResult.rows[0].is_called ? seqResult.rows[0].last_value : 0;
          if (currentVal < maxNum) {
            await pool.query(`SELECT setval('${seqName}', $1, true)`, [maxNum]);
            log(`Sequence ${seqName} synced: ${currentVal} → ${maxNum}`);
          }
        }
      } catch {
      }
    }
  } catch (err: any) {
    log(`Sequence sync warning: ${err.message}`);
  }
}

async function ensureDefaultUser() {
  try {
    const existing = await storage.getUserByUsername("admin");
    if (!existing) {
      await storage.createUser({
        username: "admin",
        password: hashPassword("admin123"),
        email: "admin@example.com",
        role: "admin",
      });
      log("Default admin user created (username: admin, password: admin123)");
    } else if (!existing.password.includes(":")) {
      // Migrate plaintext password to hashed version
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const plain = existing.password;
      await db.update(users).set({ password: hashPassword(plain) }).where(eq(users.username, "admin"));
      log("Admin password migrated to secure hashed format");
    }
  } catch (err: any) {
    log(`Could not ensure default user: ${err.message}`);
  }
}

const PgSession = connectPgSimple(session);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use(
  session({
    store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "erp-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

async function ensureLineItemColumns() {
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db");
    await db.execute(sql`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hs_code TEXT`);
    await db.execute(sql`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS country_of_origin TEXT`);
    await db.execute(sql`ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS hs_code TEXT`);
    await db.execute(sql`ALTER TABLE work_order_items ADD COLUMN IF NOT EXISTS country_of_origin TEXT`);
    await db.execute(sql`ALTER TABLE inventory_components ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT '0'`);
    await db.execute(sql`ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS swift_code TEXT`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT`);
    await db.execute(sql`ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS print_layout_id VARCHAR`);
    await db.execute(sql`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS print_layout_id VARCHAR`);
    await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS print_layout_id VARCHAR`);
    await db.execute(sql`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS print_layout_id VARCHAR`);
    await db.execute(sql`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS print_layout_id VARCHAR`);
    await db.execute(sql`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT '0.00'`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS contracts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_number TEXT NOT NULL UNIQUE,
      description TEXT,
      customer_id VARCHAR REFERENCES customers(id),
      contract_date TIMESTAMP,
      valid_until TIMESTAMP,
      status TEXT DEFAULT 'concept',
      notes TEXT,
      print_layout_id VARCHAR,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS contract_items (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id VARCHAR NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      article_number TEXT NOT NULL,
      item_type TEXT DEFAULT 'text',
      content TEXT,
      indent_level INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS print_language_code TEXT DEFAULT 'nl'`);
    await db.execute(sql`ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Arial'`);
    await db.execute(sql`ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS font_size INTEGER`);
    await db.execute(sql`ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS font_weight TEXT`);
    await db.execute(sql`ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS font_color TEXT`);
    await db.execute(sql`ALTER TABLE contract_items DROP COLUMN IF EXISTS position`);
  } catch (err: any) {
    log(`Could not ensure line item columns: ${err.message}`);
  }
}

async function ensureBrandsTable() {
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS brands (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now()
    )`);
    const unmigrated = await db.execute(
      sql`SELECT DISTINCT brand FROM inventory_items WHERE brand IS NOT NULL AND brand != '' AND brand NOT LIKE 'BRD-%'`
    );
    const rows = (unmigrated.rows || unmigrated) as any[];
    if (rows.length > 0) {
      const maxCodeResult = await db.execute(sql`SELECT code FROM brands ORDER BY code DESC LIMIT 1`);
      const maxRows = (maxCodeResult.rows || maxCodeResult) as any[];
      let codeNum = 1;
      if (maxRows.length > 0) {
        const match = maxRows[0].code.match(/^BRD-(\d+)$/);
        if (match) codeNum = parseInt(match[1], 10) + 1;
      }
      for (const row of rows) {
        const brandName = row.brand;
        const existing = await db.execute(sql`SELECT code FROM brands WHERE name = ${brandName} LIMIT 1`);
        const existingRows = (existing.rows || existing) as any[];
        let code: string;
        if (existingRows.length > 0) {
          code = existingRows[0].code;
        } else {
          code = `BRD-${String(codeNum).padStart(4, "0")}`;
          await db.execute(sql`INSERT INTO brands (code, name, is_active) VALUES (${code}, ${brandName}, true)`);
          codeNum++;
        }
        await db.execute(sql`UPDATE inventory_items SET brand = ${code} WHERE brand = ${brandName}`);
      }
      log(`Migrated ${rows.length} brand value(s) from inventory items`);
    }
    const remaining = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM inventory_items WHERE brand IS NOT NULL AND brand != '' AND brand NOT LIKE 'BRD-%'`
    );
    const remainingCount = parseInt(((remaining.rows || remaining) as any[])[0]?.cnt || "0", 10);
    if (remainingCount > 0) {
      log(`WARNING: ${remainingCount} inventory items still have unmigrated brand values`);
    }
  } catch (err: any) {
    log(`Could not ensure brands table: ${err.message}`);
  }
}

async function ensureAdminEmployee() {
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query(
      `SELECT id FROM employees WHERE employee_number = 'EM-0001' AND first_name = 'Admin' AND last_name = 'Admin'`
    );
    if (existing.length > 0) return;

    await client.query('BEGIN');

    const { rows: allEmps } = await client.query(
      `SELECT id, employee_number,
              CAST(REGEXP_REPLACE(employee_number, '[^0-9]', '', 'g') AS INTEGER) AS num
       FROM employees
       WHERE employee_number ~ '^EM-[0-9]+$'
       ORDER BY num DESC`
    );

    for (const emp of allEmps) {
      const newNum = `EM-${String(emp.num + 1).padStart(4, '0')}`;
      await client.query(`UPDATE employees SET employee_number = $1 WHERE id = $2`, [newNum, emp.id]);
    }

    await client.query(
      `INSERT INTO employees (id, employee_number, first_name, first_initial, last_name, email, title)
       VALUES (gen_random_uuid(), 'EM-0001', 'Admin', 'A.', 'Admin', '', 'Systeembeheerder')`
    );

    await client.query(`SELECT setval('employee_number_seq', (SELECT COALESCE(MAX(CAST(REPLACE(employee_number, 'EM-', '') AS INTEGER)), 0) FROM employees))`);

    await client.query('COMMIT');
    log('Admin employee created as EM-0001, existing employees shifted');
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    log(`Could not ensure admin employee: ${err.message}`);
  } finally {
    client.release();
  }
}

async function ensureCountriesSeed() {
  try {
    const possiblePaths = [
      join(import.meta.dirname, "countries-seed.json"),
      join(process.cwd(), "server", "countries-seed.json"),
      join(process.cwd(), "dist", "countries-seed.json"),
    ];
    let jsonContent = "";
    for (const p of possiblePaths) {
      try {
        if (existsSync(p)) {
          jsonContent = readFileSync(p, "utf-8").trim();
          break;
        }
      } catch {}
    }
    if (!jsonContent) return;

    const countries: Array<{ code: string; name: string; requiresBtw?: boolean; requiresAreaCode?: boolean }> = JSON.parse(jsonContent);
    if (!Array.isArray(countries) || countries.length === 0) return;

    const existing = await pool.query(`SELECT code FROM countries`);
    const existingCodes = new Set(existing.rows.map((r: any) => r.code));

    const missing = countries.filter(c => !existingCodes.has(c.code));
    if (missing.length === 0) return;

    for (const c of missing) {
      await pool.query(
        `INSERT INTO countries (code, name, requires_btw, requires_area_code) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
        [c.code, c.name, c.requiresBtw || false, c.requiresAreaCode || false]
      );
    }
    log(`Added ${missing.length} missing countries (total seed: ${countries.length})`);
  } catch (err: any) {
    log(`Countries seed error: ${err.message}`);
  }
}

async function migrateLY0016DocumentFooter() {
  try {
    const possiblePaths = [
      join(import.meta.dirname, "ly0016-footer.json"),
      join(process.cwd(), "server", "ly0016-footer.json"),
      join(process.cwd(), "dist", "ly0016-footer.json"),
    ];
    let configJson = "";
    for (const p of possiblePaths) {
      try {
        if (existsSync(p)) {
          configJson = readFileSync(p, "utf-8").trim();
          break;
        }
      } catch {}
    }
    if (!configJson) return;

    const parsed = JSON.parse(configJson);
    const expectedBlockCount = (parsed.blocks || []).length;
    if (expectedBlockCount < 30) return;

    const existing = await pool.query(
      `SELECT id, config::text as config FROM layout_sections WHERE layout_id = '6ce6fe5f-0dd3-43c5-aa5f-88d2b1b284fd' AND name = 'Document footer'`
    );
    if (existing.rows.length === 0) return;

    const currentConfig = JSON.parse(existing.rows[0].config);
    const currentBlockCount = (currentConfig.blocks || []).length;

    if (currentBlockCount >= expectedBlockCount) return;

    await pool.query(
      `UPDATE layout_sections SET config = $1::jsonb WHERE id = $2`,
      [configJson, existing.rows[0].id]
    );
    log(`Migrated LY-0016 Document footer: ${currentBlockCount} → ${expectedBlockCount} blocks`);
  } catch (err: any) {
    log(`LY-0016 migration error: ${err.message}`);
  }
}

async function ensureContractLayout() {
  try {
    const layoutId = 'contract-layout-ate-001';
    const versionCheck = await pool.query(`SELECT metadata FROM document_layouts WHERE id = $1`, [layoutId]);
    const meta = versionCheck.rows.length > 0 ? (typeof versionCheck.rows[0].metadata === 'string' ? JSON.parse(versionCheck.rows[0].metadata) : versionCheck.rows[0].metadata || {}) : {};
    const currentVersion = versionCheck.rows.length > 0 ? (meta.layoutVersion || 1) : 0;

    if (currentVersion >= 3) return;

    if (versionCheck.rows.length > 0) {
      await pool.query(`DELETE FROM layout_sections WHERE layout_id = $1`, [layoutId]);
      await pool.query(`DELETE FROM document_layouts WHERE id = $1`, [layoutId]);
    }

    await pool.query(`
      INSERT INTO document_layouts (id, document_type, name, page_format, orientation, is_default, metadata, layout_number, created_at, updated_at)
      VALUES ($1, 'contract', 'ATE Solutions Contract', 'a4', 'portrait', true,
        '{"printMargins":{"top":10,"left":15,"right":15,"bottom":10},"layoutVersion":3}',
        'LY-0020', NOW(), NOW())
    `, [layoutId]);

    const headerConfig = {
      style: {
        padding: { top: 3, left: 0, right: 0, bottom: 3 },
        backgroundColor: '#ffffff',
      },
      blocks: [
        {
          id: 'cblk-logo',
          type: 'Image',
          size: { width: 45, height: 15 },
          position: { x: 0, y: 0 },
          config: { src: 'company.logo', alt: 'ATE Solutions B.V.', fit: 'contain' },
          style: { fontSize: 9 },
        },
        {
          id: 'cblk-date',
          type: 'Data Field',
          size: { width: 50, height: 6 },
          position: { x: 130, y: 0 },
          config: { tableName: 'contract', fieldName: 'contractDate', label: 'Datum:' },
          style: { fontSize: 8, color: '#555555', textAlign: 'right' },
        },
        {
          id: 'cblk-pagenum-header',
          type: 'Page Number',
          size: { width: 50, height: 6 },
          position: { x: 130, y: 7 },
          config: { format: 'of_total' },
          style: { fontSize: 8, color: '#555555', textAlign: 'right' },
        },
        {
          id: 'cblk-orangeline-header',
          type: 'Line',
          size: { width: 180, height: 1 },
          position: { x: 0, y: 17 },
          config: {},
          style: { borderColor: '#e87722', borderWidth: 3 },
        },
      ],
      printRules: { everyPage: true },
    };

    const coverConfig = {
      style: {
        padding: { top: 0, left: 0, right: 0, bottom: 0 },
        backgroundColor: '#ffffff',
      },
      dimensions: { height: 230 },
      blocks: [
        {
          id: 'cblk-cover-title',
          type: 'Text Block',
          size: { width: 180, height: 16 },
          position: { x: 0, y: 50 },
          config: { text: 'OVEREENKOMST' },
          style: { fontSize: 28, fontWeight: 'bold', color: '#1a365d', textAlign: 'center' },
        },
        {
          id: 'cblk-cover-line1',
          type: 'Line',
          size: { width: 100, height: 1 },
          position: { x: 40, y: 70 },
          config: {},
          style: { borderColor: '#e87722', borderWidth: 2 },
        },
        {
          id: 'cblk-cover-company',
          type: 'Text Block',
          size: { width: 180, height: 10 },
          position: { x: 0, y: 80 },
          config: { text: '{{company.name}}' },
          style: { fontSize: 14, fontWeight: 'bold', color: '#1a365d', textAlign: 'center' },
        },
        {
          id: 'cblk-cover-en',
          type: 'Text Block',
          size: { width: 180, height: 8 },
          position: { x: 0, y: 94 },
          config: { text: 'en' },
          style: { fontSize: 11, color: '#666666', textAlign: 'center', fontStyle: 'italic' },
        },
        {
          id: 'cblk-cover-customer',
          type: 'Text Block',
          size: { width: 180, height: 10 },
          position: { x: 0, y: 106 },
          config: { text: '{{customer.name}}' },
          style: { fontSize: 14, fontWeight: 'bold', color: '#1a365d', textAlign: 'center' },
        },
        {
          id: 'cblk-cover-line2',
          type: 'Line',
          size: { width: 100, height: 1 },
          position: { x: 40, y: 122 },
          config: {},
          style: { borderColor: '#e87722', borderWidth: 2 },
        },
        {
          id: 'cblk-cover-desc',
          type: 'Data Field',
          size: { width: 140, height: 12 },
          position: { x: 20, y: 132 },
          config: { tableName: 'contract', fieldName: 'description' },
          style: { fontSize: 12, color: '#333333', textAlign: 'center' },
        },
        {
          id: 'cblk-cover-number',
          type: 'Text Block',
          size: { width: 180, height: 10 },
          position: { x: 0, y: 155 },
          config: { text: 'Contractnummer: {{contract.contractNumber}}' },
          style: { fontSize: 10, color: '#555555', textAlign: 'center' },
        },
        {
          id: 'cblk-cover-date',
          type: 'Text Block',
          size: { width: 180, height: 8 },
          position: { x: 0, y: 168 },
          config: { text: 'Datum: {{contract.contractDate}}  |  Geldig tot: {{contract.validUntil}}' },
          style: { fontSize: 9, color: '#777777', textAlign: 'center' },
        },
      ],
      printRules: { firstPage: true },
    };

    const bodyConfig = {
      style: {
        padding: { top: 5, left: 0, right: 0, bottom: 5 },
        backgroundColor: '#ffffff',
      },
      heightCanShrink: true,
      canShrink: true,
      blocks: [
        {
          id: 'cblk-body',
          type: 'Contract Body',
          size: { width: 180, height: 500 },
          position: { x: 0, y: 0 },
          config: {},
          style: { fontSize: 10, titleColor: '#1a365d', accentColor: '#e87722' },
        },
      ],
      printRules: { everyPage: false },
    };

    const footerConfig = {
      style: {
        padding: { top: 3, left: 0, right: 0, bottom: 3 },
        backgroundColor: '#ffffff',
      },
      blocks: [
        {
          id: 'cblk-footerline',
          type: 'Line',
          size: { width: 180, height: 1 },
          position: { x: 0, y: 0 },
          config: {},
          style: { borderColor: '#e87722', borderWidth: 2 },
        },
        {
          id: 'cblk-footertext',
          type: 'Text Block',
          size: { width: 180, height: 8 },
          position: { x: 0, y: 3 },
          config: { text: '{{company.name}} | KVK: {{company.kvkNummer}} | BTW: {{company.btwNummer}} | IBAN: {{company.bankAccount}} | {{company.phone}} | {{company.email}}' },
          style: { fontSize: 7, color: '#888888', textAlign: 'center' },
        },
      ],
      printRules: { everyPage: true },
    };

    await pool.query(`
      INSERT INTO layout_sections (id, layout_id, name, section_type, "position", allow_multiple, config, created_at)
      VALUES
        ('contract-sec-header', $1, 'Koptekst', 'header', 0, false, $2, NOW()),
        ('contract-sec-cover', $1, 'Voorblad', 'body', 1, false, $3, NOW()),
        ('contract-sec-body', $1, 'Inhoud', 'body', 2, false, $4, NOW()),
        ('contract-sec-footer', $1, 'Voettekst', 'footer', 3, false, $5, NOW())
    `, [layoutId, JSON.stringify(headerConfig), JSON.stringify(coverConfig), JSON.stringify(bodyConfig), JSON.stringify(footerConfig)]);

    log('Contract layout v2 seeded successfully');
  } catch (err: any) {
    if (!err.message?.includes('duplicate key')) {
      log(`Contract layout seed error: ${err.message}`);
    }
  }
}

(async () => {
  await seedProductionDatabase();
  await ensureSeedLayouts();
  await ensureContractLayout();
  await migrateLY0016DocumentFooter();
  await ensureCountriesSeed();
  await ensureDbFunctions();
  await ensureBrandsTable();
  await ensureLineItemColumns();
  await syncSequences();
  await fixQuotationTotals();
  await ensureAdminEmployee();
  await ensureDefaultUser();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    scheduleDailyBackup();
  });
})();
