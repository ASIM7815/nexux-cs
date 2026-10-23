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
  username: z.string().trim().min(1).max(255),
  password: passwordSchema,
  confirmPassword: z.string().min(1).max(128),
  teamName: z.string().trim().min(1).max(255),
}).superRefine((data, context) => {
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
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid team fields', 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [created] = await executeWithRetry(() => sql`
      WITH created AS (
        INSERT INTO accounts (username, password_hash, account_type, team_name, score)
        VALUES (${parsed.data.username}, ${passwordHash}, 'team', ${parsed.data.teamName}, 0)
        ON CONFLICT (username) DO NOTHING
        RETURNING id, username, team_name, score, created_at
      ), audit AS (
        INSERT INTO audit_logs (account_id, action, entity_type, entity_id, details)
        SELECT ${Number(session.user.id)}, 'create', 'team', id,
          ${JSON.stringify({ username: parsed.data.username, teamName: parsed.data.teamName })}::jsonb
        FROM created
        RETURNING entity_id
      )
      SELECT id, username, team_name, score, created_at FROM created
    `, 5, 300);
    if (!created) return jsonError('Username already exists', 409);
    return Response.json({
      success: true,
      message: 'Team created successfully',
      team: {
        id: created.id,
        username: created.username,
        teamName: created.team_name,
        score: created.score,
        createdAt: created.created_at,
      },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Team creation failed:', getErrorMessage(error));
    return jsonError('Failed to create team', 500);
  }
}
