import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use HTTP connection for better Replit compatibility
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });

// Test database connection
export async function checkDatabaseStatus() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}