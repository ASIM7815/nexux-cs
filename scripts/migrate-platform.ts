import { config } from 'dotenv';
import { resolve } from 'node:path';
import { neon, neonConfig } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

neonConfig.fetchFunction = fetch;
const sql = neon(process.env.DATABASE_URL);

/**
 * Non-destructive production upgrade for databases created by older releases.
 * It is deliberately idempotent so it can run during every deployment.
 */
async function migrate() {
  await sql.transaction([
    sql`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS additional_flags TEXT`,
    sql`ALTER TABLE challenge_attachments ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500)`,
    sql`ALTER TABLE challenge_attachments ADD COLUMN IF NOT EXISTS content_type VARCHAR(255)`,
    sql`ALTER TABLE challenge_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    // Older attachments stored an object URL in file_url. New records use an
    // opaque object key in both columns until every legacy object is migrated.
    sql`UPDATE challenge_attachments
        SET storage_key = CASE
          WHEN storage_key IS NOT NULL THEN storage_key
          WHEN file_url LIKE 'challenges/%' THEN file_url
          WHEN position('/challenges/' IN file_url) > 0 THEN substring(file_url FROM '.*/(challenges/.*)$')
          ELSE NULL
        END
        WHERE storage_key IS NULL`,
    sql`CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      owner_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      score INTEGER NOT NULL DEFAULT 0,
      last_solve_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    sql`CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      role VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (team_id, account_id),
      UNIQUE (account_id)
    )`,
    sql`ALTER TABLE solves ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL`,
    sql`ALTER TABLE hint_unlocks ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL`,
    sql`ALTER TABLE accounts ALTER COLUMN account_type TYPE VARCHAR(16)`,
    sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check`,
    sql`ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
      CHECK (account_type IN ('admin', 'team', 'participant'))`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS solves_unique_team_challenge
      ON solves(challenge_id, team_id) WHERE team_id IS NOT NULL`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS hint_unlocks_unique_team_hint
      ON hint_unlocks(hint_id, team_id) WHERE team_id IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS submissions_team_challenge_idx
      ON submissions(team_id, challenge_id, submitted_at DESC)`,
  ]);

  // Keep pre-existing one-login-per-team accounts operational. These rows are
  // represented as teams but remain valid credentials until organizers migrate.
  await sql`
    INSERT INTO teams (name, owner_account_id, score, last_solve_time)
    SELECT a.team_name, a.id, COALESCE(a.score, 0), a.last_solve_time
    FROM accounts a
    WHERE a.account_type = 'team' AND a.team_name IS NOT NULL
    ON CONFLICT (name) DO NOTHING
  `;
  await sql`
    UPDATE solves s SET team_id = t.id
    FROM teams t
    WHERE s.team_id IS NULL AND s.team_name = t.name
  `;
  await sql`
    UPDATE submissions s SET team_id = t.id
    FROM teams t
    WHERE s.team_id IS NULL AND s.team_name = t.name
  `;
  await sql`
    UPDATE hint_unlocks h SET team_id = t.id
    FROM teams t
    WHERE h.team_id IS NULL AND h.team_name = t.name
  `;
  console.log('Platform migration complete.');
}

migrate().catch((error) => {
  console.error('Platform migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
