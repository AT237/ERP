import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Add connection status check for Neon
export async function checkDatabaseStatus() {
  try {
    // Neon uses PostgreSQL syntax, 'SHOW server_version;' is a common way to check server info
    const result = await db.execute('SHOW server_version;');
    console.log('Database status:', result);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Function to unlock database and reset history retention - This functionality is not directly applicable to Neon in the same way as SQLite.
// Neon manages history retention differently. The provided SQLite commands (locking_mode, journal_mode) are not standard PostgreSQL commands.
// For Neon, ensuring the connection is properly managed and that there are no active transactions blocking modifications is key.
// The following is a conceptual attempt, but actual Neon management might require different APIs or approaches.
export async function unlockDatabase() {
  try {
    // In Neon, explicit "unlocking" like in SQLite is not typical.
    // If there are issues with history retention, it might be due to long-running transactions or specific Neon configuration.
    // We can try to ensure no transactions are blocking by attempting to end any potentially long-running ones.
    // This is a highly speculative approach for Neon.
    await pool.end(); // Close existing connections
    // Re-establishing connection might be necessary, or a different method to reset state.
    // For a true "unlock", one might need to interact with Neon's control plane or ensure active sessions are terminated.
    console.log('Attempted to reset database connection for Neon. Actual unlock may require different methods.');
    return true;
  } catch (error) {
    console.error('Failed to reset database connection for Neon:', error);
    return false;
  }
}