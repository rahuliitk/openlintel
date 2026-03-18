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
  Progress,
  toast,
} from '@openlintel/ui';
import {
  Scan,
  Plus,
  Loader2,
  Upload,
  Eye,
  Download,
  Trash2,
  Box,
  Layers,
  RotateCcw,
  FileUp,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SCAN_TYPES = [
  { value: 'interior', label: 'Interior Scan' },
  { value: 'exterior', label: 'Exterior Scan' },
  { value: 'site', label: 'Full Site Scan' },
  { value: 'room', label: 'Room-by-Room Scan' },
  { value: 'facade', label: 'Facade Detail' },
  { value: 'structural', label: 'Structural Survey' },
] as const;

const FILE_FORMATS = [
  { value: 'e57', label: '.E57' },
  { value: 'las', label: '.LAS / .LAZ' },
  { value: 'ply', label: '.PLY' },
  { value: 'pts', label: '.PTS' },
  { value: 'rcp', label: '.RCP (ReCap)' },
  { value: 'xyz', label: '.XYZ' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  uploaded: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  registered: 'bg-indigo-100 text-indigo-800',
  meshed: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function LidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [scanType, setScanType] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [scanDate, setScanDate] = useState('');
  const [scanner, setScanner] = useState('');
  const [notes, setNotes] = useState('');

  const { data: scans = [], isLoading } = trpc.lidar.listScans.useQuery({ projectId });

  const createScan = trpc.lidar.createScan.useMutation({
    onSuccess: () => {
      utils.lidar.listScans.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Scan record created', description: 'Upload your point cloud data to begin processing.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create scan', description: err.message, variant: 'destructive' });
    },
  });

  const processScan = trpc.lidar.processScan.useMutation({
    onSuccess: () => {
      utils.lidar.listScans.invalidate({ projectId });
      toast({ title: 'Processing started', description: 'Point cloud registration and meshing in progress.' });
    },
  });

  const deleteScan = trpc.lidar.deleteScan.useMutation({
    onSuccess: () => {
      utils.lidar.listScans.invalidate({ projectId });
      toast({ title: 'Scan deleted' });
    },
  });

  function resetForm() {
    setName('');
    setScanType('');
    setFileFormat('');
    setScanDate('');
    setScanner('');
    setNotes('');
  }

  function handleCreate() {
    if (!name || !scanType) return;
    createScan.mutate({
      projectId,
      name,
      scanType,
      fileFormat: fileFormat || undefined,
      scanDate: scanDate || undefined,
      scanner: scanner || undefined,
      notes: notes || undefined,
    });
  }

  const totalPoints = scans.reduce((sum: number, s: any) => sum + (s.pointCount || 0), 0);
  const completedCount = scans.filter((s: any) => s.status === 'completed').length;

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
          <Scan className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LiDAR Scan Import</h1>
            <p className="text-sm text-muted-foreground">
              Import, register, and view LiDAR point cloud scans for as-built documentation.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Import Scan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import LiDAR Scan</DialogTitle>
              <DialogDescription>Add a new point cloud scan record to the project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scan Name</Label>
                <Input id="name" placeholder="e.g. First Floor Interior - March 2026" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scan Type</Label>
                  <Select value={scanType} onValueChange={setScanType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {SCAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File Format</Label>
                  <Select value={fileFormat} onValueChange={setFileFormat}>
                    <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                    <SelectContent>
                      {FILE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scanDate">Scan Date</Label>
                  <Input id="scanDate" type="date" value={scanDate} onChange={(e) => setScanDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scanner">Scanner Model</Label>
                  <Input id="scanner" placeholder="e.g. Leica BLK360" value={scanner} onChange={(e) => setScanner(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Scan conditions, coverage areas..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createScan.isPending || !name || !scanType}>
                {createScan.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create & Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {scans.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-bold">{scans.length}</p>
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
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold">{totalPoints > 1e6 ? `${(totalPoints / 1e6).toFixed(1)}M` : totalPoints.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Data Size</p>
              <p className="text-2xl font-bold">{formatFileSize(scans.reduce((sum: number, s: any) => sum + (s.fileSize || 0), 0))}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scans Grid */}
      {scans.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scans.map((scan: any) => (
            <Card key={scan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{scan.name}</CardTitle>
                    <CardDescription>
                      {scan.scanType?.replace(/_/g, ' ')}
                      {scan.scanner && <span> &middot; {scan.scanner}</span>}
                    </CardDescription>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[scan.status] || ''}`}>{scan.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 3D preview placeholder */}
                <div className="h-32 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Box className="h-10 w-10 text-muted-foreground" />
                </div>

                {scan.status === 'processing' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Processing</span>
                      <span className="font-medium">{scan.progress || 0}%</span>
                    </div>
                    <Progress value={scan.progress || 0} className="h-2" />
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {scan.scanDate && <div className="flex justify-between"><span className="text-muted-foreground">Scan Date</span><span>{formatDate(scan.scanDate)}</span></div>}
                  {scan.pointCount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Points</span><span>{scan.pointCount > 1e6 ? `${(scan.pointCount / 1e6).toFixed(1)}M` : scan.pointCount.toLocaleString()}</span></div>}
                  {scan.fileSize > 0 && <div className="flex justify-between"><span className="text-muted-foreground">File Size</span><span>{formatFileSize(scan.fileSize)}</span></div>}
                  {scan.fileFormat && <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span>{scan.fileFormat.toUpperCase()}</span></div>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {scan.status === 'completed' && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 text-xs"><Eye className="mr-1 h-3.5 w-3.5" /> View 3D</Button>
                      <Button variant="outline" size="sm" className="text-xs"><Download className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  {scan.status === 'uploaded' && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => processScan.mutate({ id: scan.id })} disabled={processScan.isPending}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Process
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteScan.mutate({ id: scan.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Scan className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No LiDAR Scans</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import LiDAR point cloud data to create accurate as-built documentation and 3D models.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <FileUp className="mr-1 h-4 w-4" />
            Import Scan
          </Button>
        </Card>
      )}
    </div>
  );
}
