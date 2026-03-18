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
  toast,
} from '@openlintel/ui';
import {
  TreePine,
  Plus,
  Loader2,
  Flame,
  Waves,
  Umbrella,
  Fence,
  Flower2,
  Trash2,
  Pencil,
  Sun,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ZONE_TYPES = [
  { value: 'patio', label: 'Patio / Deck', icon: Umbrella },
  { value: 'pool', label: 'Pool / Spa', icon: Waves },
  { value: 'outdoor_kitchen', label: 'Outdoor Kitchen', icon: Flame },
  { value: 'fire_pit', label: 'Fire Pit / Fireplace', icon: Flame },
  { value: 'garden', label: 'Garden / Planting', icon: Flower2 },
  { value: 'lawn', label: 'Lawn Area', icon: TreePine },
  { value: 'playground', label: 'Play Area', icon: Sun },
  { value: 'driveway', label: 'Driveway / Parking', icon: Fence },
  { value: 'pergola', label: 'Pergola / Gazebo', icon: Umbrella },
  { value: 'water_feature', label: 'Water Feature', icon: Waves },
] as const;

const MATERIAL_OPTIONS = [
  { value: 'concrete', label: 'Poured Concrete' },
  { value: 'pavers', label: 'Pavers (Brick/Stone)' },
  { value: 'natural_stone', label: 'Natural Stone' },
  { value: 'composite_deck', label: 'Composite Decking' },
  { value: 'wood_deck', label: 'Wood Decking' },
  { value: 'gravel', label: 'Gravel / Decomposed Granite' },
  { value: 'turf', label: 'Artificial Turf' },
  { value: 'tile', label: 'Outdoor Tile' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function OutdoorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [material, setMaterial] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');

  const { data: zones = [], isLoading } = trpc.outdoor.listZones.useQuery({ projectId });

  const createZone = trpc.outdoor.createZone.useMutation({
    onSuccess: () => {
      utils.outdoor.listZones.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Outdoor zone added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add zone', description: err.message, variant: 'destructive' });
    },
  });

  const deleteZone = trpc.outdoor.deleteZone.useMutation({
    onSuccess: () => {
      utils.outdoor.listZones.invalidate({ projectId });
      toast({ title: 'Zone removed' });
    },
  });

  function resetForm() {
    setName('');
    setZoneType('');
    setAreaSqft('');
    setMaterial('');
    setEstimatedCost('');
    setDescription('');
    setFeatures('');
  }

  function handleCreate() {
    if (!name || !zoneType) return;
    const featureList = features.split('\n').map((f) => f.trim()).filter(Boolean);
    createZone.mutate({
      projectId,
      name,
      zoneType,
      areaSqft: areaSqft ? parseInt(areaSqft) : undefined,
      material: material || undefined,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      description: description || undefined,
      features: featureList.length > 0 ? featureList : undefined,
    });
  }

  function getZoneIcon(type: string) {
    const zone = ZONE_TYPES.find((z) => z.value === type);
    if (zone) {
      const Icon = zone.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <TreePine className="h-4 w-4" />;
  }

  const totalArea = zones.reduce((sum: number, z: any) => sum + (z.areaSqft || 0), 0);
  const totalCost = zones.reduce((sum: number, z: any) => sum + (z.estimatedCost || 0), 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreePine className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Outdoor Living Designer</h1>
            <p className="text-sm text-muted-foreground">
              Design outdoor zones including patios, pools, kitchens, gardens, and landscape features.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Outdoor Zone</DialogTitle>
              <DialogDescription>Define an outdoor living area or landscape zone.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Zone Name</Label>
                  <Input id="name" placeholder="e.g. Rear Patio" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Zone Type</Label>
                  <Select value={zoneType} onValueChange={setZoneType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {ZONE_TYPES.map((z) => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area (sqft)</Label>
                  <Input id="area" type="number" placeholder="400" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Est. Cost ($)</Label>
                  <Input id="cost" type="number" placeholder="15000" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={2} placeholder="Describe the zone design..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea id="features" rows={3} placeholder={"Built-in grill\nSeating for 8\nString lighting"} value={features} onChange={(e) => setFeatures(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createZone.isPending || !name || !zoneType}>
                {createZone.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Zone'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {zones.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outdoor Zones</p><p className="text-2xl font-bold">{zones.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Area</p><p className="text-2xl font-bold">{totalArea.toLocaleString()} sqft</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Estimated Cost</p><p className="text-2xl font-bold">${totalCost.toLocaleString()}</p></CardContent></Card>
        </div>
      )}

      {/* Zones Grid */}
      {zones.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone: any) => (
            <Card key={zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-green-50 p-2 text-green-600">
                      {getZoneIcon(zone.zoneType)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{zone.name}</CardTitle>
                      <CardDescription>{zone.zoneType?.replace(/_/g, ' ')}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Landscape preview placeholder */}
                <div className="h-28 rounded-lg bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center">
                  <TreePine className="h-8 w-8 text-green-300" />
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {zone.areaSqft > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span>{zone.areaSqft?.toLocaleString()} sqft</span></div>}
                  {zone.material && <div className="flex justify-between"><span className="text-muted-foreground">Material</span><span>{zone.material?.replace(/_/g, ' ')}</span></div>}
                  {zone.estimatedCost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Est. Cost</span><span className="font-medium">${zone.estimatedCost?.toLocaleString()}</span></div>}
                </div>

                {zone.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{zone.description}</p>
                )}

                {zone.features && zone.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {zone.features.slice(0, 4).map((f: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">{f}</Badge>
                    ))}
                    {zone.features.length > 4 && (
                      <Badge variant="secondary" className="text-[10px]">+{zone.features.length - 4}</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteZone.mutate({ id: zone.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <TreePine className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Outdoor Zones</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Design your outdoor living spaces by adding zones for patios, pools, gardens, and more.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Zone
          </Button>
        </Card>
      )}
    </div>
  );
}
