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
  ClipboardList,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  RotateCcw,
  Trash2,
  Stamp,
  FileText,
  CalendarDays,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SPEC_DIVISIONS = [
  { value: '03', label: 'Div 03 - Concrete' },
  { value: '04', label: 'Div 04 - Masonry' },
  { value: '05', label: 'Div 05 - Metals' },
  { value: '06', label: 'Div 06 - Wood/Plastics' },
  { value: '07', label: 'Div 07 - Thermal/Moisture' },
  { value: '08', label: 'Div 08 - Openings' },
  { value: '09', label: 'Div 09 - Finishes' },
  { value: '10', label: 'Div 10 - Specialties' },
  { value: '22', label: 'Div 22 - Plumbing' },
  { value: '23', label: 'Div 23 - HVAC' },
  { value: '26', label: 'Div 26 - Electrical' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  approved_as_noted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  revise_resubmit: 'bg-yellow-100 text-yellow-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  approved_as_noted: 'Approved as Noted',
  rejected: 'Rejected',
  revise_resubmit: 'Revise & Resubmit',
};

type StatusFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'revise_resubmit';

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SubmittalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [specDivision, setSpecDivision] = useState('09');
  const [contractor, setContractor] = useState('');
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [description, setDescription] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: submittals = [], isLoading } = trpc.submittal.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createSubmittal = trpc.submittal.create.useMutation({
    onSuccess: () => {
      utils.submittal.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Submittal created', description: 'Submittal has been logged for review.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create submittal', description: err.message, variant: 'destructive' });
    },
  });

  const reviewSubmittal = trpc.submittal.review.useMutation({
    onSuccess: () => {
      utils.submittal.list.invalidate();
      toast({ title: 'Submittal reviewed' });
    },
    onError: (err) => {
      toast({ title: 'Review failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteSubmittal = trpc.submittal.delete.useMutation({
    onSuccess: () => {
      utils.submittal.list.invalidate();
      toast({ title: 'Submittal deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setTitle('');
    setSpecDivision('09');
    setContractor('');
    setProductName('');
    setManufacturer('');
    setDescription('');
  }

  function handleCreate() {
    if (!title || !productName) return;
    createSubmittal.mutate({
      projectId,
      title,
      specDivision,
      contractor: contractor || undefined,
      productName,
      manufacturer: manufacturer || undefined,
      description: description || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const filtered = statusFilter === 'all'
    ? submittals
    : submittals.filter((s: any) => s.status === statusFilter);

  const totalCount = submittals.length;
  const pendingCount = submittals.filter((s: any) => s.status === 'pending' || s.status === 'under_review').length;
  const approvedCount = submittals.filter((s: any) => s.status === 'approved' || s.status === 'approved_as_noted').length;
  const actionCount = submittals.filter((s: any) => s.status === 'rejected' || s.status === 'revise_resubmit').length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submittal Management</h1>
            <p className="text-sm text-muted-foreground">
              Track contractor submittals, review approvals, and manage product specifications.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Submittal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Submittal</DialogTitle>
              <DialogDescription>
                Log a contractor material or product submittal for architect approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subTitle">Submittal Title</Label>
                <Input
                  id="subTitle"
                  placeholder="e.g. Kitchen Backsplash Tile"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spec Division</Label>
                  <Select value={specDivision} onValueChange={setSpecDivision}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEC_DIVISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subContractor">Contractor</Label>
                  <Input
                    id="subContractor"
                    placeholder="e.g. ABC Tile Co."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    placeholder="e.g. Daltile Keystones"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfg">Manufacturer</Label>
                  <Input
                    id="mfg"
                    placeholder="e.g. Daltile"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subDesc">Description</Label>
                <Textarea
                  id="subDesc"
                  placeholder="Product details, color, size, finish..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createSubmittal.isPending || !title || !productName}>
                {createSubmittal.isPending ? (
                  <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  'Create Submittal'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{totalCount}</p></div><ClipboardList className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-blue-600">{pendingCount}</p></div><Clock className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approvedCount}</p></div><CheckCircle2 className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Action Needed</p><p className="text-2xl font-bold text-red-600">{actionCount}</p></div><RotateCcw className="h-8 w-8 text-red-400" /></div></CardContent></Card>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {(['all', 'pending', 'under_review', 'approved', 'rejected', 'revise_resubmit'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {/* ── Submittal Cards ─────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sub: any) => (
            <Card key={sub.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{sub.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {sub.submittalNumber && <span className="font-mono">{sub.submittalNumber} &middot; </span>}
                      {SPEC_DIVISIONS.find((d) => d.value === sub.specDivision)?.label || `Div ${sub.specDivision}`}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[sub.status] || ''}`}>
                    {STATUS_LABELS[sub.status] || sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{sub.productName}</span>
                  </div>
                  {sub.manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer</span>
                      <span className="font-medium">{sub.manufacturer}</span>
                    </div>
                  )}
                  {sub.contractor && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contractor</span>
                      <span className="font-medium">{sub.contractor}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">{formatDate(sub.createdAt)}</span>
                  </div>
                </div>
                {sub.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>
                )}
                {sub.reviewNotes && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                    <p className="text-xs text-blue-800">{sub.reviewNotes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {(sub.status === 'pending' || sub.status === 'under_review') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => reviewSubmittal.mutate({ id: sub.id, status: 'approved' })}
                        disabled={reviewSubmittal.isPending}
                      >
                        <Stamp className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                        onClick={() => reviewSubmittal.mutate({ id: sub.id, status: 'revise_resubmit' })}
                        disabled={reviewSubmittal.isPending}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Revise
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteSubmittal.mutate({ id: sub.id })}
                    disabled={deleteSubmittal.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Submittals</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Log contractor material submittals for architect review and approval tracking.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Submittal
          </Button>
        </Card>
      )}
    </div>
  );
}
