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
  ShieldAlert,
  Plus,
  Loader2,
  HardHat,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Trash2,
  FileWarning,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const RECORD_TYPES = [
  { value: 'checklist', label: 'Safety Checklist' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'training', label: 'Training Record' },
  { value: 'ppe_audit', label: 'PPE Audit' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'observation', label: 'Observation' },
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
] as const;

const CONSTRUCTION_PHASES = [
  'demolition', 'excavation', 'foundation', 'framing', 'roofing',
  'rough_in', 'insulation', 'drywall', 'finishing', 'landscaping',
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  observation: 'bg-gray-100 text-gray-700',
  minor: 'bg-blue-100 text-blue-700',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SafetyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('checklist');
  const [severity, setSeverity] = useState('minor');
  const [phase, setPhase] = useState('framing');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: records = [], isLoading } = trpc.safety.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createRecord = trpc.safety.create.useMutation({
    onSuccess: () => {
      utils.safety.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Safety record created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create record', description: err.message, variant: 'destructive' });
    },
  });

  const resolveRecord = trpc.safety.resolve.useMutation({
    onSuccess: () => {
      utils.safety.list.invalidate();
      toast({ title: 'Record resolved' });
    },
  });

  const deleteRecord = trpc.safety.delete.useMutation({
    onSuccess: () => {
      utils.safety.list.invalidate();
      toast({ title: 'Record deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setTitle('');
    setRecordType('checklist');
    setSeverity('minor');
    setPhase('framing');
    setDescription('');
    setAssignedTo('');
  }

  function handleCreate() {
    if (!title) return;
    createRecord.mutate({
      projectId,
      title,
      recordType,
      severity,
      phase,
      description: description || undefined,
      assignedTo: assignedTo || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalRecords = records.length;
  const incidentCount = records.filter((r: any) => r.recordType === 'incident').length;
  const openCount = records.filter((r: any) => r.status === 'open' || r.status === 'in_progress').length;
  const trainingCount = records.filter((r: any) => r.recordType === 'training').length;
  const criticalCount = records.filter((r: any) => r.severity === 'critical' && r.status !== 'resolved' && r.status !== 'closed').length;

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
          <ShieldAlert className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Safety & Compliance</h1>
            <p className="text-sm text-muted-foreground">
              Safety checklists, incident reports, near-miss tracking, and training records.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Safety Record</DialogTitle>
              <DialogDescription>Log a checklist, incident, near-miss, or training record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="safetyTitle">Title</Label>
                <Input id="safetyTitle" placeholder="e.g. Fall protection audit - Week 12" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Record Type</Label>
                  <Select value={recordType} onValueChange={setRecordType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RECORD_TYPES.map((rt) => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITY_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select value={phase} onValueChange={setPhase}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONSTRUCTION_PHASES.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyAssigned">Assigned To</Label>
                <Input id="safetyAssigned" placeholder="Person or team responsible" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyDesc">Description</Label>
                <Textarea id="safetyDesc" placeholder="Details, witness statements, corrective actions..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createRecord.isPending || !title}>
                {createRecord.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Critical Alert ──────────────────────────────────── */}
      {criticalCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">{criticalCount} critical safety issue{criticalCount !== 1 ? 's' : ''} unresolved</p>
            <p className="text-xs text-red-600">Immediate attention required</p>
          </div>
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Records</p><p className="text-2xl font-bold">{totalRecords}</p></div><ClipboardCheck className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Incidents</p><p className="text-2xl font-bold text-red-600">{incidentCount}</p></div><FileWarning className="h-8 w-8 text-red-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Open Items</p><p className="text-2xl font-bold text-yellow-600">{openCount}</p></div><AlertTriangle className="h-8 w-8 text-yellow-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Training Sessions</p><p className="text-2xl font-bold text-blue-600">{trainingCount}</p></div><HardHat className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
      </div>

      {/* ── Record Cards ────────────────────────────────────── */}
      {records.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record: any) => (
            <Card key={record.id} className={`relative ${record.severity === 'critical' && record.status !== 'resolved' ? 'border-red-300' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{record.title}</CardTitle>
                    <CardDescription className="mt-0.5 capitalize">
                      {record.recordType.replace(/_/g, ' ')} &middot; {record.phase.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-1">
                    <Badge className={`text-[10px] ${STATUS_COLORS[record.status] || ''}`}>{record.status.replace(/_/g, ' ')}</Badge>
                    <Badge className={`text-[10px] ${SEVERITY_COLORS[record.severity] || ''}`}>{record.severity}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {record.description && <p className="text-sm text-muted-foreground line-clamp-3">{record.description}</p>}
                <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{formatDate(record.createdAt)}</span></div>
                  {record.assignedTo && <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span className="font-medium">{record.assignedTo}</span></div>}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {(record.status === 'open' || record.status === 'in_progress') && (
                    <Button variant="outline" size="sm" className="flex-1 border-green-200 text-green-700 hover:bg-green-50" onClick={() => resolveRecord.mutate({ id: record.id })} disabled={resolveRecord.isPending}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Resolve
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteRecord.mutate({ id: record.id })} disabled={deleteRecord.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Safety Records</h2>
          <p className="text-sm text-muted-foreground mb-4">Create safety checklists, log incidents, and track training compliance.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Record</Button>
        </Card>
      )}
    </div>
  );
}
