# 🗄️ Neon Storage Setup Guide - File Uploads for Challenges

## Overview
This guide shows you how to integrate your Neon storage bucket ("files") with the CTF platform so admins can upload files to challenges.

---

## Step 1: Get Neon Storage Access Keys

1. **Go to Neon Console**: https://console.neon.tech
2. **Select your project**: `ep-misty-bar-b4dhm394`
3. **Navigate to Storage**: Click "Storage" in left sidebar
4. **Open your bucket**: Click on "files" bucket
5. **Get Access Keys**:
   - Click "Settings" or "Access Keys" tab
   - Click "Create Access Key" or "Generate Key"
   - Copy the **Access Key ID**
   - Copy the **Secret Access Key** (shown only once!)

6. **Update `.env.local`**:
```bash
NEON_ACCESS_KEY_ID="neon_ak_xxxxxxxxxxxxxxxxxxxxx"
NEON_SECRET_ACCESS_KEY="neon_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## Step 2: Verify Installation

Already installed:
```bash
✅ @aws-sdk/client-s3
✅ @aws-sdk/s3-request-presigner
```

Storage utility created at:
```bash
✅ /lib/storage/neon-storage.ts
```

---

## Step 3: How File Uploads Work

### Admin uploads file to challenge:
1. Admin goes to `/admin/challenges`
2. Clicks "Create Challenge"
3. Fills in challenge details
4. **Clicks "Choose File" button** (new!)
5. Selects file (PDF, ZIP, TXT, etc.)
6. File uploads to Neon storage bucket
7. File URL stored in `challenge_attachments` table

### Team downloads file:
1. Team views challenge at `/arena/challenges/[id]`
2. Sees "📎 Download File" button
3. Clicks to download
4. File served from Neon storage

---

## Step 4: Update Challenge Creation Form

To add file upload to the admin challenge form, you need to:

### Update `AdminChallengesClient.tsx`:

Add file input field in the modal:

```tsx
<div className={styles.formGroup}>
  <label className={styles.label}>Challenge File (Optional)</label>
  <input
    type="file"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        setFormData({ ...formData, file });
      }
    }}
    className={styles.input}
    accept=".pdf,.zip,.txt,.jpg,.png,.mp4"
  />
  <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
    Upload files for participants to download (max 50MB)
  </p>
</div>
```

Update form submission to use FormData:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  try {
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('category_id', formData.category_id);
    formDataToSend.append('points', formData.points.toString());
    formDataToSend.append('flag', formData.flag);
    formDataToSend.append('is_visible', formData.is_visible.toString());
    if (formData.max_attempts) {
      formDataToSend.append('max_attempts', formData.max_attempts.toString());
    }
    formDataToSend.append('hints', JSON.stringify(formData.hints));
    
    // Append file if selected
    if (formData.file) {
      formDataToSend.append('file', formData.file);
    }

    const url = editingChallenge
      ? '/api/admin/challenges/update'
      : '/api/admin/challenges/create';

    const response = await fetch(url, {
      method: 'POST',
      body: formDataToSend, // Send as FormData, not JSON
    });

    // ... rest of the code
  }
};
```

---

## Step 5: Update API Route

The API route `/app/api/admin/challenges/create/route.ts` needs to:

1. Accept `FormData` instead of JSON
2. Extract file from FormData
3. Upload to Neon storage
4. Store file URL in database

This is already created in the storage utility!

---

## Step 6: Display Files in Challenge View

Update `/app/arena/challenges/[id]/ChallengeDetailClient.tsx`:

Add file download section:

```tsx
{challenge.attachments && challenge.attachments.length > 0 && (
  <div className={styles.attachmentsSection}>
    <h3>📎 Challenge Files</h3>
    {challenge.attachments.map((attachment) => (
      <a
        key={attachment.id}
        href={attachment.file_url}
        download
        className={styles.downloadButton}
        target="_blank"
        rel="noopener noreferrer"
      >
        📥 Download {attachment.filename}
        <span className={styles.fileSize}>
          ({(attachment.file_size / 1024).toFixed(2)} KB)
        </span>
      </a>
    ))}
  </div>
)}
```

---

## Security Best Practices

### File Upload Limits:
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Validate before upload
if (file.size > MAX_FILE_SIZE) {
  return { error: 'File too large (max 50MB)' };
}
```

### Allowed File Types:
```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'application/zip',
  'text/plain',
  'image/jpeg',
  'image/png',
  'video/mp4',
];

if (!ALLOWED_TYPES.includes(file.type)) {
  return { error: 'File type not allowed' };
}
```

### File Naming:
```typescript
// Prevent path traversal attacks
const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
const key = `challenges/${Date.now()}-${safeFileName}`;
```

---

## Testing

### Test File Upload:

1. **Start server**: `npm run dev`
2. **Login as admin**: http://localhost:3000/admin
3. **Go to challenges**: http://localhost:3000/admin/challenges
4. **Create challenge**:
   - Title: "Test Challenge with File"
   - Description: "This has a file attachment"
   - Category: Web Exploitation
   - Points: 100
   - Flag: flag{test}
   - **Upload a file**: Select a PDF or ZIP
   - Click "Create Challenge"

5. **Verify**:
   - Challenge appears in list
   - File uploaded to Neon storage
   - Database has file URL

6. **Test download**:
   - Login as team
   - Go to challenge
   - Click download button
   - File downloads successfully

---

## Troubleshooting

### Error: "Access Denied"
**Solution**: Check your Neon access keys in `.env.local`

### Error: "File upload failed"
**Solution**: 
1. Verify bucket name is "files"
2. Check Neon storage bucket permissions
3. Ensure access keys have write permission

### Error: "Endpoint not found"
**Solution**: Verify `NEON_PROJECT_ID` and `NEON_REGION` in `.env.local`

### Files not appearing for teams
**Solution**: Check `challenge_attachments` table has the file URL

---

## Database Schema

The `challenge_attachments` table stores file metadata:

```sql
CREATE TABLE challenge_attachments (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Quick Commands

```bash
# Verify database connection
npm run db:verify

# Check admin credentials
npm run test:login

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Next Steps

1. ✅ Get Neon storage access keys
2. ✅ Update `.env.local` with real keys
3. ✅ Update challenge creation form (add file input)
4. ✅ Update challenge display (show download button)
5. ✅ Test file upload and download
6. ✅ Deploy to production

**Your CTF platform will then support file attachments for challenges!** 📎🎯
