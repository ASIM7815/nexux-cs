import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const credentialsSchema = z.object({
  username: z.string().trim().min(3).max(255).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return jsonError('Username and a password of at least 8 characters are required', 400);

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [updated] = await sql`
      WITH updated AS (
        UPDATE accounts
        SET username = ${parsed.data.username}, password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${Number(session.user.id)} AND account_type = 'admin'
        RETURNING id, username
      ), audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT id, 'update_credentials', 'account', id,
          ${JSON.stringify({ username: parsed.data.username })}::jsonb
        FROM updated
        RETURNING entity_id
      )
      SELECT id, username FROM updated
    `;
    if (!updated) return jsonError('Admin account not found', 404);
    return Response.json({ success: true, message: 'Admin credentials updated successfully' });
  } catch (error) {
    console.error('Admin credential update failed:', getErrorMessage(error));
    return jsonError('Failed to update admin credentials', 500);
  }
}
