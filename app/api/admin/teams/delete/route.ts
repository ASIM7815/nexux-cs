import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const deleteSchema = z.object({ teamId: z.coerce.number().int().positive() });

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return jsonError('A valid team ID is required', 400);

    const [result] = await executeWithRetry(() => sql`
      WITH removed AS (
        DELETE FROM accounts
        WHERE id = ${parsed.data.teamId} AND account_type = 'team'
        RETURNING id, username, team_name
      ),
      audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'delete', 'team', id,
          jsonb_build_object('username', username, 'teamName', team_name)
        FROM removed
        RETURNING entity_id
      )
      SELECT id FROM removed LIMIT 1
    `, 5, 300);
    if (!result) return jsonError('Team not found', 404);
    return Response.json({ success: true, message: 'Team deleted successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Team deletion failed:', getErrorMessage(error));
    return jsonError('Failed to delete team', 500);
  }
}
