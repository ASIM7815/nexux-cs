import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Suspense } from 'react';
import TeamsClient from './TeamsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function TeamsContent() {
  const session = await auth();
  
  if (!session || session.user.accountType !== 'admin') {
    redirect('/admin');
  }

  const teams = await executeWithRetry(
    () => db
      .select({
        id: accounts.id,
        username: accounts.username,
        teamName: accounts.teamName,
        score: accounts.score,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(eq(accounts.accountType, 'team'))
      .orderBy(accounts.createdAt),
    5,
    300,
  );

  return <TeamsClient teams={teams} session={session} />;
}

export default function TeamsPage() {
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <div>Loading Teams...</div>
        </div>
      </div>
    }>
      <TeamsContent />
    </Suspense>
  );
}
