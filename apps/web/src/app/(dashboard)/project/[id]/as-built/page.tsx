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
  PenTool,
  Plus,
  Loader2,
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  Tag,
  MessageSquare,
  Layers,
  Calendar,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const MARKUP_TYPES = [
  { value: 'dimension_change', label: 'Dimension Change' },
  { value: 'location_change', label: 'Location Change' },
  { value: 'addition', label: 'Addition / New Element' },
  { value: 'deletion', label: 'Deletion / Removed' },
  { value: 'substitution', label: 'Material Substitution' },
  { value: 'field_note', label: 'Field Note' },
  { value: 'rfi_resolution', label: 'RFI Resolution' },
] as const;

const DISCIPLINE_OPTIONS = [
  { value: 'architectural', label: 'Architectural' },
  { value: 'structural', label: 'Structural' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'civil', label: 'Civil' },
  { value: 'landscape', label: 'Landscape' },
] as const;

const MARKUP_COLORS: Record<string, string> = {
  dimension_change: 'bg-blue-100 text-blue-800',
  location_change: 'bg-purple-100 text-purple-800',
  addition: 'bg-green-100 text-green-800',
  deletion: 'bg-red-100 text-red-800',
  substitution: 'bg-yellow-100 text-yellow-800',
  field_note: 'bg-gray-100 text-gray-800',
  rfi_resolution: 'bg-indigo-100 text-indigo-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function AsBuiltPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetNumber, setSheetNumber] = useState('');
  const [markupType, setMarkupType] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [description, setDescription] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [asBuiltValue, setAsBuiltValue] = useState('');
  const [notes, setNotes] = useState('');

  const { data: markups = [], isLoading } = trpc.asBuilt.listMarkups.useQuery({ projectId });

  const createMarkup = trpc.asBuilt.createMarkup.useMutation({
    onSuccess: () => {
      utils.asBuilt.listMarkups.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'As-built markup added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add markup', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMarkup = trpc.asBuilt.deleteMarkup.useMutation({
    onSuccess: () => {
      utils.asBuilt.listMarkups.invalidate({ projectId });
      toast({ title: 'Markup deleted' });
    },
  });

  function resetForm() {
    setSheetNumber('');
    setMarkupType('');
    setDiscipline('');
    setDescription('');
    setOriginalValue('');
    setAsBuiltValue('');
    setNotes('');
  }

  function handleCreate() {
    if (!sheetNumber || !markupType || !description) return;
    createMarkup.mutate({
      projectId,
      sheetNumber,
      markupType,
      discipline: discipline || undefined,
      description,
      originalValue: originalValue || undefined,
      asBuiltValue: asBuiltValue || undefined,
      notes: notes || undefined,
    });
  }

  // Group markups by sheet
  const sheetGroups = markups.reduce((acc: Record<string, any[]>, m: any) => {
    const sheet = m.sheetNumber || 'Unassigned';
    if (!acc[sheet]) acc[sheet] = [];
    acc[sheet].push(m);
    return acc;
  }, {});

  const typeCount = MARKUP_TYPES.map((t) => ({
    ...t,
    count: markups.filter((m: any) => m.markupType === t.value).length,
  })).filter((t) => t.count > 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenTool className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">As-Built Documentation</h1>
            <p className="text-sm text-muted-foreground">
              Record field changes, markups, and deviations from original construction documents.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Export Report</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Markup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add As-Built Markup</DialogTitle>
                <DialogDescription>Record a change from the original construction documents.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheetNum">Sheet Number</Label>
                    <Input id="sheetNum" placeholder="e.g. A-101" value={sheetNumber} onChange={(e) => setSheetNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Markup Type</Label>
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {MARKUP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discipline</Label>
                  <Select value={discipline} onValueChange={setDiscipline}>
                    <SelectTrigger><SelectValue placeholder="Select discipline" /></SelectTrigger>
                    <SelectContent>
                      {DISCIPLINE_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Change Description</Label>
                  <Textarea id="desc" rows={2} placeholder="Describe the change from original documents..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origVal">Original Value</Label>
                    <Input id="origVal" placeholder={"e.g. 12'-6\""} value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abVal">As-Built Value</Label>
                    <Input id="abVal" placeholder={"e.g. 12'-2\""} value={asBuiltValue} onChange={(e) => setAsBuiltValue(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={2} placeholder="Field conditions, reason for change..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMarkup.isPending || !sheetNumber || !markupType || !description}>
                  {createMarkup.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Markup'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      {markups.length > 0 && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Markups</p><p className="text-2xl font-bold">{markups.length}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Sheets Affected</p><p className="text-2xl font-bold">{Object.keys(sheetGroups).length}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Change Types</p><div className="mt-1 flex flex-wrap gap-1">{typeCount.map((t) => <Badge key={t.value} className={`text-[10px] ${MARKUP_COLORS[t.value]}`}>{t.label}: {t.count}</Badge>)}</div></CardContent></Card>
          </div>
        </>
      )}

      {/* Markups by Sheet */}
      {markups.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(sheetGroups).sort(([a], [b]) => a.localeCompare(b)).map(([sheet, sheetMarkups]) => (
            <Card key={sheet}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Sheet {sheet}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{(sheetMarkups as any[]).length} markups</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(sheetMarkups as any[]).map((markup: any) => (
                    <div key={markup.id} className="flex items-start justify-between rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{markup.description}</p>
                            <Badge className={`text-[10px] ${MARKUP_COLORS[markup.markupType] || ''}`}>{markup.markupType?.replace(/_/g, ' ')}</Badge>
                          </div>
                          {(markup.originalValue || markup.asBuiltValue) && (
                            <p className="text-xs mt-1">
                              {markup.originalValue && <><span className="text-muted-foreground">Original: </span><span className="line-through">{markup.originalValue}</span></>}
                              {markup.originalValue && markup.asBuiltValue && <span className="text-muted-foreground"> &rarr; </span>}
                              {markup.asBuiltValue && <><span className="text-muted-foreground">As-Built: </span><span className="font-medium text-blue-600">{markup.asBuiltValue}</span></>}
                            </p>
                          )}
                          {markup.discipline && <p className="text-xs text-muted-foreground mt-0.5">{markup.discipline}</p>}
                          {markup.notes && <p className="text-xs text-muted-foreground mt-1 italic">{markup.notes}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(markup.createdAt)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteMarkup.mutate({ id: markup.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <PenTool className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No As-Built Markups</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Record field changes and deviations from original construction documents to create accurate as-built records.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Markup
          </Button>
        </Card>
      )}
    </div>
  );
}
