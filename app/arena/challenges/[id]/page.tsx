import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { executeWithRetry, sql as neonSql } from '@/lib/db/neon-client';
import { challenges, categories, solves, submissions, hints, hintUnlocks, challengeAttachments } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import ChallengeDetailClient from './ChallengeDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  
  if (!session || !['team', 'participant'].includes(session.user.accountType || '')) {
    redirect('/participantauth');
  }

  const { id } = await params;
  const challengeId = Number(id);
  if (!Number.isSafeInteger(challengeId) || challengeId <= 0) redirect('/arena/challenges');
  const accountId = parseInt(session.user.id);

  // Fetch challenge with category
  const challengeData = await executeWithRetry(
    () => db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        categoryName: categories.name,
        points: challenges.points,
        author: challenges.author,
        maxAttempts: challenges.maxAttempts,
      })
      .from(challenges)
      .leftJoin(categories, eq(challenges.categoryId, categories.id))
      .where(and(eq(challenges.id, challengeId), eq(challenges.isVisible, true)))
      .limit(1),
    5,
    300,
  );

  if (challengeData.length === 0) {
    redirect('/arena/challenges');
  }

  const challenge = challengeData[0];

  // Check if already solved
  const solveData = await executeWithRetry(() => neonSql`
    SELECT s.id FROM solves s JOIN team_members m ON m.team_id = s.team_id
    WHERE s.challenge_id = ${challengeId} AND m.account_id = ${accountId}
    UNION SELECT s.id FROM solves s JOIN accounts a ON a.team_name = s.team_name
    WHERE s.challenge_id = ${challengeId} AND a.id = ${accountId} AND a.account_type = 'team' LIMIT 1
  `, 5, 300);

  const isSolved = solveData.length > 0;

  // Get submission history for this challenge
  const submissionHistory = await executeWithRetry(() => neonSql`
    SELECT s.id, s.is_correct AS "isCorrect", s.submitted_at AS "submittedAt" FROM submissions s
    WHERE s.challenge_id = ${challengeId} AND (s.team_id IN (SELECT team_id FROM team_members WHERE account_id = ${accountId})
      OR s.team_name = (SELECT team_name FROM accounts WHERE id = ${accountId} AND account_type = 'team'))
    ORDER BY s.submitted_at DESC LIMIT 10
  `, 5, 300);

  const attemptCount = submissionHistory.length;

  // Get hints for this challenge with non-null cost
  const challengeHints = await executeWithRetry(
    () => db
      .select({
        id: hints.id,
        content: hints.content,
        cost: hints.cost,
        displayOrder: hints.displayOrder,
      })
      .from(hints)
      .where(eq(hints.challengeId, challengeId))
      .orderBy(hints.displayOrder),
    5,
    300,
  );

  // Convert to non-nullable cost
  const hintsWithCost = challengeHints.map(h => ({
    ...h,
    cost: h.cost ?? 0
  }));

  // Get unlocked hints
  const unlockedHints = await executeWithRetry(() => neonSql`
    SELECT h.hint_id AS "hintId" FROM hint_unlocks h
    WHERE h.team_id IN (SELECT team_id FROM team_members WHERE account_id = ${accountId})
      OR h.team_name = (SELECT team_name FROM accounts WHERE id = ${accountId} AND account_type = 'team')
  `, 5, 300);

  const unlockedHintIds = unlockedHints.map(h => h.hintId ?? 0).filter(id => id > 0);

  // Get attachments
  const attachments = await executeWithRetry(
    () => db
      .select()
      .from(challengeAttachments)
      .where(eq(challengeAttachments.challengeId, challengeId)),
    5,
    300,
  );

  return (
    <ChallengeDetailClient
      challenge={challenge}
      isSolved={isSolved}
      attemptCount={attemptCount}
      maxAttempts={challenge.maxAttempts}
      submissionHistory={submissionHistory.map((submission) => ({
        id: Number(submission.id),
        isCorrect: Boolean(submission.isCorrect),
        submittedAt: submission.submittedAt ? new Date(String(submission.submittedAt)) : null,
      }))}
      hints={hintsWithCost}
      unlockedHintIds={unlockedHintIds}
      attachments={attachments}
      session={session}
    />
  );
}
