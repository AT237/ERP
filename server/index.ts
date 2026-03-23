import express, { type Request, Response, NextFunction } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
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

(async () => {
  await seedProductionDatabase();
  await ensureBrandsTable();
  await ensureLineItemColumns();
  await syncSequences();
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
