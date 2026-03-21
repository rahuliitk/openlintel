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
  CookingPot,
  Plus,
  Loader2,
  Bath,
  Triangle,
  Refrigerator,
  Flame,
  Droplets,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  LayoutGrid,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ROOM_TYPES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'master_bath', label: 'Master Bath' },
  { value: 'guest_bath', label: 'Guest Bath' },
  { value: 'powder_room', label: 'Powder Room' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'wet_bar', label: 'Wet Bar' },
] as const;

const CABINET_TYPES = [
  'base', 'wall', 'tall', 'pantry', 'corner', 'island', 'vanity',
] as const;

const COUNTERTOP_MATERIALS = [
  'granite', 'quartz', 'marble', 'butcher_block', 'laminate', 'concrete', 'soapstone', 'stainless_steel',
] as const;

const EDGE_PROFILES = [
  'square', 'beveled', 'bullnose', 'ogee', 'waterfall', 'mitered',
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  designing: 'bg-blue-100 text-blue-800',
  validated: 'bg-green-100 text-green-800',
  issues: 'bg-yellow-100 text-yellow-800',
};

function formatTriangleScore(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Fair', color: 'text-yellow-600' };
  return { label: 'Poor', color: 'text-red-600' };
}

/* ─── Page Component ────────────────────────────────────────── */

export default function KitchenBathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomType, setRoomType] = useState('kitchen');
  const [roomName, setRoomName] = useState('');
  const [cabinetType, setCabinetType] = useState('base');
  const [countertopMaterial, setCountertopMaterial] = useState('quartz');
  const [edgeProfile, setEdgeProfile] = useState('square');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: layouts = [], isLoading } = trpc.kitchenBath.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createLayout = trpc.kitchenBath.create.useMutation({
    onSuccess: () => {
      utils.kitchenBath.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Layout created', description: 'Kitchen/bath layout has been added.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create layout', description: err.message, variant: 'destructive' });
    },
  });

  const analyzeTriangle = trpc.kitchenBath.analyzeWorkTriangle.useMutation({
    onSuccess: (data) => {
      utils.kitchenBath.list.invalidate();
      toast({
        title: 'Work triangle analyzed',
        description: `Score: ${data.score}/100 - ${data.totalDistance}" total path.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  const validateLayout = trpc.kitchenBath.validate.useMutation({
    onSuccess: (data) => {
      utils.kitchenBath.list.invalidate();
      toast({
        title: 'Validation complete',
        description: `${data.passed} passed, ${data.failed} failed checks.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Validation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteLayout = trpc.kitchenBath.delete.useMutation({
    onSuccess: () => {
      utils.kitchenBath.list.invalidate();
      toast({ title: 'Layout deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setRoomType('kitchen');
    setRoomName('');
    setCabinetType('base');
    setCountertopMaterial('quartz');
    setEdgeProfile('square');
    setNotes('');
  }

  function handleCreate() {
    if (!roomName) return;
    createLayout.mutate({
      projectId,
      roomType,
      roomName,
      cabinetType,
      countertopMaterial,
      edgeProfile,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const kitchenCount = layouts.filter((l: any) => l.roomType === 'kitchen').length;
  const bathCount = layouts.filter((l: any) => l.roomType !== 'kitchen' && l.roomType !== 'laundry' && l.roomType !== 'wet_bar').length;
  const validatedCount = layouts.filter((l: any) => l.status === 'validated').length;
  const issueCount = layouts.filter((l: any) => l.status === 'issues').length;

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
          <CookingPot className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen & Bath Design</h1>
            <p className="text-sm text-muted-foreground">
              Cabinet layouts, work triangle analysis, countertops, and fixture placement.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Layout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Kitchen / Bath Layout</DialogTitle>
              <DialogDescription>
                Define room type, cabinet configuration, countertop materials, and fixtures.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kbRoomName">Room Name</Label>
                  <Input
                    id="kbRoomName"
                    placeholder="e.g. Main Kitchen"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cabinet Type</Label>
                  <Select value={cabinetType} onValueChange={setCabinetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CABINET_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Countertop</Label>
                  <Select value={countertopMaterial} onValueChange={setCountertopMaterial}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTERTOP_MATERIALS.map((cm) => (
                        <SelectItem key={cm} value={cm}>
                          {cm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Edge Profile</Label>
                  <Select value={edgeProfile} onValueChange={setEdgeProfile}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDGE_PROFILES.map((ep) => (
                        <SelectItem key={ep} value={ep}>
                          {ep.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kbNotes">Notes</Label>
                <Textarea
                  id="kbNotes"
                  placeholder="Appliance requirements, accessibility needs..."
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
              <Button onClick={handleCreate} disabled={createLayout.isPending || !roomName}>
                {createLayout.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Layout'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kitchens</p>
                <p className="text-2xl font-bold">{kitchenCount}</p>
              </div>
              <CookingPot className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bathrooms</p>
                <p className="text-2xl font-bold">{bathCount}</p>
              </div>
              <Bath className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Validated</p>
                <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-yellow-600">{issueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Layout Cards ────────────────────────────────────── */}
      {layouts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {layouts.map((layout: any) => {
            const isKitchen = layout.roomType === 'kitchen';
            const triangleInfo = layout.workTriangleScore != null
              ? formatTriangleScore(layout.workTriangleScore)
              : null;

            return (
              <Card key={layout.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{layout.roomName}</CardTitle>
                      <CardDescription className="mt-0.5 capitalize">
                        {layout.roomType.replace(/_/g, ' ')}
                      </CardDescription>
                    </div>
                    <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[layout.status] || ''}`}>
                      {layout.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <LayoutGrid className="h-3 w-3" />
                      {layout.cabinetType.replace(/_/g, ' ')}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Ruler className="h-3 w-3" />
                      {layout.countertopMaterial.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {/* Work Triangle Score */}
                  {isKitchen && triangleInfo && (
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <div className="flex items-center gap-2">
                        <Triangle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Work Triangle</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className={`text-sm font-semibold ${triangleInfo.color}`}>
                          {triangleInfo.label}
                        </span>
                        <span className="text-xs font-medium">{layout.workTriangleScore}/100</span>
                      </div>
                    </div>
                  )}

                  {layout.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{layout.notes}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {isKitchen && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => analyzeTriangle.mutate({ id: layout.id })}
                        disabled={analyzeTriangle.isPending}
                      >
                        {analyzeTriangle.isPending ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Triangle className="mr-1 h-3.5 w-3.5" />
                        )}
                        Analyze Triangle
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={isKitchen ? '' : 'flex-1'}
                      onClick={() => validateLayout.mutate({ id: layout.id })}
                      disabled={validateLayout.isPending}
                    >
                      {validateLayout.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      Validate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteLayout.mutate({ id: layout.id })}
                      disabled={deleteLayout.isPending}
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
          <CookingPot className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Kitchen / Bath Layouts</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create layouts for kitchens and bathrooms with cabinet optimization and work triangle analysis.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Layout
          </Button>
        </Card>
      )}
    </div>
  );
}
