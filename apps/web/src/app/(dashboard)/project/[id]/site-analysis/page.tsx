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
  MapPin,
  Plus,
  Loader2,
  Sun,
  Wind,
  Droplets,
  Mountain,
  Compass,
  Upload,
  Eye,
  Trash2,
  BarChart3,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ANALYSIS_TYPES = [
  { value: 'topography', label: 'Topographic Survey' },
  { value: 'solar', label: 'Solar Orientation' },
  { value: 'grading', label: 'Grading & Drainage' },
  { value: 'wind', label: 'Wind Analysis' },
  { value: 'noise', label: 'Noise Mapping' },
  { value: 'soil', label: 'Soil / Bearing Capacity' },
  { value: 'flood', label: 'Flood Zone' },
  { value: 'setback', label: 'Setback & Easement' },
] as const;

const SOIL_TYPES = [
  'clay', 'sand', 'loam', 'silt', 'gravel', 'rock', 'peat', 'unknown',
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function SiteAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [analysisType, setAnalysisType] = useState('topography');
  const [soilType, setSoilType] = useState('unknown');
  const [elevation, setElevation] = useState('');
  const [slopePercent, setSlopePercent] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: analyses = [], isLoading } = trpc.siteAnalysis.list.useQuery({ projectId });
  const { data: siteOverview } = trpc.siteAnalysis.getOverview.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createAnalysis = trpc.siteAnalysis.create.useMutation({
    onSuccess: () => {
      utils.siteAnalysis.list.invalidate();
      utils.siteAnalysis.getOverview.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Analysis created', description: 'Site analysis has been queued for processing.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create analysis', description: err.message, variant: 'destructive' });
    },
  });

  const runSolarAnalysis = trpc.siteAnalysis.runSolar.useMutation({
    onSuccess: (data) => {
      utils.siteAnalysis.list.invalidate();
      toast({
        title: 'Solar analysis complete',
        description: `Peak sun hours: ${data.peakSunHours}/day. Best orientation: ${data.bestOrientation}.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Solar analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAnalysis = trpc.siteAnalysis.delete.useMutation({
    onSuccess: () => {
      utils.siteAnalysis.list.invalidate();
      utils.siteAnalysis.getOverview.invalidate();
      toast({ title: 'Analysis deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setAnalysisName('');
    setAnalysisType('topography');
    setSoilType('unknown');
    setElevation('');
    setSlopePercent('');
    setNotes('');
  }

  function handleCreate() {
    if (!analysisName) return;
    createAnalysis.mutate({
      projectId,
      name: analysisName,
      analysisType,
      soilType: soilType !== 'unknown' ? soilType : undefined,
      elevation: elevation ? parseFloat(elevation) : undefined,
      slopePercent: slopePercent ? parseFloat(slopePercent) : undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalAnalyses = analyses.length;
  const completedCount = analyses.filter((a: any) => a.status === 'completed').length;
  const warningCount = analyses.filter((a: any) => a.status === 'warning' || a.status === 'critical').length;

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
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Site Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Topography, solar orientation, grading, drainage, and environmental analysis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSolarAnalysis.mutate({ projectId })}
            disabled={runSolarAnalysis.isPending}
          >
            {runSolarAnalysis.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sun className="mr-1 h-4 w-4" />
            )}
            Solar Study
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Site Analysis</DialogTitle>
                <DialogDescription>
                  Add topographic, solar, grading, or environmental analysis data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saName">Analysis Name</Label>
                    <Input
                      id="saName"
                      placeholder="e.g. Front yard grading plan"
                      value={analysisName}
                      onChange={(e) => setAnalysisName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANALYSIS_TYPES.map((at) => (
                          <SelectItem key={at.value} value={at.value}>
                            {at.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Soil Type</Label>
                    <Select value={soilType} onValueChange={setSoilType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOIL_TYPES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="elev">Elevation (ft)</Label>
                    <Input
                      id="elev"
                      type="number"
                      placeholder="e.g. 850"
                      value={elevation}
                      onChange={(e) => setElevation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slope">Slope (%)</Label>
                    <Input
                      id="slope"
                      type="number"
                      placeholder="e.g. 5"
                      value={slopePercent}
                      onChange={(e) => setSlopePercent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saNotes">Notes</Label>
                  <Textarea
                    id="saNotes"
                    placeholder="Observations, drainage concerns, setback info..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createAnalysis.isPending || !analysisName}>
                  {createAnalysis.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Analysis'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Site Overview Cards ──────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Analyses</p>
                <p className="text-2xl font-bold">{totalAnalyses}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
              <Mountain className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <Droplets className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solar Hours</p>
                <p className="text-2xl font-bold text-amber-600">
                  {siteOverview?.peakSunHours ?? '--'}
                </p>
              </div>
              <Sun className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Analysis Cards ──────────────────────────────────── */}
      {analyses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis: any) => {
            const typeInfo = ANALYSIS_TYPES.find((at) => at.value === analysis.analysisType);
            return (
              <Card key={analysis.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{analysis.name}</CardTitle>
                      <CardDescription className="mt-0.5">
                        {typeInfo?.label || analysis.analysisType}
                      </CardDescription>
                    </div>
                    <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[analysis.status] || ''}`}>
                      {analysis.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {analysis.soilType && analysis.soilType !== 'unknown' && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        <Mountain className="h-3 w-3" />
                        {analysis.soilType}
                      </div>
                    )}
                    {analysis.elevation != null && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {analysis.elevation} ft
                      </div>
                    )}
                    {analysis.slopePercent != null && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {analysis.slopePercent}% slope
                      </div>
                    )}
                  </div>
                  {analysis.results && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
                      {analysis.analysisType === 'solar' && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Best Orientation</span>
                          <span className="font-medium flex items-center gap-1">
                            <Compass className="h-3 w-3" />
                            {analysis.results.bestOrientation}
                          </span>
                        </div>
                      )}
                      {analysis.analysisType === 'wind' && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Prevailing Wind</span>
                          <span className="font-medium flex items-center gap-1">
                            <Wind className="h-3 w-3" />
                            {analysis.results.prevailingDirection}
                          </span>
                        </div>
                      )}
                      {analysis.results.summary && (
                        <p className="text-muted-foreground mt-1">{analysis.results.summary}</p>
                      )}
                    </div>
                  )}
                  {analysis.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{analysis.notes}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {analysis.status === 'completed' && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View Report
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAnalysis.mutate({ id: analysis.id })}
                      disabled={deleteAnalysis.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Site Analysis Data</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add topographic surveys, solar studies, and grading plans to analyze the building site.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Analysis
          </Button>
        </Card>
      )}
    </div>
  );
}
