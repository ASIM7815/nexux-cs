import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError } from '@/lib/api/security';

function asBoolean(value: string | undefined, fallback: boolean) {
  return value === undefined ? fallback : value === 'true';
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    const rows = await executeWithRetry(
      () => sql`SELECT key, value FROM competition_config`,
      5,
      300,
    );
    const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
    return Response.json({
      config: {
        competition_name: values.competition_name || 'NEXUS CYPHER CTF',
        is_active: asBoolean(values.is_active, true),
        allow_team_registration: asBoolean(values.registration_enabled, false),
        max_team_size: Number(values.max_team_size || 4),
      },
    });
  } catch (error) {
    console.error('Failed to fetch settings:', getErrorMessage(error));
    return jsonError('Failed to fetch settings', 500);
  }
}
