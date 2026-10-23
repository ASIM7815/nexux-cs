import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { executeWithRetry } from '@/lib/db/neon-client';
import { challenges, categories, solves } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || session.user.accountType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = parseInt(session.user.id);

    // Fetch visible challenges with categories
    const challengesList = await executeWithRetry(
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
        .orderBy(challenges.displayOrder, challenges.id),
      5,
      300,
    );

    // Fetch solved challenge IDs for this team
    const solved = await executeWithRetry(
      () => db
        .select({ challengeId: solves.challengeId })
        .from(solves)
        .where(eq(solves.accountId, accountId)),
      5,
      300,
    );

    const solvedIds = solved.map(s => s.challengeId ?? 0).filter(id => id > 0);

    return NextResponse.json({
      challenges: challengesList,
      solvedIds,
    });
  } catch (error) {
    console.error('Challenges list API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
