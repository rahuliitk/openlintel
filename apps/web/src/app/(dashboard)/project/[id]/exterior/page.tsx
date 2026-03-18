'use client';

import { use, useState, useEffect } from 'react';
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
  Home,
  Plus,
  Loader2,
  Paintbrush,
  TreePine,
  Sun,
  Palette,
  Image,
  Wand2,
  Eye,
  Trash2,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ELEVATION_TYPES = [
  { value: 'front', label: 'Front Elevation' },
  { value: 'rear', label: 'Rear Elevation' },
  { value: 'left', label: 'Left Side' },
  { value: 'right', label: 'Right Side' },
] as const;

const ROOF_STYLES = [
  'hip', 'gable', 'mansard', 'flat', 'butterfly', 'shed', 'gambrel', 'dutch_gable',
] as const;

const FACADE_MATERIALS = [
  'brick', 'stone', 'stucco', 'vinyl_siding', 'wood_siding', 'fiber_cement',
  'metal_cladding', 'glass', 'concrete', 'composite',
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  generating: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function ExteriorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDesign, setViewDesign] = useState<any>(null);
  const [elevationType, setElevationType] = useState('front');
  const [roofStyle, setRoofStyle] = useState('gable');
  const [facadeMaterial, setFacadeMaterial] = useState('brick');
  const [description, setDescription] = useState('');
  const [landscapeNotes, setLandscapeNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: designs = [], isLoading } = trpc.exterior.list.useQuery(
    { projectId },
    {
      // Auto-poll every 3s while any design is generating
      refetchInterval: (query) => {
        const data = query.state.data as any[] | undefined;
        const hasGenerating = data?.some((d: any) => d.status === 'generating');
        return hasGenerating ? 3000 : false;
      },
    },
  );

  /* ── Mutations ────────────────────────────────────────────── */
  const createDesign = trpc.exterior.create.useMutation({
    onSuccess: () => {
      utils.exterior.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Exterior design created', description: 'AI generation has been triggered.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create design', description: err.message, variant: 'destructive' });
    },
  });

  const generateAI = trpc.exterior.generate.useMutation({
    onSuccess: () => {
      utils.exterior.list.invalidate();
      toast({ title: 'AI generation started', description: 'Your exterior render will be ready shortly.' });
    },
    onError: (err) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteDesign = trpc.exterior.delete.useMutation({
    onSuccess: () => {
      utils.exterior.list.invalidate();
      toast({ title: 'Design deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setElevationType('front');
    setRoofStyle('gable');
    setFacadeMaterial('brick');
    setDescription('');
    setLandscapeNotes('');
  }

  function handleCreate() {
    createDesign.mutate({
      projectId,
      elevationType,
      roofStyle,
      facadeMaterial,
      description: description || undefined,
      landscapeNotes: landscapeNotes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalDesigns = designs.length;
  const completedDesigns = designs.filter((d: any) => d.status === 'completed' || d.status === 'approved').length;
  const generatingCount = designs.filter((d: any) => d.status === 'generating').length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
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
          <Home className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exterior Design</h1>
            <p className="text-sm text-muted-foreground">
              Design elevations, facades, roofing, and landscape layouts with AI generation.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Design
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Exterior Design</DialogTitle>
              <DialogDescription>
                Define elevation, materials, and landscaping for AI-powered facade generation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Elevation</Label>
                  <Select value={elevationType} onValueChange={setElevationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVATION_TYPES.map((et) => (
                        <SelectItem key={et.value} value={et.value}>
                          {et.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roof Style</Label>
                  <Select value={roofStyle} onValueChange={setRoofStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOF_STYLES.map((rs) => (
                        <SelectItem key={rs} value={rs}>
                          {rs.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Facade Material</Label>
                <Select value={facadeMaterial} onValueChange={setFacadeMaterial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACADE_MATERIALS.map((fm) => (
                      <SelectItem key={fm} value={fm}>
                        {fm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extDescription">Description</Label>
                <Textarea
                  id="extDescription"
                  placeholder="Describe the desired exterior look, colors, features..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landscapeNotes">Landscape Notes</Label>
                <Textarea
                  id="landscapeNotes"
                  placeholder="Driveway, walkways, garden beds, trees, fencing..."
                  rows={2}
                  value={landscapeNotes}
                  onChange={(e) => setLandscapeNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createDesign.isPending}>
                {createDesign.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Design'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Designs</p>
                <p className="text-2xl font-bold">{totalDesigns}</p>
              </div>
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedDesigns}</p>
              </div>
              <Palette className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Generating</p>
                <p className="text-2xl font-bold text-blue-600">{generatingCount}</p>
              </div>
              <Wand2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Design Cards ────────────────────────────────────── */}
      {/* ── View Render Dialog ──────────────────────────────── */}
      <Dialog open={!!viewDesign} onOpenChange={(open) => { if (!open) setViewDesign(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {(viewDesign?.elevationType ?? '').replace(/_/g, ' ')} Elevation — Render
            </DialogTitle>
            <DialogDescription>
              {(viewDesign?.roofStyle ?? '').replace(/_/g, ' ')} roof &middot; {(viewDesign?.facadeMaterial ?? '').replace(/_/g, ' ')} facade
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border">
            {viewDesign?.renderUrl ? (
              <img
                src={viewDesign.renderUrl}
                alt={`${viewDesign.elevationType} elevation render`}
                className="h-auto w-full object-contain"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-muted">
                <p className="text-muted-foreground">No render available</p>
              </div>
            )}
          </div>
          {viewDesign?.description && (
            <p className="text-sm text-muted-foreground">{viewDesign.description}</p>
          )}
          {viewDesign?.landscapeNotes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TreePine className="h-4 w-4" />
              {viewDesign.landscapeNotes}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDesign(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {designs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design: any) => (
            <Card key={design.id} className="relative overflow-hidden">
              {/* Render preview area */}
              <div className="relative h-40 bg-gradient-to-br from-sky-100 to-emerald-50 flex items-center justify-center">
                {design.status === 'generating' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    <p className="text-xs font-medium text-blue-600">Generating render...</p>
                  </div>
                ) : design.renderUrl ? (
                  <img src={design.renderUrl} alt={design.elevationType} className="h-full w-full object-cover" />
                ) : (
                  <Home className="h-16 w-16 text-muted-foreground/30" />
                )}
                <Badge className={`absolute top-2 right-2 text-[10px] ${STATUS_COLORS[design.status] || ''}`}>
                  {design.status}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base capitalize">
                  {(design.elevationType ?? design.designType ?? '').replace(/_/g, ' ')} Elevation
                </CardTitle>
                <CardDescription>
                  {(design.roofStyle ?? '').replace(/_/g, ' ')} roof &middot; {(design.facadeMaterial ?? '').replace(/_/g, ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {design.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{design.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {design.facadeMaterial && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Paintbrush className="h-3 w-3" />
                      {design.facadeMaterial.replace(/_/g, ' ')}
                    </div>
                  )}
                  {design.landscapeNotes && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <TreePine className="h-3 w-3" />
                      Landscaping
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {design.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => generateAI.mutate({ id: design.id })}
                      disabled={generateAI.isPending}
                    >
                      {generateAI.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                  {design.status === 'completed' && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewDesign(design)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View Render
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteDesign.mutate({ id: design.id })}
                    disabled={deleteDesign.isPending}
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
          <Home className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Exterior Designs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create exterior designs with facade materials, roofing, and AI-generated renders.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Design
          </Button>
        </Card>
      )}
    </div>
  );
}
