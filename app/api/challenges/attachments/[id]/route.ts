import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { executeWithRetry, sql } from '@/lib/db/neon-client';
import { getFileDownloadUrl } from '@/lib/storage/neon-storage';
import { jsonError } from '@/lib/api/security';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return jsonError('Unauthorized', 401);

  const attachmentId = Number((await params).id);
  if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) return jsonError('Attachment not found', 404);

  try {
    // Admins may review every attachment; participants can only receive a
    // short-lived URL for attachments belonging to a published challenge.
    const rows = await executeWithRetry(() => sql`
      SELECT a.storage_key, a.file_url
      FROM challenge_attachments a
      JOIN challenges c ON c.id = a.challenge_id
      WHERE a.id = ${attachmentId}
        AND (${session.user.accountType === 'admin'} OR c.is_visible = true)
      LIMIT 1
    `, 3, 150);
    const attachment = rows[0];
    if (!attachment) return jsonError('Attachment not found', 404);

    const storageKey = attachment.storage_key
      || (typeof attachment.file_url === 'string' && attachment.file_url.startsWith('challenges/') ? attachment.file_url : null)
      || (typeof attachment.file_url === 'string' ? attachment.file_url.match(/\/challenges\/(.+)$/)?.[0]?.slice(1) : null);
    if (!storageKey?.startsWith('challenges/')) return jsonError('Attachment is unavailable', 404);

    return NextResponse.redirect(await getFileDownloadUrl(storageKey));
  } catch (error) {
    console.error('Attachment download failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonError('Unable to prepare the attachment download', 503);
  }
}
