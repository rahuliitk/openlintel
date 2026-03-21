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
  GitBranch,
  Plus,
  Loader2,
  FileText,
  History,
  Users,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  Upload,
  Clock,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const DOC_TYPES = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'specification', label: 'Specification' },
  { value: 'asi', label: 'ASI (Supplemental Instruction)' },
  { value: 'contract', label: 'Contract Document' },
  { value: 'report', label: 'Report' },
  { value: 'schedule', label: 'Schedule' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  current: 'bg-green-100 text-green-800',
  superseded: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-800',
  archived: 'bg-orange-100 text-orange-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function DocumentVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('drawing');
  const [docNumber, setDocNumber] = useState('');
  const [revision, setRevision] = useState('A');
  const [description, setDescription] = useState('');
  const [distributedTo, setDistributedTo] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: documents = [], isLoading } = trpc.documentVersion.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createDocument = trpc.documentVersion.create.useMutation({
    onSuccess: () => {
      utils.documentVersion.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Document version created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create document', description: err.message, variant: 'destructive' });
    },
  });

  const createRevision = trpc.documentVersion.createRevision.useMutation({
    onSuccess: () => {
      utils.documentVersion.list.invalidate();
      toast({ title: 'New revision created', description: 'Previous version has been superseded.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create revision', description: err.message, variant: 'destructive' });
    },
  });

  const deleteDocument = trpc.documentVersion.delete.useMutation({
    onSuccess: () => {
      utils.documentVersion.list.invalidate();
      toast({ title: 'Document deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setDocTitle('');
    setDocType('drawing');
    setDocNumber('');
    setRevision('A');
    setDescription('');
    setDistributedTo('');
  }

  function handleCreate() {
    if (!docTitle) return;
    createDocument.mutate({
      projectId,
      title: docTitle,
      docType,
      docNumber: docNumber || undefined,
      revision,
      description: description || undefined,
      distributedTo: distributedTo ? distributedTo.split(',').map((s) => s.trim()) : undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalDocs = documents.length;
  const currentDocs = documents.filter((d: any) => d.status === 'current').length;
  const supersededDocs = documents.filter((d: any) => d.status === 'superseded').length;
  const totalRevisions = documents.reduce((sum: number, d: any) => sum + (d.revisionCount || 1), 0);

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
          <GitBranch className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Version Control</h1>
            <p className="text-sm text-muted-foreground">
              Track drawing revisions, spec versions, distribution, and superseded documents.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Document Version</DialogTitle>
              <DialogDescription>Register a drawing, specification, or ASI with revision tracking.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dvTitle">Document Title</Label>
                <Input id="dvTitle" placeholder="e.g. Floor Plan - Level 1" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOC_TYPES.map((dt) => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dvNumber">Doc Number</Label>
                  <Input id="dvNumber" placeholder="e.g. A2.1" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dvRevision">Revision</Label>
                  <Input id="dvRevision" placeholder="e.g. A" value={revision} onChange={(e) => setRevision(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dvDesc">Description / Changes</Label>
                <Textarea id="dvDesc" placeholder="Describe changes in this revision..." rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dvDistributed">Distributed To (comma-separated)</Label>
                <Input id="dvDistributed" placeholder="e.g. General Contractor, Electrician, Owner" value={distributedTo} onChange={(e) => setDistributedTo(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createDocument.isPending || !docTitle}>
                {createDocument.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Documents</p><p className="text-2xl font-bold">{totalDocs}</p></div><FileText className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Current</p><p className="text-2xl font-bold text-green-600">{currentDocs}</p></div><GitBranch className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Superseded</p><p className="text-2xl font-bold text-yellow-600">{supersededDocs}</p></div><AlertCircle className="h-8 w-8 text-yellow-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Revisions</p><p className="text-2xl font-bold text-blue-600">{totalRevisions}</p></div><History className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
      </div>

      {/* ── Document Cards ──────────────────────────────────── */}
      {documents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc: any) => (
            <Card key={doc.id} className={`relative ${doc.status === 'superseded' ? 'opacity-70' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {doc.docNumber && <span className="font-mono">{doc.docNumber} </span>}
                      Rev {doc.revision}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                    <FileText className="h-3 w-3" />
                    {doc.docType.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <History className="h-3 w-3" />
                    {doc.revisionCount || 1} revision{(doc.revisionCount || 1) !== 1 ? 's' : ''}
                  </div>
                </div>
                {doc.description && <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>}
                <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span className="font-medium">{formatDate(doc.updatedAt)}</span></div>
                  {doc.distributedTo && doc.distributedTo.length > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Distributed</span><span className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{doc.distributedTo.length} parties</span></div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {doc.status === 'current' && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => createRevision.mutate({ id: doc.id })} disabled={createRevision.isPending}>
                      {createRevision.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
                      New Revision
                    </Button>
                  )}
                  <Button variant="outline" size="sm"><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteDocument.mutate({ id: doc.id })} disabled={deleteDocument.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Documents</h2>
          <p className="text-sm text-muted-foreground mb-4">Register drawings, specifications, and ASIs with revision tracking.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Document</Button>
        </Card>
      )}
    </div>
  );
}
