import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { idSchema, jsonError, getErrorMessage, sameOrigin } from '@/lib/api/security';

const submissionSchema = z.object({
  challengeId: idSchema,
  flag: z.string().trim().min(1).max(500),
});

const MAX_SUBMISSIONS_PER_MINUTE = 10;

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'team') return jsonError('Only team accounts may submit flags', 403);

    const accountId = Number(session.user.id);
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return jsonError('Unauthorized', 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) return jsonError('A valid challenge ID and flag are required', 400);

    const { challengeId, flag } = parsed.data;
    const submittedFlagHash = createHash('sha256').update(flag, 'utf8').digest('hex');

    // One atomic PostgreSQL statement: the account lock serializes a team's
    // submissions and the unique solve constraint makes scoring idempotent.
    const [result] = await executeWithRetry(() => sql`
      WITH challenge AS MATERIALIZED (
        SELECT id, flag, points, max_attempts
        FROM challenges
        WHERE id = ${challengeId} AND is_visible = true
      ),
      participant AS MATERIALIZED (
          SELECT id, team_name FROM accounts
        WHERE id = ${accountId} AND account_type = 'team'
        FOR UPDATE
      ),
      existing_solve AS MATERIALIZED (
        SELECT 1 AS present FROM solves
        WHERE challenge_id = ${challengeId} AND account_id = ${accountId}
        LIMIT 1
      ),
      attempt_state AS MATERIALIZED (
        SELECT COUNT(*)::integer AS count FROM submissions
        WHERE challenge_id = ${challengeId} AND account_id = ${accountId}
      ),
      competition_state AS MATERIALIZED (
        SELECT
          COALESCE(NULLIF(MAX(value) FILTER (WHERE key = 'is_active'), ''), 'true') AS is_active
        FROM competition_config
      ),
      rate_state AS (
        SELECT COUNT(*)::integer AS attempt_count
        FROM submissions
        WHERE account_id = ${accountId}
          AND submitted_at >= NOW() - INTERVAL '1 minute'
      ),
      eligible AS MATERIALIZED (
        SELECT c.id, c.flag, c.points, p.team_name
        FROM challenge c, participant p, attempt_state a, rate_state r, competition_state cs
        WHERE NOT EXISTS (SELECT 1 FROM existing_solve)
          AND (c.max_attempts IS NULL OR a.count < c.max_attempts)
          AND r.attempt_count < ${MAX_SUBMISSIONS_PER_MINUTE}
          AND COALESCE(cs.is_active, 'true') = 'true'
      ),
      inserted_submission AS (
        INSERT INTO submissions (challenge_id, account_id, team_name, submitted_flag, is_correct, submitted_at)
        SELECT id, ${accountId}, team_name, ${submittedFlagHash}, BTRIM(${flag}) = BTRIM(flag), NOW()
        FROM eligible
        RETURNING challenge_id, account_id, team_name, is_correct
      ),
      new_solve AS (
        INSERT INTO solves (challenge_id, account_id, team_name, solved_at)
        SELECT challenge_id, account_id, team_name, NOW() FROM inserted_submission
        WHERE is_correct = true
        ON CONFLICT (challenge_id, account_id) DO NOTHING
        RETURNING challenge_id, account_id
      ),
      awarded AS (
        UPDATE accounts a
        SET score = COALESCE(a.score, 0) + c.points,
            last_solve_time = NOW(), updated_at = NOW()
        FROM new_solve s JOIN challenge c ON c.id = s.challenge_id
        WHERE a.id = s.account_id
        RETURNING c.points
      )
      SELECT
        EXISTS (SELECT 1 FROM challenges WHERE id = ${challengeId}) AS challenge_exists,
        EXISTS (SELECT 1 FROM challenge) AS challenge_visible,
        EXISTS (SELECT 1 FROM participant) AS participant_exists,
        EXISTS (SELECT 1 FROM existing_solve) AS already_solved,
        EXISTS (
          SELECT 1 FROM challenge c, attempt_state a
          WHERE c.max_attempts IS NOT NULL AND a.count >= c.max_attempts
        ) AS attempts_reached,
        EXISTS (
          SELECT 1 FROM competition_state cs
          WHERE COALESCE(cs.is_active, 'true') <> 'true'
        ) AS competition_unavailable,
        COALESCE((SELECT attempt_count >= ${MAX_SUBMISSIONS_PER_MINUTE} FROM rate_state), false) AS rate_limited,
        EXISTS (SELECT 1 FROM inserted_submission) AS submitted,
        COALESCE((SELECT is_correct FROM inserted_submission LIMIT 1), false) AS is_correct,
        COALESCE((SELECT points FROM awarded LIMIT 1), 0)::integer AS points_awarded
    `, 5, 300);

    if (!result?.participant_exists) return jsonError('Unauthorized', 401);
    if (!result.challenge_exists || !result.challenge_visible) return jsonError('Challenge not found', 404);
    if (result.competition_unavailable) return jsonError('The competition is not currently active', 409);
    if (result.rate_limited) return jsonError('Too many submissions. Try again later.', 429);
    if (result.already_solved) return jsonError('Already solved', 409);
    if (result.attempts_reached) return jsonError('Max attempts reached', 409);
    if (!result.submitted) return jsonError('Submission could not be recorded', 409);

    if (result.is_correct) {
      return NextResponse.json({ success: true, message: 'Correct flag!', points: result.points_awarded }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({ success: false, message: 'Incorrect flag' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Flag submission failed:', errorMessage);
    const databaseUnavailable = /fetch failed|connect|timeout|NeonDbError/i.test(errorMessage);
    return jsonError(
      databaseUnavailable
        ? 'Database temporarily unavailable. Please submit again in a few seconds.'
        : 'Submission failed. Please try again.',
      databaseUnavailable ? 503 : 500,
    );
  }
}
