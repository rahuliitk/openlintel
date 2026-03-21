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
  Progress,
  toast,
} from '@openlintel/ui';
import {
  TrendingUp,
  Plus,
  Loader2,
  DollarSign,
  Home,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Trash2,
  RefreshCw,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const IMPROVEMENT_TYPES = [
  { value: 'kitchen_remodel', label: 'Kitchen Remodel' },
  { value: 'bathroom_remodel', label: 'Bathroom Remodel' },
  { value: 'addition', label: 'Room Addition' },
  { value: 'basement_finish', label: 'Basement Finish' },
  { value: 'roof_replacement', label: 'Roof Replacement' },
  { value: 'window_replacement', label: 'Window Replacement' },
  { value: 'siding', label: 'Siding / Exterior' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'deck_patio', label: 'Deck / Patio' },
  { value: 'hvac', label: 'HVAC Upgrade' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'adu', label: 'ADU / In-Law Suite' },
  { value: 'solar', label: 'Solar Panels' },
  { value: 'smart_home', label: 'Smart Home Tech' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function PropertyValuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [improvementType, setImprovementType] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [expectedRoiPct, setExpectedRoiPct] = useState('');

  const { data: analysis, isLoading } = trpc.propertyValue.getAnalysis.useQuery({ projectId });
  const { data: improvements = [] } = trpc.propertyValue.listImprovements.useQuery({ projectId });

  const addImprovement = trpc.propertyValue.addImprovement.useMutation({
    onSuccess: () => {
      utils.propertyValue.listImprovements.invalidate({ projectId });
      utils.propertyValue.getAnalysis.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Improvement added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add improvement', description: err.message, variant: 'destructive' });
    },
  });

  const deleteImprovement = trpc.propertyValue.deleteImprovement.useMutation({
    onSuccess: () => {
      utils.propertyValue.listImprovements.invalidate({ projectId });
      utils.propertyValue.getAnalysis.invalidate({ projectId });
      toast({ title: 'Improvement removed' });
    },
  });

  const refreshAnalysis = trpc.propertyValue.refreshAnalysis.useMutation({
    onSuccess: () => {
      utils.propertyValue.getAnalysis.invalidate({ projectId });
      toast({ title: 'Analysis refreshed', description: 'Property valuations have been recalculated.' });
    },
  });

  function resetForm() {
    setImprovementType('');
    setDescription('');
    setEstimatedCost('');
    setExpectedRoiPct('');
  }

  function handleAdd() {
    if (!improvementType || !estimatedCost) return;
    addImprovement.mutate({
      projectId,
      improvementType,
      description: description || undefined,
      estimatedCost: parseFloat(estimatedCost),
      expectedRoiPct: expectedRoiPct ? parseFloat(expectedRoiPct) : undefined,
    });
  }

  const totalCost = improvements.reduce((sum: number, i: any) => sum + (i.estimatedCost || 0), 0);
  const totalValueAdd = improvements.reduce((sum: number, i: any) => sum + ((i.estimatedCost || 0) * ((i.expectedRoiPct || 0) / 100)), 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
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
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ROI &amp; Property Valuation</h1>
            <p className="text-sm text-muted-foreground">
              Analyze return on investment for planned improvements and track property value impact.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshAnalysis.mutate({ projectId })} disabled={refreshAnalysis.isPending}>
            {refreshAnalysis.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Improvement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Improvement</DialogTitle>
                <DialogDescription>Add a planned improvement to analyze its ROI and property value impact.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Improvement Type</Label>
                  <Select value={improvementType} onValueChange={setImprovementType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {IMPROVEMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} placeholder="Scope of the improvement..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost">Estimated Cost ($)</Label>
                    <Input id="cost" type="number" placeholder="25000" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roi">Expected ROI (%)</Label>
                    <Input id="roi" type="number" placeholder="75" value={expectedRoiPct} onChange={(e) => setExpectedRoiPct(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addImprovement.isPending || !improvementType || !estimatedCost}>
                  {addImprovement.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Improvement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Valuation Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold">${(analysis?.currentValue || 0).toLocaleString()}</p>
              </div>
              <Home className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">After Improvements</p>
                <p className="text-2xl font-bold text-green-600">${((analysis?.currentValue || 0) + totalValueAdd).toLocaleString()}</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Value Added</p>
                <p className={`text-2xl font-bold ${totalValueAdd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalValueAdd.toLocaleString()}
                </p>
              </div>
              {totalValueAdd >= 0 ? <ArrowUpRight className="h-8 w-8 text-green-400" /> : <ArrowDownRight className="h-8 w-8 text-red-400" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvements List */}
      {improvements.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Planned Improvements</h2>
          {improvements.map((imp: any) => {
            const valueAdd = (imp.estimatedCost || 0) * ((imp.expectedRoiPct || 0) / 100);
            const roiPositive = (imp.expectedRoiPct || 0) >= 100;
            return (
              <Card key={imp.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{imp.improvementType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                      {imp.description && <p className="text-xs text-muted-foreground">{imp.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">${(imp.estimatedCost || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Cost</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${roiPositive ? 'text-green-600' : 'text-yellow-600'}`}>{imp.expectedRoiPct || 0}%</p>
                      <p className="text-xs text-muted-foreground">ROI</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${valueAdd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {valueAdd >= 0 ? '+' : ''}${valueAdd.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Value Add</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteImprovement.mutate({ id: imp.id })}>
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
          <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Improvements Planned</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add planned improvements to analyze their ROI and impact on property value.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Improvement
          </Button>
        </Card>
      )}
    </div>
  );
}
