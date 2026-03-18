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
  Archive,
  Plus,
  Loader2,
  Shirt,
  Maximize,
  Grid3X3,
  Trash2,
  Copy,
  Pencil,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const CLOSET_TYPES = [
  { value: 'walk_in', label: 'Walk-In Closet' },
  { value: 'reach_in', label: 'Reach-In Closet' },
  { value: 'linen', label: 'Linen Closet' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'mudroom', label: 'Mudroom Storage' },
  { value: 'garage', label: 'Garage Storage' },
  { value: 'utility', label: 'Utility Closet' },
  { value: 'wardrobe', label: 'Built-In Wardrobe' },
] as const;

const ORGANIZATION_SYSTEMS = [
  { value: 'wire_shelf', label: 'Wire Shelving' },
  { value: 'melamine', label: 'Melamine / Laminate' },
  { value: 'solid_wood', label: 'Solid Wood' },
  { value: 'custom_built', label: 'Custom Built-In' },
  { value: 'modular', label: 'Modular System' },
  { value: 'elfa', label: 'Elfa / Container Store' },
] as const;

const COMPONENT_TYPES = [
  'Double hang rod', 'Single hang rod', 'Long hang section', 'Shoe shelf', 'Shoe rack (angled)',
  'Pull-out drawer', 'Accessory drawer (velvet)', 'Adjustable shelf', 'Fixed shelf',
  'Pull-out hamper', 'Belt/tie rack', 'Mirror', 'Island with drawers', 'Valet rod',
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function ClosetDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [closetType, setClosetType] = useState('');
  const [room, setRoom] = useState('');
  const [widthInches, setWidthInches] = useState('');
  const [depthInches, setDepthInches] = useState('');
  const [heightInches, setHeightInches] = useState('96');
  const [system, setSystem] = useState('');
  const [components, setComponents] = useState('');
  const [notes, setNotes] = useState('');

  const { data: closets = [], isLoading } = trpc.closetDesign.list.useQuery({ projectId });

  const createCloset = trpc.closetDesign.create.useMutation({
    onSuccess: () => {
      utils.closetDesign.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Closet design created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create design', description: err.message, variant: 'destructive' });
    },
  });

  const deleteCloset = trpc.closetDesign.delete.useMutation({
    onSuccess: () => {
      utils.closetDesign.list.invalidate({ projectId });
      toast({ title: 'Design deleted' });
    },
  });

  function resetForm() {
    setName('');
    setClosetType('');
    setRoom('');
    setWidthInches('');
    setDepthInches('');
    setHeightInches('96');
    setSystem('');
    setComponents('');
    setNotes('');
  }

  function handleCreate() {
    if (!name || !closetType) return;
    const componentList = components.split('\n').map((c) => c.trim()).filter(Boolean);
    createCloset.mutate({
      projectId,
      name,
      closetType,
      room: room || undefined,
      widthInches: parseInt(widthInches) || undefined,
      depthInches: parseInt(depthInches) || undefined,
      heightInches: parseInt(heightInches) || 96,
      system: system || undefined,
      components: componentList.length > 0 ? componentList : undefined,
      notes: notes || undefined,
    });
  }

  const totalSqft = closets.reduce((sum: number, c: any) => {
    const w = (c.widthInches || 0) / 12;
    const d = (c.depthInches || 0) / 12;
    return sum + w * d;
  }, 0);

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
          <Archive className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Closet &amp; Storage Design</h1>
            <p className="text-sm text-muted-foreground">
              Design custom closet layouts, pantries, and storage solutions room by room.
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
              <DialogTitle>New Closet / Storage Design</DialogTitle>
              <DialogDescription>Define the storage space and select organization components.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Design Name</Label>
                  <Input id="name" placeholder="Master Walk-In" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={closetType} onValueChange={setClosetType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {CLOSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room">Room Location</Label>
                  <Input id="room" placeholder="Master Bedroom" value={room} onChange={(e) => setRoom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Organization System</Label>
                  <Select value={system} onValueChange={setSystem}>
                    <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_SYSTEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (in)</Label>
                  <Input id="width" type="number" placeholder="96" value={widthInches} onChange={(e) => setWidthInches(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depth">Depth (in)</Label>
                  <Input id="depth" type="number" placeholder="24" value={depthInches} onChange={(e) => setDepthInches(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (in)</Label>
                  <Input id="height" type="number" placeholder="96" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="components">Components (one per line)</Label>
                <Textarea id="components" rows={4} placeholder={COMPONENT_TYPES.slice(0, 4).join('\n')} value={components} onChange={(e) => setComponents(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Suggestions: {COMPONENT_TYPES.slice(0, 6).join(', ')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Special requirements, material preferences..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCloset.isPending || !name || !closetType}>
                {createCloset.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create Design'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {closets.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Storage Spaces</p><p className="text-2xl font-bold">{closets.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Area</p><p className="text-2xl font-bold">{totalSqft.toFixed(0)} sqft</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Components</p><p className="text-2xl font-bold">{closets.reduce((s: number, c: any) => s + (c.components?.length || 0), 0)}</p></CardContent></Card>
        </div>
      )}

      {/* Closets Grid */}
      {closets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {closets.map((closet: any) => (
            <Card key={closet.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{closet.name}</CardTitle>
                    <CardDescription>
                      {closet.closetType?.replace(/_/g, ' ')}
                      {closet.room && <span> &middot; {closet.room}</span>}
                    </CardDescription>
                  </div>
                  <Shirt className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Layout placeholder */}
                <div className="h-28 rounded-lg bg-muted flex items-center justify-center">
                  <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                  {closet.widthInches && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions</span>
                      <span>{closet.widthInches}" W x {closet.depthInches}" D x {closet.heightInches}" H</span>
                    </div>
                  )}
                  {closet.system && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System</span>
                      <span>{closet.system.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                {closet.components && closet.components.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Components ({closet.components.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {closet.components.slice(0, 5).map((comp: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">{comp}</Badge>
                      ))}
                      {closet.components.length > 5 && (
                        <Badge variant="secondary" className="text-[10px]">+{closet.components.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-xs"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCloset.mutate({ id: closet.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Archive className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Storage Designs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create custom closet and storage layouts with specific organization components for each space.
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
