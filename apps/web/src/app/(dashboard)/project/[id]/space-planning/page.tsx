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
  Progress,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  LayoutGrid,
  Plus,
  Loader2,
  Sparkles,
  CheckCircle,
  Star,
  ArrowLeftRight,
  SquareStack,
  Maximize,
  Trash2,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const PLAN_STYLES = [
  { value: 'open_concept', label: 'Open Concept' },
  { value: 'traditional', label: 'Traditional / Defined Rooms' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'loft', label: 'Loft Style' },
  { value: 'split_level', label: 'Split Level' },
] as const;

const OPTIMIZATION_GOALS = [
  { value: 'maximize_space', label: 'Maximize Usable Space' },
  { value: 'natural_light', label: 'Natural Light' },
  { value: 'privacy', label: 'Privacy Between Zones' },
  { value: 'flow', label: 'Traffic Flow' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'energy', label: 'Energy Efficiency' },
] as const;

const SCORE_COLORS: Record<string, string> = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-red-600',
};

function getScoreLabel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SpacePlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [planStyle, setPlanStyle] = useState('');
  const [totalSqft, setTotalSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('2');
  const [optimizationGoal, setOptimizationGoal] = useState('');
  const [constraints, setConstraints] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: variants = [], isLoading } = trpc.spacePlanning.listVariants.useQuery({ projectId });

  const generateVariant = trpc.spacePlanning.generate.useMutation({
    onSuccess: () => {
      utils.spacePlanning.listVariants.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Plan variant generated', description: 'AI has created a new space plan variant.' });
    },
    onError: (err) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const selectVariant = trpc.spacePlanning.selectVariant.useMutation({
    onSuccess: () => {
      utils.spacePlanning.listVariants.invalidate({ projectId });
      toast({ title: 'Variant selected as active plan' });
    },
  });

  const deleteVariant = trpc.spacePlanning.deleteVariant.useMutation({
    onSuccess: () => {
      utils.spacePlanning.listVariants.invalidate({ projectId });
      toast({ title: 'Variant removed' });
    },
  });

  function resetForm() {
    setPlanStyle('');
    setTotalSqft('');
    setBedrooms('3');
    setBathrooms('2');
    setOptimizationGoal('');
    setConstraints('');
  }

  function handleGenerate() {
    if (!planStyle || !totalSqft) return;
    generateVariant.mutate({
      projectId,
      planStyle,
      totalSqft: parseInt(totalSqft),
      bedrooms: parseInt(bedrooms) || 3,
      bathrooms: parseInt(bathrooms) || 2,
      optimizationGoal: optimizationGoal || undefined,
      constraints: constraints || undefined,
    });
  }

  function toggleCompare(variantId: string) {
    setCompareIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : prev.length < 3 ? [...prev, variantId] : prev
    );
  }

  const comparedVariants = variants.filter((v: any) => compareIds.includes(v.id));

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Space Planning</h1>
            <p className="text-sm text-muted-foreground">
              Generate and compare AI-powered floor plan variants optimized for your needs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {compareIds.length >= 2 && (
            <Button size="sm" variant="outline" onClick={() => setCompareIds([])}>
              <ArrowLeftRight className="mr-1 h-4 w-4" />
              Clear Compare ({compareIds.length})
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Sparkles className="mr-1 h-4 w-4" />
                Generate Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Space Plan</DialogTitle>
                <DialogDescription>Let AI create an optimized floor plan based on your requirements.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan Style</Label>
                    <Select value={planStyle} onValueChange={setPlanStyle}>
                      <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                      <SelectContent>
                        {PLAN_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sqft">Total Square Feet</Label>
                    <Input id="sqft" type="number" placeholder="2400" value={totalSqft} onChange={(e) => setTotalSqft(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="beds">Bedrooms</Label>
                    <Input id="beds" type="number" min="1" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baths">Bathrooms</Label>
                    <Input id="baths" type="number" min="1" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Optimize For</Label>
                    <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                      <SelectTrigger><SelectValue placeholder="Goal" /></SelectTrigger>
                      <SelectContent>
                        {OPTIMIZATION_GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constraints">Additional Constraints</Label>
                  <Textarea id="constraints" rows={2} placeholder="e.g. Master bedroom must face south, open kitchen to living..." value={constraints} onChange={(e) => setConstraints(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={generateVariant.isPending || !planStyle || !totalSqft}>
                  {generateVariant.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-1 h-4 w-4" /> Generate</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Comparison Panel */}
      {comparedVariants.length >= 2 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Side-by-Side Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparedVariants.length}, 1fr)` }}>
              {comparedVariants.map((v: any) => (
                <div key={v.id} className="space-y-2 text-center">
                  <p className="text-sm font-medium">{v.name}</p>
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span>Space Efficiency</span><span className="font-bold">{v.scores?.spaceEfficiency || '--'}%</span></div>
                    <div className="flex justify-between"><span>Natural Light</span><span className="font-bold">{v.scores?.naturalLight || '--'}%</span></div>
                    <div className="flex justify-between"><span>Flow Score</span><span className="font-bold">{v.scores?.flow || '--'}%</span></div>
                    <div className="flex justify-between"><span>Privacy</span><span className="font-bold">{v.scores?.privacy || '--'}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variants Grid */}
      {variants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant: any) => {
            const overallScore = variant.overallScore || 0;
            const scoreLabel = getScoreLabel(overallScore);
            const isComparing = compareIds.includes(variant.id);
            return (
              <Card key={variant.id} className={`relative ${isComparing ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{variant.name || `Variant ${variant.id.slice(0, 6)}`}</CardTitle>
                      <CardDescription>
                        {variant.planStyle?.replace(/_/g, ' ')} &middot; {variant.totalSqft?.toLocaleString()} sqft
                      </CardDescription>
                    </div>
                    {variant.isSelected && (
                      <Badge className="bg-green-100 text-green-800 text-[10px]">
                        <Star className="mr-0.5 h-3 w-3" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Plan preview placeholder */}
                  <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                    <SquareStack className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {/* Scores */}
                  <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Overall Score</span>
                      <span className={`text-sm font-bold ${SCORE_COLORS[scoreLabel]}`}>{overallScore}%</span>
                    </div>
                    <Progress value={overallScore} className="h-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">Rooms</span><span>{variant.bedrooms || 0}BR / {variant.bathrooms || 0}BA</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Efficiency</span><span>{variant.scores?.spaceEfficiency || '--'}%</span></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toggleCompare(variant.id)}>
                      <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                      {isComparing ? 'Remove' : 'Compare'}
                    </Button>
                    {!variant.isSelected && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => selectVariant.mutate({ id: variant.id })}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Select
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteVariant.mutate({ id: variant.id })}>
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
          <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Space Plan Variants</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate AI-powered floor plan variants to explore different layouts and optimize your space.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Sparkles className="mr-1 h-4 w-4" />
            Generate Variant
          </Button>
        </Card>
      )}
    </div>
  );
}
