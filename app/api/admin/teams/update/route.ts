import { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const passwordSchema = z.string()
  .min(1, 'Password is required')
  .max(128, 'Password too long');

const teamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  username: z.string().trim().min(1).max(255),
  password: z.string().max(128).optional(),
  confirmPassword: z.string().max(128).optional(),
  teamName: z.string().trim().min(1).max(255),
}).superRefine((data, context) => {
  if (!data.password && !data.confirmPassword) return;
  if (!data.password) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Enter a new password or leave both password fields blank' });
    return;
  }
  if (!data.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Confirm the new password' });
  }
  const passwordResult = passwordSchema.safeParse(data.password);
  if (!passwordResult.success) {
    for (const issue of passwordResult.error.issues) {
      context.addIssue({ ...issue, path: ['password'] });
    }
  }
  if (data.password !== data.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
  }
});

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || 'Invalid team fields', 400);

    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null;
    const [updated] = await executeWithRetry(() => sql`
      WITH updated AS (
        UPDATE accounts
        SET username = ${parsed.data.username},
            team_name = ${parsed.data.teamName},
            password_hash = COALESCE(${passwordHash}, password_hash),
            updated_at = NOW()
        WHERE id = ${parsed.data.teamId} AND account_type = 'team'
        RETURNING id, username, team_name, score, created_at
      ), audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'update', 'team', id,
          ${JSON.stringify({ username: parsed.data.username, teamName: parsed.data.teamName, passwordChanged: Boolean(passwordHash) })}::jsonb
        FROM updated
        RETURNING entity_id
      )
      SELECT id, username, team_name, score, created_at FROM updated
    `, 5, 300);
    if (!updated) return jsonError('Team not found or username already exists', 409);
    return Response.json({
      success: true,
      message: 'Team updated successfully',
      team: {
        id: updated.id,
        username: updated.username,
        teamName: updated.team_name,
        score: updated.score,
        createdAt: updated.created_at,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Team update failed:', getErrorMessage(error));
    return jsonError('Failed to update team', 500);
  }
}
