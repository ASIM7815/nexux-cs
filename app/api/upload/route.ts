import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadFromFormData } from '@/lib/storage/neon-storage';

export async function POST(request: NextRequest) {
  try {
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
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
