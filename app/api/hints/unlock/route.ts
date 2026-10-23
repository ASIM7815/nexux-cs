import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { sql } from '@/lib/db/neon-client';
import { getErrorMessage, idSchema, jsonError, sameOrigin } from '@/lib/api/security';

const unlockSchema = z.object({ hintId: idSchema });

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'team') return jsonError('Only team accounts may unlock hints', 403);

    const accountId = Number(session.user.id);
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return jsonError('Unauthorized', 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) return jsonError('A valid hint ID is required', 400);

    const [result] = await sql`
      WITH team_account AS MATERIALIZED (
        SELECT id, team_name, COALESCE(score, 0)::integer AS score
        FROM accounts
        WHERE id = ${accountId} AND account_type = 'team'
        FOR UPDATE
      ),
      hint AS MATERIALIZED (
        SELECT h.id, h.content, COALESCE(h.cost, 0)::integer AS cost
        FROM hints h
        JOIN challenges c ON c.id = h.challenge_id
        WHERE h.id = ${parsed.data.hintId} AND c.is_visible = true
      ),
      already_unlocked AS MATERIALIZED (
        SELECT 1 AS present FROM hint_unlocks
        WHERE hint_id = ${parsed.data.hintId} AND account_id = ${accountId}
        LIMIT 1
      ),
      charged AS (
        UPDATE accounts a
        SET score = COALESCE(a.score, 0) - h.cost, updated_at = NOW()
        FROM team_account t, hint h
        WHERE a.id = t.id
          AND NOT EXISTS (SELECT 1 FROM already_unlocked)
          AND t.score >= h.cost
        RETURNING a.id
      ),
      unlocked AS (
        INSERT INTO hint_unlocks (hint_id, account_id, team_id, team_name, unlocked_at)
        SELECT h.id, t.id, NULL, t.team_name, NOW() FROM hint h, charged, team_account t
        ON CONFLICT DO NOTHING
        RETURNING hint_id
      )
      SELECT
        EXISTS (SELECT 1 FROM team_account) AS team_exists,
        EXISTS (SELECT 1 FROM hint) AS hint_exists,
        EXISTS (SELECT 1 FROM already_unlocked) AS already_unlocked,
        EXISTS (SELECT 1 FROM unlocked) AS unlocked,
        COALESCE((SELECT content FROM hint LIMIT 1), '') AS content,
        COALESCE((SELECT cost FROM hint LIMIT 1), 0)::integer AS cost
    `;

    if (!result?.team_exists) return jsonError('Unauthorized', 401);
    if (!result.hint_exists) return jsonError('Hint not found', 404);
    if (result.already_unlocked) return jsonError('Hint already unlocked', 409);
    if (!result.unlocked) return jsonError('Insufficient points', 409);

    return Response.json({
      success: true,
      message: 'Hint unlocked',
      content: result.content,
      cost: result.cost,
    });
  } catch (error) {
    console.error('Hint unlock failed:', getErrorMessage(error));
    return jsonError('Unable to unlock hint. Please try again.', 500);
  }
}
