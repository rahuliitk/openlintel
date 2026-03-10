import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth } from '@/lib/auth';
import { db, uploads, projects, rooms, eq, and } from '@openlintel/db';
import { saveFile, generateStorageKey } from '@/lib/storage';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB — DWG files are commonly 10-40MB

// MIME types sent by browsers for each format.
// DWG has no official IANA MIME type — browsers vary widely.
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // PDF
  'application/pdf',
  // DWG — browsers send different types depending on OS/browser
  'application/acad',
  'application/x-acad',
  'application/x-autocad',
  'application/dwg',
  'image/x-dwg',
  'image/vnd.dwg',
  // DXF
  'application/dxf',
  'application/x-dxf',
  'image/vnd.dxf',
  'image/x-dxf',
  // Fallback — many browsers send this for unknown binary formats
  'application/octet-stream',
];

// Because DWG/DXF MIME detection is unreliable, also validate by extension
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'dwg', 'dxf',
]);

const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getFileExtension(filename: string): string {
  return (filename.split('.').pop() ?? '').toLowerCase();
}

function isAllowedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  // If extension is in our allowed list, accept regardless of MIME type
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  // Otherwise fall back to MIME type check
  return ALLOWED_TYPES.includes(file.type);
}

function isCADFile(filename: string): boolean {
  return CAD_EXTENSIONS.has(getFileExtension(filename));
}

function computeImageHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 32);
}

async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer | null> {
  if (!IMAGE_TYPES.includes(mimeType)) return null;
  try {
    // Dynamic import to avoid issues if sharp is not installed
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null;
  const roomId = formData.get('roomId') as string | null;
  const category = (formData.get('category') as string) || 'photo';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
  }

  if (!isAllowedFile(file)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: images, PDF, DWG, DXF' },
      { status: 400 },
    );
  }

  // Verify ownership if projectId or roomId is provided
  if (projectId) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  if (roomId) {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: { project: true },
    });
    if (!room || room.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = generateStorageKey(file.name);
  await saveFile(buffer, storageKey, file.type);

  // Generate thumbnail (and preview for non-image files)
  let thumbnailKey: string | null = null;

  if (IMAGE_TYPES.includes(file.type)) {
    // Direct image: generate thumbnail from original
    const thumbnail = await generateThumbnail(buffer, file.type);
    if (thumbnail) {
      thumbnailKey = storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
      await saveFile(thumbnail, thumbnailKey, 'image/jpeg');
    }
  } else {
    // PDF/CAD: convert to image first, then save preview + thumbnail
    try {
      const { fileToImageBuffer } = await import('@/lib/file-to-image');
      const { imageBuffer } = await fileToImageBuffer(buffer, file.type, file.name);

      // Save full-size preview PNG
      const previewKey = storageKey.replace(/\.[^.]+$/, '_preview.png');
      await saveFile(imageBuffer, previewKey, 'image/png');

      // Generate thumbnail from the converted image
      const thumbnail = await generateThumbnail(imageBuffer, 'image/png');
      if (thumbnail) {
        thumbnailKey = storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
        await saveFile(thumbnail, thumbnailKey, 'image/jpeg');
      }
    } catch (err) {
      console.error('Preview generation failed for non-image upload:', err);
      // Non-fatal — upload still succeeds, just no preview
    }
  }

  // Compute image hash for deduplication (images only)
  const imageHash = IMAGE_TYPES.includes(file.type) ? computeImageHash(buffer) : null;

  const [upload] = await db
    .insert(uploads)
    .values({
      userId: session.user.id,
      projectId,
      roomId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      category,
      thumbnailKey,
      imageHash,
    })
    .returning();

  return NextResponse.json(upload);
}
