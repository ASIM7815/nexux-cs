import { z } from 'zod';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getErrorMessage, jsonError, sameOrigin } from '@/lib/api/security';

const settingsSchema = z.object({
  competition_name: z.string().trim().min(1).max(255),
  is_active: z.boolean(),
  allow_team_registration: z.boolean(),
  max_team_size: z.coerce.number().int().min(1).max(20),
});

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return jsonError('Invalid request origin', 403);
    const session = await auth();
    if (!session?.user?.id) return jsonError('Unauthorized', 401);
    if (session.user.accountType !== 'admin') return jsonError('Forbidden', 403);

    let body: unknown;
    try { body = await request.json(); } catch { return jsonError('Invalid JSON body', 400); }
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return jsonError('Invalid competition settings', 400);
    const value = parsed.data;

    const rows = [
      ['competition_name', value.competition_name],
      ['is_active', String(value.is_active)],
      ['registration_enabled', String(value.allow_team_registration)],
      ['max_team_size', String(value.max_team_size)],
    ] as const;

    // Each statement is an upsert; the configuration table's unique key makes
    // repeated saves safe. These are independent key/value settings by design.
    await executeWithRetry(() => sql.transaction([
      ...rows.map(([key, settingValue]) => sql`
        INSERT INTO competition_config (key, value, updated_at)
        VALUES (${key}, ${settingValue}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `),
      sql`
      INSERT INTO audit_logs (account_id, action, entity_type, details)
      VALUES (${Number(session.user.id)}, 'update', 'competition_config',
        ${JSON.stringify({ competition_name: value.competition_name, is_active: value.is_active })}::jsonb)
      `,
    ]), 5, 300);
    return Response.json({ success: true, message: 'Settings updated successfully' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Failed to update settings:', getErrorMessage(error));
    return jsonError('Failed to update settings', 500);
  }
}
