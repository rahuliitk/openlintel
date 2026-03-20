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
  Progress,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  Accessibility,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  DoorOpen,
  Bath,
  CookingPot,
  ArrowDown,
  Trash2,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const CHECK_CATEGORIES = [
  { value: 'entrance', label: 'Entrance & Access', icon: DoorOpen },
  { value: 'circulation', label: 'Circulation & Hallways', icon: Home },
  { value: 'bathroom', label: 'Bathroom', icon: Bath },
  { value: 'kitchen', label: 'Kitchen', icon: CookingPot },
  { value: 'stairs', label: 'Stairs & Ramps', icon: ArrowDown },
  { value: 'bedroom', label: 'Bedroom', icon: Home },
  { value: 'general', label: 'General Features', icon: Accessibility },
] as const;

const COMPLIANCE_LEVELS = [
  { value: 'basic', label: 'Basic Visitability' },
  { value: 'enhanced', label: 'Enhanced Accessibility' },
  { value: 'full_ada', label: 'Full ADA Compliance' },
  { value: 'aging_in_place', label: 'Aging-in-Place Certified' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  compliant: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  non_compliant: 'bg-red-100 text-red-800',
  not_checked: 'bg-gray-100 text-gray-800',
};

const STATUS_ICONS = {
  compliant: <CheckCircle className="h-4 w-4 text-green-600" />,
  partial: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  non_compliant: <XCircle className="h-4 w-4 text-red-600" />,
  not_checked: <div className="h-4 w-4 rounded-full border-2 border-gray-300" />,
};

/* ─── Page Component ────────────────────────────────────────── */

export default function UniversalDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [category, setCategory] = useState('');
  const [room, setRoom] = useState('');
  const [complianceLevel, setComplianceLevel] = useState('');
  const [description, setDescription] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const { data: checks = [], isLoading } = trpc.universalDesign.listChecks.useQuery({ projectId });

  const addCheck = trpc.universalDesign.addCheck.useMutation({
    onSuccess: () => {
      utils.universalDesign.listChecks.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Check added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add check', description: err.message, variant: 'destructive' });
    },
  });

  const updateStatus = trpc.universalDesign.updateCheckStatus.useMutation({
    onSuccess: () => {
      utils.universalDesign.listChecks.invalidate({ projectId });
      toast({ title: 'Status updated' });
    },
  });

  const deleteCheck = trpc.universalDesign.deleteCheck.useMutation({
    onSuccess: () => {
      utils.universalDesign.listChecks.invalidate({ projectId });
      toast({ title: 'Check removed' });
    },
  });

  const runAudit = trpc.universalDesign.runAudit.useMutation({
    onSuccess: () => {
      utils.universalDesign.listChecks.invalidate({ projectId });
      toast({ title: 'Audit complete', description: 'Accessibility audit has been run against your design.' });
    },
  });

  function resetForm() {
    setFeatureName('');
    setCategory('');
    setRoom('');
    setComplianceLevel('');
    setDescription('');
    setRecommendation('');
  }

  function handleAdd() {
    if (!featureName || !category) return;
    addCheck.mutate({
      projectId,
      name: featureName,
      category,
      room: room || undefined,
      complianceLevel: complianceLevel || undefined,
      description: description || undefined,
      recommendation: recommendation || undefined,
    });
  }

  const compliantCount = checks.filter((c: any) => c.status === 'compliant').length;
  const nonCompliantCount = checks.filter((c: any) => c.status === 'non_compliant').length;
  const partialCount = checks.filter((c: any) => c.status === 'partial').length;
  const complianceRate = checks.length > 0 ? Math.round((compliantCount / checks.length) * 100) : 0;

  const categoryGroups = CHECK_CATEGORIES.map((cat) => ({
    ...cat,
    checks: checks.filter((c: any) => c.category === cat.value),
  })).filter((g) => g.checks.length > 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Accessibility className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Universal Design &amp; Aging-in-Place</h1>
            <p className="text-sm text-muted-foreground">
              Ensure accessibility compliance and aging-in-place readiness for your design.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => runAudit.mutate({ projectId })} disabled={runAudit.isPending}>
            {runAudit.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Accessibility className="mr-1 h-4 w-4" />}
            Run Audit
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Check
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Accessibility Check</DialogTitle>
                <DialogDescription>Add a universal design feature or compliance check.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="feature">Feature / Check Name</Label>
                  <Input id="feature" placeholder="e.g. Zero-step entry at front door" value={featureName} onChange={(e) => setFeatureName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CHECK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room / Location</Label>
                    <Input id="room" placeholder="Front entrance" value={room} onChange={(e) => setRoom(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Compliance Level</Label>
                  <Select value={complianceLevel} onValueChange={setComplianceLevel}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} placeholder="Describe the requirement..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec">Recommendation</Label>
                  <Textarea id="rec" rows={2} placeholder="How to achieve compliance..." value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addCheck.isPending || !featureName || !category}>
                  {addCheck.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Check'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      {checks.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Compliance Rate</p>
              <p className="text-2xl font-bold">{complianceRate}%</p>
              <Progress value={complianceRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Compliant</p><p className="text-2xl font-bold text-green-600">{compliantCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Partial</p><p className="text-2xl font-bold text-yellow-600">{partialCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Non-Compliant</p><p className="text-2xl font-bold text-red-600">{nonCompliantCount}</p></CardContent></Card>
        </div>
      )}

      {/* Checks by Category */}
      {checks.length > 0 ? (
        <div className="space-y-4">
          {categoryGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.value}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{group.checks.length} checks</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.checks.map((check: any) => (
                      <div key={check.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{STATUS_ICONS[check.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.not_checked}</div>
                          <div>
                            <p className="text-sm font-medium">{check.name}</p>
                            {check.room && <p className="text-xs text-muted-foreground">{check.room}</p>}
                            {check.description && <p className="text-xs text-muted-foreground mt-1">{check.description}</p>}
                            {check.recommendation && check.status !== 'compliant' && (
                              <p className="text-xs text-blue-600 mt-1">Recommendation: {check.recommendation}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select value={check.status} onValueChange={(status: string) => updateStatus.mutate({ id: check.id, status: status as 'compliant' | 'partial' | 'non_compliant' | 'not_checked' })}>
                            <SelectTrigger className="w-[130px] h-7 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compliant">Compliant</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                              <SelectItem value="not_checked">Not Checked</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCheck.mutate({ id: check.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Accessibility className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Accessibility Checks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Run an accessibility audit or manually add universal design checks to ensure your project is accessible for all ages and abilities.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runAudit.mutate({ projectId })} disabled={runAudit.isPending}>
              <Accessibility className="mr-1 h-4 w-4" /> Run Audit
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Check
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
