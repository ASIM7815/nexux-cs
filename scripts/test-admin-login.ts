import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function testAdminLogin() {
  const username = process.env.ADMIN_TEST_USERNAME || process.env.ADMIN_SEED_USERNAME;
  const password = process.env.ADMIN_TEST_PASSWORD || process.env.ADMIN_SEED_PASSWORD;
  if (!username || !password) {
    throw new Error('Set ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD to run this check');
  }
  
  console.log('🔍 Testing admin login...');
  console.log('Username:', username);
  console.log('Password: [provided securely]');
  console.log('');
  
  try {
    // Fetch admin account
    console.log('📡 Connecting to Neon database...');
    const result = await sql`SELECT * FROM accounts WHERE username = ${username} LIMIT 1`;
    
    if (result.length === 0) {
      console.error('❌ Admin account not found!');
      console.error('❌ Admin account not found');
      process.exitCode = 1;
      return;
    }
    
    const account = result[0];
    console.log('✅ Admin account found!');
    console.log('   ID:', account.id);
    console.log('   Username:', account.username);
    console.log('   Account Type:', account.account_type);
    console.log('');
    
    // Test password
    console.log('🔐 Testing password...');
    const passwordsMatch = await bcrypt.compare(password, account.password_hash);
    
    if (passwordsMatch) {
      console.log('✅ Password matches! Login should work.');
    } else {
      console.error('❌ Password does not match!');
      process.exitCode = 1;
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('This is likely a Neon connection timeout.');
    console.error('Try running the script again or check your DATABASE_URL.');
  }
}

testAdminLogin();
