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
  Wifi,
  Plus,
  Loader2,
  Lightbulb,
  Thermometer,
  Camera,
  Lock,
  Speaker,
  Zap,
  Network,
  Trash2,
  MapPin,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const DEVICE_CATEGORIES = [
  { value: 'lighting', label: 'Smart Lighting', icon: 'lightbulb' },
  { value: 'hvac', label: 'HVAC / Thermostat', icon: 'thermometer' },
  { value: 'security', label: 'Security Camera', icon: 'camera' },
  { value: 'lock', label: 'Smart Lock', icon: 'lock' },
  { value: 'audio', label: 'Audio / Speaker', icon: 'speaker' },
  { value: 'shade', label: 'Motorized Shade', icon: 'zap' },
  { value: 'sensor', label: 'Sensor (Motion/Door)', icon: 'zap' },
  { value: 'hub', label: 'Hub / Controller', icon: 'network' },
  { value: 'outlet', label: 'Smart Outlet', icon: 'zap' },
  { value: 'other', label: 'Other', icon: 'wifi' },
] as const;

const WIRE_TYPES = [
  { value: 'cat6', label: 'CAT6 Ethernet' },
  { value: 'cat6a', label: 'CAT6a Ethernet' },
  { value: 'coax', label: 'Coaxial (RG6)' },
  { value: 'speaker_14', label: 'Speaker Wire (14 AWG)' },
  { value: 'speaker_12', label: 'Speaker Wire (12 AWG)' },
  { value: 'hdmi', label: 'HDMI Conduit' },
  { value: 'fiber', label: 'Fiber Optic' },
  { value: 'low_voltage', label: 'Low Voltage (18/2)' },
  { value: 'power', label: 'Power (14/2 Romex)' },
] as const;

const PROTOCOL_OPTIONS = [
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'zwave', label: 'Z-Wave' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'thread', label: 'Thread / Matter' },
  { value: 'wired', label: 'Wired Only' },
] as const;

function getDeviceIcon(category: string) {
  switch (category) {
    case 'lighting': return <Lightbulb className="h-4 w-4" />;
    case 'hvac': return <Thermometer className="h-4 w-4" />;
    case 'security': return <Camera className="h-4 w-4" />;
    case 'lock': return <Lock className="h-4 w-4" />;
    case 'audio': return <Speaker className="h-4 w-4" />;
    case 'hub': return <Network className="h-4 w-4" />;
    default: return <Zap className="h-4 w-4" />;
  }
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SmartHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [category, setCategory] = useState('');
  const [room, setRoom] = useState('');
  const [protocol, setProtocol] = useState('');
  const [wireType, setWireType] = useState('');
  const [wireRuns, setWireRuns] = useState('1');
  const [notes, setNotes] = useState('');

  const { data: devices = [], isLoading } = trpc.smartHome.listDevices.useQuery({ projectId });

  const addDevice = trpc.smartHome.addDevice.useMutation({
    onSuccess: () => {
      utils.smartHome.listDevices.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Device added to plan' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add device', description: err.message, variant: 'destructive' });
    },
  });

  const removeDevice = trpc.smartHome.removeDevice.useMutation({
    onSuccess: () => {
      utils.smartHome.listDevices.invalidate({ projectId });
      toast({ title: 'Device removed' });
    },
  });

  function resetForm() {
    setDeviceName('');
    setCategory('');
    setRoom('');
    setProtocol('');
    setWireType('');
    setWireRuns('1');
    setNotes('');
  }

  function handleAdd() {
    if (!deviceName || !category) return;
    addDevice.mutate({
      projectId,
      name: deviceName,
      category,
      room: room || undefined,
      protocol: protocol || undefined,
      wireType: wireType || undefined,
      wireRuns: parseInt(wireRuns) || 1,
      notes: notes || undefined,
    });
  }

  // Group by room
  const roomGroups = devices.reduce((acc: Record<string, any[]>, d: any) => {
    const r = d.room || 'Unassigned';
    if (!acc[r]) acc[r] = [];
    acc[r].push(d);
    return acc;
  }, {});

  const totalWireRuns = devices.reduce((sum: number, d: any) => sum + (d.wireRuns || 0), 0);
  const categoryCount = new Set(devices.map((d: any) => d.category)).size;

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
          <Wifi className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Home Wiring Planner</h1>
            <p className="text-sm text-muted-foreground">
              Plan smart device placement, wiring runs, and home automation infrastructure.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Smart Device</DialogTitle>
              <DialogDescription>Plan a smart device with its wiring requirements.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="devName">Device Name</Label>
                  <Input id="devName" placeholder="e.g. Kitchen Pendant Dimmer" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {DEVICE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input id="room" placeholder="e.g. Master Bedroom" value={room} onChange={(e) => setRoom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PROTOCOL_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Wire Type</Label>
                  <Select value={wireType} onValueChange={setWireType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {WIRE_TYPES.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="runs">Wire Runs</Label>
                  <Input id="runs" type="number" min="0" placeholder="1" value={wireRuns} onChange={(e) => setWireRuns(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Installation notes, conduit requirements..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addDevice.isPending || !deviceName || !category}>
                {addDevice.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Device'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {devices.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Devices</p><p className="text-2xl font-bold">{devices.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Rooms</p><p className="text-2xl font-bold">{Object.keys(roomGroups).length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Categories</p><p className="text-2xl font-bold">{categoryCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Wire Runs</p><p className="text-2xl font-bold">{totalWireRuns}</p></CardContent></Card>
        </div>
      )}

      {/* Devices by Room */}
      {devices.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(roomGroups).map(([roomName, roomDevices]) => (
            <Card key={roomName}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{roomName}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{(roomDevices as any[]).length} devices</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(roomDevices as any[]).map((device: any) => (
                    <div key={device.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          {getDeviceIcon(device.category)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.category?.replace(/_/g, ' ')}
                            {device.protocol && <span> &middot; {device.protocol}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {device.wireType && (
                          <div className="text-right">
                            <p className="text-xs font-medium">{device.wireType?.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-muted-foreground">{device.wireRuns || 1} run(s)</p>
                          </div>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeDevice.mutate({ id: device.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Wifi className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Smart Home Devices</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Plan your smart home infrastructure by adding devices and specifying wiring requirements for each room.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Device
          </Button>
        </Card>
      )}
    </div>
  );
}
