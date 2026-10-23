import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const hintSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  penalty_points: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

const challengeSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(50_000),
  category_id: z.coerce.number().int().positive(),
  points: z.coerce.number().int().min(0).max(1_000_000),
  flag: z.string().trim().min(1).max(500), // MANDATORY - CTF challenges must have a flag
  additionalFlags: z.array(z.string().trim()).optional().default([]), // Array of additional flags
  is_visible: z.boolean().default(false),
  max_attempts: z.union([z.coerce.number().int().positive().max(1_000_000), z.null()]).default(null),
  hints: z.array(hintSchema).max(50).default([]),
  fileUrl: z.string().url().optional().or(z.literal('')),
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
      existing AS (
        SELECT 1 FROM challenges WHERE LOWER(title) = LOWER(${data.title}) LIMIT 1
      ),
      created AS (
        INSERT INTO challenges (title, description, category_id, points, flag, additional_flags, is_visible, max_attempts)
        SELECT ${data.title}, ${data.description}, ${data.category_id}, ${data.points}, 
               ${data.flag}, 
               ${data.additionalFlags && data.additionalFlags.length > 0 ? JSON.stringify(data.additionalFlags) : null}, 
               ${data.is_visible}, ${data.max_attempts}
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING id
      ),
      file_attachment AS (
        INSERT INTO challenge_attachments (challenge_id, filename, file_url, file_size)
        SELECT c.id, 
               split_part(${data.fileUrl || ''}, '/', -1),
               ${data.fileUrl || ''},
               0
        FROM created c
        WHERE ${data.fileUrl || ''} != ''
        RETURNING id
      ),
      added_hints AS (
        INSERT INTO hints (challenge_id, content, cost, display_order)
        SELECT c.id, h.content, h.penalty_points, row_number() OVER ()
        FROM created c
        CROSS JOIN LATERAL jsonb_to_recordset(${JSON.stringify(data.hints)}::jsonb)
          AS h(content text, penalty_points integer)
        WHERE jsonb_array_length(${JSON.stringify(data.hints)}::jsonb) > 0
        RETURNING id
      ),
      audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'create', 'challenge', id,
          jsonb_build_object('title', ${data.title}, 'points', ${data.points})
        FROM created
        RETURNING entity_id
      )
      SELECT 
        (SELECT id FROM created) AS challenge_id,
        EXISTS (SELECT 1 FROM category) AS category_exists,
        EXISTS (SELECT 1 FROM existing) AS duplicate_exists
    `, 3, 150);

    if (!result?.category_exists) return jsonError('Category not found', 400);
    if (result.duplicate_exists) return jsonError('A challenge with this title already exists', 409);
    if (!result.challenge_id) return jsonError('Challenge could not be created', 500);
    return Response.json({ success: true, message: 'Challenge created successfully', challengeId: result.challenge_id }, { status: 201 });
  } catch (error) {
    console.error('Failed to create challenge:', getErrorMessage(error));
    return jsonError('Failed to create challenge', 500);
  }
}
