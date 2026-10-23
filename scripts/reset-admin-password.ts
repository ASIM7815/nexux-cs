import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const { accounts } = schema;

async function resetAdminPassword() {
  console.log('🔑 Resetting admin password...');

  try {
    const newPassword = process.env.ADMIN_UPDATE_PASSWORD;
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Set ADMIN_UPDATE_PASSWORD with at least 8 characters');
    }
    const adminPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update admin password
    await db
      .update(accounts)
      .set({ passwordHash: adminPasswordHash })
      .where(eq(accounts.accountType, 'admin'));

    console.log('✅ Admin password reset successfully!');
    console.log('✅ Password updated from ADMIN_UPDATE_PASSWORD (not printed)');
  } catch (error) {
    console.error('❌ Failed to reset password:', error);
    throw error;
  }
}

resetAdminPassword()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
