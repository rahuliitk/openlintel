'use client';

import { use, useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@openlintel/ui';
import {
  PenTool,
  Plus,
  Loader2,
  Square,
  Grid3X3,
  Layers,
  ZoomIn,
  ZoomOut,
  DoorOpen,
  MousePointer2,
  Ruler,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

/* ─── Types & Constants ─────────────────────────────────────── */

type ToolMode = 'select' | 'wall' | 'room' | 'door' | 'window' | 'measure';

const TOOLS: { mode: ToolMode; icon: any; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'wall', icon: PenTool, label: 'Draw Wall' },
  { mode: 'room', icon: Square, label: 'Draw Room' },
  { mode: 'door', icon: DoorOpen, label: 'Place Door' },
  { mode: 'window', icon: Grid3X3, label: 'Place Window' },
  { mode: 'measure', icon: Ruler, label: 'Measure' },
];

const LAYER_OPTIONS = [
  { value: 'structural', label: 'Structural', color: 'bg-gray-600', stroke: '#4b5563' },
  { value: 'furniture', label: 'Furniture', color: 'bg-blue-500', stroke: '#3b82f6' },
  { value: 'electrical', label: 'Electrical', color: 'bg-yellow-500', stroke: '#eab308' },
  { value: 'plumbing', label: 'Plumbing', color: 'bg-cyan-500', stroke: '#06b6d4' },
  { value: 'hvac', label: 'HVAC', color: 'bg-red-500', stroke: '#ef4444' },
];

const LAYER_STROKE: Record<string, string> = Object.fromEntries(
  LAYER_OPTIONS.map((l) => [l.value, l.stroke])
);

const ROOM_TYPES = [
  'bedroom', 'kitchen', 'bathroom', 'living_room', 'dining',
  'office', 'hallway', 'garage', 'utility',
];

const PX_PER_FT = 40;
const WALL_STROKE = 6;

const ROOM_FILL: Record<string, string> = {
  bedroom: '#dbeafe',
  kitchen: '#fef3c7',
  bathroom: '#cffafe',
  living_room: '#ede9fe',
  dining: '#fce7f3',
  office: '#d1fae5',
  hallway: '#f3f4f6',
  garage: '#e5e7eb',
  utility: '#fde68a',
  other: '#f0fdf4',
};

/* ─── Helpers ───────────────────────────────────────────────── */

interface WallData {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  wallType: string;
  layer: string | null;
  metadata: any;
  roomId: string | null;
  openings?: any[];
}

interface RoomGroup {
  groupId: string;
  name: string;
  type: string;
  walls: WallData[];
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildRoomGroups(walls: WallData[]): RoomGroup[] {
  const map = new Map<string, WallData[]>();
  for (const w of walls) {
    const gid = (w.metadata as any)?.roomGroupId;
    if (!gid) continue;
    if (!map.has(gid)) map.set(gid, []);
    map.get(gid)!.push(w);
  }
  return Array.from(map.entries()).map(([groupId, rw]) => {
    const meta = (rw[0]?.metadata as any) ?? {};
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of rw) {
      minX = Math.min(minX, w.startX, w.endX);
      minY = Math.min(minY, w.startY, w.endY);
      maxX = Math.max(maxX, w.startX, w.endX);
      maxY = Math.max(maxY, w.startY, w.endY);
    }
    return { groupId, name: meta.roomName ?? 'Room', type: meta.roomType ?? 'other', walls: rw, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });
}

function wallLength(w: { startX: number; startY: number; endX: number; endY: number }) {
  return Math.sqrt((w.endX - w.startX) ** 2 + (w.endY - w.startY) ** 2);
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function FloorPlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  // UI state
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [activeLayer, setActiveLayer] = useState('structural');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [showLayers, setShowLayers] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(LAYER_OPTIONS.map((l) => l.value)));

  // Drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

  // Pan
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Measure
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // Add Room Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('bedroom');
  const [roomWidth, setRoomWidth] = useState('');
  const [roomLength, setRoomLength] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasCreating = useRef(false);

  /* ── Queries ───────────────────────────────────────────────── */
  const { data: canvas, isLoading } = trpc.floorPlanEditor.getCanvas.useQuery({ projectId });

  /* ── Mutations ─────────────────────────────────────────────── */
  const invalidate = () => utils.floorPlanEditor.getCanvas.invalidate({ projectId });

  const saveCanvas = trpc.floorPlanEditor.saveCanvas.useMutation({ onSuccess: invalidate });

  const createWall = trpc.floorPlanEditor.createWall.useMutation({
    onSuccess: () => {
      invalidate();
      toast({ title: 'Wall added' });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const createRoomWalls = trpc.floorPlanEditor.createRoomWalls.useMutation({
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' }),
  });

  const deleteWall = trpc.floorPlanEditor.deleteWall.useMutation({
    onSuccess: () => {
      invalidate();
      setSelectedWallId(null);
      toast({ title: 'Wall deleted' });
    },
  });

  const deleteRoomWalls = trpc.floorPlanEditor.deleteRoomWalls.useMutation({
    onSuccess: () => {
      invalidate();
      toast({ title: 'Room deleted' });
    },
  });

  const placeOpening = trpc.floorPlanEditor.placeOpening.useMutation({
    onSuccess: () => {
      invalidate();
      toast({ title: 'Opening placed' });
    },
    onError: (err) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  /* ── Auto-create canvas ────────────────────────────────────── */
  useEffect(() => {
    if (!isLoading && !canvas && !canvasCreating.current && !saveCanvas.isPending) {
      canvasCreating.current = true;
      saveCanvas.mutate({ projectId, name: 'Floor 1', canvasState: {}, gridSize: PX_PER_FT, scale: 1.0 });
    }
  }, [isLoading, canvas]);

  /* ── Derived ───────────────────────────────────────────────── */
  const walls: WallData[] = (canvas as any)?.walls ?? [];
  const filtered = walls.filter((w) => visibleLayers.has(w.layer ?? 'structural'));
  const roomGroups = buildRoomGroups(walls);
  const totalArea = roomGroups.reduce((s, r) => s + (r.w / PX_PER_FT) * (r.h / PX_PER_FT), 0);
  const scale = zoom / 100;

  /* ── Canvas coords from mouse ──────────────────────────────── */
  const toCanvas = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    let x = (e.clientX - rect.left - panOffset.x) / scale;
    let y = (e.clientY - rect.top - panOffset.y) / scale;
    if (snapToGrid) {
      x = Math.round(x / PX_PER_FT) * PX_PER_FT;
      y = Math.round(y / PX_PER_FT) * PX_PER_FT;
    }
    return { x, y };
  }, [panOffset, scale, snapToGrid]);

  /* ── Mouse handlers ────────────────────────────────────────── */
  function onMouseDown(e: React.MouseEvent) {
    // Pan: middle-click or alt+left-click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...panOffset };
      return;
    }

    const pt = toCanvas(e);

    if (activeTool === 'select') {
      setSelectedWallId(null);
      return;
    }

    if (activeTool === 'measure') {
      if (!measureStart || measureEnd) {
        setMeasureStart(pt);
        setMeasureEnd(null);
      } else {
        setMeasureEnd(pt);
      }
      return;
    }

    if (activeTool === 'door' || activeTool === 'window') {
      if (!canvas) return;
      placeOpening.mutate({
        canvasId: canvas.id,
        x: pt.x,
        y: pt.y,
        openingType: activeTool as 'door' | 'window',
        width: activeTool === 'door' ? 80 : 100,
        height: activeTool === 'door' ? 210 : 120,
      });
      return;
    }

    if (activeTool === 'wall' || activeTool === 'room') {
      setIsDrawing(true);
      setDrawStart(pt);
      setDrawCurrent(pt);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPanOffset({
        x: panOffsetStart.current.x + (e.clientX - panStart.current.x),
        y: panOffsetStart.current.y + (e.clientY - panStart.current.y),
      });
      return;
    }
    if (isDrawing) setDrawCurrent(toCanvas(e));
  }

  function onMouseUp() {
    if (isPanning) { setIsPanning(false); return; }
    if (!isDrawing || !drawStart || !drawCurrent || !canvas) { setIsDrawing(false); return; }

    const dx = Math.abs(drawCurrent.x - drawStart.x);
    const dy = Math.abs(drawCurrent.y - drawStart.y);

    if (activeTool === 'wall' && (dx > 5 || dy > 5)) {
      createWall.mutate({
        canvasId: canvas.id,
        startX: drawStart.x, startY: drawStart.y,
        endX: drawCurrent.x, endY: drawCurrent.y,
        thickness: 150, wallType: 'interior', layer: activeLayer,
      });
    }

    if (activeTool === 'room' && dx >= PX_PER_FT && dy >= PX_PER_FT) {
      const x1 = Math.min(drawStart.x, drawCurrent.x);
      const y1 = Math.min(drawStart.y, drawCurrent.y);
      const x2 = Math.max(drawStart.x, drawCurrent.x);
      const y2 = Math.max(drawStart.y, drawCurrent.y);
      const wFt = Math.round((x2 - x1) / PX_PER_FT);
      const hFt = Math.round((y2 - y1) / PX_PER_FT);

      createRoomWalls.mutate({
        canvasId: canvas.id,
        projectId,
        roomName: `Room ${roomGroups.length + 1}`,
        roomType: 'other',
        widthMm: wFt * 304.8,
        lengthMm: hFt * 304.8,
        walls: [
          { startX: x1, startY: y1, endX: x2, endY: y1, layer: activeLayer },
          { startX: x2, startY: y1, endX: x2, endY: y2, layer: activeLayer },
          { startX: x2, startY: y2, endX: x1, endY: y2, layer: activeLayer },
          { startX: x1, startY: y2, endX: x1, endY: y1, layer: activeLayer },
        ],
      }, {
        onSuccess: () => toast({ title: `Room drawn (${wFt}×${hFt} ft)` }),
      });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }

  /* ── Keyboard ──────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWallId && !e.target) {
        deleteWall.mutate({ id: selectedWallId });
      }
      // Also support delete when no input is focused
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWallId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          deleteWall.mutate({ id: selectedWallId });
        }
      }
      if (e.key === 'Escape') {
        setSelectedWallId(null);
        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
        setMeasureStart(null);
        setMeasureEnd(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedWallId]);

  /* ── Add Room via Dialog ───────────────────────────────────── */
  function handleAddRoom() {
    if (!canvas || !roomName || !roomWidth || !roomLength) return;
    const w = parseFloat(roomWidth) * PX_PER_FT;
    const h = parseFloat(roomLength) * PX_PER_FT;

    // Auto-position
    let ox = PX_PER_FT * 2;
    let oy = PX_PER_FT * 2;
    if (roomGroups.length > 0) {
      const last = roomGroups[roomGroups.length - 1];
      ox = last.x + last.w + PX_PER_FT;
      oy = last.y;
      if (ox + w > 1800) {
        ox = PX_PER_FT * 2;
        oy = Math.max(...roomGroups.map((r) => r.y + r.h)) + PX_PER_FT;
      }
    }

    createRoomWalls.mutate({
      canvasId: canvas.id,
      projectId,
      roomName,
      roomType,
      widthMm: parseFloat(roomWidth) * 304.8,
      lengthMm: parseFloat(roomLength) * 304.8,
      walls: [
        { startX: ox, startY: oy, endX: ox + w, endY: oy, layer: activeLayer },
        { startX: ox + w, startY: oy, endX: ox + w, endY: oy + h, layer: activeLayer },
        { startX: ox + w, startY: oy + h, endX: ox, endY: oy + h, layer: activeLayer },
        { startX: ox, startY: oy + h, endX: ox, endY: oy, layer: activeLayer },
      ],
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setRoomName('');
        setRoomType('bedroom');
        setRoomWidth('');
        setRoomLength('');
        toast({ title: `${roomName} added (${roomWidth}×${roomLength} ft)` });
      },
    });
  }

  /* ── Measure ───────────────────────────────────────────────── */
  const measureFt = measureStart && measureEnd
    ? Math.sqrt((measureEnd.x - measureStart.x) ** 2 + (measureEnd.y - measureStart.y) ** 2) / PX_PER_FT
    : null;

  /* ── Loading ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenTool className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Floor Plan Editor</h1>
            <p className="text-sm text-muted-foreground">
              Draw walls &amp; rooms, place doors and windows, measure distances.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setPanOffset({ x: 0, y: 0 }); setZoom(100); }}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset View
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Room</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Room</DialogTitle>
                <DialogDescription>Enter room details and dimensions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rn">Room Name</Label>
                  <Input id="rn" placeholder="e.g. Master Bedroom" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rw">Width (ft)</Label>
                    <Input id="rw" type="number" placeholder="12" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rl">Length (ft)</Label>
                    <Input id="rl" type="number" placeholder="14" value={roomLength} onChange={(e) => setRoomLength(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddRoom} disabled={createRoomWalls.isPending || !roomName || !roomWidth || !roomLength}>
                  {createRoomWalls.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Room'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-xs">
        <span>Rooms: <strong>{roomGroups.length}</strong></span>
        <span>Walls: <strong>{walls.length}</strong></span>
        <span>Area: <strong>{totalArea.toFixed(0)} sqft</strong></span>
        {measureFt !== null && <span className="text-blue-600">Measure: <strong>{measureFt.toFixed(1)} ft</strong></span>}
        <span className="ml-auto flex items-center gap-2">
          Layer: <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: LAYER_STROKE[activeLayer] }} /><strong className="text-[11px]">{LAYER_OPTIONS.find((l) => l.value === activeLayer)?.label}</strong></span>
          {' | '}Zoom: <strong>{zoom}%</strong>{' | '}
          Tool: <Badge variant="secondary" className="text-[10px]">{activeTool}</Badge>
        </span>
      </div>

      <div className="flex gap-4">
        {/* Toolbar */}
        <div className="flex w-14 flex-col items-center gap-1 rounded-lg border bg-background p-2">
          {TOOLS.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={activeTool === mode ? 'default' : 'ghost'}
              size="sm"
              className="h-10 w-10 p-0"
              title={label}
              onClick={() => { setActiveTool(mode); setSelectedWallId(null); setMeasureStart(null); setMeasureEnd(null); }}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="my-2 h-px w-full bg-border" />
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" title="Zoom In" onClick={() => setZoom((z) => Math.min(200, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" title="Zoom Out" onClick={() => setZoom((z) => Math.max(25, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
          <div className="my-2 h-px w-full bg-border" />
          <Button variant={snapToGrid ? 'default' : 'ghost'} size="sm" className="h-10 w-10 p-0" title="Snap to Grid" onClick={() => setSnapToGrid(!snapToGrid)}><Grid3X3 className="h-4 w-4" /></Button>
          <Button variant={showLayers ? 'default' : 'ghost'} size="sm" className="h-10 w-10 p-0" title="Layers" onClick={() => setShowLayers(!showLayers)}><Layers className="h-4 w-4" /></Button>
          {selectedWallId && (
            <>
              <div className="my-2 h-px w-full bg-border" />
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => deleteWall.mutate({ id: selectedWallId })}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-white">
          <svg
            ref={svgRef}
            width="100%"
            height={600}
            style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(25, Math.min(200, z + (e.deltaY > 0 ? -5 : 5)))); }}
          >
            <defs>
              <pattern id="grid" width={PX_PER_FT * scale} height={PX_PER_FT * scale} patternUnits="userSpaceOnUse" x={panOffset.x} y={panOffset.y}>
                <path d={`M ${PX_PER_FT * scale} 0 L 0 0 0 ${PX_PER_FT * scale}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
              <pattern id="grid5" width={PX_PER_FT * scale * 5} height={PX_PER_FT * scale * 5} patternUnits="userSpaceOnUse" x={panOffset.x} y={panOffset.y}>
                <path d={`M ${PX_PER_FT * scale * 5} 0 L 0 0 0 ${PX_PER_FT * scale * 5}`} fill="none" stroke="#cbd5e1" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="#fafafa" />
            <rect width="100%" height="100%" fill="url(#grid)" />
            <rect width="100%" height="100%" fill="url(#grid5)" />

            <g transform={`translate(${panOffset.x},${panOffset.y}) scale(${scale})`}>
              {/* Room fills */}
              {roomGroups.map((r) => (
                <g key={r.groupId}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={ROOM_FILL[r.type] ?? ROOM_FILL.other} opacity={0.5} />
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 8} textAnchor="middle" fontSize={13 / scale} fill="#374151" fontWeight="600">{r.name}</text>
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 10} textAnchor="middle" fontSize={11 / scale} fill="#6b7280">
                    {(r.w / PX_PER_FT).toFixed(0)}×{(r.h / PX_PER_FT).toFixed(0)} ft
                  </text>
                </g>
              ))}

              {/* Walls */}
              {filtered.map((w) => (
                <line
                  key={w.id}
                  x1={w.startX} y1={w.startY} x2={w.endX} y2={w.endY}
                  stroke={selectedWallId === w.id ? '#2563eb' : LAYER_STROKE[w.layer ?? 'structural'] ?? '#4b5563'}
                  strokeWidth={WALL_STROKE / scale}
                  strokeLinecap="round"
                  style={{ cursor: activeTool === 'select' ? 'pointer' : undefined }}
                  onClick={(e) => { e.stopPropagation(); if (activeTool === 'select') setSelectedWallId(w.id); }}
                />
              ))}

              {/* Openings (doors/windows) on walls */}
              {filtered.map((w) =>
                (w.openings ?? []).map((op: any) => {
                  const dx = w.endX - w.startX;
                  const dy = w.endY - w.startY;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  if (len === 0) return null;
                  const t = op.offsetFromStart / len;
                  const cx = w.startX + t * dx;
                  const cy = w.startY + t * dy;
                  const isDoor = op.openingType === 'door';
                  return (
                    <g key={op.id}>
                      <circle cx={cx} cy={cy} r={isDoor ? 8 / scale : 6 / scale} fill={isDoor ? '#f97316' : '#06b6d4'} stroke="white" strokeWidth={2 / scale} />
                      <text x={cx} y={cy + 3 / scale} textAnchor="middle" fontSize={8 / scale} fill="white" fontWeight="bold">
                        {isDoor ? 'D' : 'W'}
                      </text>
                    </g>
                  );
                })
              )}

              {/* Dimension labels */}
              {filtered.map((w) => {
                const len = wallLength(w);
                const ft = (len / PX_PER_FT).toFixed(1);
                const mx = (w.startX + w.endX) / 2;
                const my = (w.startY + w.endY) / 2;
                const angle = Math.atan2(w.endY - w.startY, w.endX - w.startX);
                const off = 14 / scale;
                return (
                  <text key={`d-${w.id}`} x={mx - Math.sin(angle) * off} y={my + Math.cos(angle) * off} textAnchor="middle" fontSize={9 / scale} fill="#6b7280">
                    {ft}′
                  </text>
                );
              })}

              {/* Draw preview: wall */}
              {isDrawing && drawStart && drawCurrent && activeTool === 'wall' && (
                <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y}
                  stroke="#3b82f6" strokeWidth={WALL_STROKE / scale} strokeDasharray={`${6 / scale},${4 / scale}`} strokeLinecap="round" />
              )}

              {/* Draw preview: room */}
              {isDrawing && drawStart && drawCurrent && activeTool === 'room' && (() => {
                const rx = Math.min(drawStart.x, drawCurrent.x);
                const ry = Math.min(drawStart.y, drawCurrent.y);
                const rw = Math.abs(drawCurrent.x - drawStart.x);
                const rh = Math.abs(drawCurrent.y - drawStart.y);
                return (
                  <g>
                    <rect x={rx} y={ry} width={rw} height={rh} fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={WALL_STROKE / scale} strokeDasharray={`${6 / scale},${4 / scale}`} />
                    <text x={rx + rw / 2} y={ry + rh / 2} textAnchor="middle" fontSize={13 / scale} fill="#3b82f6">
                      {(rw / PX_PER_FT).toFixed(0)}×{(rh / PX_PER_FT).toFixed(0)} ft
                    </text>
                  </g>
                );
              })()}

              {/* Measure line */}
              {measureStart && measureEnd && (
                <g>
                  <line x1={measureStart.x} y1={measureStart.y} x2={measureEnd.x} y2={measureEnd.y} stroke="#ef4444" strokeWidth={2 / scale} strokeDasharray={`${4 / scale},${3 / scale}`} />
                  <circle cx={measureStart.x} cy={measureStart.y} r={4 / scale} fill="#ef4444" />
                  <circle cx={measureEnd.x} cy={measureEnd.y} r={4 / scale} fill="#ef4444" />
                  <text x={(measureStart.x + measureEnd.x) / 2} y={(measureStart.y + measureEnd.y) / 2 - 12 / scale} textAnchor="middle" fontSize={12 / scale} fill="#ef4444" fontWeight="bold">
                    {measureFt?.toFixed(1)}′
                  </text>
                </g>
              )}
            </g>

            {/* Empty state */}
            {walls.length === 0 && !isDrawing && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#9ca3af">
                Click &quot;Add Room&quot; or use the toolbar to draw walls and rooms.
              </text>
            )}
          </svg>
        </div>

        {/* Side panel */}
        {showLayers && (
          <div className="w-52 space-y-3 rounded-lg border bg-background p-3 overflow-y-auto" style={{ maxHeight: 640 }}>
            {/* Layers */}
            <div>
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-1.5"><Layers className="h-4 w-4" /> Layers</h3>
              <p className="text-[10px] text-muted-foreground mb-2">Click to draw on layer. Eye toggles visibility.</p>
              <div className="space-y-1">
                {LAYER_OPTIONS.map((l) => (
                  <div
                    key={l.value}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors border ${activeLayer === l.value ? 'bg-muted border-primary/40 ring-1 ring-primary/20' : 'border-transparent hover:bg-muted/50'}`}
                    onClick={() => setActiveLayer(l.value)}
                  >
                    {activeLayer === l.value && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                    <div className={`h-3 w-3 rounded-sm flex-shrink-0 ${l.color} ${visibleLayers.has(l.value) ? 'opacity-100' : 'opacity-30'}`} />
                    <span className={`text-xs flex-1 ${!visibleLayers.has(l.value) ? 'line-through text-muted-foreground' : ''}`}>{l.label}</span>
                    <button
                      className="p-0.5 rounded hover:bg-muted-foreground/10 transition-colors"
                      title={visibleLayers.has(l.value) ? `Hide ${l.label}` : `Show ${l.label}`}
                      onClick={(e) => { e.stopPropagation(); setVisibleLayers((p) => { const n = new Set(p); n.has(l.value) ? n.delete(l.value) : n.add(l.value); return n; }); }}
                    >
                      {visibleLayers.has(l.value) ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms */}
            {roomGroups.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Rooms ({roomGroups.length})</h4>
                <div className="space-y-1">
                  {roomGroups.map((r) => (
                    <div key={r.groupId} className="flex items-center gap-2 text-xs rounded px-1.5 py-1 hover:bg-muted/50">
                      <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: ROOM_FILL[r.type] ?? '#e5e7eb' }} />
                      <span className="truncate flex-1">{r.name}</span>
                      <span className="text-muted-foreground text-[10px]">{(r.w / PX_PER_FT).toFixed(0)}×{(r.h / PX_PER_FT).toFixed(0)}</span>
                      {canvas && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteRoomWalls.mutate({ roomGroupId: r.groupId, canvasId: canvas.id })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standalone walls */}
            {walls.filter((w) => !(w.metadata as any)?.roomGroupId).length > 0 && (
              <div className="border-t pt-3">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Standalone Walls</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {walls.filter((w) => !(w.metadata as any)?.roomGroupId).map((w) => (
                    <div key={w.id} className={`flex items-center justify-between text-xs rounded px-1.5 py-1 cursor-pointer ${selectedWallId === w.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted/50'}`} onClick={() => { setActiveTool('select'); setSelectedWallId(w.id); }}>
                      <span>Wall {(wallLength(w) / PX_PER_FT).toFixed(1)}′</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteWall.mutate({ id: w.id }); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="border-t pt-3 text-[10px] text-muted-foreground space-y-1">
              <p><strong>Wall:</strong> Click &amp; drag to draw</p>
              <p><strong>Room:</strong> Click &amp; drag a rectangle</p>
              <p><strong>Door/Window:</strong> Click near a wall</p>
              <p><strong>Select:</strong> Click wall, then Del key</p>
              <p><strong>Measure:</strong> Click two points</p>
              <p><strong>Pan:</strong> Alt+drag or middle-click</p>
              <p><strong>Zoom:</strong> Scroll wheel or buttons</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
