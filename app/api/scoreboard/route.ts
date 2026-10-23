import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { teams, solves } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get rankings with score calculation
    const rankings = await executeWithRetry(
      () => db
        .select({
          id: teams.id,
          teamName: teams.name,
          username: teams.name,
          score: teams.score,
          lastSolveTime: sql<Date | null>`(
            SELECT MAX(${solves.solvedAt})
            FROM ${solves}
            WHERE ${solves.teamId} = ${teams.id}
          )`.as('last_solve_time'),
          solveCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM ${solves}
            WHERE ${solves.teamId} = ${teams.id}
          )`.as('solve_count'),
        })
        .from(teams)
        .orderBy(
          desc(teams.score),
          sql`last_solve_time ASC NULLS LAST`
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
