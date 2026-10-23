import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { accounts, solves } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { Suspense } from 'react';
import ScoreboardClient from './ScoreboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ScoreboardContent() {
  const session = await auth();
  
  if (!session) {
    redirect('/participantauth');
  }

  const rankings = await executeWithRetry(
    () => db
      .select({
        id: accounts.id,
        teamName: accounts.teamName,
        username: accounts.username,
        score: accounts.score,
        lastSolveTime: accounts.lastSolveTime,
        solveCount: sql<number>`count(${solves.id})`,
      })
      .from(accounts)
      .leftJoin(solves, eq(accounts.id, solves.accountId))
      .where(eq(accounts.accountType, 'team'))
      .groupBy(accounts.id)
      .orderBy(
        desc(accounts.score),
        sql`COALESCE(${accounts.lastSolveTime}, ${accounts.createdAt}) ASC`
      ),
    5,
    300,
  );

  return <ScoreboardClient rankings={rankings} session={session} />;
}

export default function ScoreboardPage() {
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <div>Loading Scoreboard...</div>
        </div>
      </div>
    }>
      <ScoreboardContent />
    </Suspense>
  );
}
