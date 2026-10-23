import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { jsonError, sameOrigin } from '@/lib/api/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
  const session = await auth();
  if (!session?.user?.id || session.user.accountType !== 'participant') return jsonError('Only participant accounts may leave a team', 403);
  const accountId = Number(session.user.id);
  const [result] = await executeWithRetry(() => sql`
    WITH removed AS (DELETE FROM team_members WHERE account_id = ${accountId} AND role <> 'owner' RETURNING team_id)
    SELECT EXISTS(SELECT 1 FROM removed) AS left_team
  `, 3, 150);
  if (!result?.left_team) return jsonError('Team owners must transfer ownership or delete their team through an organizer', 409);
  return Response.json({ success: true, message: 'Left team successfully' });
}
