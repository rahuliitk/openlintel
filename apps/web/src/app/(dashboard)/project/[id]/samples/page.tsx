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
  Palette,
  Plus,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Trash2,
  Star,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const MATERIAL_CATEGORIES = [
  { value: 'tile', label: 'Tile & Stone' },
  { value: 'hardwood', label: 'Hardwood Flooring' },
  { value: 'laminate', label: 'Laminate / LVP' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'countertop', label: 'Countertop' },
  { value: 'cabinet', label: 'Cabinet Door' },
  { value: 'paint', label: 'Paint' },
  { value: 'wallpaper', label: 'Wallpaper' },
  { value: 'fabric', label: 'Fabric / Upholstery' },
  { value: 'hardware', label: 'Hardware / Fixtures' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'siding', label: 'Siding' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-800',
  ordered: 'bg-blue-100 text-blue-800',
  shipped: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  reviewed: 'bg-purple-100 text-purple-800',
  returned: 'bg-red-100 text-red-800',
};

const DECISION_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SamplesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [color, setColor] = useState('');
  const [sku, setSku] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  const { data: samples = [], isLoading } = trpc.samples.list.useQuery({ projectId });

  const requestSample = trpc.samples.request.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Sample requested' });
    },
    onError: (err) => {
      toast({ title: 'Failed to request sample', description: err.message, variant: 'destructive' });
    },
  });

  const updateDecision = trpc.samples.updateDecision.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate({ projectId });
      toast({ title: 'Decision recorded' });
    },
  });

  const deleteSample = trpc.samples.delete.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate({ projectId });
      toast({ title: 'Sample removed' });
    },
  });

  function resetForm() {
    setMaterialName('');
    setCategory('');
    setSupplier('');
    setColor('');
    setSku('');
    setRoom('');
    setNotes('');
  }

  function handleRequest() {
    if (!materialName || !category) return;
    requestSample.mutate({
      projectId,
      name: materialName,
      category,
      supplier: supplier || undefined,
      color: color || undefined,
      sku: sku || undefined,
      room: room || undefined,
      notes: notes || undefined,
    });
  }

  const approvedCount = samples.filter((s: any) => s.decision === 'approved').length;
  const pendingCount = samples.filter((s: any) => !s.decision || s.decision === 'pending').length;

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
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material Samples</h1>
            <p className="text-sm text-muted-foreground">
              Request, track, and review physical material samples for finish selections.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Request Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Material Sample</DialogTitle>
              <DialogDescription>Request a physical sample from a supplier for review.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matName">Material Name</Label>
                  <Input id="matName" placeholder="e.g. Carrara Marble 12x24" value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" placeholder="e.g. Daltile" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color / Finish</Label>
                  <Input id="color" placeholder="e.g. Bianco Polished" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Model</Label>
                  <Input id="sku" placeholder="e.g. DAL-CM1224" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">For Room</Label>
                  <Input id="room" placeholder="e.g. Master Bath" value={room} onChange={(e) => setRoom(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Specific requirements..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRequest} disabled={requestSample.isPending || !materialName || !category}>
                {requestSample.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Requesting...</> : 'Request Sample'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {samples.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Samples</p><p className="text-2xl font-bold">{samples.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approvedCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></CardContent></Card>
        </div>
      )}

      {/* Samples Grid */}
      {samples.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample: any) => (
            <Card key={sample.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{sample.name}</CardTitle>
                    <CardDescription>
                      {sample.category?.replace(/_/g, ' ')}
                      {sample.supplier && <span> &middot; {sample.supplier}</span>}
                    </CardDescription>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[sample.status] || ''}`}>{sample.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Color swatch placeholder */}
                <div className="h-20 rounded-lg bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center">
                  <Palette className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {sample.color && <div className="flex justify-between"><span className="text-muted-foreground">Color</span><span>{sample.color}</span></div>}
                  {sample.sku && <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span className="font-mono">{sample.sku}</span></div>}
                  {sample.room && <div className="flex justify-between"><span className="text-muted-foreground">For</span><span>{sample.room}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span>{formatDate(sample.createdAt)}</span></div>
                </div>

                {sample.decision && (
                  <Badge className={`text-[10px] ${DECISION_COLORS[sample.decision] || ''}`}>
                    {sample.decision === 'approved' && <ThumbsUp className="mr-1 h-3 w-3" />}
                    {sample.decision === 'rejected' && <ThumbsDown className="mr-1 h-3 w-3" />}
                    {sample.decision}
                  </Badge>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {(!sample.decision || sample.decision === 'pending') && sample.status === 'delivered' && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 text-xs border-green-200 text-green-700" onClick={() => updateDecision.mutate({ id: sample.id, decision: 'approved' })}>
                        <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs border-red-200 text-red-700" onClick={() => updateDecision.mutate({ id: sample.id, decision: 'rejected' })}>
                        <ThumbsDown className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSample.mutate({ id: sample.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Material Samples</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Request physical material samples to review finishes, colors, and textures before making selections.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Request Sample
          </Button>
        </Card>
      )}
    </div>
  );
}
