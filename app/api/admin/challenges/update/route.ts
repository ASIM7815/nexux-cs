import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const hintSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  penalty_points: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

const challengeSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(50_000),
  category_id: z.coerce.number().int().positive(),
  points: z.coerce.number().int().min(0).max(1_000_000),
  // An empty flag means “keep the existing server-side flag”. It is never
  // returned by the list endpoint, so admins cannot accidentally expose it.
  flag: z.string().trim().max(500).optional(),
  is_visible: z.boolean().default(false),
  max_attempts: z.union([z.coerce.number().int().positive().max(1_000_000), z.null()]).default(null),
  hints: z.array(hintSchema).max(50).default([]),
  additionalFlags: z.array(z.string().trim()).optional().default([]), // Array of additional flags
  fileUrl: z.string().url().optional().or(z.literal('')), // Support file updates
});

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = challengeSchema.safeParse(body);
    if (!parsed.success) return jsonError('Invalid challenge fields', 400);
    const data = parsed.data;

    const [result] = await executeWithRetry(() => sql`
      WITH category AS (
        SELECT id FROM categories WHERE id = ${data.category_id}
      ),
      updated AS (
        UPDATE challenges
        SET title = ${data.title},
            description = ${data.description},
            category_id = ${data.category_id},
            points = ${data.points},
            flag = CASE WHEN COALESCE(${data.flag ?? ''}, '') = '' THEN flag ELSE ${data.flag ?? ''} END,
            additional_flags = CASE 
              WHEN ${data.additionalFlags && data.additionalFlags.length > 0 ? JSON.stringify(data.additionalFlags) : null} IS NOT NULL 
              THEN ${data.additionalFlags && data.additionalFlags.length > 0 ? JSON.stringify(data.additionalFlags) : null}
              ELSE additional_flags 
            END,
            is_visible = ${data.is_visible},
            max_attempts = ${data.max_attempts},
            updated_at = NOW()
        WHERE id = ${data.id} AND EXISTS (SELECT 1 FROM category)
        RETURNING id
      ),
      removed_file AS (
        DELETE FROM challenge_attachments 
        WHERE challenge_id IN (SELECT id FROM updated) AND ${data.fileUrl || ''} != ''
        RETURNING id
      ),
      added_file AS (
        INSERT INTO challenge_attachments (challenge_id, filename, file_url, file_size)
        SELECT u.id, 
               CASE WHEN ${data.fileUrl || ''} != '' THEN split_part(${data.fileUrl || ''}, '/', -1) ELSE 'file' END,
               ${data.fileUrl || ''},
               0
        FROM updated u
        WHERE ${data.fileUrl || ''} != ''
        RETURNING id
      ),
      removed_hints AS (
        DELETE FROM hints WHERE challenge_id IN (SELECT id FROM updated)
        RETURNING id
      ),
      added_hints AS (
        INSERT INTO hints (challenge_id, content, cost, display_order)
        SELECT u.id, h.content, h.penalty_points, h.display_order
        FROM updated u
        CROSS JOIN LATERAL jsonb_to_recordset(${JSON.stringify(data.hints)}::jsonb)
          AS h(content text, penalty_points integer, display_order integer)
        RETURNING id
      ),
      audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'update', 'challenge', id,
          ${JSON.stringify({ title: data.title, points: data.points, hasFileUpdate: !!(data.fileUrl) })}::jsonb
        FROM updated
        RETURNING entity_id
      )
      SELECT EXISTS (SELECT 1 FROM category) AS category_exists,
             EXISTS (SELECT 1 FROM updated) AS updated
    `, 5, 300);

    if (!result?.category_exists) return jsonError('Category not found', 400);
    if (!result.updated) return jsonError('Challenge not found', 404);
    return Response.json({ success: true, message: 'Challenge updated successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Failed to update challenge:', getErrorMessage(error));
    return jsonError('Failed to update challenge', 500);
  }
}
