'use client';

import { use, useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import QRCode from 'qrcode';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
} from '@openlintel/ui';
import {
  ArrowLeft,
  Smartphone,
  Glasses,
  QrCode,
  Monitor,
  Info,
  CheckCircle2,
  XCircle,
  Save,
  FolderOpen,
  Trash2,
  Loader2,
} from 'lucide-react';
import { XRViewer, type XRMode } from '@/components/xr/xr-viewer';
import { ARPlacement, type ARPlacedItem } from '@/components/xr/ar-placement';
import { VRWalkthrough, type VRWaypoint } from '@/components/xr/vr-walkthrough';
import { FURNITURE_CATALOGUE } from '@/lib/gltf-loader';
import type { WallSegmentData, OpeningData, RoomData, SpacePlanData } from '@/components/xr/vr-scene-3d';
import type { WallOutlineData, RoomContextData } from '@/components/xr/ar-scene-3d';

// Dynamically import 3D scene components with SSR disabled
// @react-three/fiber accesses removed React 19 internals at module load time
const ARScene3D = dynamic(() => import('@/components/xr/ar-scene-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
      </div>
    </div>
  ),
});

const VRScene3D = dynamic(() => import('@/components/xr/vr-scene-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading VR scene...</p>
      </div>
    </div>
  ),
});

