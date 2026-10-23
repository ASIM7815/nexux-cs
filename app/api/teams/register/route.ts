import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { jsonError, sameOrigin } from '@/lib/api/security';

const schema = z.object({
  username: z.string().trim().min(3).max(255), password: z.string().min(8).max(128),
  teamName: z.string().trim().min(3).max(255),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
  // Registration is intentionally unauthenticated, but it is controlled by
  // the organizer's persisted registration setting.
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Username, an 8-character password, and a team name are required', 400);
  try {
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const [created] = await executeWithRetry(() => sql`
      WITH settings AS (SELECT COALESCE(MAX(value) FILTER (WHERE key = 'registration_enabled'), 'false') AS enabled FROM competition_config),
      account AS (
        INSERT INTO accounts (username, password_hash, account_type, score)
        SELECT ${parsed.data.username}, ${hash}, 'participant', 0 FROM settings WHERE enabled = 'true' RETURNING id
      ), team AS (
        INSERT INTO teams (name, owner_account_id) SELECT ${parsed.data.teamName}, id FROM account RETURNING id, name, owner_account_id
      ), member AS (
        INSERT INTO team_members (team_id, account_id, role) SELECT id, owner_account_id, 'owner' FROM team RETURNING team_id
      ) SELECT (SELECT enabled = 'true' FROM settings) AS registration_enabled, (SELECT id FROM account) AS account_id, (SELECT id FROM team) AS team_id
    `, 3, 150);
    if (!created?.registration_enabled) return jsonError('Team registration is currently closed', 403);
    if (!created.account_id || !created.team_id) return jsonError('Username or team name is already in use', 409);
    return Response.json({ success: true, message: 'Team created. You can now sign in.' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/unique|duplicate/i.test(message)) return jsonError('Username or team name is already in use', 409);
    console.error('Team registration failed:', message);
    return jsonError('Unable to create team', 500);
  }
}
