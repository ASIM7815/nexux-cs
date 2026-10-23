import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError } from '@/lib/api/security';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    // Never include c.flag in an API response or client component payload.
    const challenges = await executeWithRetry(() => sql`
      SELECT c.id, c.title, c.description, c.category_id,
             cat.name AS category_name, c.points, c.is_visible,
             c.max_attempts, c.created_at, c.updated_at,
             COALESCE(
               json_agg(json_build_object(
                 'id', h.id,
                 'content', h.content,
                 'penalty_points', COALESCE(h.cost, 0)
               ) ORDER BY h.display_order, h.created_at)
               FILTER (WHERE h.id IS NOT NULL), '[]'::json
             ) AS hints,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', a.id,
                 'filename', a.filename,
                 'file_url', a.file_url,
                 'file_size', a.file_size
               ))
               FROM challenge_attachments a
               WHERE a.challenge_id = c.id), '[]'::json
             ) AS attachments
      FROM challenges c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN hints h ON c.id = h.challenge_id
      GROUP BY c.id, cat.name
      ORDER BY c.created_at DESC NULLS LAST, c.id DESC
    `, 3, 150);
    return Response.json({ challenges });
  } catch (error) {
    console.error('Failed to fetch challenges:', getErrorMessage(error));
    return jsonError('Failed to fetch challenges', 500);
  }
}
