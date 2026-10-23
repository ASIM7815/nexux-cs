import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Neon Storage S3-compatible configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.NEON_STORAGE_BUCKET || 'files';

export interface UploadResult {
  success: boolean;
  /** Object key only. Never expose a bucket URL as a public download URL. */
  storageKey?: string;
  originalFilename?: string;
  fileSize?: number;
  contentType?: string;
  error?: string;
}

function storageIsConfigured() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3
    && process.env.AWS_ACCESS_KEY_ID
    && process.env.AWS_SECRET_ACCESS_KEY
    && process.env.NEON_STORAGE_BUCKET,
  );
}

/**
 * Upload file to Neon Storage
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  try {
    if (!storageIsConfigured()) {
      return { success: false, error: 'Challenge file storage is not configured' };
    }
    // Sanitize filename
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `challenges/${Date.now()}-${safeFileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return {
      success: true,
      storageKey: key,
      originalFilename: fileName,
      fileSize: file.length,
      contentType,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Get presigned URL for secure file download (expires in 1 hour)
 */
export async function getFileDownloadUrl(fileName: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error: any) {
    console.error('Get download URL error:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileName: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    console.error('File delete error:', error);
    return false;
  }
}

/** Check that an opaque challenge object key exists before recording it in SQL. */
export async function challengeObjectExists(storageKey: string) {
  if (!storageIsConfigured() || !storageKey.startsWith('challenges/')) return false;
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: storageKey }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload from FormData (for Next.js API routes)
 */
export async function uploadFromFormData(
  formData: FormData,
  fieldName: string = 'file'
): Promise<UploadResult> {
  try {
    const file = formData.get(fieldName) as File | null;
    
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File too large (max 50MB)' };
    }

    // Validate file type
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/octet-stream', // source code and challenge binaries
      'text/plain',
      'text/x-c',
      'text/x-c++src',
      'application/javascript',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { 
        success: false, 
        error: `File type not allowed. Allowed: PDF, ZIP, TXT, JPG, PNG, GIF, MP4` 
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await uploadFile(buffer, file.name, file.type);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
