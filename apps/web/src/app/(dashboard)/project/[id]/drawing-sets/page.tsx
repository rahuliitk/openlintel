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
  Separator,
  toast,
} from '@openlintel/ui';
import {
  FileStack,
  Plus,
  Loader2,
  FileText,
  Download,
  Trash2,
  Pencil,
  Copy,
  CheckSquare,
  Layout,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SHEET_DISCIPLINES = [
  { value: 'A', label: 'Architectural (A)' },
  { value: 'S', label: 'Structural (S)' },
  { value: 'M', label: 'Mechanical (M)' },
  { value: 'E', label: 'Electrical (E)' },
  { value: 'P', label: 'Plumbing (P)' },
  { value: 'C', label: 'Civil (C)' },
  { value: 'L', label: 'Landscape (L)' },
  { value: 'G', label: 'General (G)' },
  { value: 'ID', label: 'Interior Design (ID)' },
] as const;

const SHEET_SIZES = [
  { value: 'arch_d', label: 'ARCH D (24" x 36")' },
  { value: 'arch_e', label: 'ARCH E (36" x 48")' },
  { value: 'ansi_b', label: 'ANSI B (11" x 17")' },
  { value: 'ansi_d', label: 'ANSI D (22" x 34")' },
  { value: 'a1', label: 'A1 (594mm x 841mm)' },
  { value: 'a0', label: 'A0 (841mm x 1189mm)' },
] as const;

const DRAWING_SET_TYPES = [
  { value: 'permit', label: 'Permit Set' },
  { value: 'construction', label: 'Construction Documents' },
  { value: 'schematic', label: 'Schematic Design' },
  { value: 'design_dev', label: 'Design Development' },
  { value: 'as_built', label: 'As-Built Set' },
  { value: 'record', label: 'Record Set' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function DrawingSetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [setName, setSetName] = useState('');
  const [setType, setSetType] = useState('');
  const [sheetSize, setSheetSize] = useState('');
  const [titleBlockTemplate, setTitleBlockTemplate] = useState('');
  const [sheetsInput, setSheetsInput] = useState('');
  const [notes, setNotes] = useState('');

  const { data: drawingSets = [], isLoading } = trpc.drawingSet.list.useQuery({ projectId });

  const createSet = trpc.drawingSet.create.useMutation({
    onSuccess: () => {
      utils.drawingSet.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Drawing set created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create set', description: err.message, variant: 'destructive' });
    },
  });

  const deleteSet = trpc.drawingSet.delete.useMutation({
    onSuccess: () => {
      utils.drawingSet.list.invalidate({ projectId });
      toast({ title: 'Drawing set deleted' });
    },
  });

  function resetForm() {
    setSetName('');
    setSetType('');
    setSheetSize('');
    setTitleBlockTemplate('');
    setSheetsInput('');
    setNotes('');
  }

  function handleCreate() {
    if (!setName || !setType) return;
    const sheets = sheetsInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(' - ');
        return { number: parts[0]?.trim() || line, title: parts[1]?.trim() || '' };
      });
    createSet.mutate({
      projectId,
      name: setName,
      setType,
      sheetSize: sheetSize || undefined,
      titleBlockTemplate: titleBlockTemplate || undefined,
      sheets: sheets.length > 0 ? sheets : undefined,
      notes: notes || undefined,
    });
  }

  const totalSheets = drawingSets.reduce((sum: number, ds: any) => sum + (ds.sheets?.length || 0), 0);

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
          <FileStack className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Drawing Set Templates</h1>
            <p className="text-sm text-muted-foreground">
              Configure professional drawing sets with sheet organization and title block templates.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Drawing Set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Drawing Set</DialogTitle>
              <DialogDescription>Define a drawing set template with sheet index and configuration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setName">Set Name</Label>
                  <Input id="setName" placeholder="e.g. Permit Set v2" value={setName} onChange={(e) => setSetName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Set Type</Label>
                  <Select value={setType} onValueChange={setSetType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {DRAWING_SET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sheet Size</Label>
                  <Select value={sheetSize} onValueChange={setSheetSize}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {SHEET_SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleBlock">Title Block Template</Label>
                  <Input id="titleBlock" placeholder="e.g. Standard v3" value={titleBlockTemplate} onChange={(e) => setTitleBlockTemplate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheets">Sheet Index (one per line: NUMBER - TITLE)</Label>
                <Textarea id="sheets" rows={6} placeholder={"G-001 - Cover Sheet\nA-101 - Floor Plan - Level 1\nA-102 - Floor Plan - Level 2\nA-201 - Building Elevations\nA-301 - Building Sections\nS-101 - Foundation Plan\nE-101 - Electrical Plan"} value={sheetsInput} onChange={(e) => setSheetsInput(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Scale, revision conventions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createSet.isPending || !setName || !setType}>
                {createSet.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create Set'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {drawingSets.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Drawing Sets</p><p className="text-2xl font-bold">{drawingSets.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Sheets</p><p className="text-2xl font-bold">{totalSheets}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Disciplines</p><p className="text-2xl font-bold">{new Set(drawingSets.flatMap((ds: any) => (ds.sheets || []).map((s: any) => s.number?.charAt(0)))).size}</p></CardContent></Card>
        </div>
      )}

      {/* Drawing Sets */}
      {drawingSets.length > 0 ? (
        <div className="space-y-4">
          {drawingSets.map((ds: any) => (
            <Card key={ds.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{ds.name}</CardTitle>
                    <CardDescription>
                      {ds.setType?.replace(/_/g, ' ')}
                      {ds.sheetSize && <span> &middot; {SHEET_SIZES.find((s) => s.value === ds.sheetSize)?.label || ds.sheetSize}</span>}
                      <span> &middot; {ds.sheets?.length || 0} sheets</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs"><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
                    <Button variant="outline" size="sm" className="text-xs"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSet.mutate({ id: ds.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ds.sheets && ds.sheets.length > 0 ? (
                  <div className="space-y-1">
                    {ds.sheets.map((sheet: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-mono">{sheet.number}</Badge>
                          <span>{sheet.title}</span>
                        </div>
                        <Layout className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No sheets defined yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <FileStack className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Drawing Sets</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create professional drawing set templates with sheet indices, title blocks, and discipline organization.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Drawing Set
          </Button>
        </Card>
      )}
    </div>
  );
}
