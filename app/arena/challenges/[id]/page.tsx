import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { challenges, categories, solves, submissions, hints, hintUnlocks, challengeAttachments } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import ChallengeDetailClient from './ChallengeDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  
  if (!session || session.user.accountType !== 'team') {
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
  const solveData = await executeWithRetry(
    () => db
      .select()
      .from(solves)
      .where(and(eq(solves.challengeId, challengeId), eq(solves.accountId, accountId)))
      .limit(1),
    5,
    300,
  );

  const isSolved = solveData.length > 0;

  // Get submission history for this challenge
  const submissionHistory = await executeWithRetry(
    () => db
      .select({
        id: submissions.id,
        isCorrect: submissions.isCorrect,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(and(eq(submissions.challengeId, challengeId), eq(submissions.accountId, accountId)))
      .orderBy(desc(submissions.submittedAt))
      .limit(10),
    5,
    300,
  );

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
  const unlockedHints = await executeWithRetry(
    () => db
      .select({ hintId: hintUnlocks.hintId })
      .from(hintUnlocks)
      .where(eq(hintUnlocks.accountId, accountId)),
    5,
    300,
  );

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
      submissionHistory={submissionHistory}
      hints={hintsWithCost}
      unlockedHintIds={unlockedHintIds}
      attachments={attachments}
      session={session}
    />
  );
}
