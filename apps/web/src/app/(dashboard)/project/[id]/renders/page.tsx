'use client';

import { use, useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  Textarea,
  toast,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@openlintel/ui';
import {
  Camera,
  Plus,
  Loader2,
  Sun,
  Moon,
  Sunset,
  Clock,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Image,
  Video,
  X,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const RENDER_TYPES = [
  { value: 'still', label: 'Still Image' },
  { value: 'panorama_360', label: '360 Panorama' },
  { value: 'video_walkthrough', label: 'Video Walkthrough' },
  { value: 'before_after', label: 'Before & After' },
] as const;

const TIME_OF_DAY = [
  { value: 'morning', label: 'Morning', icon: Sun },
  { value: 'afternoon', label: 'Afternoon', icon: Sun },
  { value: 'sunset', label: 'Sunset', icon: Sunset },
  { value: 'night', label: 'Night', icon: Moon },
] as const;

const QUALITY_LEVELS = [
  { value: 'preview', label: 'Preview (fast)' },
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High Quality' },
  { value: 'ultra', label: 'Ultra (ray-traced)' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-800',
  rendering: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function RendersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [renderName, setRenderName] = useState('');
  const [renderType, setRenderType] = useState('still');
  const [roomId, setRoomId] = useState('__all__');
  const [timeOfDay, setTimeOfDay] = useState('afternoon');
  const [quality, setQuality] = useState('standard');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('1920x1080');
  const [previewRender, setPreviewRender] = useState<any | null>(null);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [beforeAfterMode, setBeforeAfterMode] = useState<'before' | 'after'>('after');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: renders = [], isLoading } = trpc.render.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });

  /* ── Auto-refresh while renders are in progress ────────────── */
  const hasActiveRenders = renders.some((r: any) => r.status === 'rendering' || r.status === 'queued');
  useEffect(() => {
    if (!hasActiveRenders) return;
    const interval = setInterval(() => {
      utils.render.list.invalidate();
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActiveRenders, utils.render.list]);

  /* ── Mutations ────────────────────────────────────────────── */
  const createRender = trpc.render.create.useMutation({
    onSuccess: () => {
      utils.render.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Render started', description: 'AI is generating your photorealistic render.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create render', description: err.message, variant: 'destructive' });
    },
  });

  const retryRender = trpc.render.retry.useMutation({
    onSuccess: () => {
      utils.render.list.invalidate();
      toast({ title: 'Render restarted', description: 'Retrying image generation.' });
    },
    onError: (err) => {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteRender = trpc.render.delete.useMutation({
    onSuccess: () => {
      utils.render.list.invalidate();
      toast({ title: 'Render deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setRenderName('');
    setRenderType('still');
    setRoomId('__all__');
    setTimeOfDay('afternoon');
    setQuality('standard');
    setDescription('');
    setResolution('1920x1080');
  }

  function handleCreate() {
    if (!renderName) return;
    createRender.mutate({
      projectId,
      name: renderName,
      renderType,
      roomId: roomId && roomId !== '__all__' ? roomId : undefined,
      timeOfDay,
      quality,
      resolution,
      description: description || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalRenders = renders.length;
  const completedCount = renders.filter((r: any) => r.status === 'completed').length;
  const renderingCount = renders.filter((r: any) => r.status === 'rendering').length;
  const queuedCount = renders.filter((r: any) => r.status === 'queued').length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Photorealistic Renders</h1>
            <p className="text-sm text-muted-foreground">
              Generate AI-powered photorealistic renders of your design.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Render
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate New Render</DialogTitle>
              <DialogDescription>
                Describe the scene and AI will generate a photorealistic render.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="renderName">Render Name</Label>
                <Input
                  id="renderName"
                  placeholder="e.g. Living Room - Afternoon Light"
                  value={renderName}
                  onChange={(e) => setRenderName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Render Type</Label>
                  <Select value={renderType} onValueChange={setRenderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RENDER_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Full house</SelectItem>
                      {rooms.map((room: any) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Time of Day</Label>
                  <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OF_DAY.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_LEVELS.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution</Label>
                  <Input
                    id="resolution"
                    placeholder="1920x1080"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renderDesc">Scene Description</Label>
                <Textarea
                  id="renderDesc"
                  placeholder="Describe the scene: camera angle, furniture style, special lighting, elements to highlight..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createRender.isPending || !renderName}>
                {createRender.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Generate Render'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Renders</p>
                <p className="text-2xl font-bold">{totalRenders}</p>
              </div>
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
              <Image className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rendering</p>
                <p className="text-2xl font-bold text-blue-600">{renderingCount}</p>
              </div>
              <RefreshCw className={`h-8 w-8 text-blue-400 ${renderingCount > 0 ? 'animate-spin' : ''}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queued</p>
                <p className="text-2xl font-bold text-gray-600">{queuedCount}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Render Cards ────────────────────────────────────── */}
      {renders.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {renders.map((render: any) => {
            const TimeIcon = TIME_OF_DAY.find((t) => t.value === render.timeOfDay)?.icon || Sun;
            return (
              <Card key={render.id} className="relative overflow-hidden">
                {/* Preview area */}
                <div className="relative h-44 bg-gradient-to-br from-slate-100 to-sky-50 flex items-center justify-center">
                  {render.outputUrl ? (
                    <img src={render.outputUrl} alt={render.name} className="h-full w-full object-cover" />
                  ) : render.status === 'rendering' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                      <span className="text-xs text-muted-foreground">
                        {render.renderType === 'video_walkthrough'
                          ? `Generating frames (${(render.cameraPosition as any)?.frames?.length ?? 0}/4)...`
                          : render.renderType === 'before_after'
                          ? 'Generating before & after...'
                          : 'AI is generating...'}
                      </span>
                    </div>
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <Badge className={`absolute top-2 right-2 text-[10px] ${STATUS_COLORS[render.status] || ''}`}>
                    {render.status}
                  </Badge>
                  <div className="absolute top-2 left-2 flex gap-1">
                    {render.renderType === 'video_walkthrough' && (
                      <Badge className="text-[10px] bg-purple-100 text-purple-800">
                        <Video className="mr-1 h-2.5 w-2.5" />
                        {(render.cameraPosition as any)?.frames?.length ?? 0} frames
                      </Badge>
                    )}
                    {render.renderType === 'panorama_360' && (
                      <Badge className="text-[10px] bg-indigo-100 text-indigo-800">
                        360°
                      </Badge>
                    )}
                    {render.renderType === 'before_after' && (
                      <Badge className="text-[10px] bg-orange-100 text-orange-800">
                        Before & After
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{render.name || 'Untitled Render'}</CardTitle>
                  <CardDescription>
                    {render.renderType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    {' '}&middot; {render.resolution}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <TimeIcon className="h-3 w-3" />
                      {render.timeOfDay || 'afternoon'}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                      {render.quality || 'standard'}
                    </div>
                  </div>
                  {render.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{render.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {render.status === 'completed' && render.outputUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => { setPreviewRender(render); setPreviewFrame(0); setBeforeAfterMode('after'); }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = render.outputUrl;
                            a.target = '_blank';
                            a.download = `${(render.name || 'render').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                            a.click();
                          }}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {render.status === 'rendering' && (
                      <Button variant="outline" size="sm" className="flex-1" disabled>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </Button>
                    )}
                    {render.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => retryRender.mutate({ id: render.id })}
                        disabled={retryRender.isPending}
                      >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteRender.mutate({ id: render.id })}
                      disabled={deleteRender.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Renders</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate AI-powered photorealistic renders of your rooms and spaces.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Render
          </Button>
        </Card>
      )}

      {/* ── Full-screen Preview Dialog ─────────────────────── */}
      {previewRender && (
        <Dialog open={!!previewRender} onOpenChange={() => setPreviewRender(null)}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setPreviewRender(null)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* ── Video Walkthrough: frame navigator ── */}
              {previewRender.renderType === 'video_walkthrough' && (previewRender.cameraPosition as any)?.frames ? (() => {
                const frames = (previewRender.cameraPosition as any).frames as string[];
                const labels = ['Entry View', 'Center View', 'Far Corner', 'Detail Close-up'];
                return (
                  <div>
                    <img src={frames[previewFrame] || previewRender.outputUrl} alt={`Frame ${previewFrame + 1}`} className="w-full h-auto" />
                    <div className="flex items-center gap-2 p-4 bg-black/90">
                      {frames.map((_: string, i: number) => (
                        <Button
                          key={i}
                          variant={previewFrame === i ? 'default' : 'outline'}
                          size="sm"
                          className={previewFrame === i ? '' : 'text-white border-white/30 hover:bg-white/10'}
                          onClick={() => setPreviewFrame(i)}
                        >
                          {labels[i] || `Frame ${i + 1}`}
                        </Button>
                      ))}
                      <span className="ml-auto text-xs text-white/60">
                        {previewFrame + 1} / {frames.length} frames
                      </span>
                    </div>
                  </div>
                );
              })()

              /* ── Before & After: toggle ── */
              : previewRender.renderType === 'before_after' && (previewRender.cameraPosition as any)?.beforeUrl ? (() => {
                const { beforeUrl, afterUrl } = previewRender.cameraPosition as any;
                return (
                  <div>
                    <img
                      src={beforeAfterMode === 'before' ? beforeUrl : afterUrl}
                      alt={beforeAfterMode === 'before' ? 'Before renovation' : 'After renovation'}
                      className="w-full h-auto"
                    />
                    <div className="flex items-center gap-2 p-4 bg-black/90">
                      <Button
                        variant={beforeAfterMode === 'before' ? 'default' : 'outline'}
                        size="sm"
                        className={beforeAfterMode === 'before' ? 'bg-red-600 hover:bg-red-700' : 'text-white border-white/30 hover:bg-white/10'}
                        onClick={() => setBeforeAfterMode('before')}
                      >
                        Before
                      </Button>
                      <Button
                        variant={beforeAfterMode === 'after' ? 'default' : 'outline'}
                        size="sm"
                        className={beforeAfterMode === 'after' ? 'bg-green-600 hover:bg-green-700' : 'text-white border-white/30 hover:bg-white/10'}
                        onClick={() => setBeforeAfterMode('after')}
                      >
                        After
                      </Button>
                      <span className="ml-auto text-xs text-white/60">
                        {beforeAfterMode === 'before' ? 'Before Renovation' : 'After Renovation'}
                      </span>
                    </div>
                  </div>
                );
              })()

              /* ── Still / Panorama: single image ── */
              : (
                <div>
                  <img src={previewRender.outputUrl} alt="Render preview" className="w-full h-auto" />
                  {previewRender.renderType === 'panorama_360' && (
                    <div className="p-3 bg-black/90 text-center">
                      <span className="text-xs text-white/60">360° Equirectangular Panorama — use with a panorama viewer for immersive experience</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
