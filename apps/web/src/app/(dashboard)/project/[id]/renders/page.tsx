'use client';

import { use, useState } from 'react';
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
  const [roomId, setRoomId] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('afternoon');
  const [quality, setQuality] = useState('standard');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('1920x1080');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: renders = [], isLoading } = trpc.render.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createRender = trpc.render.create.useMutation({
    onSuccess: () => {
      utils.render.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Render queued', description: 'Your render has been added to the queue.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create render', description: err.message, variant: 'destructive' });
    },
  });

  const retryRender = trpc.render.retry.useMutation({
    onSuccess: () => {
      utils.render.list.invalidate();
      toast({ title: 'Render requeued' });
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
    setRoomId('');
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
      roomId: roomId || undefined,
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
              Queue ray-traced renders, 360 panoramas, and video walkthroughs.
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
              <DialogTitle>Queue New Render</DialogTitle>
              <DialogDescription>
                Configure render settings for photorealistic output.
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
                      <SelectItem value="">Full house</SelectItem>
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
                <Label htmlFor="renderDesc">Description</Label>
                <Textarea
                  id="renderDesc"
                  placeholder="Camera angle, special lighting, elements to highlight..."
                  rows={2}
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
                    Queueing...
                  </>
                ) : (
                  'Queue Render'
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
              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
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
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/30" />
                  ) : (
                    <Camera className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <Badge className={`absolute top-2 right-2 text-[10px] ${STATUS_COLORS[render.status] || ''}`}>
                    {render.status}
                  </Badge>
                  {render.renderType === 'video_walkthrough' && (
                    <div className="absolute top-2 left-2">
                      <Badge className="text-[10px] bg-purple-100 text-purple-800">
                        <Video className="mr-1 h-2.5 w-2.5" />
                        Video
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{render.name}</CardTitle>
                  <CardDescription>
                    {render.renderType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    {' '}&middot; {render.resolution}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <TimeIcon className="h-3 w-3" />
                      {render.timeOfDay}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                      {render.quality}
                    </div>
                  </div>
                  {render.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{render.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {render.status === 'completed' && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download
                        </Button>
                      </>
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
            Queue photorealistic renders with ray-tracing, 360 panoramas, and video walkthroughs.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Render
          </Button>
        </Card>
      )}
    </div>
  );
}
