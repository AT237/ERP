import express, { type Request, Response, NextFunction } from "express";
import { exec } from "child_process";
import { promisify } from "util";
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
    }
  } catch (err: any) {
    log(`Could not ensure default user: ${err.message}`);
  }
}

const PgSession = connectPgSimple(session);

const app = express();
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

(async () => {
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
