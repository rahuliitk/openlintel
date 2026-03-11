'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import dynamic from 'next/dynamic';

const FloorPlanUpload = dynamic(
  () => import('@/components/floor-plan-upload').then((m) => m.FloorPlanUpload),
  {
    loading: () => (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading uploader...
      </div>
    ),
  },
);

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Textarea,
  Input,
  toast,
} from '@openlintel/ui';
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Send,
  Download,
  Map,
  ArrowLeft,
  Bot,
  User,
  Pencil,
  Check,
  X,
  ScanLine,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers — preview URLs for non-image uploads (PDF, DWG, DXF)
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/** Returns the best image URL for displaying an upload (handles PDF/CAD previews). */
function getUploadImageUrl(upload: { storageKey: string; mimeType?: string | null; filename?: string | null }): string {
  const ext = (upload.storageKey.split('.').pop() || '').toLowerCase();
  // Real images: serve directly. DWG/DXF may report image/* MIME types but aren't renderable.
  if (upload.mimeType?.startsWith('image/') && !['dwg', 'dxf'].includes(ext)) {
    return `/api/uploads/${encodeURIComponent(upload.storageKey)}`;
  }
  // Non-image (PDF/CAD): use the generated preview PNG
  const previewKey = upload.storageKey.replace(/\.[^.]+$/, '_preview.png');
  return `/api/uploads/${encodeURIComponent(previewKey)}`;
}

/** Derive image URL from a raw storageKey (used in digitization results). */
function storageKeyToImageUrl(storageKey: string): string {
  const ext = (storageKey.split('.').pop() || '').toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) {
    return `/api/uploads/${encodeURIComponent(storageKey)}`;
  }
  const previewKey = storageKey.replace(/\.[^.]+$/, '_preview.png');
  return `/api/uploads/${encodeURIComponent(previewKey)}`;
}

// ---------------------------------------------------------------------------
// Room colors
// ---------------------------------------------------------------------------

const ROOM_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899',
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#8b5cf6',
];

// ---------------------------------------------------------------------------
// Simple Floor Plan SVG — clean rectangles with thin borders, room labels,
// and small door/window indicators. Matches the actual floor plan layout.
// ---------------------------------------------------------------------------

