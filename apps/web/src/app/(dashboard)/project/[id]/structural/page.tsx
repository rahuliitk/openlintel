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
  Building2,
  Plus,
  Loader2,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Trash2,
  Layers,
  Weight,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ELEMENT_TYPES = [
  { value: 'beam', label: 'Beam / Header' },
  { value: 'column', label: 'Column' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'wall', label: 'Load-Bearing Wall' },
  { value: 'slab', label: 'Floor Slab' },
  { value: 'roof_truss', label: 'Roof Truss' },
  { value: 'retaining_wall', label: 'Retaining Wall' },
] as const;

const FOUNDATION_TYPES = [
  { value: 'slab_on_grade', label: 'Slab on Grade' },
  { value: 'crawl_space', label: 'Crawl Space' },
  { value: 'basement', label: 'Full Basement' },
  { value: 'pier_and_beam', label: 'Pier & Beam' },
] as const;

const LOAD_TYPES = [
  { value: 'dead', label: 'Dead Load' },
  { value: 'live', label: 'Live Load' },
  { value: 'wind', label: 'Wind Load' },
  { value: 'seismic', label: 'Seismic Load' },
  { value: 'snow', label: 'Snow Load' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  analyzing: 'bg-blue-100 text-blue-800',
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function StructuralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [elementName, setElementName] = useState('');
  const [elementType, setElementType] = useState('beam');
  const [spanLength, setSpanLength] = useState('');
  const [loadType, setLoadType] = useState('dead');
  const [loadValue, setLoadValue] = useState('');
  const [material, setMaterial] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: elements = [], isLoading } = trpc.structural.list.useQuery({ projectId });
  const { data: analysis } = trpc.structural.getAnalysis.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createElement = trpc.structural.create.useMutation({
    onSuccess: () => {
      utils.structural.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Element added', description: 'Structural element has been recorded.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create element', description: err.message, variant: 'destructive' });
    },
  });

  const runAnalysis = trpc.structural.analyze.useMutation({
    onSuccess: (data) => {
      utils.structural.list.invalidate();
      utils.structural.getAnalysis.invalidate();
      toast({
        title: 'Analysis complete',
        description: `${data.passed} pass, ${data.failed} fail, ${data.warnings} warnings.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  const sizeBeam = trpc.structural.sizeBeam.useMutation({
    onSuccess: (data) => {
      utils.structural.list.invalidate();
      toast({
        title: 'Beam sized',
        description: `Recommended: ${data.size} (${data.material})`,
      });
    },
    onError: (err) => {
      toast({ title: 'Sizing failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteElement = trpc.structural.delete.useMutation({
    onSuccess: () => {
      utils.structural.list.invalidate();
      toast({ title: 'Element removed' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setElementName('');
    setElementType('beam');
    setSpanLength('');
    setLoadType('dead');
    setLoadValue('');
    setMaterial('');
    setNotes('');
  }

  function handleCreate() {
    if (!elementName) return;
    createElement.mutate({
      projectId,
      name: elementName,
      elementType,
      spanLength: spanLength ? parseFloat(spanLength) : undefined,
      loadType,
      loadValue: loadValue ? parseFloat(loadValue) : undefined,
      material: material || undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalElements = elements.length;
  const beamCount = elements.filter((e: any) => e.elementType === 'beam').length;
  const passCount = elements.filter((e: any) => e.status === 'pass').length;
  const failCount = elements.filter((e: any) => e.status === 'fail').length;
  const loadPathOk = analysis?.loadPathComplete ?? false;
  const foundationRec = analysis?.foundationRecommendation ?? null;
  const seismicZone = analysis?.seismicZone ?? null;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Structural Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Beam sizing, load path analysis, foundation recommendations, and seismic checks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAnalysis.mutate({ projectId })}
            disabled={runAnalysis.isPending || elements.length === 0}
          >
            {runAnalysis.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-1 h-4 w-4" />
            )}
            Run Analysis
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Element
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Structural Element</DialogTitle>
                <DialogDescription>
                  Define a beam, column, wall, or foundation element for analysis.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="elName">Element Name</Label>
                    <Input
                      id="elName"
                      placeholder="e.g. LVL Header over garage"
                      value={elementName}
                      onChange={(e) => setElementName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Element Type</Label>
                    <Select value={elementType} onValueChange={setElementType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ELEMENT_TYPES.map((et) => (
                          <SelectItem key={et.value} value={et.value}>
                            {et.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spanLen">Span (ft)</Label>
                    <Input
                      id="spanLen"
                      type="number"
                      placeholder="e.g. 16"
                      value={spanLength}
                      onChange={(e) => setSpanLength(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Load Type</Label>
                    <Select value={loadType} onValueChange={setLoadType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAD_TYPES.map((lt) => (
                          <SelectItem key={lt.value} value={lt.value}>
                            {lt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loadVal">Load (psf)</Label>
                    <Input
                      id="loadVal"
                      type="number"
                      placeholder="e.g. 40"
                      value={loadValue}
                      onChange={(e) => setLoadValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="elMaterial">Material</Label>
                  <Input
                    id="elMaterial"
                    placeholder="e.g. LVL, Steel W-flange, Concrete"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="elNotes">Notes</Label>
                  <Textarea
                    id="elNotes"
                    placeholder="Additional context, bearing conditions..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createElement.isPending || !elementName}>
                  {createElement.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Element'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Elements</p>
                <p className="text-2xl font-bold">{totalElements}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Beams/Headers</p>
                <p className="text-2xl font-bold">{beamCount}</p>
              </div>
              <Weight className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600">{passCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Analysis Summary ────────────────────────────────── */}
      {analysis && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ArrowDown className={`h-6 w-6 ${loadPathOk ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <p className="text-sm font-medium">Load Path</p>
                  <p className={`text-xs ${loadPathOk ? 'text-green-600' : 'text-red-600'}`}>
                    {loadPathOk ? 'Complete - Roof to Foundation' : 'Incomplete - Gaps Detected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {foundationRec && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium">Foundation Recommendation</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">
                  {foundationRec.replace(/_/g, ' ')}
                </p>
              </CardContent>
            </Card>
          )}
          {seismicZone && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium">Seismic Zone</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Zone {seismicZone} - {seismicZone >= 3 ? 'High Risk' : seismicZone >= 2 ? 'Moderate Risk' : 'Low Risk'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Element Cards ───────────────────────────────────── */}
      {elements.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {elements.map((el: any) => (
            <Card key={el.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{el.name}</CardTitle>
                    <CardDescription className="mt-0.5 capitalize">
                      {el.elementType.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[el.status] || 'bg-gray-100 text-gray-800'}`}>
                    {el.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {el.spanLength && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      Span: {el.spanLength} ft
                    </div>
                  )}
                  {el.loadValue && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Weight className="h-3 w-3" />
                      {el.loadValue} psf ({el.loadType})
                    </div>
                  )}
                  {el.material && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {el.material}
                    </div>
                  )}
                </div>
                {el.recommendedSize && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-2.5">
                    <p className="text-xs font-medium text-green-800">
                      Recommended: {el.recommendedSize}
                    </p>
                  </div>
                )}
                {el.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{el.notes}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {el.elementType === 'beam' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => sizeBeam.mutate({ id: el.id })}
                      disabled={sizeBeam.isPending}
                    >
                      {sizeBeam.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Calculator className="mr-1 h-3.5 w-3.5" />
                      )}
                      Size Beam
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteElement.mutate({ id: el.id })}
                    disabled={deleteElement.isPending}
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
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Structural Elements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add beams, columns, walls, and foundations for structural analysis and sizing.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Element
          </Button>
        </Card>
      )}
    </div>
  );
}
