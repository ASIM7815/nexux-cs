import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const deleteSchema = z.object({ id: z.coerce.number().int().positive() });

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return jsonError('A valid challenge ID is required', 400);

    const [result] = await executeWithRetry(() => sql`
      WITH removed AS (
        DELETE FROM challenges
        WHERE id = ${parsed.data.id}
        RETURNING id, title, points
      ),
      audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'delete', 'challenge', id,
          jsonb_build_object('title', title, 'points', points)
        FROM removed
        RETURNING entity_id
      )
      SELECT id FROM removed LIMIT 1
    `, 5, 300);

    if (!result) return jsonError('Challenge not found', 404);
    return Response.json({ success: true, message: 'Challenge deleted successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Failed to delete challenge:', getErrorMessage(error));
    return jsonError('Failed to delete challenge', 500);
  }
}
