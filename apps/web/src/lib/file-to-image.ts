import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';

const TMP_DIR = join(tmpdir(), 'openlintel-conversions');

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true });
}

function exec(cmd: string, args: string[], timeoutMs = 30000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} failed: ${stderr || err.message}`));
      else resolve({ stdout, stderr });
    });
  });
}

/**
 * Convert a PDF buffer to a PNG image buffer (first page only).
 * Uses pdftoppm from poppler-utils.
 */
async function pdfToPng(buffer: Buffer): Promise<Buffer> {
  await ensureTmpDir();
  const id = randomUUID();
  const pdfPath = join(TMP_DIR, `${id}.pdf`);
  const outPrefix = join(TMP_DIR, id);

  try {
    await writeFile(pdfPath, buffer);
    // pdftoppm outputs <prefix>-<page>.png — we want only the first page
    await exec('pdftoppm', ['-png', '-r', '200', '-f', '1', '-l', '1', pdfPath, outPrefix]);

    // pdftoppm names output as prefix-1.png or prefix-01.png
    const possibleNames = [`${outPrefix}-1.png`, `${outPrefix}-01.png`, `${outPrefix}-001.png`];
    for (const name of possibleNames) {
      try {
        const png = await readFile(name);
        await unlink(name).catch(() => {});
        return png;
      } catch {
        continue;
      }
    }

    // Try glob-style: any file starting with the prefix
    const { readdir } = await import('fs/promises');
    const files = await readdir(TMP_DIR);
    const match = files.find((f) => f.startsWith(id) && f.endsWith('.png'));
    if (match) {
      const png = await readFile(join(TMP_DIR, match));
      await unlink(join(TMP_DIR, match)).catch(() => {});
      return png;
    }

    throw new Error('pdftoppm produced no output');
  } finally {
    await unlink(pdfPath).catch(() => {});
  }
}

/**
 * Convert a PDF buffer to PNG image buffers for ALL pages.
 * Returns one buffer per page, sorted by page number.
 */
async function pdfToAllPagePngs(buffer: Buffer): Promise<Buffer[]> {
  await ensureTmpDir();
  const id = randomUUID();
  const pdfPath = join(TMP_DIR, `${id}.pdf`);
  const outPrefix = join(TMP_DIR, id);

  try {
    await writeFile(pdfPath, buffer);
    await exec('pdftoppm', ['-png', '-r', '200', pdfPath, outPrefix]);

    const { readdir } = await import('fs/promises');
    const files = await readdir(TMP_DIR);
    const pageFiles = files
      .filter((f) => f.startsWith(id) && f.endsWith('.png'))
      .sort();

    const buffers: Buffer[] = [];
    for (const file of pageFiles) {
      const filePath = join(TMP_DIR, file);
      buffers.push(await readFile(filePath));
      await unlink(filePath).catch(() => {});
    }

    if (buffers.length === 0) throw new Error('pdftoppm produced no output pages');
    return buffers;
  } finally {
    await unlink(pdfPath).catch(() => {});
  }
}

/**
 * Convert a DXF or DWG buffer to a PNG image buffer.
 * Uses the Python dxf2png.py script with ezdxf + matplotlib.
 */
async function cadToPng(buffer: Buffer, extension: string): Promise<Buffer> {
  await ensureTmpDir();
  const id = randomUUID();
  const inputPath = join(TMP_DIR, `${id}.${extension}`);
  const outputPath = join(TMP_DIR, `${id}.png`);
  const scriptPath = join(process.cwd(), 'scripts', 'dxf2png.py');

  try {
    await writeFile(inputPath, buffer);
    // DWG files need extra time: dwg2dxf conversion + ezdxf rendering
    const timeout = extension === 'dwg' ? 120000 : 60000;
    await exec('python3', [scriptPath, inputPath, outputPath], timeout);
    const png = await readFile(outputPath);
    return png;
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Convert any supported file buffer to a PNG image buffer suitable for GPT-4o vision.
 * Supported: PNG, JPG, WEBP, GIF (passthrough), PDF (pdftoppm), DXF/DWG (ezdxf).
 */
export async function fileToImageBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ imageBuffer: Buffer; imageMimeType: string }> {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  // Images: pass through directly
  if (mimeType.startsWith('image/') && !['dwg', 'dxf'].includes(ext)) {
    return { imageBuffer: buffer, imageMimeType: mimeType };
  }

  // PDF: convert first page to PNG
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const png = await pdfToPng(buffer);
    return { imageBuffer: png, imageMimeType: 'image/png' };
  }

  // DXF: convert to PNG via Python script
  if (ext === 'dxf') {
    const png = await cadToPng(buffer, 'dxf');
    return { imageBuffer: png, imageMimeType: 'image/png' };
  }

  // DWG: convert to PNG via Python script (may fail if ODA not available)
  if (ext === 'dwg') {
    const png = await cadToPng(buffer, 'dwg');
    return { imageBuffer: png, imageMimeType: 'image/png' };
  }

  throw new Error(`Unsupported file type for floor plan analysis: ${ext} (${mimeType})`);
}

/**
 * Convert any supported file buffer to PNG image buffers for ALL pages.
 * PDFs produce one buffer per page; images/CAD files produce a single buffer.
 */
export async function fileToAllImageBuffers(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<Array<{ imageBuffer: Buffer; imageMimeType: string; pageIndex: number }>> {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (mimeType.startsWith('image/') && !['dwg', 'dxf'].includes(ext)) {
    return [{ imageBuffer: buffer, imageMimeType: mimeType, pageIndex: 0 }];
  }

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const pages = await pdfToAllPagePngs(buffer);
    return pages.map((png, i) => ({ imageBuffer: png, imageMimeType: 'image/png', pageIndex: i }));
  }

  if (ext === 'dxf') {
    const png = await cadToPng(buffer, 'dxf');
    return [{ imageBuffer: png, imageMimeType: 'image/png', pageIndex: 0 }];
  }

  if (ext === 'dwg') {
    const png = await cadToPng(buffer, 'dwg');
    return [{ imageBuffer: png, imageMimeType: 'image/png', pageIndex: 0 }];
  }

  throw new Error(`Unsupported file type: ${ext} (${mimeType})`);
}
