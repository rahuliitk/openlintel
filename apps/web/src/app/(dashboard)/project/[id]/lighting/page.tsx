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
  Lightbulb,
  Plus,
  Loader2,
  Sun,
  Moon,
  Zap,
  ToggleLeft,
  Calculator,
  Trash2,
  Eye,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const FIXTURE_TYPES = [
  { value: 'recessed', label: 'Recessed Downlight' },
  { value: 'pendant', label: 'Pendant' },
  { value: 'chandelier', label: 'Chandelier' },
  { value: 'track', label: 'Track Light' },
  { value: 'sconce', label: 'Wall Sconce' },
  { value: 'under_cabinet', label: 'Under Cabinet' },
  { value: 'cove', label: 'Cove Lighting' },
  { value: 'floor_lamp', label: 'Floor Lamp' },
  { value: 'table_lamp', label: 'Table Lamp' },
] as const;

const TEMP_OPTIONS = [
  { value: '2700', label: '2700K Warm White' },
  { value: '3000', label: '3000K Soft White' },
  { value: '3500', label: '3500K Neutral' },
  { value: '4000', label: '4000K Cool White' },
  { value: '5000', label: '5000K Daylight' },
  { value: '6500', label: '6500K Full Daylight' },
] as const;

const LUX_TARGETS: Record<string, number> = {
  bedroom: 150,
  kitchen: 500,
  bathroom: 300,
  living_room: 300,
  dining_room: 200,
  home_office: 500,
  hallway: 100,
  staircase: 150,
  garage: 300,
};

function formatLux(lux: number, target: number): { status: string; color: string } {
  const ratio = lux / target;
  if (ratio >= 0.9 && ratio <= 1.3) return { status: 'Optimal', color: 'text-green-600' };
  if (ratio >= 0.7) return { status: 'Adequate', color: 'text-yellow-600' };
  return { status: 'Insufficient', color: 'text-red-600' };
}

/* ─── Page Component ────────────────────────────────────────── */

