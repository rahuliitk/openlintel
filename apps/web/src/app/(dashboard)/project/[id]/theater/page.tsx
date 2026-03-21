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
  MonitorPlay,
  Plus,
  Loader2,
  Speaker,
  Tv,
  Volume2,
  Armchair,
  Lightbulb,
  Trash2,
  Pencil,
  Save,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const DISPLAY_TYPES = [
  { value: 'projector_screen', label: 'Projector + Screen' },
  { value: 'led_wall', label: 'LED Video Wall' },
  { value: 'large_tv', label: 'Large TV (85"+)' },
  { value: 'ultra_short_throw', label: 'Ultra Short-Throw Projector' },
] as const;

const AUDIO_CONFIGS = [
  { value: '5.1', label: '5.1 Surround' },
  { value: '7.1', label: '7.1 Surround' },
  { value: '7.1.4', label: '7.1.4 Dolby Atmos' },
  { value: '9.1.6', label: '9.1.6 Dolby Atmos' },
  { value: '5.1.2', label: '5.1.2 Dolby Atmos' },
  { value: 'stereo', label: '2.0 Stereo' },
  { value: '2.1', label: '2.1 Stereo + Sub' },
] as const;

const SEATING_TYPES = [
  { value: 'recliner', label: 'Theater Recliners' },
  { value: 'sofa', label: 'Sectional Sofa' },
  { value: 'tiered', label: 'Tiered Seating' },
  { value: 'bean_bag', label: 'Bean Bag / Casual' },
  { value: 'mixed', label: 'Mixed Seating' },
] as const;

const ACOUSTIC_TREATMENTS = [
  'Acoustic panels (side walls)', 'Bass traps (corners)', 'Diffuser panels (rear wall)',
  'Acoustic ceiling tiles', 'Sound isolation (MLV)', 'Carpet with pad',
  'Blackout curtains', 'Acoustic door seal',
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function TheaterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [roomWidthFt, setRoomWidthFt] = useState('');
  const [roomLengthFt, setRoomLengthFt] = useState('');
  const [roomHeightFt, setRoomHeightFt] = useState('9');
  const [displayType, setDisplayType] = useState('');
  const [screenSize, setScreenSize] = useState('');
  const [audioConfig, setAudioConfig] = useState('');
  const [seatingType, setSeatingType] = useState('');
  const [seatCount, setSeatCount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: designs = [], isLoading } = trpc.theater.list.useQuery({ projectId });

  const createDesign = trpc.theater.create.useMutation({
    onSuccess: () => {
      utils.theater.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Theater design created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create design', description: err.message, variant: 'destructive' });
    },
  });

  const deleteDesign = trpc.theater.delete.useMutation({
    onSuccess: () => {
      utils.theater.list.invalidate({ projectId });
      toast({ title: 'Design deleted' });
    },
  });

  function resetForm() {
    setName('');
    setRoomWidthFt('');
    setRoomLengthFt('');
    setRoomHeightFt('9');
    setDisplayType('');
    setScreenSize('');
    setAudioConfig('');
    setSeatingType('');
    setSeatCount('');
    setNotes('');
  }

  function handleCreate() {
    if (!name || !displayType || !audioConfig) return;
    createDesign.mutate({
      projectId,
      name,
      roomWidthFt: parseFloat(roomWidthFt) || undefined,
      roomLengthFt: parseFloat(roomLengthFt) || undefined,
      roomHeightFt: parseFloat(roomHeightFt) || 9,
      displayType,
      screenSize: screenSize ? parseInt(screenSize) : undefined,
      audioConfig,
      seatingType: seatingType || undefined,
      seatCount: seatCount ? parseInt(seatCount) : undefined,
      notes: notes || undefined,
    });
  }

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
          <MonitorPlay className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Home Theater Designer</h1>
            <p className="text-sm text-muted-foreground">
              Design home theater and media rooms with optimal AV layout and acoustic treatment.
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
              <DialogTitle>New Theater Design</DialogTitle>
              <DialogDescription>Configure display, audio, and seating for the media room.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Design Name</Label>
                <Input id="name" placeholder="e.g. Basement Theater" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (ft)</Label>
                  <Input id="width" type="number" placeholder="15" value={roomWidthFt} onChange={(e) => setRoomWidthFt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length">Length (ft)</Label>
                  <Input id="length" type="number" placeholder="22" value={roomLengthFt} onChange={(e) => setRoomLengthFt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (ft)</Label>
                  <Input id="height" type="number" placeholder="9" value={roomHeightFt} onChange={(e) => setRoomHeightFt(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Type</Label>
                  <Select value={displayType} onValueChange={setDisplayType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {DISPLAY_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screenSize">Screen Size (inches)</Label>
                  <Input id="screenSize" type="number" placeholder="120" value={screenSize} onChange={(e) => setScreenSize(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audio Configuration</Label>
                  <Select value={audioConfig} onValueChange={setAudioConfig}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {AUDIO_CONFIGS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seating Type</Label>
                  <Select value={seatingType} onValueChange={setSeatingType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SEATING_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seats">Number of Seats</Label>
                <Input id="seats" type="number" placeholder="8" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Sound isolation needs, equipment preferences..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createDesign.isPending || !name || !displayType || !audioConfig}>
                {createDesign.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create Design'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Designs Grid */}
      {designs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design: any) => (
            <Card key={design.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{design.name}</CardTitle>
                    <CardDescription>
                      {design.roomWidthFt && design.roomLengthFt
                        ? `${design.roomWidthFt}' x ${design.roomLengthFt}' room`
                        : 'Dimensions not set'}
                    </CardDescription>
                  </div>
                  <MonitorPlay className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Layout placeholder */}
                <div className="h-28 rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
                  <Tv className="h-10 w-10 text-gray-600" />
                </div>

                {/* Display */}
                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Tv className="h-3.5 w-3.5" /> Display
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{design.displayType?.replace(/_/g, ' ')}</span></div>
                  {design.screenSize && <div className="flex justify-between"><span className="text-muted-foreground">Screen</span><span>{design.screenSize}"</span></div>}
                </div>

                {/* Audio */}
                <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Volume2 className="h-3.5 w-3.5" /> Audio
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Config</span><span>{design.audioConfig}</span></div>
                  {design.speakerCount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Speakers</span><span>{design.speakerCount}</span></div>}
                </div>

                {/* Seating */}
                {design.seatingType && (
                  <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <Armchair className="h-3.5 w-3.5" /> Seating
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{design.seatingType?.replace(/_/g, ' ')}</span></div>
                    {design.seatCount && <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span>{design.seatCount}</span></div>}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteDesign.mutate({ id: design.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <MonitorPlay className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Theater Designs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Design your home theater with optimal display, surround sound, seating layout, and acoustic treatment.
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
