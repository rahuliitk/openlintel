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
  MessageSquareDashed,
  Plus,
  Loader2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Eye,
  Filter,
  MessageCircle,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ANNOTATION_TYPES = [
  { value: 'dislike', label: "Don't Like This" },
  { value: 'like', label: 'Love This' },
  { value: 'question', label: 'Question' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'general', label: 'General Comment' },
] as const;

const ELEMENT_TYPES = [
  { value: 'wall', label: 'Wall' },
  { value: 'floor', label: 'Floor' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'fixture', label: 'Fixture' },
  { value: 'finish', label: 'Finish / Material' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'window', label: 'Window' },
  { value: 'door', label: 'Door' },
  { value: 'other', label: 'Other' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

const TYPE_ICONS: Record<string, any> = {
  dislike: ThumbsDown,
  like: ThumbsUp,
  question: MessageCircle,
  change_request: MessageSquareDashed,
  general: MapPin,
};

const TYPE_COLORS: Record<string, string> = {
  dislike: 'bg-red-100 text-red-700',
  like: 'bg-green-100 text-green-700',
  question: 'bg-blue-100 text-blue-700',
  change_request: 'bg-purple-100 text-purple-700',
  general: 'bg-gray-100 text-gray-700',
};

type StatusFilter = 'all' | 'open' | 'acknowledged' | 'resolved' | 'dismissed';

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function AnnotationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [annotationType, setAnnotationType] = useState('general');
  const [elementType, setElementType] = useState('other');
  const [roomId, setRoomId] = useState('');
  const [comment, setComment] = useState('');
  const [positionNote, setPositionNote] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: annotations = [], isLoading } = trpc.annotation.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createAnnotation = trpc.annotation.create.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Annotation created', description: 'Walk-through feedback has been recorded.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create annotation', description: err.message, variant: 'destructive' });
    },
  });

  const acknowledgeAnnotation = trpc.annotation.acknowledge.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate();
      toast({ title: 'Annotation acknowledged' });
    },
  });

  const resolveAnnotation = trpc.annotation.resolve.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate();
      toast({ title: 'Annotation resolved' });
    },
  });

  const dismissAnnotation = trpc.annotation.dismiss.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate();
      toast({ title: 'Annotation dismissed' });
    },
  });

  const deleteAnnotation = trpc.annotation.delete.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate();
      toast({ title: 'Annotation deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setAnnotationType('general');
    setElementType('other');
    setRoomId('');
    setComment('');
    setPositionNote('');
  }

  function handleCreate() {
    if (!comment) return;
    createAnnotation.mutate({
      projectId,
      annotationType,
      elementType,
      roomId: roomId || undefined,
      comment,
      positionNote: positionNote || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const filtered = statusFilter === 'all'
    ? annotations
    : annotations.filter((a: any) => a.status === statusFilter);

  const totalAnnotations = annotations.length;
  const openCount = annotations.filter((a: any) => a.status === 'open').length;
  const resolvedCount = annotations.filter((a: any) => a.status === 'resolved').length;
  const dislikeCount = annotations.filter((a: any) => a.annotationType === 'dislike' && a.status === 'open').length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquareDashed className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Walk-Through Annotations</h1>
            <p className="text-sm text-muted-foreground">
              Client feedback pinned to specific elements in VR/3D walkthroughs.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Annotation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Walk-Through Annotation</DialogTitle>
              <DialogDescription>Pin feedback to a specific element or location in the design.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Feedback Type</Label>
                  <Select value={annotationType} onValueChange={setAnnotationType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANNOTATION_TYPES.map((at) => <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Element Type</Label>
                  <Select value={elementType} onValueChange={setElementType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ELEMENT_TYPES.map((et) => <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={roomId} onValueChange={setRoomId}><SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger><SelectContent><SelectItem value="">General</SelectItem>{rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posNote">Position Note</Label>
                  <Input id="posNote" placeholder="e.g. North wall, above couch" value={positionNote} onChange={(e) => setPositionNote(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="annComment">Comment</Label>
                <Textarea id="annComment" placeholder="Describe your feedback in detail..." rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createAnnotation.isPending || !comment}>
                {createAnnotation.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Annotation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Annotations</p><p className="text-2xl font-bold">{totalAnnotations}</p></div><MessageSquareDashed className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{openCount}</p></div><Clock className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-green-600">{resolvedCount}</p></div><CheckCircle2 className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Dislikes (Open)</p><p className="text-2xl font-bold text-red-600">{dislikeCount}</p></div><ThumbsDown className="h-8 w-8 text-red-400" /></div></CardContent></Card>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {(['all', 'open', 'acknowledged', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Annotation List ─────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((ann: any) => {
            const TypeIcon = TYPE_ICONS[ann.annotationType] || MapPin;
            return (
              <Card key={ann.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[ann.annotationType] || 'bg-gray-100 text-gray-700'}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] ${TYPE_COLORS[ann.annotationType] || ''}`}>
                          {ANNOTATION_TYPES.find((at) => at.value === ann.annotationType)?.label || ann.annotationType}
                        </Badge>
                        <Badge className={`text-[10px] ${STATUS_COLORS[ann.status] || ''}`}>
                          {ann.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {ann.elementType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm">{ann.comment}</p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        {ann.roomName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ann.roomName}
                          </span>
                        )}
                        {ann.positionNote && (
                          <span className="flex items-center gap-1">
                            {ann.positionNote}
                          </span>
                        )}
                        {ann.authorName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ann.authorName}
                          </span>
                        )}
                        <span>{formatDate(ann.createdAt)}</span>
                      </div>
                      {ann.resolution && (
                        <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
                          <span className="font-medium">Resolution: </span>{ann.resolution}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ann.status === 'open' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => acknowledgeAnnotation.mutate({ id: ann.id })} disabled={acknowledgeAnnotation.isPending}>
                            <Eye className="mr-1 h-3.5 w-3.5" />Ack
                          </Button>
                          <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => resolveAnnotation.mutate({ id: ann.id })} disabled={resolveAnnotation.isPending}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Resolve
                          </Button>
                        </>
                      )}
                      {ann.status === 'acknowledged' && (
                        <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => resolveAnnotation.mutate({ id: ann.id })} disabled={resolveAnnotation.isPending}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Resolve
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteAnnotation.mutate({ id: ann.id })} disabled={deleteAnnotation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <MessageSquareDashed className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Annotations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create walk-through annotations to pin client feedback to specific design elements.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Annotation
          </Button>
        </Card>
      )}
    </div>
  );
}
