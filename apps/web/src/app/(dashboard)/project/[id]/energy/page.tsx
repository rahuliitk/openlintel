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
  Zap,
  Plus,
  Loader2,
  Thermometer,
  Sun,
  Wind,
  Snowflake,
  Flame,
  Leaf,
  Calculator,
  Trash2,
  TrendingDown,
  BarChart3,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const MODEL_TYPES = [
  { value: 'heating_load', label: 'Heating Load' },
  { value: 'cooling_load', label: 'Cooling Load' },
  { value: 'lighting_load', label: 'Lighting Load' },
  { value: 'insulation', label: 'Insulation R-Value' },
  { value: 'window_ratio', label: 'Window-to-Wall Ratio' },
  { value: 'thermal_bridge', label: 'Thermal Bridging' },
  { value: 'passive_solar', label: 'Passive Solar Design' },
  { value: 'ventilation', label: 'Natural Ventilation' },
  { value: 'solar_panel', label: 'Solar Panel Placement' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  calculating: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  optimized: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

function formatEnergy(value: number, unit: string): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
  return `${value.toFixed(0)} ${unit}`;
}

/* ─── Page Component ────────────────────────────────────────── */

export default function EnergyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState('heating_load');
  const [rValue, setRValue] = useState('');
  const [windowWallRatio, setWindowWallRatio] = useState('');
  const [orientation, setOrientation] = useState('south');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: models = [], isLoading } = trpc.energy.list.useQuery({ projectId });
  const { data: summary } = trpc.energy.getSummary.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createModel = trpc.energy.create.useMutation({
    onSuccess: () => {
      utils.energy.list.invalidate();
      utils.energy.getSummary.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Model created', description: 'Energy model has been added for simulation.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create model', description: err.message, variant: 'destructive' });
    },
  });

  const runSimulation = trpc.energy.simulate.useMutation({
    onSuccess: (data) => {
      utils.energy.list.invalidate();
      utils.energy.getSummary.invalidate();
      toast({
        title: 'Simulation complete',
        description: `HERS score: ${data.hersScore}. Annual energy: ${formatEnergy(data.annualKwh, 'kWh')}.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Simulation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteModel = trpc.energy.delete.useMutation({
    onSuccess: () => {
      utils.energy.list.invalidate();
      utils.energy.getSummary.invalidate();
      toast({ title: 'Model deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setModelName('');
    setModelType('heating_load');
    setRValue('');
    setWindowWallRatio('');
    setOrientation('south');
    setNotes('');
  }

  function handleCreate() {
    if (!modelName) return;
    createModel.mutate({
      projectId,
      name: modelName,
      modelType,
      rValue: rValue ? parseFloat(rValue) : undefined,
      windowWallRatio: windowWallRatio ? parseFloat(windowWallRatio) : undefined,
      orientation,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const hersScore = summary?.hersScore ?? null;
  const annualKwh = summary?.annualKwh ?? 0;
  const heatingBtu = summary?.heatingBtu ?? 0;
  const coolingBtu = summary?.coolingBtu ?? 0;
  const netZeroGap = summary?.netZeroGapKwh ?? null;

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
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Energy Modeling</h1>
            <p className="text-sm text-muted-foreground">
              Whole-building energy simulation, passive design, and net-zero pathway analysis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSimulation.mutate({ projectId })}
            disabled={runSimulation.isPending || models.length === 0}
          >
            {runSimulation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-1 h-4 w-4" />
            )}
            Run Simulation
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Energy Model</DialogTitle>
                <DialogDescription>
                  Define insulation, window ratios, and passive design parameters.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emName">Model Name</Label>
                    <Input
                      id="emName"
                      placeholder="e.g. Baseline Envelope"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model Type</Label>
                    <Select value={modelType} onValueChange={setModelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_TYPES.map((mt) => (
                          <SelectItem key={mt.value} value={mt.value}>
                            {mt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rValue">R-Value</Label>
                    <Input
                      id="rValue"
                      type="number"
                      placeholder="e.g. 38"
                      value={rValue}
                      onChange={(e) => setRValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wwr">Window-Wall %</Label>
                    <Input
                      id="wwr"
                      type="number"
                      placeholder="e.g. 15"
                      value={windowWallRatio}
                      onChange={(e) => setWindowWallRatio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Orientation</Label>
                    <Select value={orientation} onValueChange={setOrientation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['north', 'south', 'east', 'west'].map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.charAt(0).toUpperCase() + o.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emNotes">Notes</Label>
                  <Textarea
                    id="emNotes"
                    placeholder="Describe building envelope, thermal mass, etc."
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
                <Button onClick={handleCreate} disabled={createModel.isPending || !modelName}>
                  {createModel.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Model'
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
                <p className="text-sm text-muted-foreground">HERS Score</p>
                <p className={`text-2xl font-bold ${hersScore != null && hersScore <= 50 ? 'text-green-600' : hersScore != null && hersScore <= 100 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                  {hersScore ?? '--'}
                </p>
              </div>
              <Leaf className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Annual Energy</p>
                <p className="text-2xl font-bold text-blue-600">{formatEnergy(annualKwh, 'kWh')}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heating Load</p>
                <p className="text-2xl font-bold text-red-600">{formatEnergy(heatingBtu, 'BTU')}</p>
              </div>
              <Flame className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cooling Load</p>
                <p className="text-2xl font-bold text-cyan-600">{formatEnergy(coolingBtu, 'BTU')}</p>
              </div>
              <Snowflake className="h-8 w-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Net Zero Pathway ────────────────────────────────── */}
      {netZeroGap != null && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className={`h-6 w-6 ${netZeroGap <= 0 ? 'text-green-600' : 'text-amber-600'}`} />
              <div>
                <p className="text-sm font-medium">Net-Zero Pathway</p>
                <p className={`text-xs ${netZeroGap <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {netZeroGap <= 0
                    ? 'Net-zero energy achieved! Surplus: ' + formatEnergy(Math.abs(netZeroGap), 'kWh')
                    : 'Gap to net-zero: ' + formatEnergy(netZeroGap, 'kWh') + '/year. Consider additional solar panels.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Model Cards ─────────────────────────────────────── */}
      {models.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model: any) => (
            <Card key={model.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{model.name}</CardTitle>
                    <CardDescription className="mt-0.5 capitalize">
                      {model.modelType.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[model.status] || ''}`}>
                    {model.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {model.rValue != null && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Thermometer className="h-3 w-3" />
                      R-{model.rValue}
                    </div>
                  )}
                  {model.windowWallRatio != null && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      WWR: {model.windowWallRatio}%
                    </div>
                  )}
                  {model.orientation && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                      <Wind className="h-3 w-3" />
                      {model.orientation}
                    </div>
                  )}
                </div>
                {model.result && (
                  <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                    {model.result.energyKwh != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="font-medium">{formatEnergy(model.result.energyKwh, 'kWh')}</span>
                      </div>
                    )}
                    {model.result.savings != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Savings</span>
                        <span className="font-medium text-green-600">{model.result.savings}%</span>
                      </div>
                    )}
                  </div>
                )}
                {model.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{model.notes}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteModel.mutate({ id: model.id })}
                    disabled={deleteModel.isPending}
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
          <Zap className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Energy Models</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create energy models to simulate heating/cooling loads and optimize for net-zero.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Model
          </Button>
        </Card>
      )}
    </div>
  );
}