export default function LightingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [fixtureType, setFixtureType] = useState('recessed');
  const [lumens, setLumens] = useState('');
  const [wattage, setWattage] = useState('');
  const [colorTemp, setColorTemp] = useState('3000');
  const [quantity, setQuantity] = useState('1');
  const [switchZone, setSwitchZone] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: fixtures = [], isLoading } = trpc.lighting.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });
  const { data: luxReport } = trpc.lighting.calculateLux.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createFixture = trpc.lighting.create.useMutation({
    onSuccess: () => {
      utils.lighting.list.invalidate();
      utils.lighting.calculateLux.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Fixture added', description: 'Lighting fixture has been placed.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add fixture', description: err.message, variant: 'destructive' });
    },
  });

  const calculateLighting = trpc.lighting.recalculate.useMutation({
    onSuccess: () => {
      utils.lighting.calculateLux.invalidate();
      toast({ title: 'Lux calculations updated' });
    },
    onError: (err) => {
      toast({ title: 'Calculation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteFixture = trpc.lighting.delete.useMutation({
    onSuccess: () => {
      utils.lighting.list.invalidate();
      utils.lighting.calculateLux.invalidate();
      toast({ title: 'Fixture removed' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setRoomId('');
    setFixtureType('recessed');
    setLumens('');
    setWattage('');
    setColorTemp('3000');
    setQuantity('1');
    setSwitchZone('');
    setNotes('');
  }

  function handleCreate() {
    if (!roomId || !lumens || !wattage) return;
    createFixture.mutate({
      projectId,
      roomId,
      fixtureType,
      lumens: parseInt(lumens, 10),
      wattage: parseFloat(wattage),
      colorTemp: parseInt(colorTemp, 10),
      quantity: parseInt(quantity, 10) || 1,
      switchZone: switchZone || undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalFixtures = fixtures.length;
  const totalWattage = fixtures.reduce((sum: number, f: any) => sum + (f.wattage || 0) * (f.quantity || 1), 0);
  const totalLumens = fixtures.reduce((sum: number, f: any) => sum + (f.lumens || 0) * (f.quantity || 1), 0);
  const switchZones = [...new Set(fixtures.map((f: any) => f.switchZone).filter(Boolean))].length;
  const roomResults = luxReport?.rooms ?? [];

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
          <Lightbulb className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lighting Design</h1>
            <p className="text-sm text-muted-foreground">
              Plan lighting fixtures, calculate lux levels, and design switching zones.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculateLighting.mutate({ projectId })}
            disabled={calculateLighting.isPending || fixtures.length === 0}
          >
            {calculateLighting.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-1 h-4 w-4" />
            )}
            Recalculate
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Fixture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Lighting Fixture</DialogTitle>
                <DialogDescription>
                  Place a lighting fixture with lumens, wattage, and color temperature.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Select value={roomId} onValueChange={setRoomId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room: any) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fixture Type</Label>
                    <Select value={fixtureType} onValueChange={setFixtureType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIXTURE_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lumens">Lumens</Label>
                    <Input
                      id="lumens"
                      type="number"
                      placeholder="e.g. 800"
                      value={lumens}
                      onChange={(e) => setLumens(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wattage">Wattage</Label>
                    <Input
                      id="wattage"
                      type="number"
                      placeholder="e.g. 10"
                      value={wattage}
                      onChange={(e) => setWattage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Qty</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color Temperature</Label>
                    <Select value={colorTemp} onValueChange={setColorTemp}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMP_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="switchZone">Switch Zone</Label>
                    <Input
                      id="switchZone"
                      placeholder="e.g. Zone A"
                      value={switchZone}
                      onChange={(e) => setSwitchZone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lightNotes">Notes</Label>
                  <Textarea
                    id="lightNotes"
                    placeholder="Placement notes, dimming requirements..."
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
                <Button
                  onClick={handleCreate}
                  disabled={createFixture.isPending || !roomId || !lumens || !wattage}
                >
                  {createFixture.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Fixture'
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
                <p className="text-sm text-muted-foreground">Total Fixtures</p>
                <p className="text-2xl font-bold">{totalFixtures}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Lumens</p>
                <p className="text-2xl font-bold text-yellow-600">{totalLumens.toLocaleString()}</p>
              </div>
              <Sun className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Wattage</p>
                <p className="text-2xl font-bold text-blue-600">{totalWattage}W</p>
              </div>
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Switch Zones</p>
                <p className="text-2xl font-bold text-purple-600">{switchZones}</p>
              </div>
              <ToggleLeft className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lux Level Report ────────────────────────────────── */}
      {roomResults.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Lux Level Analysis</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roomResults.map((room: any) => {
              const target = LUX_TARGETS[room.roomType] || 300;
              const info = formatLux(room.calculatedLux, target);
              return (
                <Card key={room.roomId} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{room.roomName}</span>
                    <Badge className={`text-[10px] ${
                      info.status === 'Optimal' ? 'bg-green-100 text-green-800' :
                      info.status === 'Adequate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {info.status}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-xl font-bold ${info.color}`}>{room.calculatedLux} lux</p>
                      <p className="text-[10px] text-muted-foreground">Target: {target} lux</p>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <p>{room.fixtureCount} fixtures</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fixture Cards ───────────────────────────────────── */}
      {fixtures.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fixtures.map((fixture: any) => (
            <Card key={fixture.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base capitalize truncate">
                      {fixture.fixtureType.replace(/_/g, ' ')}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {rooms.find((r: any) => r.id === fixture.roomId)?.name || 'Unknown room'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    x{fixture.quantity || 1}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <Sun className="h-3 w-3" />
                    {fixture.lumens} lm
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    {fixture.wattage}W
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {fixture.colorTemp <= 3000 ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    {fixture.colorTemp}K
                  </div>
                </div>
                {fixture.switchZone && (
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Switch Zone</span>
                      <span className="font-medium">{fixture.switchZone}</span>
                    </div>
                  </div>
                )}
                {fixture.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{fixture.notes}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteFixture.mutate({ id: fixture.id })}
                    disabled={deleteFixture.isPending}
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
          <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Lighting Fixtures</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add lighting fixtures to calculate lux levels and design switching zones.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Fixture
          </Button>
        </Card>
      )}
    </div>
  );
}
