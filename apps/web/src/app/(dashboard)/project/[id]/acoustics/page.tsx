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
  Volume2,
  Plus,
  Loader2,
  VolumeX,
  Music,
  Calculator,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Layers,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ASSESSMENT_TYPES = [
  { value: 'stc', label: 'STC (Sound Transmission Class)' },
  { value: 'iic', label: 'IIC (Impact Insulation Class)' },
  { value: 'reverberation', label: 'Reverberation Time' },
  { value: 'noise_reduction', label: 'Noise Reduction Strategy' },
  { value: 'material_recommendation', label: 'Acoustic Material' },
] as const;

const ROOM_USES = [
  { value: 'home_theater', label: 'Home Theater' },
  { value: 'music_room', label: 'Music Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'home_office', label: 'Home Office' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'general', label: 'General' },
] as const;

const STC_RATINGS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent (STC 60+)', color: 'text-green-600' },
  good: { label: 'Good (STC 50-59)', color: 'text-blue-600' },
  fair: { label: 'Fair (STC 40-49)', color: 'text-yellow-600' },
  poor: { label: 'Poor (STC <40)', color: 'text-red-600' },
};

function getStcRating(stc: number): string {
  if (stc >= 60) return 'excellent';
  if (stc >= 50) return 'good';
  if (stc >= 40) return 'fair';
  return 'poor';
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  analyzing: 'bg-blue-100 text-blue-800',
  pass: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  fail: 'bg-red-100 text-red-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function AcousticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentType, setAssessmentType] = useState('stc');
  const [sourceRoom, setSourceRoom] = useState('');
  const [receivingRoom, setReceivingRoom] = useState('');
  const [roomUse, setRoomUse] = useState('general');
  const [wallType, setWallType] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: assessments = [], isLoading } = trpc.acoustics.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createAssessment = trpc.acoustics.create.useMutation({
    onSuccess: () => {
      utils.acoustics.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Assessment created', description: 'Acoustic assessment has been added.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create assessment', description: err.message, variant: 'destructive' });
    },
  });

  const runCalculation = trpc.acoustics.calculate.useMutation({
    onSuccess: (data) => {
      utils.acoustics.list.invalidate();
      toast({
        title: 'Calculation complete',
        description: `${data.passed} pass, ${data.warnings} warnings.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Calculation failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAssessment = trpc.acoustics.delete.useMutation({
    onSuccess: () => {
      utils.acoustics.list.invalidate();
      toast({ title: 'Assessment deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setAssessmentName('');
    setAssessmentType('stc');
    setSourceRoom('');
    setReceivingRoom('');
    setRoomUse('general');
    setWallType('');
    setNotes('');
  }

  function handleCreate() {
    if (!assessmentName) return;
    createAssessment.mutate({
      projectId,
      name: assessmentName,
      assessmentType,
      sourceRoomId: sourceRoom || undefined,
      receivingRoomId: receivingRoom || undefined,
      roomUse,
      wallType: wallType || undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalAssessments = assessments.length;
  const passCount = assessments.filter((a: any) => a.status === 'pass').length;
  const warningCount = assessments.filter((a: any) => a.status === 'warning').length;
  const failCount = assessments.filter((a: any) => a.status === 'fail').length;

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
          <Volume2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Acoustic Design</h1>
            <p className="text-sm text-muted-foreground">
              STC/IIC calculations, reverberation time, and acoustic material recommendations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runCalculation.mutate({ projectId })}
            disabled={runCalculation.isPending || assessments.length === 0}
          >
            {runCalculation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-1 h-4 w-4" />
            )}
            Calculate All
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Acoustic Assessment</DialogTitle>
                <DialogDescription>
                  Define an STC, IIC, or reverberation assessment between rooms.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acName">Assessment Name</Label>
                    <Input
                      id="acName"
                      placeholder="e.g. Master BR to Living Room"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={assessmentType} onValueChange={setAssessmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSESSMENT_TYPES.map((at) => (
                          <SelectItem key={at.value} value={at.value}>
                            {at.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source Room</Label>
                    <Select value={sourceRoom} onValueChange={setSourceRoom}>
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
                    <Label>Receiving Room</Label>
                    <Select value={receivingRoom} onValueChange={setReceivingRoom}>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room Use</Label>
                    <Select value={roomUse} onValueChange={setRoomUse}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_USES.map((ru) => (
                          <SelectItem key={ru.value} value={ru.value}>
                            {ru.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wallType">Wall Assembly</Label>
                    <Input
                      id="wallType"
                      placeholder="e.g. 2x6 staggered stud"
                      value={wallType}
                      onChange={(e) => setWallType(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acNotes">Notes</Label>
                  <Textarea
                    id="acNotes"
                    placeholder="Additional requirements, existing conditions..."
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
                <Button onClick={handleCreate} disabled={createAssessment.isPending || !assessmentName}>
                  {createAssessment.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Assessment'
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
                <p className="text-sm text-muted-foreground">Assessments</p>
                <p className="text-2xl font-bold">{totalAssessments}</p>
              </div>
              <Volume2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600">{passCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failCount}</p>
              </div>
              <VolumeX className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Assessment Cards ─────────────────────────────────── */}
      {assessments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((assessment: any) => {
            const stcValue = assessment.stcValue;
            const stcInfo = stcValue != null ? STC_RATINGS[getStcRating(stcValue)] : null;
            return (
              <Card key={assessment.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{assessment.name}</CardTitle>
                      <CardDescription className="mt-0.5">
                        {ASSESSMENT_TYPES.find((at) => at.value === assessment.assessmentType)?.label}
                      </CardDescription>
                    </div>
                    <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[assessment.status] || ''}`}>
                      {assessment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessment.sourceRoomName && assessment.receivingRoomName && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{assessment.sourceRoomName}</span>
                      <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{assessment.receivingRoomName}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {stcValue != null && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        <Volume2 className="h-3 w-3" />
                        STC {stcValue}
                      </div>
                    )}
                    {assessment.iicValue != null && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        <Layers className="h-3 w-3" />
                        IIC {assessment.iicValue}
                      </div>
                    )}
                    {assessment.reverbTime != null && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        <Music className="h-3 w-3" />
                        {assessment.reverbTime}s RT60
                      </div>
                    )}
                    {assessment.roomUse && assessment.roomUse !== 'general' && (
                      <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                        {assessment.roomUse.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  {stcInfo && (
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className={`text-xs font-medium ${stcInfo.color}`}>{stcInfo.label}</p>
                    </div>
                  )}
                  {assessment.recommendation && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                      <p className="text-xs text-blue-800">{assessment.recommendation}</p>
                    </div>
                  )}
                  {assessment.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{assessment.notes}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAssessment.mutate({ id: assessment.id })}
                      disabled={deleteAssessment.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Volume2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Acoustic Assessments</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add STC, IIC, and reverberation assessments to optimize sound isolation between rooms.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Assessment
          </Button>
        </Card>
      )}
    </div>
  );
}
