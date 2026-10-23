import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError } from '@/lib/api/security';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);
  if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

  try {
    const startTime = Date.now();
    await executeWithRetry(() => sql`SELECT 1`, 5, 300);
    return Response.json({ success: true, responseTime: `${Date.now() - startTime}ms` }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Database test failed:', getErrorMessage(error));
    return jsonError('Database connection failed', 503);
  }
}
