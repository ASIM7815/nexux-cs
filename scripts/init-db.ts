import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

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
const sql = neon(DATABASE_URL);

async function executeWithRetry(queryFn: () => Promise<any>, description: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await queryFn();
      console.log(`✅ ${description}`);
      return;
    } catch (error: any) {
      if (i === maxRetries - 1) {
        console.error(`❌ Failed ${description} after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`⚠️  Retry ${i + 1}/${maxRetries} for ${description}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function initDatabase() {
  console.log('🔄 Creating database schema...\n');

  try {
    // Group 1: Core tables
    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('admin', 'team')),
        team_name VARCHAR(255),
        active_session_id VARCHAR(128),
        active_session_expires_at TIMESTAMP,
        score INTEGER DEFAULT 0,
        last_solve_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'accounts table'
    );

    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'categories table'
    );

    // Group 2: Challenge tables
    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        points INTEGER NOT NULL,
        flag VARCHAR(500) NOT NULL,
        max_attempts INTEGER,
        is_visible BOOLEAN DEFAULT true,
        author VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'challenges table'
    );

    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS challenge_attachments (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'challenge_attachments table'
    );

    // Group 3: Hint tables
    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS hints (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        cost INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'hints table'
    );

    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS hint_unlocks (
        id SERIAL PRIMARY KEY,
        hint_id INTEGER REFERENCES hints(id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        team_name VARCHAR(255),
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hint_id, account_id)
      )`,
      'hint_unlocks table'
    );

    // Group 4: Submission tables
    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS solves (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        team_name VARCHAR(255),
        solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_id, account_id)
      )`,
      'solves table'
    );

    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        team_name VARCHAR(255),
        submitted_flag VARCHAR(500) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'submissions table'
    );

    // Group 5: Config and audit
    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS competition_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'competition_config table'
    );

    await executeWithRetry(
      () => sql`CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      'audit_logs table'
    );

    // Forward-compatible, non-destructive upgrades for databases initialized
    // by an earlier version of the application.
    await executeWithRetry(
      () => sql`ALTER TABLE challenges
        ADD COLUMN IF NOT EXISTS author VARCHAR(255),
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS max_attempts INTEGER,
        ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      'challenge columns'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE hints
        ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
      'hint columns'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS entity_id INTEGER,
        ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`,
      'audit columns'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE solves
        ADD COLUMN IF NOT EXISTS team_name VARCHAR(255)`,
      'solve team identity column'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS team_name VARCHAR(255)`,
      'submission team identity column'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE hint_unlocks
        ADD COLUMN IF NOT EXISTS team_name VARCHAR(255)`,
      'hint unlock team identity column'
    );
    await executeWithRetry(
      () => sql`ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(128),
        ADD COLUMN IF NOT EXISTS active_session_expires_at TIMESTAMP`,
      'account session lock columns'
    );
    await executeWithRetry(
      () => sql`UPDATE solves s
        SET team_name = a.team_name
        FROM accounts a
        WHERE s.account_id = a.id
          AND s.team_name IS DISTINCT FROM a.team_name`,
      'solve team identity backfill'
    );
    await executeWithRetry(
      () => sql`UPDATE submissions s
        SET team_name = a.team_name
        FROM accounts a
        WHERE s.account_id = a.id
          AND s.team_name IS DISTINCT FROM a.team_name`,
      'submission team identity backfill'
    );
    await executeWithRetry(
      () => sql`UPDATE hint_unlocks h
        SET team_name = a.team_name
        FROM accounts a
        WHERE h.account_id = a.id
          AND h.team_name IS DISTINCT FROM a.team_name`,
      'hint unlock team identity backfill'
    );
    await executeWithRetry(
      () => sql`DELETE FROM competition_config
        WHERE key IN ('competition_start', 'competition_end')`,
      'remove competition schedule settings'
    );

    console.log('\n🔄 Creating indexes...\n');

    // Create indexes
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category_id)`,
      'idx_challenges_category'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_challenges_visible ON challenges(is_visible)`,
      'idx_challenges_visible'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_solves_account ON solves(account_id)`,
      'idx_solves_account'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_solves_challenge ON solves(challenge_id)`,
      'idx_solves_challenge'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_submissions_account ON submissions(account_id)`,
      'idx_submissions_account'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)`,
      'idx_accounts_type'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_accounts_score ON accounts(score DESC, last_solve_time ASC)`,
      'idx_accounts_score'
    );
    await executeWithRetry(
      () => sql`CREATE INDEX IF NOT EXISTS idx_submissions_challenge_account ON submissions(challenge_id, account_id, submitted_at DESC)`,
      'idx_submissions_challenge_account'
    );

    console.log('\n✨ Database schema initialized successfully!');
  } catch (error) {
    console.error('\n❌ Fatal error initializing database');
    throw error;
  }
}

initDatabase()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
