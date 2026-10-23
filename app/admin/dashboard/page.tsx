import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/admin');
  }

  if (session.user.accountType !== 'admin') {
    redirect('/arena/challenges');
  }

  return <AdminDashboardClient session={session} />;
}
