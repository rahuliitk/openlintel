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
  CalendarCheck,
  Plus,
  Loader2,
  User,
  Star,
  Clock,
  MapPin,
  DollarSign,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SERVICE_TYPES = [
  { value: 'architect', label: 'Architect Consultation' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'structural_engineer', label: 'Structural Engineer' },
  { value: 'surveyor', label: 'Land Surveyor' },
  { value: 'contractor', label: 'General Contractor' },
  { value: 'inspector', label: 'Home Inspector' },
  { value: 'energy_auditor', label: 'Energy Auditor' },
  { value: 'landscape_designer', label: 'Landscape Designer' },
  { value: 'lighting_designer', label: 'Lighting Designer' },
  { value: 'acoustics', label: 'Acoustics Consultant' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function BookingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerEmail, setProviderEmail] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const { data: bookings = [], isLoading } = trpc.bookings.list.useQuery({ projectId });

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Booking created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create booking', description: err.message, variant: 'destructive' });
    },
  });

  const updateStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate({ projectId });
      toast({ title: 'Booking status updated' });
    },
  });

  const deleteBooking = trpc.bookings.delete.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate({ projectId });
      toast({ title: 'Booking deleted' });
    },
  });

  function resetForm() {
    setServiceType('');
    setProviderName('');
    setProviderEmail('');
    setScheduledDate('');
    setScheduledTime('');
    setDurationMinutes('60');
    setEstimatedCost('');
    setLocation('');
    setNotes('');
  }

  function handleCreate() {
    if (!serviceType || !providerName || !scheduledDate) return;
    createBooking.mutate({
      projectId,
      serviceType,
      providerName,
      providerEmail: providerEmail || undefined,
      scheduledDate: scheduledTime ? `${scheduledDate}T${scheduledTime}` : scheduledDate,
      durationMinutes: parseInt(durationMinutes) || 60,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      location: location || undefined,
      notes: notes || undefined,
    });
  }

  const upcomingBookings = bookings.filter((b: any) => ['requested', 'confirmed'].includes(b.status));
  const pastBookings = bookings.filter((b: any) => ['completed', 'cancelled', 'no_show'].includes(b.status));
  const totalSpent = bookings.filter((b: any) => b.status === 'completed').reduce((sum: number, b: any) => sum + (b.estimatedCost || 0), 0);

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
          <CalendarCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Professional Bookings</h1>
            <p className="text-sm text-muted-foreground">
              Book and manage consultations with architects, engineers, and other professionals.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Book Professional Service</DialogTitle>
              <DialogDescription>Schedule a consultation or service with a professional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider Name</Label>
                  <Input id="provider" placeholder="Jane Smith, AIA" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerEmail">Provider Email</Label>
                <Input id="providerEmail" type="email" placeholder="jane@architects.com" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input id="duration" type="number" placeholder="60" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Estimated Cost ($)</Label>
                  <Input id="cost" type="number" placeholder="250" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="On-site or virtual" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} placeholder="Topics to discuss, documents needed..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createBooking.isPending || !serviceType || !providerName || !scheduledDate}>
                {createBooking.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Booking...</> : 'Create Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {bookings.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-2xl font-bold">{upcomingBookings.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{pastBookings.filter((b: any) => b.status === 'completed').length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Spent</p><p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p></CardContent></Card>
        </div>
      )}

      {/* Bookings */}
      {bookings.length > 0 ? (
        <div className="space-y-6">
          {upcomingBookings.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingBookings.map((booking: any) => (
                  <Card key={booking.id} className="border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{booking.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</CardTitle>
                          <CardDescription>{booking.providerName}</CardDescription>
                        </div>
                        <Badge className={`text-[10px] ${STATUS_COLORS[booking.status]}`}>{booking.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg bg-muted/50 p-2.5 space-y-1 text-xs">
                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {formatDate(booking.scheduledDate)} {booking.scheduledDate && formatTime(booking.scheduledDate)}</div>
                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {booking.durationMinutes || 60} minutes</div>
                        {booking.location && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {booking.location}</div>}
                        {booking.estimatedCost > 0 && <div className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> ${booking.estimatedCost}</div>}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {booking.status === 'requested' && (
                          <Button variant="outline" size="sm" className="flex-1 text-xs border-green-200 text-green-700" onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed' })}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirm
                          </Button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button variant="outline" size="sm" className="flex-1 text-xs border-blue-200 text-blue-700" onClick={() => updateStatus.mutate({ id: booking.id, status: 'completed' })}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs border-red-200 text-red-700" onClick={() => updateStatus.mutate({ id: booking.id, status: 'cancelled' })}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteBooking.mutate({ id: booking.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past Bookings</h2>
              <div className="space-y-2">
                {pastBookings.map((booking: any) => (
                  <Card key={booking.id} className="opacity-80">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{booking.providerName} - {booking.serviceType?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(booking.scheduledDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.estimatedCost > 0 && <span className="text-sm">${booking.estimatedCost}</span>}
                        <Badge className={`text-[10px] ${STATUS_COLORS[booking.status]}`}>{booking.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CalendarCheck className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Bookings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Book consultations with architects, engineers, and other professionals from the marketplace.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Booking
          </Button>
        </Card>
      )}
    </div>
  );
}
