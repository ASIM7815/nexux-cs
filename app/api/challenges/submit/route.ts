import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { idSchema, jsonError, getErrorMessage, sameOrigin } from '@/lib/api/security';

const submissionSchema = z.object({ challengeId: idSchema, flag: z.string().trim().min(1).max(500) });
const MAX_SUBMISSIONS_PER_MINUTE = 10;

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id || !['team', 'participant'].includes(session.user.accountType || '')) {
      return jsonError('Only participants with a team may submit flags', 403);
    }
    const accountId = Number(session.user.id);
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return jsonError('Unauthorized', 401);
    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) return jsonError('A valid challenge ID and flag are required', 400);
    const { challengeId, flag } = parsed.data;
    const digest = createHash('sha256').update(flag, 'utf8').digest('hex');

    const [result] = await executeWithRetry(() => sql`
      WITH participant AS MATERIALIZED (
        SELECT id, account_type, team_name FROM accounts WHERE id = ${accountId} FOR UPDATE
      ), team_info AS MATERIALIZED (
        SELECT t.id, t.name FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.account_id = ${accountId}
        UNION ALL
        SELECT t.id, t.name FROM participant p JOIN teams t ON t.name = p.team_name WHERE p.account_type = 'team'
        LIMIT 1
      ), challenge AS MATERIALIZED (
        SELECT id, flag, additional_flags, points, max_attempts FROM challenges WHERE id = ${challengeId} AND is_visible = true
      ), settings AS MATERIALIZED (
        SELECT COALESCE(MAX(value) FILTER (WHERE key = 'is_active'), 'true') AS is_active,
          MAX(value) FILTER (WHERE key = 'competition_start') AS starts_at,
          MAX(value) FILTER (WHERE key = 'competition_end') AS ends_at FROM competition_config
      ), existing_solve AS MATERIALIZED (
        SELECT 1 FROM solves s JOIN team_info t ON t.id = s.team_id WHERE s.challenge_id = ${challengeId} LIMIT 1
      ), attempts AS MATERIALIZED (
        SELECT COUNT(*)::integer AS count FROM submissions s JOIN team_info t ON t.id = s.team_id WHERE s.challenge_id = ${challengeId}
      ), rate AS MATERIALIZED (
        SELECT COUNT(*)::integer AS count FROM submissions WHERE account_id = ${accountId} AND submitted_at >= NOW() - INTERVAL '1 minute'
      ), eligible AS MATERIALIZED (
        SELECT c.*, t.id AS team_id, t.name AS team_name FROM challenge c, team_info t, settings cfg, attempts a, rate r
        WHERE NOT EXISTS (SELECT 1 FROM existing_solve) AND (c.max_attempts IS NULL OR a.count < c.max_attempts)
          AND r.count < ${MAX_SUBMISSIONS_PER_MINUTE} AND cfg.is_active = 'true'
          AND (cfg.starts_at IS NULL OR NOW() >= cfg.starts_at::timestamp)
          AND (cfg.ends_at IS NULL OR NOW() <= cfg.ends_at::timestamp)
      ), recorded AS (
        INSERT INTO submissions (challenge_id, account_id, team_id, team_name, submitted_flag, is_correct, submitted_at)
        SELECT id, ${accountId}, team_id, team_name, ${digest}, BTRIM(${flag}) = BTRIM(flag) OR BTRIM(${flag}) = ANY(
          SELECT jsonb_array_elements_text(COALESCE(additional_flags::jsonb, '[]'::jsonb))
        ), NOW() FROM eligible RETURNING challenge_id, team_id, team_name, is_correct
      ), new_solve AS (
        INSERT INTO solves (challenge_id, account_id, team_id, team_name, solved_at)
        SELECT challenge_id, ${accountId}, team_id, team_name, NOW() FROM recorded WHERE is_correct
        ON CONFLICT (challenge_id, team_id) WHERE team_id IS NOT NULL DO NOTHING RETURNING challenge_id, team_id
      ), awarded AS (
        UPDATE teams t SET score = t.score + c.points, last_solve_time = NOW(), updated_at = NOW()
        FROM new_solve s JOIN challenge c ON c.id = s.challenge_id WHERE t.id = s.team_id RETURNING c.points
      ) SELECT EXISTS (SELECT 1 FROM participant) AS participant_exists, EXISTS (SELECT 1 FROM team_info) AS team_exists,
        EXISTS (SELECT 1 FROM challenges WHERE id = ${challengeId}) AS challenge_exists, EXISTS (SELECT 1 FROM challenge) AS challenge_visible,
        EXISTS (SELECT 1 FROM existing_solve) AS already_solved,
        EXISTS (SELECT 1 FROM challenge c, attempts a WHERE c.max_attempts IS NOT NULL AND a.count >= c.max_attempts) AS attempts_reached,
        (SELECT is_active <> 'true' OR (starts_at IS NOT NULL AND NOW() < starts_at::timestamp) OR (ends_at IS NOT NULL AND NOW() > ends_at::timestamp) FROM settings) AS competition_unavailable,
        (SELECT count >= ${MAX_SUBMISSIONS_PER_MINUTE} FROM rate) AS rate_limited, EXISTS (SELECT 1 FROM recorded) AS submitted,
        COALESCE((SELECT is_correct FROM recorded LIMIT 1), false) AS is_correct, COALESCE((SELECT points FROM awarded LIMIT 1), 0)::integer AS points_awarded
    `, 3, 150);
    if (!result?.participant_exists) return jsonError('Unauthorized', 401);
    if (!result.team_exists) return jsonError('Join or create a team before submitting flags', 409);
    if (!result.challenge_exists || !result.challenge_visible) return jsonError('Challenge not found', 404);
    if (result.competition_unavailable) return jsonError('The competition is not currently available', 409);
    if (result.rate_limited) return jsonError('Too many submissions. Try again later.', 429);
    if (result.already_solved) return jsonError('Already solved by your team', 409);
    if (result.attempts_reached) return jsonError('Max attempts reached', 409);
    if (!result.submitted) return jsonError('Submission could not be recorded', 409);
    return NextResponse.json(result.is_correct ? { success: true, message: 'Correct flag!', points: result.points_awarded } : { success: false, message: 'Incorrect flag' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Flag submission failed:', message);
    const unavailable = /fetch failed|connect|timeout|NeonDbError/i.test(message);
    return jsonError(unavailable ? 'Database temporarily unavailable. Please submit again shortly.' : 'Submission failed. Please try again.', unavailable ? 503 : 500);
  }
}
