import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { sql } from './neon-client';

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const db = drizzle(sql, { schema });

// Test connection
export async function testConnection() {
  try {
    const result = await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
