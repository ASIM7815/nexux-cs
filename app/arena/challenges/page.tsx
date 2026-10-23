import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { challenges, categories, solves } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Suspense } from 'react';
import ChallengesClient from './ChallengesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ChallengesContent() {
  const session = await auth();
  
  if (!session || session.user.accountType !== 'team') {
    redirect('/participantauth');
  }

  const allChallenges = await executeWithRetry(
    () => db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        categoryId: challenges.categoryId,
        categoryName: categories.name,
        points: challenges.points,
        author: challenges.author,
        displayOrder: challenges.displayOrder,
      })
      .from(challenges)
      .leftJoin(categories, eq(challenges.categoryId, categories.id))
      .where(eq(challenges.isVisible, true))
      .orderBy(challenges.displayOrder),
    5,
    300,
  );

  const accountId = parseInt(session.user.id);
  const solvedChallenges = await executeWithRetry(
    () => db
      .select({ challengeId: solves.challengeId })
      .from(solves)
      .where(eq(solves.accountId, accountId)),
    5,
    300,
  );

  const solvedIds = solvedChallenges.map(s => s.challengeId ?? 0).filter(id => id > 0);

  const allCategories = await executeWithRetry(
    () => db
      .select()
      .from(categories)
      .orderBy(categories.displayOrder),
    5,
    300,
  );

  return (
    <ChallengesClient
      challenges={allChallenges}
      categories={allCategories}
      solvedIds={solvedIds}
      session={session}
    />
  );
}

export default function ChallengesPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        background: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Orbitron, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <div>Loading Arena...</div>
        </div>
      </div>
    }>
      <ChallengesContent />
    </Suspense>
  );
}
