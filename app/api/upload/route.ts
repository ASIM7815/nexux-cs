import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadFromFormData } from '@/lib/storage/neon-storage';
import { sameOrigin } from '@/lib/api/security';

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const session = await auth();

    if (!session || session.user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await uploadFromFormData(formData, 'file');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      storageKey: result.storageKey,
      filename: result.originalFilename,
      fileSize: result.fileSize,
      contentType: result.contentType,
    });
  } catch (error: unknown) {
    console.error('Upload error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
