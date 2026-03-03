import { randomUUID } from 'crypto';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// Resolve uploads directory relative to monorepo root (two levels up from apps/web)
const UPLOADS_DIR = join(process.cwd(), '..', '..', 'uploads');

export function generateStorageKey(filename: string): string {
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${date}/${randomUUID()}${ext}`;
}

export async function saveFile(buffer: Buffer, key: string, _contentType?: string): Promise<void> {
  const filePath = join(UPLOADS_DIR, key);
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, buffer);
}

export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const filePath = join(UPLOADS_DIR, key);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const filePath = join(UPLOADS_DIR, key);
    await unlink(filePath);
  } catch {
    // File may not exist, ignore
  }
}

export async function getPresignedUrl(key: string, _expiresIn = 3600): Promise<string> {
  // For local storage, return an internal API route that serves the file
  return `/api/uploads/${encodeURIComponent(key)}`;
}
