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
  Separator,
  Textarea,
  toast,
} from '@openlintel/ui';
import {
  Timer,
  Plus,
  Loader2,
  Play,
  Square,
  Clock,
  Calendar,
  DollarSign,
  Trash2,
  BarChart3,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const TASK_CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'client_meeting', label: 'Client Meeting' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'administration', label: 'Administration' },
  { value: 'review', label: 'Review' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'research', label: 'Research' },
] as const;

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function TimeTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'entries' | 'weekly'>('entries');

  const { data: entries = [], isLoading } = trpc.timeTracking.list.useQuery({ projectId });

  const createEntry = trpc.timeTracking.create.useMutation({
    onSuccess: () => {
      utils.timeTracking.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Time entry added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add entry', description: err.message, variant: 'destructive' });
    },
  });

  const deleteEntry = trpc.timeTracking.delete.useMutation({
    onSuccess: () => {
      utils.timeTracking.list.invalidate({ projectId });
      toast({ title: 'Time entry deleted' });
    },
  });

  function resetForm() {
    setDescription('');
    setCategory('');
    setHours('');
    setMinutes('');
    setHourlyRate('');
    setDate(new Date().toISOString().split('T')[0]!);
    setNotes('');
  }

  function handleCreate() {
    if (!description || !category) return;
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) return;
    createEntry.mutate({
      projectId,
      description,
      category,
      durationMinutes: totalMinutes,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      date,
      notes: notes || undefined,
    });
  }

  function startTimer(entryDescription: string) {
    setActiveTimer(entryDescription);
    setTimerStart(new Date());
    toast({ title: 'Timer started', description: `Tracking: ${entryDescription}` });
  }

  function stopTimer() {
    if (!timerStart || !activeTimer) return;
    const elapsed = Math.round((new Date().getTime() - timerStart.getTime()) / 60000);
    setDescription(activeTimer);
    setHours(String(Math.floor(elapsed / 60)));
    setMinutes(String(elapsed % 60));
    setActiveTimer(null);
    setTimerStart(null);
    setDialogOpen(true);
  }

  const totalMinutes = entries.reduce((sum: number, e: any) => sum + Math.round((e.hours || 0) * 60), 0);
  const totalBillable = entries.reduce((sum: number, e: any) => {
    return sum + (e.hours || 0) * (e.rate || 0);
  }, 0);

  // Group entries by date for weekly view
  const entriesByDate = entries.reduce((acc: Record<string, any[]>, entry: any) => {
    const d = new Date(entry.date).toISOString().split('T')[0]!;
    if (!acc[d]) acc[d] = [];
    acc[d]!.push(entry);
    return acc;
  }, {} as Record<string, any[]>);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Tracking &amp; Billing</h1>
            <p className="text-sm text-muted-foreground">
              Track billable hours and generate invoices for project work.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTimer ? (
            <Button size="sm" variant="destructive" onClick={stopTimer}>
              <Square className="mr-1 h-4 w-4" />
              Stop Timer
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => startTimer('General work')}>
              <Play className="mr-1 h-4 w-4" />
              Start Timer
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Time Entry</DialogTitle>
                <DialogDescription>Log time spent on project work.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Input id="desc" placeholder="What did you work on?" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {TASK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours</Label>
                    <Input id="hours" type="number" min="0" placeholder="0" value={hours} onChange={(e) => setHours(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mins">Minutes</Label>
                    <Input id="mins" type="number" min="0" max="59" placeholder="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Hourly Rate ($)</Label>
                    <Input id="rate" type="number" placeholder="150" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={2} placeholder="Additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createEntry.isPending || !description || !category}>
                  {createEntry.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : 'Save Entry'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Timer Banner */}
      {activeTimer && timerStart && (
        <Card className="mb-6 border-primary">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Timer Running: {activeTimer}</p>
                <p className="text-xs text-muted-foreground">Started at {timerStart.toLocaleTimeString()}</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={stopTimer}>
              <Square className="mr-1 h-4 w-4" /> Stop
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {entries.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Billable Amount</p>
                  <p className="text-2xl font-bold">${totalBillable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entries</p>
                  <p className="text-2xl font-bold">{entries.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      {entries.length > 0 && (
        <div className="mb-4 flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          <button
            onClick={() => setViewMode('entries')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'entries' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            All Entries
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'weekly' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            By Date
          </button>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 ? (
        viewMode === 'entries' ? (
          <div className="space-y-2">
            {entries.map((entry: any) => (
              <Card key={entry.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                        {entry.category && <span> &middot; {entry.category.replace(/_/g, ' ')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatDuration(Math.round((entry.hours || 0) * 60))}</p>
                      {entry.rate > 0 && (
                        <p className="text-xs text-green-600">
                          ${((entry.rate * (entry.hours || 0))).toFixed(0)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteEntry.mutate({ id: entry.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(entriesByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([dateKey, dateEntries]) => {
                const dayTotal = (dateEntries as any[]).reduce((sum, e) => sum + Math.round((e.hours || 0) * 60), 0);
                return (
                  <div key={dateKey}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{formatDate(dateKey)}</span>
                      </div>
                      <Badge variant="secondary">{formatDuration(dayTotal)}</Badge>
                    </div>
                    <div className="space-y-1 ml-6">
                      {(dateEntries as any[]).map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-md border p-2">
                          <div>
                            <p className="text-sm">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">{entry.category?.replace(/_/g, ' ')}</p>
                          </div>
                          <span className="text-sm font-medium">{formatDuration(Math.round((entry.hours || 0) * 60))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Timer className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Time Entries</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start tracking time spent on this project to manage billing and productivity.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Entry
          </Button>
        </Card>
      )}
    </div>
  );
}
