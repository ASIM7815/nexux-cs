import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session || session.user.accountType !== 'admin') {
    redirect('/admin');
  }

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading settings...</div>}>
      <AdminSettingsClient />
    </Suspense>
  );
}
