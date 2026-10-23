import { neon, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Database network request failed');
}

neonConfig.fetchFunction = fetchWithRetry;
const sql = neon(process.env.DATABASE_URL!);

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 200));
    }
  }
  throw new Error('All retries failed');
}

async function verifyDatabase() {
  console.log('🔍 Checking database tables...\n');

  try {
    // Check if tables exist
    const tables = await executeWithRetry(() => sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📊 Existing tables:');
    tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`));
    console.log('');

    const tableNames = tables.map((t: any) => t.table_name);
    const requiredTables = [
      'accounts',
      'categories', 
      'challenges',
      'hints',
      'hint_unlocks',
      'solves',
      'submissions',
    'competition_config',
    'audit_logs'
    ];

    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
      console.log('\n💡 Run: npm run db:init\n');
      return false;
    }

    // Check accounts table structure
    console.log('🔍 Checking accounts table...');
    const accounts = await executeWithRetry(() => sql`SELECT * FROM accounts LIMIT 1`);
    console.log(`  ✓ Accounts table working (${accounts.length} sample row)`);

    // Check admin account
    const admin = await executeWithRetry(() => sql`
      SELECT id, username, account_type 
      FROM accounts 
      WHERE account_type = 'admin' 
      LIMIT 1
    `);
    
    if (admin.length > 0) {
      console.log(`  ✓ Admin account exists: ${admin[0].username}`);
    } else {
      console.log('  ⚠️  No admin account found');
    }

    // Check team accounts
    const teams = await executeWithRetry(() => sql`
      SELECT COUNT(*) as count 
      FROM accounts 
      WHERE account_type = 'team'
    `);
    console.log(`  ✓ Team accounts: ${teams[0].count}`);

    // Check challenges
    const challenges = await executeWithRetry(() => sql`
      SELECT COUNT(*) as count FROM challenges
    `);
    console.log(`  ✓ Challenges: ${challenges[0].count}`);

    // Check categories
    const categories = await executeWithRetry(() => sql`
      SELECT COUNT(*) as count FROM categories
    `);
    console.log(`  ✓ Categories: ${categories[0].count}`);

    // Check solves tracking
    const solves = await executeWithRetry(() => sql`
      SELECT COUNT(*) as count FROM solves
    `);
    console.log(`  ✓ Solves recorded: ${solves[0].count}`);

    // Check submissions tracking
    const submissions = await executeWithRetry(() => sql`
      SELECT COUNT(*) as count FROM submissions
    `);
    console.log(`  ✓ Submissions recorded: ${submissions[0].count}`);

    const activityIdentity = await executeWithRetry(() => sql`
      SELECT
        (SELECT COUNT(*) FROM solves WHERE team_name IS NULL) AS solves_without_team_name,
        (SELECT COUNT(*) FROM submissions WHERE team_name IS NULL) AS submissions_without_team_name,
        (SELECT COUNT(*) FROM hint_unlocks WHERE team_name IS NULL) AS hint_unlocks_without_team_name
    `);
    const identity = activityIdentity[0];
    if (Number(identity.solves_without_team_name) === 0
      && Number(identity.submissions_without_team_name) === 0
      && Number(identity.hint_unlocks_without_team_name) === 0) {
      console.log('  ✓ Team names present in all participant activity records');
    } else {
      console.log(
        `  ⚠️ Missing team names: solves=${identity.solves_without_team_name}, `
        + `submissions=${identity.submissions_without_team_name}, `
        + `hint_unlocks=${identity.hint_unlocks_without_team_name}`
      );
    }

    console.log('\n✅ Database is properly configured!\n');
    console.log('📋 Summary:');
    console.log(`   - Admin account: ${admin.length > 0 ? '✓' : '✗'}`);
    console.log(`   - Team accounts: ${teams[0].count}`);
    console.log(`   - Challenges: ${challenges[0].count}`);
    console.log(`   - Categories: ${categories[0].count}`);
    console.log(`   - Total solves: ${solves[0].count}`);
    console.log(`   - Total submissions: ${submissions[0].count}`);
    console.log('');

    return true;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Database tables may not exist. Run: npm run db:init\n');
    return false;
  }
}

verifyDatabase();
