import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { jsonError, getErrorMessage } from '@/lib/api/security';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    const categories = await executeWithRetry(() => sql`
      SELECT id, name, display_order
      FROM categories
      ORDER BY display_order ASC, name ASC
    `, 5, 300);
    return Response.json({ categories });
  } catch (error) {
    console.error('Failed to fetch categories:', getErrorMessage(error));
    return jsonError('Failed to fetch categories', 500);
  }
}
