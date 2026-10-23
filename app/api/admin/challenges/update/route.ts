import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';
import { challengeObjectExists, deleteFile } from '@/lib/storage/neon-storage';

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
  additionalFlags: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  // Omitted means retain files. An explicit list replaces the complete set.
  attachments: z.array(z.object({
    storageKey: z.string().regex(/^challenges\/[A-Za-z0-9._-]+$/),
    filename: z.string().trim().min(1).max(255),
    fileSize: z.coerce.number().int().nonnegative().max(50 * 1024 * 1024),
    contentType: z.string().trim().min(1).max(255),
  })).max(10).optional(),
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

    if (data.attachments) {
      for (const attachment of data.attachments) {
        if (!await challengeObjectExists(attachment.storageKey)) {
          return jsonError(`Uploaded file is unavailable: ${attachment.filename}`, 400);
        }
      }
    }
    const replaceAttachments = data.attachments !== undefined;
    const additionalFlagsJson = data.additionalFlags === undefined
      ? null
      : JSON.stringify(data.additionalFlags);

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
            additional_flags = CASE WHEN CAST(${additionalFlagsJson} AS text) IS NULL
              THEN additional_flags ELSE CAST(${additionalFlagsJson} AS text) END,
            is_visible = ${data.is_visible},
            max_attempts = ${data.max_attempts},
            updated_at = NOW()
        WHERE id = ${data.id} AND EXISTS (SELECT 1 FROM category)
        RETURNING id
      ),
      removed_files AS (
        DELETE FROM challenge_attachments
        WHERE challenge_id IN (SELECT id FROM updated) AND ${replaceAttachments}
        RETURNING storage_key, file_url
      ),
      added_files AS (
        INSERT INTO challenge_attachments (challenge_id, filename, file_url, storage_key, file_size, content_type, uploaded_at)
        SELECT u.id, f.filename, f."storageKey", f."storageKey", f."fileSize", f."contentType", NOW()
        FROM updated u
        CROSS JOIN LATERAL jsonb_to_recordset(${JSON.stringify(data.attachments ?? [])}::jsonb)
          AS f("storageKey" text, filename text, "fileSize" integer, "contentType" text)
        WHERE ${replaceAttachments}
        RETURNING id
      ),
      removed_hints AS (
        DELETE FROM hints WHERE challenge_id IN (SELECT id FROM updated)
        RETURNING id
      ),
      added_hints AS (
        INSERT INTO hints (challenge_id, content, cost, display_order)
        SELECT u.id, h.content, h.penalty_points, row_number() OVER ()
        FROM updated u
        CROSS JOIN LATERAL jsonb_to_recordset(${JSON.stringify(data.hints)}::jsonb)
          AS h(content text, penalty_points integer)
        RETURNING id
      ),
      audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'update', 'challenge', id,
          ${JSON.stringify({ title: data.title, points: data.points, replaceAttachments })}::jsonb
        FROM updated
        RETURNING entity_id
      )
      SELECT EXISTS (SELECT 1 FROM category) AS category_exists,
             EXISTS (SELECT 1 FROM updated) AS updated,
             COALESCE((SELECT json_agg(json_build_object('storage_key', storage_key, 'file_url', file_url)) FROM removed_files), '[]'::json) AS removed_files
    `, 5, 300);

    if (!result?.category_exists) return jsonError('Category not found', 400);
    if (!result.updated) return jsonError('Challenge not found', 404);
    // Storage cannot share PostgreSQL's transaction. Delete only after its
    // metadata has committed; failed deletion leaves an unreachable object,
    // never a broken participant record.
    if (replaceAttachments && Array.isArray(result.removed_files)) {
      await Promise.all(result.removed_files.map((file: { storage_key?: string; file_url?: string }) => {
        const key = file.storage_key || (file.file_url?.startsWith('challenges/') ? file.file_url : '');
        return key.startsWith('challenges/') ? deleteFile(key) : Promise.resolve(true);
      }));
    }
    return Response.json({ success: true, message: 'Challenge updated successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Failed to update challenge:', message);
    return jsonError(process.env.NODE_ENV === 'development'
      ? `Failed to update challenge: ${message}`
      : 'Failed to update challenge', 500);
  }
}
