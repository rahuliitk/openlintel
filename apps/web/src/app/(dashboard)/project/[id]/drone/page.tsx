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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  toast,
} from '@openlintel/ui';
import {
  Plane,
  Plus,
  Loader2,
  Upload,
  Camera,
  Video,
  Map,
  Calendar,
  Download,
  Eye,
  Trash2,
  CloudUpload,
  Image,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const CAPTURE_TYPES = [
  { value: 'photo_survey', label: 'Photo Survey' },
  { value: 'video_flyover', label: 'Video Flyover' },
  { value: 'orthomosaic', label: 'Orthomosaic Map' },
  { value: '3d_model', label: '3D Reconstruction' },
  { value: 'thermal', label: 'Thermal Imaging' },
  { value: 'progress_tracking', label: 'Progress Tracking' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function DronePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [captureType, setCaptureType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [altitude, setAltitude] = useState('100');
  const [overlap, setOverlap] = useState('75');
  const [notes, setNotes] = useState('');

  const { data: captures = [], isLoading } = trpc.drone.listCaptures.useQuery({ projectId });

  const createCapture = trpc.drone.createCapture.useMutation({
    onSuccess: () => {
      utils.drone.listCaptures.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Drone capture scheduled' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create capture', description: err.message, variant: 'destructive' });
    },
  });

  const processCapture = trpc.drone.processCapture.useMutation({
    onSuccess: () => {
      utils.drone.listCaptures.invalidate({ projectId });
      toast({ title: 'Processing started', description: 'Drone data is being processed.' });
    },
  });

  const deleteCapture = trpc.drone.deleteCapture.useMutation({
    onSuccess: () => {
      utils.drone.listCaptures.invalidate({ projectId });
      toast({ title: 'Capture deleted' });
    },
  });

  function resetForm() {
    setName('');
    setCaptureType('');
    setScheduledDate('');
    setAltitude('100');
    setOverlap('75');
    setNotes('');
  }

  function handleCreate() {
    if (!name || !captureType) return;
    createCapture.mutate({
      projectId,
      name,
      captureType,
      scheduledDate: scheduledDate || undefined,
      altitude: parseInt(altitude) || 100,
      overlap: parseInt(overlap) || 75,
      notes: notes || undefined,
    });
  }

  function getCaptureIcon(type: string) {
    switch (type) {
      case 'photo_survey': return <Camera className="h-4 w-4" />;
      case 'video_flyover': return <Video className="h-4 w-4" />;
      case 'orthomosaic': return <Map className="h-4 w-4" />;
      case 'thermal': return <Image className="h-4 w-4" />;
      default: return <Plane className="h-4 w-4" />;
    }
  }

  const completedCount = captures.filter((c: any) => c.status === 'completed').length;
  const processingCount = captures.filter((c: any) => c.status === 'processing').length;
  const totalImages = captures.reduce((sum: number, c: any) => sum + (c.imageCount || 0), 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Drone Capture</h1>
            <p className="text-sm text-muted-foreground">
              Schedule drone flights, process aerial data, and generate site models.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Capture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Drone Capture</DialogTitle>
              <DialogDescription>Plan a drone flight for site documentation or modeling.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Capture Name</Label>
                <Input id="name" placeholder="e.g. Foundation Progress - Week 4" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capture Type</Label>
                  <Select value={captureType} onValueChange={setCaptureType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {CAPTURE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedDate">Scheduled Date</Label>
                  <Input id="schedDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="altitude">Altitude (ft)</Label>
                  <Input id="altitude" type="number" placeholder="100" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overlap">Image Overlap (%)</Label>
                  <Input id="overlap" type="number" placeholder="75" value={overlap} onChange={(e) => setOverlap(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Flight Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Special instructions, no-fly zones..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCapture.isPending || !name || !captureType}>
                {createCapture.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Scheduling...</> : 'Schedule Capture'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {captures.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Captures</p>
              <p className="text-2xl font-bold">{captures.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-yellow-600">{processingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Images</p>
              <p className="text-2xl font-bold">{totalImages.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Captures Grid */}
      {captures.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {captures.map((capture: any) => (
            <Card key={capture.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCaptureIcon(capture.captureType)}
                    <div>
                      <CardTitle className="text-base">{capture.name}</CardTitle>
                      <CardDescription>{capture.captureType?.replace(/_/g, ' ')}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[capture.status] || ''}`}>{capture.status?.replace(/_/g, ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Preview placeholder */}
                <div className="h-28 rounded-lg bg-muted flex items-center justify-center">
                  {capture.thumbnailUrl ? (
                    <img src={capture.thumbnailUrl} alt={capture.name} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <CloudUpload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {capture.scheduledDate && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{formatDate(capture.scheduledDate)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Altitude</span><span>{capture.altitude || 100} ft</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Overlap</span><span>{capture.overlap || 75}%</span></div>
                  {capture.imageCount > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Images</span><span>{capture.imageCount}</span></div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {capture.status === 'completed' && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {capture.status === 'in_progress' && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => processCapture.mutate({ id: capture.id })} disabled={processCapture.isPending}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> Process Data
                    </Button>
                  )}
                  {capture.status === 'planned' && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <Upload className="mr-1 h-3.5 w-3.5" /> Upload Data
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCapture.mutate({ id: capture.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Plane className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Drone Captures</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Schedule drone flights to capture aerial photography, create orthomosaics, or generate 3D site models.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Capture
          </Button>
        </Card>
      )}
    </div>
  );
}
