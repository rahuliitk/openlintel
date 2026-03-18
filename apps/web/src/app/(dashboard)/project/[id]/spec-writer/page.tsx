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
  BookText,
  Plus,
  Loader2,
  Sparkles,
  Download,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  FileText,
  Copy,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const CSI_DIVISIONS = [
  { value: '01', label: 'Division 01 - General Requirements' },
  { value: '02', label: 'Division 02 - Existing Conditions' },
  { value: '03', label: 'Division 03 - Concrete' },
  { value: '04', label: 'Division 04 - Masonry' },
  { value: '05', label: 'Division 05 - Metals' },
  { value: '06', label: 'Division 06 - Wood, Plastics, Composites' },
  { value: '07', label: 'Division 07 - Thermal & Moisture Protection' },
  { value: '08', label: 'Division 08 - Openings' },
  { value: '09', label: 'Division 09 - Finishes' },
  { value: '10', label: 'Division 10 - Specialties' },
  { value: '11', label: 'Division 11 - Equipment' },
  { value: '12', label: 'Division 12 - Furnishings' },
  { value: '21', label: 'Division 21 - Fire Suppression' },
  { value: '22', label: 'Division 22 - Plumbing' },
  { value: '23', label: 'Division 23 - HVAC' },
  { value: '26', label: 'Division 26 - Electrical' },
  { value: '31', label: 'Division 31 - Earthwork' },
  { value: '32', label: 'Division 32 - Exterior Improvements' },
  { value: '33', label: 'Division 33 - Utilities' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function SpecWriterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionNumber, setSectionNumber] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [division, setDivision] = useState('');
  const [content, setContent] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: sections = [], isLoading } = trpc.specWriter.listSections.useQuery({ projectId });

  const createSection = trpc.specWriter.createSection.useMutation({
    onSuccess: () => {
      utils.specWriter.listSections.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Specification section added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create section', description: err.message, variant: 'destructive' });
    },
  });

  const generateSpec = trpc.specWriter.generateWithAI.useMutation({
    onSuccess: () => {
      utils.specWriter.listSections.invalidate({ projectId });
      toast({ title: 'Spec generated', description: 'AI has generated the specification content.' });
    },
    onError: (err) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteSection = trpc.specWriter.deleteSection.useMutation({
    onSuccess: () => {
      utils.specWriter.listSections.invalidate({ projectId });
      toast({ title: 'Section deleted' });
    },
  });

  function resetForm() {
    setSectionNumber('');
    setSectionTitle('');
    setDivision('');
    setContent('');
  }

  function handleCreate() {
    if (!sectionNumber || !sectionTitle || !division) return;
    createSection.mutate({
      projectId,
      sectionNumber,
      title: sectionTitle,
      division,
      content: content || undefined,
    });
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // Group by division
  const divisionGroups = CSI_DIVISIONS.map((div) => ({
    ...div,
    sections: sections.filter((s: any) => s.division === div.value),
  })).filter((d) => d.sections.length > 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CSI Specification Writer</h1>
            <p className="text-sm text-muted-foreground">
              Create and edit construction specifications organized by CSI MasterFormat divisions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generateSpec.mutate({ projectId })} disabled={generateSpec.isPending}>
            {generateSpec.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            AI Generate
          </Button>
          <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Export PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Specification Section</DialogTitle>
                <DialogDescription>Create a new CSI MasterFormat specification section.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>CSI Division</Label>
                  <Select value={division} onValueChange={setDivision}>
                    <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                    <SelectContent>
                      {CSI_DIVISIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secNum">Section Number</Label>
                    <Input id="secNum" placeholder="e.g. 09 29 00" value={sectionNumber} onChange={(e) => setSectionNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secTitle">Section Title</Label>
                    <Input id="secTitle" placeholder="e.g. Gypsum Board" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Specification Content</Label>
                  <Textarea id="content" rows={8} placeholder={"PART 1 - GENERAL\n\n1.1 SUMMARY\n  A. Section includes...\n\n1.2 REFERENCES\n  A. ASTM C1396...\n\nPART 2 - PRODUCTS\n\n2.1 MATERIALS\n  A. Gypsum Board: Type X..."} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createSection.isPending || !sectionNumber || !sectionTitle || !division}>
                  {createSection.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Add Section'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {sections.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Sections</p><p className="text-2xl font-bold">{sections.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Divisions</p><p className="text-2xl font-bold">{divisionGroups.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Pages (est.)</p><p className="text-2xl font-bold">{Math.max(sections.length * 3, 1)}</p></CardContent></Card>
        </div>
      )}

      {/* Spec Sections by Division */}
      {sections.length > 0 ? (
        <div className="space-y-3">
          {divisionGroups.map((group) => (
            <Card key={group.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{group.label}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{group.sections.length} sections</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.sections.map((section: any) => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <div key={section.id} className="rounded-lg border">
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50" onClick={() => toggleSection(section.id)}>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Badge variant="secondary" className="text-[10px] font-mono">{section.sectionNumber}</Badge>
                            <span className="text-sm font-medium">{section.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSection.mutate({ id: section.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded && section.content && (
                          <div className="border-t px-3 py-3">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{section.content}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BookText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Specifications</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Write construction specifications organized by CSI MasterFormat, or let AI generate them from your design.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => generateSpec.mutate({ projectId })} disabled={generateSpec.isPending}>
              <Sparkles className="mr-1 h-4 w-4" /> AI Generate
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Section
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