export default function ARPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading } = trpc.project.byId.useQuery({ id });

  // Fetch floor plan data (wall segments, openings, space plans)
  const { data: floorPlanData } = trpc.arVr.getFloorPlanData.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const [xrMode, setXRMode] = useState<XRMode>('none');
  const [activeTab, setActiveTab] = useState<string>('ar');
  const [placedItems, setPlacedItems] = useState<ARPlacedItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);

  // Backend hooks
  const { data: savedSessions, refetch: refetchSessions } = trpc.arVr.list.useQuery(
    { projectId: id },
    { enabled: !!id },
  );
  const saveMutation = trpc.arVr.save.useMutation({
    onSuccess: () => { refetchSessions(); setSavingSession(false); },
    onError: () => setSavingSession(false),
  });
  const updateMutation = trpc.arVr.update.useMutation({
    onSuccess: () => refetchSessions(),
  });
  const deleteMutation = trpc.arVr.delete.useMutation({
    onSuccess: () => { refetchSessions(); setLoadedSessionId(null); },
  });

  // ── Room data (enriched with dimensions from floorPlanData) ──────
  const rooms = (project as any)?.rooms ?? [];

  const enrichedRooms: RoomData[] = useMemo(() => {
    const fpRooms = (floorPlanData?.rooms ?? []) as any[];
    if (fpRooms.length > 0) {
      return fpRooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type ?? 'other',
        lengthMm: r.lengthMm ?? null,
        widthMm: r.widthMm ?? null,
        heightMm: r.heightMm ?? null,
      }));
    }
    return rooms.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type ?? 'other',
      lengthMm: r.lengthMm ?? null,
      widthMm: r.widthMm ?? null,
      heightMm: r.heightMm ?? null,
    }));
  }, [floorPlanData, rooms]);

  // Set initial room
  useEffect(() => {
    if (enrichedRooms.length > 0 && !currentRoomId && enrichedRooms[0]) {
      setCurrentRoomId(enrichedRooms[0].id);
    }
  }, [enrichedRooms, currentRoomId]);

  // ── Wall segments from floor plan canvases ────────────────────────
  const wallSegments: WallSegmentData[] = useMemo(() => {
    if (!floorPlanData?.canvases) return [];
    const walls: WallSegmentData[] = [];
    for (const canvas of floorPlanData.canvases as any[]) {
      for (const wall of (canvas.walls ?? []) as any[]) {
        walls.push({
          id: wall.id,
          startX: wall.startX,
          startY: wall.startY,
          endX: wall.endX,
          endY: wall.endY,
          thickness: wall.thickness ?? 150,
          wallType: wall.wallType ?? 'interior',
          roomId: wall.roomId ?? null,
          openings: ((wall.openings ?? []) as any[]).map((o: any) => ({
            id: o.id,
            openingType: o.openingType,
            subType: o.subType ?? null,
            offsetFromStart: o.offsetFromStart,
            width: o.width,
            height: o.height,
            sillHeight: o.sillHeight ?? 0,
          })),
        });
      }
    }
    return walls;
  }, [floorPlanData]);

  // ── Wall outlines for AR scene ────────────────────────────────────
  const wallOutlines: WallOutlineData[] = useMemo(() => {
    return wallSegments.map(w => ({
      startX: w.startX,
      startY: w.startY,
      endX: w.endX,
      endY: w.endY,
      thickness: w.thickness,
      roomId: w.roomId,
    }));
  }, [wallSegments]);

  // ── Space plans ──────────────────────────────────────────────────
  const spacePlans: SpacePlanData[] = useMemo(() => {
    if (!floorPlanData?.spacePlans) return [];
    return (floorPlanData.spacePlans as any[]).map((sp: any) => ({
      roomId: sp.roomId,
      furniturePlacements: sp.furniturePlacements ?? null,
    }));
  }, [floorPlanData]);

  // ── Current room context for AR ──────────────────────────────────
  const currentRoomContext: RoomContextData | null = useMemo(() => {
    return enrichedRooms.find(r => r.id === currentRoomId) ?? null;
  }, [enrichedRooms, currentRoomId]);

  // ── Generate waypoints from rooms using actual dimensions ────────
  const waypoints: VRWaypoint[] = useMemo(() => {
    // Compute room bounds from walls
    const wallsByRoom = new Map<string, typeof wallSegments>();
    for (const w of wallSegments) {
      if (w.roomId) {
        if (!wallsByRoom.has(w.roomId)) wallsByRoom.set(w.roomId, []);
        wallsByRoom.get(w.roomId)!.push(w);
      }
    }

    const hasWalls = wallSegments.length > 0;

    // Compute scene transform (same as VR scene uses)
    let offsetX = 0, offsetZ = 0, scale = 0.01;
    if (hasWalls) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const w of wallSegments) {
        minX = Math.min(minX, w.startX, w.endX);
        maxX = Math.max(maxX, w.startX, w.endX);
        minY = Math.min(minY, w.startY, w.endY);
        maxY = Math.max(maxY, w.startY, w.endY);
      }
      offsetX = (minX + maxX) / 2;
      offsetZ = (minY + maxY) / 2;
      const maxSpan = Math.max(maxX - minX, maxY - minY, 1);
      scale = 20 / maxSpan;
    }

    return enrichedRooms.flatMap((room) => {
      const roomWalls = wallsByRoom.get(room.id);
      let cx: number, cz: number, roomW: number, roomD: number;

      if (roomWalls && roomWalls.length > 0) {
        // Use actual wall positions
        let rMinX = Infinity, rMaxX = -Infinity;
        let rMinZ = Infinity, rMaxZ = -Infinity;
        for (const w of roomWalls) {
          const sx = (w.startX - offsetX) * scale;
          const sz = (w.startY - offsetZ) * scale;
          const ex = (w.endX - offsetX) * scale;
          const ez = (w.endY - offsetZ) * scale;
          rMinX = Math.min(rMinX, sx, ex);
          rMaxX = Math.max(rMaxX, sx, ex);
          rMinZ = Math.min(rMinZ, sz, ez);
          rMaxZ = Math.max(rMaxZ, sz, ez);
        }
        cx = (rMinX + rMaxX) / 2;
        cz = (rMinZ + rMaxZ) / 2;
        roomW = rMaxX - rMinX;
        roomD = rMaxZ - rMinZ;
      } else if (hasWalls) {
        // Room exists but no walls assigned - skip
        cx = 0; cz = 0; roomW = 3; roomD = 3;
      } else {
        // Fallback layout
        const cols = Math.ceil(Math.sqrt(enrichedRooms.length));
        const idx = enrichedRooms.indexOf(room);
        const w = (room.lengthMm ?? 4000) / 1000;
        const d = (room.widthMm ?? 3000) / 1000;
        const gap = 1.0;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        cx = col * (w + gap);
        cz = row * (d + gap);
        roomW = w;
        roomD = d;
      }

      const eyeHeight = 1.6;
      return [
        {
          id: `wp_${room.id}_center`,
          name: `${room.name} - Center`,
          roomId: room.id,
          roomName: room.name,
          position: [cx, eyeHeight, cz] as [number, number, number],
          lookAt: [cx + roomW * 0.3, eyeHeight, cz - roomD * 0.3] as [number, number, number],
        },
        {
          id: `wp_${room.id}_entrance`,
          name: `${room.name} - Entrance`,
          roomId: room.id,
          roomName: room.name,
          position: [cx - roomW * 0.35, eyeHeight, cz + roomD * 0.35] as [number, number, number],
          lookAt: [cx, eyeHeight, cz] as [number, number, number],
        },
        {
          id: `wp_${room.id}_corner`,
          name: `${room.name} - Corner View`,
          roomId: room.id,
          roomName: room.name,
          position: [cx + roomW * 0.35, eyeHeight, cz + roomD * 0.35] as [number, number, number],
          lookAt: [cx - roomW * 0.2, eyeHeight * 0.6, cz - roomD * 0.2] as [number, number, number],
        },
      ];
    });
  }, [enrichedRooms, wallSegments]);

  // Available furniture for AR placement
  const arFurnitureItems = useMemo(
    () =>
      FURNITURE_CATALOGUE.slice(0, 12).map((f) => ({
        name: f.name,
        category: f.category,
        color: f.color,
      })),
    [],
  );

  // AR callbacks
  const handlePlaceItem = useCallback((item: ARPlacedItem) => {
    setPlacedItems((prev) => [...prev, item]);
    setActiveItemId(item.id);
  }, []);

  const handleConfirmItem = useCallback((itemId: string) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, confirmed: true } : item)),
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setPlacedItems((prev) => prev.filter((item) => item.id !== itemId));
    if (activeItemId === itemId) setActiveItemId(null);
  }, [activeItemId]);

  const handleScaleChange = useCallback((itemId: string, scale: number) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, scale } : item)),
    );
  }, []);

  const handleSelectItemIn3D = useCallback((itemId: string) => {
    setActiveItemId(itemId || null);
  }, []);

  // Save session
  const handleSaveSession = useCallback(() => {
    setSavingSession(true);
    const name = `${activeTab === 'ar' ? 'AR' : 'VR'} Session - ${new Date().toLocaleString()}`;
    if (loadedSessionId) {
      updateMutation.mutate({
        id: loadedSessionId,
        name,
        placedItems: placedItems,
        vrState: { currentRoomId, activeWaypointId },
      });
      setSavingSession(false);
    } else {
      saveMutation.mutate({
        projectId: id,
        name,
        mode: activeTab === 'ar' ? 'ar' : 'vr',
        placedItems: placedItems,
        vrState: { currentRoomId, activeWaypointId },
      });
    }
  }, [activeTab, placedItems, currentRoomId, activeWaypointId, id, loadedSessionId, saveMutation, updateMutation]);

  // Load session
  const handleLoadSession = useCallback((session: any) => {
    setLoadedSessionId(session.id);
    if (session.placedItems) {
      setPlacedItems(session.placedItems as ARPlacedItem[]);
    }
    if (session.vrState) {
      const vs = session.vrState as any;
      if (vs.currentRoomId) setCurrentRoomId(vs.currentRoomId);
      if (vs.activeWaypointId) setActiveWaypointId(vs.activeWaypointId);
    }
    setActiveTab(session.mode === 'vr' ? 'vr' : 'ar');
  }, []);

  // QR code URL (for sharing with mobile)
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = typeof window !== 'undefined'
      ? window.location.href
      : `https://app.openlintel.com/project/${id}/ar`;
    QRCode.toDataURL(url, {
      width: 384,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href={`/project/${id}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">AR / VR Viewer</h1>
          <p className="text-sm text-muted-foreground">
            Place furniture in AR or walk through your rooms in VR — interactive 3D preview based on your floor plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSession}
            disabled={savingSession}
          >
            {savingSession ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            {loadedSessionId ? 'Update' : 'Save'} Session
          </Button>
        </div>
      </div>

      {/* Device capability info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-5 w-5" />
            Device Capabilities
          </CardTitle>
          <CardDescription>WebXR feature detection for your current device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">AR Mode</p>
                <p className="text-xs text-muted-foreground">
                  Requires WebXR-capable mobile browser
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Glasses className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">VR Mode</p>
                <p className="text-xs text-muted-foreground">
                  Requires VR headset (Quest, Vive, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Monitor className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">3D Preview</p>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-600">Always available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floor plan data status */}
          <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
            {wallSegments.length > 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">
                  Floor plan loaded: {wallSegments.length} wall segments, {enrichedRooms.length} rooms
                  {spacePlans.length > 0 && `, ${spacePlans.length} furniture layouts`}
                </span>
              </>
            ) : enrichedRooms.length > 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground">
                  {enrichedRooms.length} rooms loaded (add walls in Floor Plan Editor for detailed 3D)
                </span>
              </>
            ) : (
              <>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  No rooms found. Add rooms to your project for 3D walkthrough.
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved sessions */}
      {savedSessions && savedSessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5" />
              Saved Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSessions.map((session: any) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${
                    loadedSessionId === session.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <button
                    className="flex items-center gap-2"
                    onClick={() => handleLoadSession(session)}
                  >
                    {session.mode === 'ar' ? (
                      <Smartphone className="h-3.5 w-3.5" />
                    ) : (
                      <Glasses className="h-3.5 w-3.5" />
                    )}
                    <span className="max-w-[180px] truncate">{session.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ id: session.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode selection tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ar" className="gap-1">
            <Smartphone className="h-4 w-4" />
            AR Placement
          </TabsTrigger>
          <TabsTrigger value="vr" className="gap-1">
            <Glasses className="h-4 w-4" />
            VR Walkthrough
          </TabsTrigger>
          <TabsTrigger value="share" className="gap-1">
            <QrCode className="h-4 w-4" />
            Share / QR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ar">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* 3D Preview area */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <ARScene3D
                    placedItems={placedItems}
                    activeItemId={activeItemId}
                    selectedItemIndex={selectedItemIndex}
                    surfaceDetected={true}
                    onSelectItem={handleSelectItemIn3D}
                    currentRoom={currentRoomContext}
                    wallOutlines={wallOutlines}
                  />
                  {/* XR overlay for native AR/VR */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="pointer-events-auto">
                      <XRViewer
                        mode={xrMode}
                        onModeChange={setXRMode}
                      >
                        <div />
                      </XRViewer>
                    </div>
                  </div>
                  {/* Item count badge */}
                  {placedItems.length > 0 && (
                    <div className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow">
                      {placedItems.length} item{placedItems.length !== 1 ? 's' : ''} placed
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* AR controls panel */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">AR Placement</CardTitle>
                  <CardDescription className="text-xs">
                    {currentRoomContext
                      ? `Placing in: ${currentRoomContext.name} (${((currentRoomContext.lengthMm ?? 4000) / 1000).toFixed(1)}m x ${((currentRoomContext.widthMm ?? 3000) / 1000).toFixed(1)}m)`
                      : 'Select furniture, place it in the 3D scene, adjust scale, and confirm.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Room selector for AR */}
                  {enrichedRooms.length > 1 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Room</p>
                      <div className="flex flex-wrap gap-1">
                        {enrichedRooms.map((room) => (
                          <button
                            key={room.id}
                            className={`rounded-md px-2 py-1 text-xs transition-colors ${
                              currentRoomId === room.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            onClick={() => setCurrentRoomId(room.id)}
                          >
                            {room.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <ARPlacement
                    items={arFurnitureItems}
                    placedItems={placedItems}
                    onPlace={handlePlaceItem}
                    onConfirm={handleConfirmItem}
                    onRemove={handleRemoveItem}
                    onScaleChange={handleScaleChange}
                    sessionActive={true}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vr">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* VR viewport */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950 dark:to-purple-950">
                  <VRScene3D
                    rooms={enrichedRooms}
                    waypoints={waypoints}
                    activeWaypointId={activeWaypointId}
                    currentRoomId={currentRoomId}
                    onRoomChange={setCurrentRoomId}
                    onTeleport={setActiveWaypointId}
                    wallSegments={wallSegments}
                    spacePlans={spacePlans}
                  />
                  {/* XR overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="pointer-events-auto">
                      <XRViewer
                        mode={xrMode}
                        onModeChange={setXRMode}
                      >
                        <div />
                      </XRViewer>
                    </div>
                  </div>
                  {/* Room info badge */}
                  {currentRoomId && (
                    <div className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow">
                      {enrichedRooms.find((r) => r.id === currentRoomId)?.name ?? 'Room'}
                      {activeWaypointId && (
                        <span className="ml-1 opacity-70">
                          &middot; {waypoints.find((w) => w.id === activeWaypointId)?.name?.split(' - ')[1]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* VR controls panel */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">VR Walkthrough</CardTitle>
                  <CardDescription className="text-xs">
                    Navigate through your floor plan. Click rooms and waypoints in the 3D scene.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VRWalkthrough
                    rooms={enrichedRooms.map((r) => ({
                      id: r.id,
                      name: r.name,
                      type: r.type,
                      lengthMm: r.lengthMm,
                      widthMm: r.widthMm,
                      heightMm: r.heightMm,
                    }))}
                    waypoints={waypoints}
                    activeWaypointId={activeWaypointId}
                    onTeleport={setActiveWaypointId}
                    onRoomChange={setCurrentRoomId}
                    currentRoomId={currentRoomId}
                    sessionActive={true}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="share">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* QR Code section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-5 w-5" />
                  Mobile AR QR Code
                </CardTitle>
                <CardDescription>
                  Scan this QR code with your phone to open the AR viewer directly on your
                  mobile device.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  {/* QR code */}
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code for AR viewer"
                      className="h-48 w-48 rounded-lg"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                      <div className="text-center">
                        <QrCode className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Generating...</p>
                      </div>
                    </div>
                  )}

                  <div className="w-full rounded-lg bg-muted p-3">
                    <p className="break-all text-xs font-mono text-muted-foreground">
                      {currentUrl || `https://app.openlintel.com/project/${id}/ar`}
                    </p>
                  </div>

                  <div className="flex w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          currentUrl || `https://app.openlintel.com/project/${id}/ar`,
                        );
                      }}
                    >
                      Copy Link
                    </Button>
                    {qrDataUrl && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = qrDataUrl;
                          a.download = `qr-project-${id.slice(0, 8)}.png`;
                          a.click();
                        }}
                      >
                        Download QR
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-5 w-5" />
                  How to Use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <Monitor className="h-4 w-4" />
                      3D Preview (Desktop)
                    </h3>
                    <ol className="ml-6 mt-2 list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Select the AR Placement or VR Walkthrough tab</li>
                      <li>Interact with the 3D scene using orbit controls (click + drag to rotate, scroll to zoom)</li>
                      <li>Place furniture items from the sidebar panel</li>
                      <li>Adjust scale and confirm placement</li>
                      <li>Save your session to preserve your layout</li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4" />
                      AR Mode (Mobile)
                    </h3>
                    <ol className="ml-6 mt-2 list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Open the link on your mobile device (Chrome/Safari)</li>
                      <li>Grant camera permissions when prompted</li>
                      <li>Point your camera at a flat surface (floor, table)</li>
                      <li>Wait for surface detection (you will see a marker)</li>
                      <li>Tap to place furniture items</li>
                      <li>Pinch to resize, drag to reposition</li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <Glasses className="h-4 w-4" />
                      VR Mode (Headset)
                    </h3>
                    <ol className="ml-6 mt-2 list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Connect your VR headset (Quest, Vive, etc.)</li>
                      <li>Open the link in the headset browser</li>
                      <li>Click &quot;Enter VR&quot; to start the experience</li>
                      <li>Use controllers to teleport between rooms</li>
                      <li>Look around to explore your design</li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium">Supported Devices</h3>
                    <div className="mt-2 space-y-1">
                      {[
                        { name: 'Meta Quest 2/3/Pro', supported: true },
                        { name: 'Apple Vision Pro', supported: true },
                        { name: 'HTC Vive', supported: true },
                        { name: 'Android (Chrome)', supported: true },
                        { name: 'iOS Safari (AR Quick Look)', supported: true },
                        { name: 'Desktop browsers', supported: true, note: '3D preview mode' },
                      ].map((device) => (
                        <div key={device.name} className="flex items-center gap-2 text-xs">
                          {device.supported ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={device.supported ? '' : 'text-muted-foreground'}>
                            {device.name}
                          </span>
                          {device.note && (
                            <span className="text-[10px] text-muted-foreground">
                              ({device.note})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
