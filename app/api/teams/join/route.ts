import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { jsonError, sameOrigin } from '@/lib/api/security';

const schema = z.object({ teamName: z.string().trim().min(3).max(255) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
  const session = await auth();
  if (!session?.user?.id || session.user.accountType !== 'participant') return jsonError('Only participant accounts may join a team', 403);
  let body: unknown; try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError('A valid team name is required', 400);
  const accountId = Number(session.user.id);
  const [result] = await executeWithRetry(() => sql`
    WITH cfg AS (SELECT COALESCE(MAX(value) FILTER (WHERE key = 'max_team_size'), '4')::integer AS max_size FROM competition_config),
    target AS (SELECT t.id FROM teams t WHERE t.name = ${parsed.data.teamName}),
    joined AS (
      INSERT INTO team_members (team_id, account_id, role)
      SELECT t.id, ${accountId}, 'member' FROM target t, cfg
      WHERE (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id) < cfg.max_size
      ON CONFLICT (account_id) DO NOTHING RETURNING team_id
    ) SELECT EXISTS(SELECT 1 FROM target) AS team_exists, EXISTS(SELECT 1 FROM joined) AS joined
  `, 3, 150);
  if (!result?.team_exists) return jsonError('Team not found', 404);
  if (!result.joined) return jsonError('You are already on a team or this team is full', 409);
  return Response.json({ success: true, message: 'Joined team successfully' });
}