function FloorPlanSVG({ floor, floorIndex }: { floor: any; floorIndex: number }) {
  const rooms: any[] = floor.rooms || [];
  if (rooms.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No rooms detected for this floor.</p>;
  }

  const wallT = floor.wallThicknessMm || 150;
  const stroke = Math.max(20, wallT * 0.4); // thin wall stroke

  // Calculate overall bounding box from rooms
  let overallW = 0;
  let overallH = 0;
  for (const r of rooms) {
    const right = (r.x || 0) + (r.lengthMm || 0);
    const bottom = (r.y || 0) + (r.widthMm || 0);
    if (right > overallW) overallW = right;
    if (bottom > overallH) overallH = bottom;
  }
  if (overallW === 0) overallW = 10000;
  if (overallH === 0) overallH = 8000;

  // Small padding around the plan
  const pad = Math.max(overallW, overallH) * 0.05;
  const svgW = overallW + pad * 2;
  const svgH = overallH + pad * 2;

  // Font sizes proportional to plan size
  const baseFontSize = Math.max(100, Math.min(300, overallW * 0.02));

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full rounded-lg border bg-white dark:bg-gray-950"
      style={{ maxHeight: '520px' }}
    >
      {/* Room rectangles — fill + border */}
      {rooms.map((room: any, i: number) => {
        const rx = pad + (room.x || 0);
        const ry = pad + (room.y || 0);
        const rw = room.lengthMm || 3000;
        const rh = room.widthMm || 3000;
        const color = ROOM_COLORS[i % ROOM_COLORS.length];

        return (
          <rect
            key={`room-${i}`}
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill={`${color}15`}
            stroke="#1f2937"
            strokeWidth={stroke}
          />
        );
      })}

      {/* Door indicators — small brown gap marks on walls */}
      {rooms.map((room: any, ri: number) =>
        (room.doors || []).map((door: any, di: number) => {
          const rx = pad + (room.x || 0);
          const ry = pad + (room.y || 0);
          const rw = room.lengthMm || 3000;
          const rh = room.widthMm || 3000;
          const doorW = door.widthMm || 900;
          const markStroke = stroke * 2.5;

          // Center the door on the specified wall
          switch (door.wallSide) {
            case 'top': {
              const cx = rx + rw / 2;
              return <line key={`d-${ri}-${di}`} x1={cx - doorW / 2} y1={ry} x2={cx + doorW / 2} y2={ry} stroke="#92400e" strokeWidth={markStroke} />;
            }
            case 'bottom': {
              const cx = rx + rw / 2;
              return <line key={`d-${ri}-${di}`} x1={cx - doorW / 2} y1={ry + rh} x2={cx + doorW / 2} y2={ry + rh} stroke="#92400e" strokeWidth={markStroke} />;
            }
            case 'left': {
              const cy = ry + rh / 2;
              return <line key={`d-${ri}-${di}`} x1={rx} y1={cy - doorW / 2} x2={rx} y2={cy + doorW / 2} stroke="#92400e" strokeWidth={markStroke} />;
            }
            case 'right': {
              const cy = ry + rh / 2;
              return <line key={`d-${ri}-${di}`} x1={rx + rw} y1={cy - doorW / 2} x2={rx + rw} y2={cy + doorW / 2} stroke="#92400e" strokeWidth={markStroke} />;
            }
            default:
              return null;
          }
        }),
      )}

      {/* Window indicators — small blue marks on walls */}
      {rooms.map((room: any, ri: number) =>
        (room.windows || []).map((win: any, wi: number) => {
          const rx = pad + (room.x || 0);
          const ry = pad + (room.y || 0);
          const rw = room.lengthMm || 3000;
          const rh = room.widthMm || 3000;
          const winW = win.widthMm || 1200;
          const markStroke = stroke * 2;

          switch (win.wallSide) {
            case 'top': {
              const cx = rx + rw / 2;
              return <line key={`w-${ri}-${wi}`} x1={cx - winW / 2} y1={ry} x2={cx + winW / 2} y2={ry} stroke="#3b82f6" strokeWidth={markStroke} />;
            }
            case 'bottom': {
              const cx = rx + rw / 2;
              return <line key={`w-${ri}-${wi}`} x1={cx - winW / 2} y1={ry + rh} x2={cx + winW / 2} y2={ry + rh} stroke="#3b82f6" strokeWidth={markStroke} />;
            }
            case 'left': {
              const cy = ry + rh / 2;
              return <line key={`w-${ri}-${wi}`} x1={rx} y1={cy - winW / 2} x2={rx} y2={cy + winW / 2} stroke="#3b82f6" strokeWidth={markStroke} />;
            }
            case 'right': {
              const cy = ry + rh / 2;
              return <line key={`w-${ri}-${wi}`} x1={rx + rw} y1={cy - winW / 2} x2={rx + rw} y2={cy + winW / 2} stroke="#3b82f6" strokeWidth={markStroke} />;
            }
            default:
              return null;
          }
        }),
      )}

      {/* Room labels — name, area, dimensions centered in each room */}
      {rooms.map((room: any, i: number) => {
        const rx = pad + (room.x || 0);
        const ry = pad + (room.y || 0);
        const rw = room.lengthMm || 3000;
        const rh = room.widthMm || 3000;
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;
        const color = ROOM_COLORS[i % ROOM_COLORS.length];

        // Scale font to fit inside room
        const roomMin = Math.min(rw, rh);
        const nameFontSize = Math.max(70, Math.min(baseFontSize, roomMin * 0.12));
        const subFontSize = nameFontSize * 0.7;

        return (
          <g key={`label-${i}`}>
            <text x={cx} y={cy - nameFontSize * 0.3} fill={color} fontSize={nameFontSize} fontWeight="600" textAnchor="middle" dominantBaseline="middle">
              {room.name || room.type?.replace(/_/g, ' ')}
            </text>
            {room.areaSqm ? (
              <text x={cx} y={cy + subFontSize * 0.6} fill="#6b7280" fontSize={subFontSize} textAnchor="middle" dominantBaseline="middle">
                {room.areaSqm} sqm
              </text>
            ) : null}
            {room.lengthMm && room.widthMm ? (
              <text x={cx} y={cy + subFontSize * 0.6 + subFontSize * 1.1} fill="#9ca3af" fontSize={subFontSize * 0.85} textAnchor="middle" dominantBaseline="middle">
                {(room.lengthMm / 1000).toFixed(1)}m x {(room.widthMm / 1000).toFixed(1)}m
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Overall dimensions text at bottom-right */}
      <text
        x={svgW - pad * 0.5}
        y={svgH - pad * 0.3}
        fill="#6b7280"
        fontSize={baseFontSize * 0.6}
        textAnchor="end"
        dominantBaseline="auto"
      >
        {(overallW / 1000).toFixed(1)}m x {(overallH / 1000).toFixed(1)}m
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Digitization results panel — shows detected rooms after floor plan digitization
// Supports both new multi-floor format and old polygon format
// ---------------------------------------------------------------------------

function DigitizationResultsPanel({
  job,
  onClose,
  onGoToBom,
}: {
  job: any;
  onClose: () => void;
  onGoToBom: () => void;
}) {
  const output = job.outputJson as any;
  const inputData = job.inputJson as any;
  const storageKey = output?.storageKey || inputData?.storageKey;
  const imageUrl = storageKey ? storageKeyToImageUrl(storageKey) : null;

  // Detect format: new (floors array) vs old (detectedRooms with polygon)
  const floors: any[] = output?.floors || [];
  const isNewFormat = floors.length > 0 && floors[0]?.rooms?.length > 0;

  // For old format, convert to a single floor
  const legacyRooms = output?.detectedRooms || output?.rooms || [];
  const effectiveFloors = isNewFormat
    ? floors
    : legacyRooms.length > 0
      ? [{
          floorName: 'Floor Plan',
          rooms: legacyRooms,
          overallLengthMm: output?.width || 800,
          overallWidthMm: output?.height || 600,
          wallThicknessMm: 150,
          summary: output?.summary,
        }]
      : [];

  const summary = output?.summary;
  const totalRooms = effectiveFloors.reduce((s: number, f: any) => s + (f.rooms?.length || 0), 0);

  // Floor tab state
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const activeFloor = effectiveFloors[activeFloorIdx] || effectiveFloors[0];
  const activeRooms = activeFloor?.rooms || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Digitization Results</h3>
          <p className="text-sm text-muted-foreground">
            {totalRooms} room{totalRooms !== 1 ? 's' : ''} detected
            {effectiveFloors.length > 1 ? ` across ${effectiveFloors.length} floors` : ''}
            {summary?.totalAreaSqm ? ` — ${summary.totalAreaSqm} sqm total` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onGoToBom}>
            Generate BOM
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Uploaded floor plan image */}
      {imageUrl && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Uploaded Floor Plan</p>
            <img
              src={imageUrl}
              alt="Uploaded floor plan"
              className="w-full rounded-lg border object-contain"
              style={{ maxHeight: '300px' }}
            />
          </CardContent>
        </Card>
      )}

      {/* Floor tabs (for multi-floor plans) */}
      {effectiveFloors.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {effectiveFloors.map((floor: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveFloorIdx(idx)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                idx === activeFloorIdx
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {floor.floorName || `Floor ${idx + 1}`}
              <span className="ml-1 text-xs opacity-60">({floor.rooms?.length || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* SVG floor plan visualization */}
      {activeFloor && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {activeFloor.floorName || 'Detected Room Layout'}
              {activeFloor.summary?.floorPlanType ? ` — ${activeFloor.summary.floorPlanType}` : ''}
            </p>
            {isNewFormat ? (
              <FloorPlanSVG floor={activeFloor} floorIndex={activeFloorIdx} />
            ) : (
              /* Legacy SVG rendering for old polygon-based format */
              <LegacySVG rooms={legacyRooms} width={output?.width || 800} height={output?.height || 600} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Room list */}
      <div className="grid gap-2 sm:grid-cols-2">
        {activeRooms.map((room: any, i: number) => {
          const color = ROOM_COLORS[i % ROOM_COLORS.length];
          return (
            <div
              key={room.id || `room-${i}`}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{room.name || `Room ${i + 1}`}</p>
                <p className="text-xs text-muted-foreground">
                  {room.type?.replace(/_/g, ' ')}
                  {room.lengthMm && room.widthMm ? ` — ${(room.lengthMm / 1000).toFixed(1)}m x ${(room.widthMm / 1000).toFixed(1)}m` : ''}
                  {room.areaSqm ? ` — ${room.areaSqm} sqm` : ''}
                </p>
              </div>
              {room.doors?.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {room.doors.length} door{room.doors.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {room.windows?.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {room.windows.length} win
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy SVG for old polygon-based format (backward compatibility)
// ---------------------------------------------------------------------------

function LegacySVG({ rooms, width, height }: { rooms: any[]; width: number; height: number }) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full rounded-lg border bg-white dark:bg-gray-950"
      style={{ maxHeight: '400px' }}
    >
      {rooms.map((room: any, i: number) => {
        const color = ROOM_COLORS[i % ROOM_COLORS.length];
        const polygon = room.polygon || [];
        if (polygon.length === 0) return null;
        const points = polygon.map((p: any) => `${p.x},${p.y}`).join(' ');
        const cx = polygon.reduce((s: number, p: any) => s + p.x, 0) / polygon.length;
        const cy = polygon.reduce((s: number, p: any) => s + p.y, 0) / polygon.length;

        return (
          <g key={room.id || `room-${i}`}>
            <polygon
              points={points}
              fill={`${color}22`}
              stroke={color}
              strokeWidth="2"
            />
            <text x={cx} y={cy - 8} fill={color} fontSize="13" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
              {room.name || room.type}
            </text>
            <text x={cx} y={cy + 10} fill={color} fontSize="10" textAnchor="middle" dominantBaseline="middle" opacity="0.7">
              {room.areaSqm ? `${room.areaSqm} sqm` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Default prompt
// ---------------------------------------------------------------------------

const DEFAULT_RENDER_PROMPT = `Analyze the provided floor plan and generate a photorealistic top-down (true 90° orthographic) rendering of the entire apartment, strictly preserving the exact dimensions, proportions, walls, doors, windows, and furniture placement as shown.

Do not modify layout, scale, structure, or orientation.

Style: Luxury Modern Cabin — high ceilings, exposed timber beams, warm natural wood throughout, wide plank flooring, large floor-to-ceiling glass windows and sliding glass doors, expansive glazing facing exterior areas, cozy yet contemporary cabin aesthetic. Use light and warm wood tones, natural stone accents, soft warm lighting, and comfortable furnishings and natural romantic decorations.

Architectural visualization style, ultra-realistic materials, physically accurate lighting, no perspective distortion, no added or removed structural elements.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  uploadId: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  status?: 'generating' | 'completed' | 'failed';
  error?: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
      >
        <X className="h-5 w-5" />
      </button>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-16 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-5 w-5" />
      </a>
      <img
        src={src}
        alt={alt || 'Image'}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat message bubble
// ---------------------------------------------------------------------------

function ChatBubble({
  message,
  onImageClick,
}: {
  message: ChatMessage;
  onImageClick?: (url: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.status === 'generating' && (
          <div className="flex h-48 w-64 items-center justify-center rounded-xl bg-muted">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Generating...</p>
            </div>
          </div>
        )}

        {message.imageUrl && (
          <div className="relative inline-block">
            <img
              src={message.imageUrl}
              alt="Render"
              className="max-h-[360px] w-auto max-w-full cursor-pointer rounded-xl border object-contain transition-opacity hover:opacity-90"
              onClick={() => onImageClick?.(message.imageUrl!)}
            />
            <a
              href={message.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {message.status === 'failed' && (
          <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            Failed: {message.error || 'Unknown error'}
          </div>
        )}

        <p className={`text-[10px] text-muted-foreground ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: reconstruct chat messages from saved jobs
// ---------------------------------------------------------------------------

function jobsToMessages(renderJobs: any[]): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  // Sort by createdAt ascending
  const sorted = [...renderJobs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const job of sorted) {
    const input = job.inputJson as any;
    const output = job.outputJson as any;
    const uploadId = input?.floorPlanUploadId || input?.floorPlanUploadId || '';
    if (!uploadId) continue;

    const prompt =
      input?.stylePrompt || input?.prompt || 'Render request';

    // User message
    msgs.push({
      id: `user-${job.id}`,
      uploadId,
      role: 'user',
      content: prompt,
      timestamp: new Date(job.createdAt),
    });

    // Assistant message
    if (job.status === 'completed' && output?.imageUrl) {
      msgs.push({
        id: job.id,
        uploadId,
        role: 'assistant',
        content: output.revisedPrompt || 'Here is your render.',
        imageUrl: output.imageUrl,
        status: 'completed',
        timestamp: new Date(job.completedAt || job.createdAt),
      });
    } else if (job.status === 'failed') {
      msgs.push({
        id: job.id,
        uploadId,
        role: 'assistant',
        content: 'Generation failed.',
        status: 'failed',
        error: job.error || 'Unknown error',
        timestamp: new Date(job.completedAt || job.createdAt),
      });
    } else if (job.status === 'running' || job.status === 'pending') {
      msgs.push({
        id: job.id,
        uploadId,
        role: 'assistant',
        content: 'Generating...',
        status: 'generating',
        timestamp: new Date(job.createdAt),
      });
    }
  }

  return msgs;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Which upload is currently active
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Track uploads whose preview image failed to load (fallback to placeholder)
  const [previewErrors, setPreviewErrors] = useState<Set<string>>(new Set());

  // Upload renaming
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [newUploadName, setNewUploadName] = useState('');

  // Prompt
  const [editPrompt, setEditPrompt] = useState('');

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeEditJobId, setActiveEditJobId] = useState<string | null>(null);

  // Queries
  const { data: project, isLoading: loadingProject } = trpc.project.byId.useQuery({ id: projectId });
  const { data: uploads = [] } = trpc.upload.listByProject.useQuery({ projectId });
  const floorPlanUploads = uploads.filter((u: any) => u.category === 'floor_plan');

  // Rename mutation (persists label to DB)
  const renameUpload = trpc.upload.rename.useMutation({
    onSuccess: () => {
      utils.upload.listByProject.invalidate({ projectId });
    },
  });

  // Load render history from DB
  const { data: renderJobs } = trpc.floorPlanRender.listRenders.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  // Reconstruct messages from saved jobs (once)
  useEffect(() => {
    if (!renderJobs || historyLoaded) return;

    const relevantJobs = renderJobs.filter(
      (j: any) => j.type === 'full_apartment_render' || j.type === 'floor_plan_edit',
    );

    if (relevantJobs.length > 0) {
      const restoredMessages = jobsToMessages(relevantJobs);
      setMessages(restoredMessages);
    }
    setHistoryLoaded(true);
  }, [renderJobs, historyLoaded]);

  const activeUpload = floorPlanUploads.find((u: any) => u.id === activeUploadId);
  const activeUploadUrl = activeUpload
    ? getUploadImageUrl(activeUpload)
    : undefined;

  const activeMessages = messages.filter((m) => m.uploadId === activeUploadId);
  const isGenerating = Boolean(activeJobId) || Boolean(activeEditJobId);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeMessages[activeMessages.length - 1]?.status]);

  // Auto-resize textarea
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const minH = lineHeight * 2;
    const maxH = lineHeight * 10;
    el.style.height = `${Math.max(minH, Math.min(el.scrollHeight, maxH))}px`;
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [editPrompt, autoResizeTextarea]);

  // Floor plan digitization
  const [digitizeJobId, setDigitizeJobId] = useState<string | null>(null);
  const [viewingDigitization, setViewingDigitization] = useState<string | null>(null); // uploadId

  const digitizeFloorPlan = trpc.floorPlan.digitize.useMutation({
    onSuccess: (job) => {
      if (job) setDigitizeJobId(job.id);
      toast({ title: 'Floor plan digitization started', description: 'Extracting rooms, walls, and dimensions...' });
    },
    onError: (err) => {
      toast({ title: 'Digitization failed', description: err.message });
    },
  });

  // Poll for digitization job completion
  const { data: digitizeJobStatus } = trpc.floorPlan.jobStatus.useQuery(
    { jobId: digitizeJobId! },
    {
      enabled: Boolean(digitizeJobId),
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === 'completed' || s === 'failed' ? false : 1500;
      },
    },
  );

  useEffect(() => {
    if (digitizeJobStatus?.status === 'completed') {
      utils.floorPlan.listDigitizationJobs.invalidate({ projectId });
      toast({ title: 'Floor plan digitized', description: 'Rooms and dimensions extracted successfully.' });
      setDigitizeJobId(null);
    } else if (digitizeJobStatus?.status === 'failed') {
      toast({ title: 'Digitization failed', description: digitizeJobStatus.error || 'Unknown error' });
      setDigitizeJobId(null);
    }
  }, [digitizeJobStatus?.status, projectId, utils.floorPlan.listDigitizationJobs]);

  const { data: digitizationJobs = [] } = trpc.floorPlan.listDigitizationJobs.useQuery(
    { projectId },
  );

  // Map uploadId → latest completed digitization job with output data
  const digitizationByUpload: Record<string, any> = {};
  for (const j of digitizationJobs) {
    const uploadId = (j.inputJson as any)?.uploadId;
    if (uploadId && j.status === 'completed') {
      digitizationByUpload[uploadId] = j;
    }
  }
  const digitizedUploadIds = new Set(Object.keys(digitizationByUpload));

  // Mutations
  const deleteUpload = trpc.upload.delete.useMutation({
    onSuccess: (_data, variables) => {
      utils.upload.listByProject.invalidate({ projectId });
      if (activeUploadId === variables.id) setActiveUploadId(null);
      setMessages((prev) => prev.filter((m) => m.uploadId !== variables.id));
      toast({ title: 'Floor plan deleted' });
    },
  });

  const generateFullApartment = trpc.floorPlanRender.generateFullApartmentRender.useMutation({
    onError: (err) => {
      toast({ title: 'Render failed', description: err.message });
      setMessages((prev) =>
        prev.map((m) =>
          m.status === 'generating' ? { ...m, status: 'failed' as const, error: err.message } : m,
        ),
      );
    },
  });

  const editWithPrompt = trpc.floorPlanRender.editWithPrompt.useMutation({
    onError: (err) => {
      toast({ title: 'Failed', description: err.message });
      setMessages((prev) =>
        prev.map((m) =>
          m.status === 'generating' ? { ...m, status: 'failed' as const, error: err.message } : m,
        ),
      );
    },
  });

  // Job polling
  const { data: renderJobStatus } = trpc.floorPlanRender.jobStatus.useQuery(
    { jobId: activeJobId! },
    {
      enabled: Boolean(activeJobId),
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === 'completed' || s === 'failed' ? false : 2000;
      },
    },
  );

  const { data: editJobStatus } = trpc.floorPlanRender.jobStatus.useQuery(
    { jobId: activeEditJobId! },
    {
      enabled: Boolean(activeEditJobId),
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === 'completed' || s === 'failed' ? false : 2000;
      },
    },
  );

  // Effect: initial render complete
  useEffect(() => {
    if (renderJobStatus?.status === 'completed' && renderJobStatus.outputJson) {
      const output = renderJobStatus.outputJson as any;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeJobId
            ? { ...m, status: 'completed' as const, imageUrl: output.imageUrl, content: output.revisedPrompt || 'Here is your rendered floor plan.' }
            : m,
        ),
      );
      setActiveJobId(null);
      toast({ title: 'Render complete' });
    } else if (renderJobStatus?.status === 'failed') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeJobId
            ? { ...m, status: 'failed' as const, error: renderJobStatus.error || 'Unknown error', content: 'Render failed.' }
            : m,
        ),
      );
      setActiveJobId(null);
    }
  }, [renderJobStatus?.status]);

  // Effect: edit complete
  useEffect(() => {
    if (editJobStatus?.status === 'completed' && editJobStatus.outputJson) {
      const output = editJobStatus.outputJson as any;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeEditJobId
            ? { ...m, status: 'completed' as const, imageUrl: output.imageUrl, content: output.revisedPrompt || 'Here is your updated render.' }
            : m,
        ),
      );
      setActiveEditJobId(null);
      toast({ title: 'Edit complete' });
    } else if (editJobStatus?.status === 'failed') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeEditJobId
            ? { ...m, status: 'failed' as const, error: editJobStatus.error || 'Unknown error', content: 'Edit failed.' }
            : m,
        ),
      );
      setActiveEditJobId(null);
    }
  }, [editJobStatus?.status]);

  // Open an upload
  const openUpload = useCallback((uploadId: string) => {
    setActiveUploadId(uploadId);
    const existing = messages.filter((m) => m.uploadId === uploadId);
    if (existing.length === 0) {
      setEditPrompt(DEFAULT_RENDER_PROMPT);
    } else {
      setEditPrompt('');
    }
  }, [messages]);

  // Send prompt
  const handleSendPrompt = () => {
    if (!editPrompt.trim() || !activeUploadId) return;
    if (isGenerating) {
      toast({ title: 'Please wait for the current generation to finish' });
      return;
    }

    const prompt = editPrompt.trim();
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const lastImage = [...messages]
      .filter((m) => m.uploadId === activeUploadId && m.imageUrl)
      .pop();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        uploadId: activeUploadId,
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      },
      {
        id: assistantMsgId,
        uploadId: activeUploadId,
        role: 'assistant',
        content: 'Generating...',
        status: 'generating',
        timestamp: new Date(),
      },
    ]);

    const isFirstRender = !lastImage;

    if (isFirstRender) {
      generateFullApartment.mutate(
        {
          projectId,
          floorPlanUploadId: activeUploadId,
          stylePrompt: prompt,
          roomDescriptions: [],
        },
        {
          onSuccess: (job) => {
            if (!job) return;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, id: job.id } : m)),
            );
            setActiveJobId(job.id);
          },
        },
      );
    } else {
      editWithPrompt.mutate(
        {
          projectId,
          sourceImageUrl: lastImage.imageUrl ?? '',
          prompt,
          floorPlanUploadId: activeUploadId,
        },
        {
          onSuccess: (job) => {
            if (!job) return;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, id: job.id } : m)),
            );
            setActiveEditJobId(job.id);
          },
        },
      );
    }

    setEditPrompt('');
  };

  // Upload naming helpers
  const getUploadName = (upload: any) => {
    return upload.label || `Floor Plan ${floorPlanUploads.indexOf(upload) + 1}`;
  };

  const startEditName = (uploadId: string, currentName: string) => {
    setEditingNameId(uploadId);
    setEditNameValue(currentName);
  };

  const saveName = (uploadId: string) => {
    if (editNameValue.trim()) {
      renameUpload.mutate({ id: uploadId, label: editNameValue.trim() });
    }
    setEditingNameId(null);
  };

  // Loading
  if (loadingProject) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  // ======================================================================
  // VIEW: Chat interface for active upload
  // ======================================================================
  if (activeUploadId && activeUpload) {
    const name = getUploadName(activeUpload);

    return (
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-3xl flex-col">
        {lightboxSrc && (
          <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        )}

        {/* Header */}
        <div className="mb-4 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveUploadId(null)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <img
              src={activeUploadUrl}
              alt=""
              className="h-8 w-8 cursor-pointer rounded border object-cover"
              onClick={() => activeUploadUrl && setLightboxSrc(activeUploadUrl)}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="font-medium text-sm">{name}</span>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {/* Floor plan image as first message */}
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] space-y-2">
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                <p className="text-muted-foreground">Uploaded floor plan</p>
              </div>
              {activeUploadUrl && !previewErrors.has(activeUploadId!) ? (
                <img
                  src={activeUploadUrl}
                  alt={name}
                  className="max-h-[280px] w-auto max-w-full cursor-pointer rounded-xl border object-contain transition-opacity hover:opacity-90"
                  onClick={() => activeUploadUrl && setLightboxSrc(activeUploadUrl)}
                  onError={() => setPreviewErrors((prev) => new Set(prev).add(activeUploadId!))}
                />
              ) : (
                <div className="flex h-40 w-56 items-center justify-center rounded-xl bg-muted">
                  <Map className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>

          {/* Chat messages */}
          {activeMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} onImageClick={setLightboxSrc} />
          ))}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t bg-background pt-3 pb-2">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={2}
              className="flex-1 resize-none overflow-y-auto"
              style={{ minHeight: '40px', maxHeight: '200px' }}
              placeholder="Ask to edit, change style, show a room, or explore..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
            />
            <Button
              onClick={handleSendPrompt}
              disabled={!editPrompt.trim() || isGenerating}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              'Show the living room from eye level',
              'Change to Scandinavian style',
              'Show the kitchen in detail',
              'Add warmer lighting',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setEditPrompt(suggestion)}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ======================================================================
  // VIEW: Digitization results for a specific upload
  // ======================================================================
  if (viewingDigitization) {
    const digJob = digitizationByUpload[viewingDigitization];
    if (digJob) {
      return (
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingDigitization(null)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Floor Plans
            </Button>
          </div>
          <DigitizationResultsPanel
            job={digJob}
            onClose={() => setViewingDigitization(null)}
            onGoToBom={() => {
              window.location.href = `/project/${projectId}/bom?fpJobId=${digJob.id}`;
            }}
          />
        </div>
      );
    }
  }

  // ======================================================================
  // VIEW: Upload list
  // ======================================================================
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Floor Plan Studio</h1>
        <p className="text-sm text-muted-foreground">
          Upload floor plans (images, PDF, DWG, DXF) and generate photorealistic renders with AI.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle className="text-lg">Upload Floor Plan</CardTitle>
          </div>
          <CardDescription>
            Upload an image, PDF, DWG, or DXF file. Enter a name before uploading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Enter a name, e.g. Floor Plan 1, Living Area..."
            value={newUploadName}
            onChange={(e) => setNewUploadName(e.target.value)}
          />
          <FloorPlanUpload
            projectId={projectId}
            disabled={!newUploadName.trim()}
            onUploadComplete={(upload: any) => {
              utils.upload.listByProject.invalidate({ projectId });
              if (upload?.id) {
                renameUpload.mutate({ id: upload.id, label: newUploadName.trim() });
              }
              setNewUploadName('');
            }}
          />
        </CardContent>
      </Card>

      {floorPlanUploads.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            Your Floor Plans ({floorPlanUploads.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {floorPlanUploads.map((upload: any) => {
              const name = getUploadName(upload);
              const uploadMessages = messages.filter(
                (m) => m.uploadId === upload.id && m.imageUrl && m.status === 'completed',
              );

              return (
                <Card
                  key={upload.id}
                  className="group cursor-pointer overflow-hidden transition-all hover:ring-1 hover:ring-primary/50"
                  onClick={() => openUpload(upload.id)}
                >
                  <div className="relative aspect-video bg-muted">
                    {!previewErrors.has(upload.id) ? (
                      <img
                        src={getUploadImageUrl(upload)}
                        alt={name}
                        className="h-full w-full object-contain"
                        onError={() => setPreviewErrors((prev) => new Set(prev).add(upload.id))}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Map className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    {uploadMessages.length > 0 && (
                      <div className="absolute left-2 top-2">
                        <Badge variant="secondary" className="bg-black/60 text-white text-[10px]">
                          {uploadMessages.length} render{uploadMessages.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                      <div className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-900/90 dark:text-white">
                        {uploadMessages.length > 0 ? 'Continue' : 'Start Rendering'}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {editingNameId === upload.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveName(upload.id);
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveName(upload.id);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{name}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditName(upload.id, name);
                              }}
                              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {digitizedUploadIds.has(upload.id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingDigitization(upload.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                            View Results
                          </Button>
                        ) : digitizeJobId && (digitizeJobStatus as any)?.inputJson?.uploadId === upload.id ? (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Digitizing...
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={digitizeFloorPlan.isPending || Boolean(digitizeJobId)}
                            onClick={(e) => {
                              e.stopPropagation();
                              digitizeFloorPlan.mutate({
                                projectId,
                                uploadId: upload.id,
                              });
                            }}
                          >
                            <ScanLine className="h-3 w-3" />
                            Digitize
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          disabled={deleteUpload.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this floor plan and all its renders?')) {
                              deleteUpload.mutate({ id: upload.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Map className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Floor Plans Yet</h2>
          <p className="text-sm text-muted-foreground">
            Upload an image, PDF, DWG, or DXF floor plan above to get started.
          </p>
        </Card>
      )}
    </div>
  );
}
