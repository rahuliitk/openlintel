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
  Separator,
  toast,
} from '@openlintel/ui';
import {
  BarChart3,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  MapPin,
  RefreshCw,
  Info,
  ArrowUpDown,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const COST_CATEGORIES = [
  { value: 'per_sqft_construction', label: 'Construction Cost / sqft' },
  { value: 'per_sqft_finish', label: 'Finish Cost / sqft' },
  { value: 'kitchen_remodel', label: 'Kitchen Remodel' },
  { value: 'bathroom_remodel', label: 'Bathroom Remodel' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'hvac', label: 'HVAC System' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'windows_doors', label: 'Windows & Doors' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'landscape', label: 'Landscaping' },
  { value: 'permits', label: 'Permits & Fees' },
  { value: 'architect_fee', label: 'Architect Fee (% of project)' },
] as const;

const QUALITY_LEVELS = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid_range', label: 'Mid-Range' },
  { value: 'upscale', label: 'Upscale' },
  { value: 'luxury', label: 'Luxury' },
] as const;

function getTrendIcon(trend: number) {
  if (trend > 2) return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (trend < -2) return <TrendingDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function getPositionLabel(percentile: number): string {
  if (percentile <= 25) return 'Below Market';
  if (percentile <= 75) return 'At Market';
  return 'Above Market';
}

function getPositionColor(percentile: number): string {
  if (percentile <= 25) return 'text-green-600';
  if (percentile <= 75) return 'text-blue-600';
  return 'text-red-600';
}

/* ─── Page Component ────────────────────────────────────────── */

export default function BenchmarksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [yourCost, setYourCost] = useState('');
  const [qualityLevel, setQualityLevel] = useState('');
  const [zipCode, setZipCode] = useState('');

  const { data: benchmarks = [], isLoading } = trpc.benchmarks.list.useQuery({ projectId });

  const addBenchmark = trpc.benchmarks.add.useMutation({
    onSuccess: () => {
      utils.benchmarks.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Benchmark added', description: 'Market rate comparison has been generated.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add benchmark', description: err.message, variant: 'destructive' });
    },
  });

  const refreshAll = trpc.benchmarks.refreshAll.useMutation({
    onSuccess: () => {
      utils.benchmarks.list.invalidate({ projectId });
      toast({ title: 'Benchmarks refreshed' });
    },
  });

  function resetForm() {
    setCategory('');
    setYourCost('');
    setQualityLevel('');
    setZipCode('');
  }

  function handleAdd() {
    if (!category || !yourCost) return;
    addBenchmark.mutate({
      projectId,
      category,
      yourCost: parseFloat(yourCost),
      qualityLevel: qualityLevel || undefined,
      zipCode: zipCode || undefined,
    });
  }

  const belowMarket = benchmarks.filter((b: any) => (b.percentile || 50) <= 25).length;
  const aboveMarket = benchmarks.filter((b: any) => (b.percentile || 50) > 75).length;

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
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Market Rate Benchmarking</h1>
            <p className="text-sm text-muted-foreground">
              Compare your project costs against market rates by category and quality level.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {benchmarks.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => refreshAll.mutate({ projectId })} disabled={refreshAll.isPending}>
              {refreshAll.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              Refresh Rates
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Benchmark
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Cost Benchmark</DialogTitle>
                <DialogDescription>Compare your cost against market rates.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Cost Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {COST_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yourCost">Your Cost ($)</Label>
                    <Input id="yourCost" type="number" placeholder="150" value={yourCost} onChange={(e) => setYourCost(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quality Level</Label>
                    <Select value={qualityLevel} onValueChange={setQualityLevel}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {QUALITY_LEVELS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code (for local rates)</Label>
                  <Input id="zip" placeholder="90210" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addBenchmark.isPending || !category || !yourCost}>
                  {addBenchmark.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Comparing...</> : 'Compare'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      {benchmarks.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Benchmarks</p><p className="text-2xl font-bold">{benchmarks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Below Market</p><p className="text-2xl font-bold text-green-600">{belowMarket}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Above Market</p><p className="text-2xl font-bold text-red-600">{aboveMarket}</p></CardContent></Card>
        </div>
      )}

      {/* Benchmarks List */}
      {benchmarks.length > 0 ? (
        <div className="space-y-3">
          {benchmarks.map((benchmark: any) => {
            const percentile = benchmark.percentile || 50;
            const posLabel = getPositionLabel(percentile);
            const posColor = getPositionColor(percentile);
            const marketLow = benchmark.marketLow || 0;
            const marketHigh = benchmark.marketHigh || 0;
            const marketMedian = benchmark.marketMedian || 0;
            return (
              <Card key={benchmark.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{benchmark.category?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        <p className="text-xs text-muted-foreground">
                          {benchmark.qualityLevel && <span>{benchmark.qualityLevel?.replace(/_/g, ' ')} &middot; </span>}
                          {benchmark.zipCode && <><MapPin className="inline h-3 w-3" /> {benchmark.zipCode}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold">${(benchmark.yourCost || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Your Cost</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="text-right">
                        <p className="text-sm">${marketLow.toLocaleString()} - ${marketHigh.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Market Range (Median: ${marketMedian.toLocaleString()})</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="flex items-center gap-2">
                        {getTrendIcon(benchmark.yearOverYearPct || 0)}
                        <div className="text-right">
                          <p className={`text-sm font-bold ${posColor}`}>{posLabel}</p>
                          <p className="text-[10px] text-muted-foreground">{percentile}th percentile</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-3 relative h-2 rounded-full bg-muted">
                    <div className="absolute left-0 h-full rounded-full bg-gradient-to-r from-green-300 via-yellow-300 to-red-300" style={{ width: '100%' }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow"
                      style={{ left: `${Math.min(Math.max(percentile, 2), 98)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Benchmarks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Compare your project costs against market rates to ensure competitive pricing.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Benchmark
          </Button>
        </Card>
      )}
    </div>
  );
}
