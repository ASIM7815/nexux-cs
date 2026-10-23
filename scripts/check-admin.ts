import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function checkAdmin() {
  console.log('🔍 Checking admin account...');
  const username = process.env.ADMIN_TEST_USERNAME || process.env.ADMIN_SEED_USERNAME;

  try {
    if (!username) throw new Error('Set ADMIN_TEST_USERNAME or ADMIN_SEED_USERNAME');
    const result = await sql`SELECT username, account_type FROM accounts WHERE username = ${username}`;
    
    if (result.length === 0) {
      console.log('❌ No admin account found!');
    } else {
      console.log('✅ Admin account exists:');
      console.log(`   Username: ${result[0].username}`);
      const password = process.env.ADMIN_TEST_PASSWORD;
      if (password) {
        const adminResult = await sql`SELECT password_hash FROM accounts WHERE username = ${username}`;
        const match = await bcrypt.compare(password, adminResult[0].password_hash);
        console.log(`   Password check: ${match ? '✅ MATCH' : '❌ no match'}`);
      } else {
        console.log('   Password check skipped (set ADMIN_TEST_PASSWORD to verify it)');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAdmin()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
