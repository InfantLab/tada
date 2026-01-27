# Media Storage Architecture

**Date:** January 26, 2026  
**Status:** Design  
**Target:** v0.6.0+ (Premium Feature)

---

## Overview

Design for photo, video, and audio attachments in Ta-Da! entries. Media storage is a premium feature due to infrastructure costs.

---

## Storage Strategy

### Cloudflare R2 (Primary Choice)

**Why R2:**
- S3-compatible API (easy migration path)
- Zero egress fees (critical for media-heavy apps)
- Global edge caching via Cloudflare CDN
- Cost-effective for read-heavy workloads
- Integrates with existing Cloudflare infrastructure

**Alternatives Considered:**
- AWS S3: Higher egress costs, more complex
- Backblaze B2: Cheaper but less integrated
- Self-hosted MinIO: Complexity for self-hosted users

### Bucket Structure

```
tada-media-{environment}/
├── {user_id}/
│   ├── {entry_id}/
│   │   ├── original/
│   │   │   └── {attachment_id}.{ext}
│   │   └── thumb/
│   │       └── {attachment_id}_256.webp
│   └── profile/
│       └── avatar.webp
```

---

## Upload Flow

### 1. Client-Side

```
User selects media
    ↓
Client compresses/resizes (if image/video)
    ↓
Client requests presigned URL from API
    ↓
Client uploads directly to R2
    ↓
Client notifies API of completion
    ↓
API validates and creates attachment record
```

### 2. Presigned URL Endpoint

```typescript
// POST /api/attachments/presign
{
  entryId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number
}

// Response
{
  uploadUrl: string,      // Presigned PUT URL (expires 15min)
  attachmentId: string,   // Pre-generated ID
  expiresAt: string       // ISO 8601
}
```

### 3. Completion Endpoint

```typescript
// POST /api/attachments/complete
{
  attachmentId: string,
  entryId: string
}

// API validates file exists in R2, creates DB record
```

---

## File Processing

### Images

1. **On upload complete:**
   - Validate file exists and matches expected size
   - Generate thumbnail (256px, WebP)
   - Extract EXIF metadata (location, date, camera)
   - Strip sensitive EXIF before storing

2. **Formats supported:**
   - JPEG, PNG, WebP, HEIC
   - Max size: 20MB original
   - Thumbnails: WebP only

### Videos

1. **On upload complete:**
   - Validate format and duration
   - Generate poster frame (thumbnail)
   - Optional: transcode to web-friendly format (HLS)

2. **Formats supported:**
   - MP4 (H.264), WebM, MOV
   - Max duration: 5 minutes
   - Max size: 100MB

### Audio

1. **On upload complete:**
   - Validate format
   - Extract duration metadata

2. **Formats supported:**
   - MP3, M4A, WAV, OGG
   - Max duration: 30 minutes
   - Max size: 50MB

---

## Security

### Access Control

1. **Presigned URLs for reads** (time-limited, user-scoped)
2. **No public bucket access**
3. **User can only access their own media**
4. **Signed URLs expire after 1 hour for viewing**

### Upload Validation

1. **File type validation** (magic bytes, not just extension)
2. **Size limits enforced** (client + server + R2)
3. **Rate limiting** (max 10 uploads per minute)
4. **Virus scanning** (optional, via Cloudflare or ClamAV)

### Privacy

1. **EXIF stripping** by default (preserve date only)
2. **Location data opt-in** (user preference)
3. **Deletion cascades** to R2 objects
4. **Export includes media** (GDPR compliance)

---

## Database Schema

### Attachments Table

```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  
  -- File metadata
  filename TEXT NOT NULL,                 -- Original filename
  mime_type TEXT NOT NULL,                -- e.g., 'image/jpeg'
  size_bytes INTEGER NOT NULL,            -- Original file size
  
  -- Storage location
  storage_key TEXT NOT NULL,              -- R2 object key
  thumbnail_key TEXT,                     -- Thumbnail object key (if applicable)
  
  -- Media metadata (extracted)
  width INTEGER,                          -- Image/video width
  height INTEGER,                         -- Image/video height
  duration_seconds INTEGER,               -- Audio/video duration
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
  error_message TEXT,                     -- If status = 'failed'
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  deleted_at TEXT                         -- Soft delete
);

CREATE INDEX idx_attachments_entry ON attachments(entry_id);
CREATE INDEX idx_attachments_user ON attachments(user_id);
CREATE INDEX idx_attachments_status ON attachments(status);
```

### Entry.data Extension

```typescript
// In entry.data JSON field
{
  // ... existing fields
  attachments?: string[];  // Array of attachment IDs (for quick reference)
}
```

---

## API Endpoints

### Upload Flow

```
POST   /api/attachments/presign     - Get presigned upload URL
POST   /api/attachments/complete    - Mark upload complete, trigger processing
DELETE /api/attachments/:id         - Delete attachment
```

### Reading

```
GET    /api/attachments/:id         - Get attachment metadata + signed view URL
GET    /api/attachments/:id/url     - Get fresh signed URL (for expired links)
GET    /api/entries/:id/attachments - List all attachments for an entry
```

---

## Client-Side Compression

Before uploading, client should:

### Images
```typescript
// Target: 1920px max dimension, 80% quality JPEG
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const maxDim = 1920;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  
  const canvas = new OffscreenCanvas(
    img.width * scale,
    img.height * scale
  );
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
}
```

### Videos
- Use `MediaRecorder` API for re-encoding if needed
- Or accept as-is with size limits

---

## Cost Estimation (R2)

| Tier | Storage | Requests | Est. Cost/mo |
|------|---------|----------|--------------|
| Free | 10 GB | 10M reads | $0 |
| Light | 50 GB | 50M reads | ~$1 |
| Medium | 200 GB | 100M reads | ~$5 |
| Heavy | 1 TB | 500M reads | ~$20 |

*R2 pricing: $0.015/GB storage, free egress*

---

## Self-Hosted Option

For self-hosted users without R2:

1. **Local filesystem storage** (default)
   - Store in `/data/media/{user_id}/{entry_id}/`
   - Serve via Nuxt static handler
   - No presigned URLs needed (direct auth)

2. **S3-compatible config** (optional)
   - MinIO, Backblaze B2, any S3-compatible
   - Same API, different credentials

```env
# .env for self-hosted
MEDIA_STORAGE=local          # or 's3'
MEDIA_LOCAL_PATH=/data/media

# If using S3-compatible
S3_ENDPOINT=https://s3.example.com
S3_BUCKET=tada-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## Implementation Phases

### Phase 1: Schema & API (v0.3.0) ✅
- [x] Design document (this file)
- [ ] Attachments table migration
- [ ] Basic attachment CRUD API (without actual storage)

### Phase 2: Local Storage (v0.4.0)
- [ ] Local filesystem storage for self-hosted
- [ ] Image compression on upload
- [ ] Thumbnail generation
- [ ] Gallery UI component

### Phase 3: Cloud Storage (v0.5.0+)
- [ ] R2 integration
- [ ] Presigned URL flow
- [ ] Background processing (thumbnails, validation)
- [ ] CDN caching

### Phase 4: Premium Features (v0.6.0+)
- [ ] Video support
- [ ] Audio attachments (voice memos)
- [ ] Storage quotas and billing
- [ ] Advanced media management

---

## Open Questions

1. **Quota enforcement:** Per-user storage limits? Per-entry limits?
2. **Retention:** Auto-delete after X days for free tier?
3. **Migration:** How to move from local to cloud storage?
4. **Backup:** Include media in data export?
