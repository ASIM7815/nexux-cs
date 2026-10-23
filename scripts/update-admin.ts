import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function updateAdmin() {
  console.log('🔑 Updating admin credentials...');

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const newUsername = process.env.ADMIN_UPDATE_USERNAME || process.env.ADMIN_SEED_USERNAME;
      const newPassword = process.env.ADMIN_UPDATE_PASSWORD || process.env.ADMIN_SEED_PASSWORD;
      if (!newUsername || !newPassword || newPassword.length < 8) {
        throw new Error('Set ADMIN_UPDATE_USERNAME and ADMIN_UPDATE_PASSWORD (minimum 8 characters)');
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);

      console.log(`Attempt ${attempt}/${maxRetries}...`);

      // Update admin account
      await sql`
        UPDATE accounts 
        SET username = ${newUsername}, 
            password_hash = ${passwordHash}
        WHERE account_type = 'admin'
      `;

      console.log('✅ Admin credentials updated successfully!');
      console.log('');
      console.log('🔐 New admin credentials:');
      console.log(`   Username: ${newUsername}`);
      console.log('   Password: supplied through the environment (not printed)');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`⚠️  Attempt ${attempt} failed, retrying in ${attempt}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  console.error('❌ Failed to update admin after', maxRetries, 'attempts:', lastError);
  throw lastError;
}

updateAdmin()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
