'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { BOMTable, type BOMItem } from '@/components/bom-table';
import { BOMCategorySummary } from '@/components/bom-category-summary';
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Progress,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  FileDown,
  RefreshCw,
  Loader2,
  Truck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function BOMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const autoTriggeredRef = useRef(false);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [selectedFloorPlanJob, setSelectedFloorPlanJob] = useState('');

  const { data: variants = [], isLoading: loadingVariants } =
    trpc.designVariant.listByProject.useQuery({ projectId });
  const { data: bomResults = [], isLoading: loadingBom } =
    trpc.bom.listByProject.useQuery({ projectId });

  // Fetch completed floor plan digitization jobs for structural BOM
  const { data: floorPlanJobs = [] } = trpc.floorPlan.listDigitizationJobs.useQuery(
    { projectId },
  );

  // Fetch uploads to resolve floor plan names
  const { data: projectUploads = [] } = trpc.upload.listByProject.useQuery({ projectId });
  const uploadById: Record<string, any> = {};
  for (const u of projectUploads) uploadById[u.id] = u;

  /** Get a human-friendly name for a floor plan digitization job. */
  const getFloorPlanJobLabel = (fpJob: any) => {
    const input = fpJob.inputJson as any;
    const output = fpJob.outputJson as any;
    const upload = input?.uploadId ? uploadById[input.uploadId] : null;
    const roomCount = output?.detectedRooms?.length ?? output?.rooms?.length ?? 0;
    const name = upload?.label || 'Floor Plan';
    return `${name} (${roomCount} rooms)`;
  };

  // Load previously completed structural BOM jobs (cross-session persistence)
  const { data: structuralBomJobs = [] } = trpc.bom.listStructuralBomJobs.useQuery(
    { projectId },
  );

  const generateBom = trpc.bom.generate.useMutation({
    onSuccess: (job) => {
      setActiveJobId(job!.id);
      setGenerateOpen(false);
      toast({ title: 'BOM generation started' });
    },
    onError: (err) => {
      toast({ title: 'Failed to start BOM generation', description: err.message });
    },
  });

  const generateStructuralBom = trpc.bom.generateFromFloorPlan.useMutation({
    onSuccess: (job) => {
      setActiveJobId(job!.id);
      toast({ title: 'Structural BOM generation started' });
    },
    onError: (err) => {
      toast({ title: 'Failed to start structural BOM generation', description: err.message });
    },
  });

  // Auto-trigger BOM generation when arriving from floor plan page with fpJobId param
  const fpJobIdFromUrl = searchParams.get('fpJobId');
  useEffect(() => {
    if (
      fpJobIdFromUrl &&
      floorPlanJobs.length > 0 &&
      !autoTriggeredRef.current &&
      !activeJobId
    ) {
      const matchingJob = floorPlanJobs.find((j: any) => j.id === fpJobIdFromUrl);
      if (matchingJob) {
        autoTriggeredRef.current = true;
        setSelectedFloorPlanJob(fpJobIdFromUrl);
        generateStructuralBom.mutate({
          projectId,
          floorPlanJobId: fpJobIdFromUrl,
          budgetTier: 'mid_range',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fpJobIdFromUrl, floorPlanJobs.length, activeJobId, projectId]);

  const deleteBom = trpc.bom.delete.useMutation({
    onSuccess: () => {
      utils.bom.listByProject.invalidate({ projectId });
      setSelectedBomId(null);
      toast({ title: 'BOM deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete BOM', description: err.message });
    },
  });

  const handleDelete = (bomId: string) => {
    deleteBom.mutate({ bomResultId: bomId });
  };

  const { data: jobStatus } = trpc.bom.jobStatus.useQuery(
    { jobId: activeJobId! },
    {
      enabled: Boolean(activeJobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === 'completed' || status === 'failed') return false;
        return 2000;
      },
    },
  );

  // Track structural BOM data from job output
  const [structuralBomData, setStructuralBomData] = useState<any>(null);

  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      utils.bom.listByProject.invalidate({ projectId });
      utils.bom.listStructuralBomJobs.invalidate({ projectId });
      // Check if this was a structural BOM job with inline data
      const output = (jobStatus as any).outputJson;
      if ((output?.source === 'inline_structural_bom' || output?.source === 'ai_structural_bom') && output?.items) {
        // Resolve the floor plan name from the input
        const inputJson = (jobStatus as any).inputJson;
        const fpUpload = inputJson?.uploadId ? uploadById[inputJson.uploadId] : null;
        const fpName = fpUpload?.label || 'Floor Plan';
        setStructuralBomData({
          id: (jobStatus as any).id || 'structural',
          items: output.items,
          totalCost: output.totalCost,
          currency: output.currency || 'INR',
          createdAt: (jobStatus as any).completedAt || new Date().toISOString(),
          variantName: `Structural BOM — ${fpName}`,
          roomName: `${output.roomCount || 0} rooms`,
        });
      }
      setActiveJobId(null);
      toast({ title: 'BOM generation complete' });
    } else if (jobStatus?.status === 'failed') {
      setActiveJobId(null);
      toast({ title: 'BOM generation failed', description: jobStatus.error || 'Unknown error' });
    }
  }, [jobStatus?.status, projectId, utils.bom.listByProject, utils.bom.listStructuralBomJobs, jobStatus?.error]);

  const handleGenerate = () => {
    if (!selectedVariant) return;
    generateBom.mutate({ designVariantId: selectedVariant });
  };

  // Parse BOM items from the selected or most recent result
  // Include structural BOM data from inline fallback and historical jobs
  const historicalStructuralBoms = structuralBomJobs
    .filter((j: any) => {
      const out = j.outputJson as any;
      return (out?.source === 'inline_structural_bom' || out?.source === 'ai_structural_bom') && out?.items?.length > 0;
    })
    .map((j: any) => {
      const out = j.outputJson as any;
      const inp = j.inputJson as any;
      const fpUpload = inp?.uploadId ? uploadById[inp.uploadId] : null;
      const fpName = fpUpload?.label || 'Floor Plan';
      return {
        id: j.id,
        items: out.items,
        totalCost: out.totalCost,
        currency: out.currency || 'INR',
        createdAt: j.completedAt || j.createdAt,
        variantName: `Structural BOM — ${fpName}`,
        roomName: `${out.roomCount || 0} rooms`,
      };
    });

  // Merge: active session data + historical + regular BOM results
  const structuralBoms = structuralBomData
    ? [structuralBomData, ...historicalStructuralBoms.filter((h: any) => h.id !== structuralBomData.id)]
    : historicalStructuralBoms;
  const allBomResults = [...structuralBoms, ...bomResults];
  const activeBom = selectedBomId
    ? allBomResults.find((b: any) => b.id === selectedBomId) || allBomResults[0]
    : allBomResults.length > 0 ? allBomResults[0] : null;
  const bomItems: BOMItem[] = activeBom?.items
    ? (activeBom.items as BOMItem[])
    : [];

  const categoryData = bomItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.total;
    return acc;
  }, {});

  const categorySummary = Object.entries(categoryData).map(([category, total]) => ({
    category,
    total,
  }));

  const currency = activeBom?.currency || 'USD';

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (bomItems.length === 0) {
      toast({ title: 'No BOM data to export' });
      return;
    }

    if (format === 'csv') {
      const headers = ['Item', 'Category', 'Specification', 'Quantity', 'Unit', 'Unit Price', 'Total', 'Waste Factor'];
      const rows = bomItems.map((item) => [
        item.name,
        item.category,
        item.specification,
        item.quantity.toString(),
        item.unit,
        item.unitPrice.toFixed(2),
        item.total.toFixed(2),
        (item.wasteFactor * 100).toFixed(1) + '%',
      ]);
      const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bom-${projectId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV exported' });
    } else if (activeBom) {
      const exportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      window.open(`/api/bom/export/${activeBom.id}?format=${exportFormat}`, '_blank');
      toast({ title: `${format.toUpperCase()} export started` });
    }
  };

  if (loadingVariants || loadingBom) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bill of Materials</h1>
          <p className="text-sm text-muted-foreground">
            Auto-generated material lists with quantities and costs.
            {bomResults.length > 0 && (
              <> {bomResults.length} BOM{bomResults.length !== 1 ? 's' : ''} generated.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          {bomItems.length > 0 && (
            <>
              <Link href={`/project/${projectId}/procurement`}>
                <Button variant="outline" size="sm">
                  <Truck className="mr-1 h-4 w-4" />
                  Procurement
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <FileDown className="mr-1 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <FileText className="mr-1 h-4 w-4" />
                PDF
              </Button>
            </>
          )}

          {/* Generate BOM dialog */}
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={variants.length === 0 || Boolean(activeJobId)}>
                {activeJobId ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Generate BOM
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Bill of Materials</DialogTitle>
                <DialogDescription>
                  Select a design variant to generate a BOM from. This will calculate
                  material quantities and costs based on the design.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select design variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant: any) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} ({variant.roomName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateBom.isPending || !selectedVariant}
                >
                  {generateBom.isPending ? 'Starting...' : 'Generate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Job progress indicator */}
      {activeJobId && jobStatus && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Generating BOM...</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {jobStatus.status}
              </Badge>
            </div>
            <Progress value={jobStatus.progress || 0} />
            <p className="mt-1 text-xs text-muted-foreground">
              {jobStatus.progress || 0}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* BOM content */}
      {bomItems.length > 0 ? (
        <div className="space-y-6">
          {/* Category cost breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
              <CardDescription>
                Material cost distribution across {categorySummary.length} categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BOMCategorySummary categories={categorySummary} currency={currency} />
            </CardContent>
          </Card>

          <Separator />

          {/* BOM selector and metadata */}
          {activeBom && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Generated: {new Date(activeBom.createdAt).toLocaleDateString()}
                </span>
                {'variantName' in activeBom && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>Variant: {(activeBom as { variantName: string }).variantName}</span>
                  </>
                )}
                {'roomName' in activeBom && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>Room: {(activeBom as { roomName: string }).roomName}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {allBomResults.length > 1 && (
                  <Select
                    value={activeBom.id}
                    onValueChange={(val) => setSelectedBomId(val)}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBomResults.map((bom: any) => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.variantName || 'Variant'} — {new Date(bom.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteBom.isPending}
                  onClick={() => handleDelete(activeBom.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Full BOM table */}
          <BOMTable items={bomItems} currency={currency} />
        </div>
      ) : (
        /* Empty state */
        <div className="space-y-6">
          {/* Variant status */}
          {/* Structural BOM from Floor Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate BOM from Floor Plan</CardTitle>
              <CardDescription>
                Create a structural BOM directly from your digitized floor plan
                -- no design variant needed. Upload a DWG, DXF, PDF, or image
                floor plan first via the Floor Plan page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {floorPlanJobs.length > 0 ? (
                <>
                  <Select value={selectedFloorPlanJob} onValueChange={setSelectedFloorPlanJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a completed floor plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {floorPlanJobs.map((fpJob: any) => (
                        <SelectItem key={fpJob.id} value={fpJob.id}>
                          {getFloorPlanJobLabel(fpJob)} &mdash; {new Date(fpJob.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => generateStructuralBom.mutate({
                      projectId,
                      floorPlanJobId: selectedFloorPlanJob,
                      budgetTier: 'mid_range',
                    })}
                    disabled={generateStructuralBom.isPending || Boolean(activeJobId) || !selectedFloorPlanJob}
                    variant="outline"
                  >
                    {generateStructuralBom.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-1 h-4 w-4" />
                    )}
                    Generate Structural BOM
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No completed floor plan digitizations found. Go to the Floor Plan page, upload a file, and digitize it first.
                </p>
              )}
            </CardContent>
          </Card>

          {variants.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BOM Status by Design Variant</CardTitle>
                <CardDescription>
                  {variants.length} variant{variants.length !== 1 ? 's' : ''} available for BOM generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {variants.map((variant: any) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{variant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {variant.roomName} &middot; {variant.style} &middot; {variant.budgetTier}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(activeJobId)}
                        onClick={() => {
                          setSelectedVariant(variant.id);
                          setGenerateOpen(true);
                        }}
                      >
                        Generate
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">No Design Variants</h2>
              <p className="text-sm text-muted-foreground">
                Create design variants in the Designs tab first. BOM will be calculated from each variant.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
