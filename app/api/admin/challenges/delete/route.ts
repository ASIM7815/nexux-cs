import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';
import { deleteFile } from '@/lib/storage/neon-storage';

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
      WITH removed_files AS (
        DELETE FROM challenge_attachments
        WHERE challenge_id = ${parsed.data.id}
        RETURNING storage_key, file_url
      ), removed AS (
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
      SELECT id,
        COALESCE((SELECT json_agg(json_build_object('storage_key', storage_key, 'file_url', file_url)) FROM removed_files), '[]'::json) AS removed_files
      FROM removed LIMIT 1
    `, 5, 300);

    if (!result) return jsonError('Challenge not found', 404);
    if (Array.isArray(result.removed_files)) {
      await Promise.all(result.removed_files.map((file: { storage_key?: string; file_url?: string }) => {
        const key = file.storage_key || (file.file_url?.startsWith('challenges/') ? file.file_url : '');
        return key.startsWith('challenges/') ? deleteFile(key) : Promise.resolve(true);
      }));
    }
    return Response.json({ success: true, message: 'Challenge deleted successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Failed to delete challenge:', getErrorMessage(error));
    return jsonError('Failed to delete challenge', 500);
  }
}
