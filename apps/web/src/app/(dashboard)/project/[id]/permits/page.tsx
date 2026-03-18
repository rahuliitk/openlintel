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
  FileCheck2,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarDays,
  Trash2,
  Building,
  ClipboardCheck,
  User,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const PERMIT_TYPES = [
  { value: 'building', label: 'Building Permit' },
  { value: 'electrical', label: 'Electrical Permit' },
  { value: 'plumbing', label: 'Plumbing Permit' },
  { value: 'mechanical', label: 'Mechanical Permit' },
  { value: 'demolition', label: 'Demolition Permit' },
  { value: 'grading', label: 'Grading Permit' },
  { value: 'occupancy', label: 'Occupancy Certificate' },
  { value: 'zoning', label: 'Zoning Approval' },
] as const;

const INSPECTION_TYPES = [
  'foundation', 'framing', 'rough_electrical', 'rough_plumbing', 'rough_mechanical',
  'insulation', 'drywall', 'final_electrical', 'final_plumbing', 'final_mechanical', 'final_building',
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  scheduled: 'bg-purple-100 text-purple-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function PermitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [permitType, setPermitType] = useState('building');
  const [permitNumber, setPermitNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [submittedDate, setSubmittedDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPhone, setInspectorPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [inspectionPermitId, setInspectionPermitId] = useState('');
  const [inspectionType, setInspectionType] = useState('foundation');
  const [inspectionDate, setInspectionDate] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: permits = [], isLoading } = trpc.permit.list.useQuery({ projectId });
  const { data: inspections = [] } = trpc.permit.listInspections.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createPermit = trpc.permit.create.useMutation({
    onSuccess: () => {
      utils.permit.list.invalidate();
      setDialogOpen(false);
      resetPermitForm();
      toast({ title: 'Permit created', description: 'Permit record has been added.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create permit', description: err.message, variant: 'destructive' });
    },
  });

  const scheduleInspection = trpc.permit.scheduleInspection.useMutation({
    onSuccess: () => {
      utils.permit.listInspections.invalidate();
      setInspectionDialogOpen(false);
      toast({ title: 'Inspection scheduled' });
    },
    onError: (err) => {
      toast({ title: 'Failed to schedule', description: err.message, variant: 'destructive' });
    },
  });

  const recordResult = trpc.permit.recordInspectionResult.useMutation({
    onSuccess: () => {
      utils.permit.listInspections.invalidate();
      toast({ title: 'Result recorded' });
    },
  });

  const deletePermit = trpc.permit.delete.useMutation({
    onSuccess: () => {
      utils.permit.list.invalidate();
      toast({ title: 'Permit deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetPermitForm() {
    setPermitType('building');
    setPermitNumber('');
    setJurisdiction('');
    setSubmittedDate('');
    setExpirationDate('');
    setInspectorName('');
    setInspectorPhone('');
    setNotes('');
  }

  function handleCreatePermit() {
    createPermit.mutate({
      projectId,
      permitType,
      permitNumber: permitNumber || undefined,
      jurisdiction: jurisdiction || undefined,
      submittedDate: submittedDate ? new Date(submittedDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      inspectorName: inspectorName || undefined,
      inspectorPhone: inspectorPhone || undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalPermits = permits.length;
  const approvedCount = permits.filter((p: any) => p.status === 'approved').length;
  const pendingCount = permits.filter((p: any) => p.status === 'submitted' || p.status === 'under_review').length;
  const upcomingInspections = inspections.filter((i: any) => i.status === 'scheduled').length;

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
          <FileCheck2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Permits & Inspections</h1>
            <p className="text-sm text-muted-foreground">
              Track building permits, schedule inspections, and record results.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setInspectionDialogOpen(true)}>
            <ClipboardCheck className="mr-1 h-4 w-4" />
            Schedule Inspection
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Permit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Permit</DialogTitle>
                <DialogDescription>Add a building permit with jurisdiction and inspector details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Permit Type</Label>
                    <Select value={permitType} onValueChange={setPermitType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERMIT_TYPES.map((pt) => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permitNum">Permit Number</Label>
                    <Input id="permitNum" placeholder="e.g. BP-2024-0042" value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input id="jurisdiction" placeholder="e.g. City of Austin Building Dept" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subDate">Submitted Date</Label>
                    <Input id="subDate" type="date" value={submittedDate} onChange={(e) => setSubmittedDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expDate">Expiration Date</Label>
                    <Input id="expDate" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inspName">Inspector Name</Label>
                    <Input id="inspName" placeholder="e.g. John Smith" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspPhone">Inspector Phone</Label>
                    <Input id="inspPhone" placeholder="e.g. (512) 555-0100" value={inspectorPhone} onChange={(e) => setInspectorPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permitNotes">Notes</Label>
                  <Textarea id="permitNotes" rows={2} placeholder="Conditions, special requirements..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePermit} disabled={createPermit.isPending}>
                  {createPermit.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Permit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Inspection scheduling dialog */}
          <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Inspection</DialogTitle>
                <DialogDescription>Schedule a required inspection for a permit.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Permit</Label>
                  <Select value={inspectionPermitId} onValueChange={setInspectionPermitId}><SelectTrigger><SelectValue placeholder="Select permit" /></SelectTrigger><SelectContent>{permits.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.permitType.replace(/_/g, ' ')} - {p.permitNumber || p.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inspection Type</Label>
                    <Select value={inspectionType} onValueChange={setInspectionType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INSPECTION_TYPES.map((it) => <SelectItem key={it} value={it}>{it.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspDate">Date</Label>
                    <Input id="inspDate" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => { scheduleInspection.mutate({ permitId: inspectionPermitId, inspectionType, scheduledDate: new Date(inspectionDate) }); }} disabled={scheduleInspection.isPending || !inspectionPermitId || !inspectionDate}>
                  {scheduleInspection.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Permits</p><p className="text-2xl font-bold">{totalPermits}</p></div><Building className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approvedCount}</p></div><CheckCircle2 className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></div><Clock className="h-8 w-8 text-yellow-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Upcoming Inspections</p><p className="text-2xl font-bold text-purple-600">{upcomingInspections}</p></div><ClipboardCheck className="h-8 w-8 text-purple-400" /></div></CardContent></Card>
      </div>

      {/* ── Permit Cards ────────────────────────────────────── */}
      {permits.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {permits.map((permit: any) => (
            <Card key={permit.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base capitalize">{permit.permitType.replace(/_/g, ' ')} Permit</CardTitle>
                    <CardDescription className="mt-0.5">{permit.permitNumber || 'No number assigned'}</CardDescription>
                  </div>
                  <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[permit.status] || ''}`}>{permit.status.replace(/_/g, ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                  {permit.jurisdiction && <div className="flex justify-between"><span className="text-muted-foreground">Jurisdiction</span><span className="font-medium">{permit.jurisdiction}</span></div>}
                  {permit.submittedDate && <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span className="font-medium">{formatDate(permit.submittedDate)}</span></div>}
                  {permit.expirationDate && <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span className="font-medium">{formatDate(permit.expirationDate)}</span></div>}
                  {permit.inspectorName && <div className="flex justify-between"><span className="text-muted-foreground">Inspector</span><span className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{permit.inspectorName}</span></div>}
                </div>
                {permit.notes && <p className="text-sm text-muted-foreground line-clamp-2">{permit.notes}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deletePermit.mutate({ id: permit.id })} disabled={deletePermit.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <FileCheck2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Permits</h2>
          <p className="text-sm text-muted-foreground mb-4">Add building permits and schedule required inspections.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Permit</Button>
        </Card>
      )}

      {/* ── Inspections ─────────────────────────────────────── */}
      {inspections.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Scheduled Inspections</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {inspections.map((insp: any) => (
              <Card key={insp.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{insp.inspectionType.replace(/_/g, ' ')}</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[insp.status] || ''}`}>{insp.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(insp.scheduledDate)}</p>
                {insp.status === 'scheduled' && (
                  <div className="flex gap-1 mt-2">
                    <Button variant="outline" size="sm" className="flex-1 text-green-700" onClick={() => recordResult.mutate({ id: insp.id, result: 'passed' })}><CheckCircle2 className="mr-1 h-3 w-3" />Pass</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-700" onClick={() => recordResult.mutate({ id: insp.id, result: 'failed' })}><XCircle className="mr-1 h-3 w-3" />Fail</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
