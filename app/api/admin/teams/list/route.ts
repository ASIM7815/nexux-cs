import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Teams list API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
