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
  HelpCircle,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  FileText,
  Trash2,
  Send,
  CalendarDays,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  responded: 'bg-green-100 text-green-800',
  closed: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

type StatusFilter = 'all' | 'open' | 'responded' | 'closed' | 'overdue';

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function RFIsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState('medium');
  const [drawingRef, setDrawingRef] = useState('');
  const [specSection, setSpecSection] = useState('');
  const [responseDueDate, setResponseDueDate] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: rfis = [], isLoading } = trpc.rfi.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createRfi = trpc.rfi.create.useMutation({
    onSuccess: () => {
      utils.rfi.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'RFI created', description: 'Request for Information has been submitted.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create RFI', description: err.message, variant: 'destructive' });
    },
  });

  const respondToRfi = trpc.rfi.respond.useMutation({
    onSuccess: () => {
      utils.rfi.list.invalidate();
      toast({ title: 'Response submitted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to respond', description: err.message, variant: 'destructive' });
    },
  });

  const closeRfi = trpc.rfi.close.useMutation({
    onSuccess: () => {
      utils.rfi.list.invalidate();
      toast({ title: 'RFI closed' });
    },
  });

  const deleteRfi = trpc.rfi.delete.useMutation({
    onSuccess: () => {
      utils.rfi.list.invalidate();
      toast({ title: 'RFI deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setSubject('');
    setQuestion('');
    setPriority('medium');
    setDrawingRef('');
    setSpecSection('');
    setResponseDueDate('');
  }

  function handleCreate() {
    if (!subject || !question) return;
    createRfi.mutate({
      projectId,
      subject,
      question,
      priority,
      drawingReference: drawingRef || undefined,
      specSection: specSection || undefined,
      responseDueDate: responseDueDate ? new Date(responseDueDate) : undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const filteredRfis = rfis
    .filter((rfi: any) => statusFilter === 'all' || rfi.status === statusFilter)
    .filter((rfi: any) =>
      searchQuery === '' ||
      rfi.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfi.rfiNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalCount = rfis.length;
  const openCount = rfis.filter((r: any) => r.status === 'open').length;
  const overdueCount = rfis.filter((r: any) => r.status === 'overdue').length;
  const respondedCount = rfis.filter((r: any) => r.status === 'responded').length;

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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
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
          <HelpCircle className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RFI Management</h1>
            <p className="text-sm text-muted-foreground">
              Track contractor questions, responses, and link to drawing sheets.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New RFI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Request for Information</DialogTitle>
              <DialogDescription>
                Submit a question with references to drawings or spec sections.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rfiSubject">Subject</Label>
                <Input
                  id="rfiSubject"
                  placeholder="e.g. Clarification on wall framing at grid B-3"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfiQuestion">Question</Label>
                <Textarea
                  id="rfiQuestion"
                  placeholder="Describe the information you need in detail..."
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfiDueDate">Response Due</Label>
                  <Input
                    id="rfiDueDate"
                    type="date"
                    value={responseDueDate}
                    onChange={(e) => setResponseDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drawingRef">Drawing Reference</Label>
                  <Input
                    id="drawingRef"
                    placeholder="e.g. A2.1, S-101"
                    value={drawingRef}
                    onChange={(e) => setDrawingRef(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specRef">Spec Section</Label>
                  <Input
                    id="specRef"
                    placeholder="e.g. 06 10 00"
                    value={specSection}
                    onChange={(e) => setSpecSection(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createRfi.isPending || !subject || !question}>
                {createRfi.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit RFI'
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
                <p className="text-sm text-muted-foreground">Total RFIs</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-blue-600">{openCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Responded</p>
                <p className="text-2xl font-bold text-green-600">{respondedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter ─────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject or RFI number..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          {(['all', 'open', 'responded', 'closed', 'overdue'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── RFI List ────────────────────────────────────────── */}
      {filteredRfis.length > 0 ? (
        <div className="space-y-3">
          {filteredRfis.map((rfi: any) => (
            <Card key={rfi.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {rfi.rfiNumber && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {rfi.rfiNumber}
                        </Badge>
                      )}
                      <Badge className={`text-[10px] ${STATUS_COLORS[rfi.status] || ''}`}>
                        {rfi.status}
                      </Badge>
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[rfi.priority] || ''}`}>
                        {rfi.priority}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold truncate">{rfi.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{rfi.question}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Created {formatDate(rfi.createdAt)}
                      </span>
                      {rfi.responseDueDate && (
                        <span className={`flex items-center gap-1 ${rfi.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                          <Clock className="h-3 w-3" />
                          Due {formatDate(rfi.responseDueDate)}
                        </span>
                      )}
                      {rfi.drawingReference && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {rfi.drawingReference}
                        </span>
                      )}
                      {rfi.responseCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {rfi.responseCount} response{rfi.responseCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {rfi.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => respondToRfi.mutate({ id: rfi.id, response: 'Acknowledged' })}
                        disabled={respondToRfi.isPending}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" />
                        Respond
                      </Button>
                    )}
                    {rfi.status === 'responded' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700"
                        onClick={() => closeRfi.mutate({ id: rfi.id })}
                        disabled={closeRfi.isPending}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Close
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteRfi.mutate({ id: rfi.id })}
                      disabled={deleteRfi.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <HelpCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No RFIs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create Requests for Information to track contractor questions and architect responses.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New RFI
          </Button>
        </Card>
      )}
    </div>
  );
}
