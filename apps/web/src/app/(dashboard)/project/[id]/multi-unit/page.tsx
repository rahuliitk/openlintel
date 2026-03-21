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
  toast,
} from '@openlintel/ui';
import {
  Building2,
  Plus,
  Loader2,
  Home,
  DollarSign,
  Maximize,
  Trash2,
  Pencil,
  Copy,
  Users,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const UNIT_TYPES = [
  { value: 'adu', label: 'Accessory Dwelling Unit (ADU)' },
  { value: 'duplex_unit', label: 'Duplex Unit' },
  { value: 'triplex_unit', label: 'Triplex Unit' },
  { value: 'fourplex_unit', label: 'Fourplex Unit' },
  { value: 'apartment', label: 'Apartment Unit' },
  { value: 'townhouse', label: 'Townhouse Unit' },
  { value: 'condo', label: 'Condo Unit' },
  { value: 'studio', label: 'Studio' },
] as const;

const CONSTRUCTION_TYPES = [
  { value: 'new_build', label: 'New Construction' },
  { value: 'conversion', label: 'Garage Conversion' },
  { value: 'addition', label: 'Addition' },
  { value: 'detached', label: 'Detached Structure' },
  { value: 'basement', label: 'Basement Unit' },
  { value: 'above_garage', label: 'Above Garage' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function MultiUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [constructionType, setConstructionType] = useState('');
  const [sqft, setSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [estimatedRent, setEstimatedRent] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');

  const { data: units = [], isLoading } = trpc.multiUnit.listUnits.useQuery({ projectId });

  const createUnit = trpc.multiUnit.createUnit.useMutation({
    onSuccess: () => {
      utils.multiUnit.listUnits.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Unit added to plan' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add unit', description: err.message, variant: 'destructive' });
    },
  });

  const deleteUnit = trpc.multiUnit.deleteUnit.useMutation({
    onSuccess: () => {
      utils.multiUnit.listUnits.invalidate({ projectId });
      toast({ title: 'Unit removed' });
    },
  });

  function resetForm() {
    setUnitName('');
    setUnitType('');
    setConstructionType('');
    setSqft('');
    setBedrooms('1');
    setBathrooms('1');
    setEstimatedRent('');
    setEstimatedCost('');
    setNotes('');
  }

  function handleCreate() {
    if (!unitName || !unitType) return;
    createUnit.mutate({
      projectId,
      name: unitName,
      unitType,
      constructionType: constructionType || undefined,
      sqft: sqft ? parseInt(sqft) : undefined,
      bedrooms: parseInt(bedrooms) || 1,
      bathrooms: parseInt(bathrooms) || 1,
      estimatedRent: estimatedRent ? parseFloat(estimatedRent) : undefined,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      notes: notes || undefined,
    });
  }

  const totalSqft = units.reduce((sum: number, u: any) => sum + (u.sqft || 0), 0);
  const totalRent = units.reduce((sum: number, u: any) => sum + (u.estimatedRent || 0), 0);
  const totalCost = units.reduce((sum: number, u: any) => sum + (u.estimatedCost || 0), 0);
  const totalBedrooms = units.reduce((sum: number, u: any) => sum + (u.bedrooms || 0), 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
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
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Multi-Unit &amp; ADU Planning</h1>
            <p className="text-sm text-muted-foreground">
              Plan additional dwelling units, duplexes, and multi-unit developments with ROI analysis.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Dwelling Unit</DialogTitle>
              <DialogDescription>Define a new unit with its specifications and financial projections.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unitName">Unit Name</Label>
                <Input id="unitName" placeholder="e.g. ADU - Backyard Cottage" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Type</Label>
                  <Select value={unitType} onValueChange={setUnitType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Construction Type</Label>
                  <Select value={constructionType} onValueChange={setConstructionType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CONSTRUCTION_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sqft">Square Feet</Label>
                  <Input id="sqft" type="number" placeholder="600" value={sqft} onChange={(e) => setSqft(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beds">Bedrooms</Label>
                  <Input id="beds" type="number" min="0" placeholder="1" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baths">Bathrooms</Label>
                  <Input id="baths" type="number" min="1" placeholder="1" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">Est. Monthly Rent ($)</Label>
                  <Input id="rent" type="number" placeholder="1800" value={estimatedRent} onChange={(e) => setEstimatedRent(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Est. Build Cost ($)</Label>
                  <Input id="cost" type="number" placeholder="150000" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Zoning considerations, setback requirements..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createUnit.isPending || !unitName || !unitType}>
                {createUnit.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Unit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {units.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Units</p><p className="text-2xl font-bold">{units.length}</p></div><Building2 className="h-8 w-8 text-muted-foreground" /></div><p className="text-xs text-muted-foreground mt-1">{totalBedrooms} BR &middot; {totalSqft.toLocaleString()} sqft</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Monthly Revenue</p><p className="text-2xl font-bold text-green-600">${totalRent.toLocaleString()}</p></div><DollarSign className="h-8 w-8 text-green-400" /></div><p className="text-xs text-muted-foreground mt-1">${(totalRent * 12).toLocaleString()} / year</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Build Cost</p><p className="text-2xl font-bold">${totalCost.toLocaleString()}</p></div><Maximize className="h-8 w-8 text-muted-foreground" /></div>{totalCost > 0 && totalSqft > 0 && <p className="text-xs text-muted-foreground mt-1">${Math.round(totalCost / totalSqft)} / sqft</p>}</CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">ROI Period</p><p className="text-2xl font-bold">{totalRent > 0 && totalCost > 0 ? `${(totalCost / (totalRent * 12)).toFixed(1)} yr` : '--'}</p></div><Users className="h-8 w-8 text-muted-foreground" /></div><p className="text-xs text-muted-foreground mt-1">Simple payback period</p></CardContent></Card>
        </div>
      )}

      {/* Units Grid */}
      {units.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit: any) => (
            <Card key={unit.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{unit.name}</CardTitle>
                    <CardDescription>
                      {unit.unitType?.replace(/_/g, ' ')}
                      {unit.constructionType && <span> &middot; {unit.constructionType?.replace(/_/g, ' ')}</span>}
                    </CardDescription>
                  </div>
                  <Home className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {unit.sqft && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{unit.sqft.toLocaleString()} sqft</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Layout</span><span>{unit.bedrooms} BR / {unit.bathrooms} BA</span></div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {unit.estimatedRent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Monthly Rent</span><span className="font-medium text-green-600">${unit.estimatedRent.toLocaleString()}</span></div>}
                  {unit.estimatedCost > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Build Cost</span><span>${unit.estimatedCost.toLocaleString()}</span></div>}
                  {unit.estimatedRent > 0 && unit.estimatedCost > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Payback</span><span className="font-medium">{(unit.estimatedCost / (unit.estimatedRent * 12)).toFixed(1)} years</span></div>
                  )}
                </div>

                {unit.notes && <p className="text-xs text-muted-foreground line-clamp-2">{unit.notes}</p>}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-xs"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteUnit.mutate({ id: unit.id })}>
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
          <h2 className="mb-2 text-lg font-semibold">No Units Planned</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add dwelling units to plan multi-unit developments, ADUs, or accessory structures with financial projections.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Unit
          </Button>
        </Card>
      )}
    </div>
  );
}
