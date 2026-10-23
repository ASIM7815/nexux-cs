import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminChallengesClient from './AdminChallengesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminChallengesPage() {
  const session = await auth();

  if (!session || session.user.accountType !== 'admin') {
    redirect('/admin');
  }

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading challenges...</div>}>
      <AdminChallengesClient />
    </Suspense>
  );
}
