import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { accounts, solves } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Admin-created teams are `team` accounts. Keep this query aligned with
    // the team-management and flag-submission flows so a solve appears on
    // both the server-rendered leaderboard and this refresh endpoint.
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

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Scoreboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoreboard' },
      { status: 500 }
    );
  }
}
