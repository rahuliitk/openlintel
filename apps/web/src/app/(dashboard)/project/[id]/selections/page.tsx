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
  ListChecks,
  Plus,
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays,
  Trash2,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SELECTION_CATEGORIES = [
  { value: 'flooring', label: 'Flooring' },
  { value: 'paint', label: 'Paint Colors' },
  { value: 'tile', label: 'Tile' },
  { value: 'countertop', label: 'Countertops' },
  { value: 'cabinetry', label: 'Cabinetry' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'lighting', label: 'Lighting Fixtures' },
  { value: 'plumbing_fixtures', label: 'Plumbing Fixtures' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'windows_doors', label: 'Windows & Doors' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  selected: 'bg-blue-100 text-blue-800',
  ordered: 'bg-purple-100 text-purple-800',
  signed_off: 'bg-green-100 text-green-800',
  over_budget: 'bg-red-100 text-red-800',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function SelectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState('flooring');
  const [itemName, setItemName] = useState('');
  const [allowanceBudget, setAllowanceBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: selections = [], isLoading } = trpc.selection.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createSelection = trpc.selection.create.useMutation({
    onSuccess: () => {
      utils.selection.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Selection created', description: 'Allowance item has been added.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create selection', description: err.message, variant: 'destructive' });
    },
  });

  const signOff = trpc.selection.signOff.useMutation({
    onSuccess: () => {
      utils.selection.list.invalidate();
      toast({ title: 'Selection signed off' });
    },
  });

  const deleteSelection = trpc.selection.delete.useMutation({
    onSuccess: () => {
      utils.selection.list.invalidate();
      toast({ title: 'Selection deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setCategory('flooring');
    setItemName('');
    setAllowanceBudget('');
    setActualCost('');
    setDueDate('');
    setSupplier('');
    setNotes('');
  }

  function handleCreate() {
    if (!itemName) return;
    createSelection.mutate({
      projectId,
      category,
      itemName,
      allowanceBudget: allowanceBudget ? parseFloat(allowanceBudget) : undefined,
      actualCost: actualCost ? parseFloat(actualCost) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      supplier: supplier || undefined,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalSelections = selections.length;
  const signedOffCount = selections.filter((s: any) => s.status === 'signed_off').length;
  const pendingCount = selections.filter((s: any) => s.status === 'pending').length;
  const totalAllowance = selections.reduce((sum: number, s: any) => sum + (s.allowanceBudget || 0), 0);
  const totalActual = selections.reduce((sum: number, s: any) => sum + (s.actualCost || 0), 0);
  const variance = totalActual - totalAllowance;
  const overdueCount = selections.filter((s: any) => {
    if (s.status === 'signed_off' || s.status === 'ordered') return false;
    if (!s.dueDate) return false;
    return new Date(s.dueDate) < new Date();
  }).length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Selections & Allowances</h1>
            <p className="text-sm text-muted-foreground">
              Track finish selections, allowance budgets, and sign-off workflow.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Selection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Selection Item</DialogTitle>
              <DialogDescription>Define a finish selection with allowance budget and deadline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SELECTION_CATEGORIES.map((sc) => <SelectItem key={sc.value} value={sc.value}>{sc.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selName">Item Name</Label>
                  <Input id="selName" placeholder="e.g. Master bath floor tile" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allowance">Allowance ($)</Label>
                  <Input id="allowance" type="number" placeholder="5000" value={allowanceBudget} onChange={(e) => setAllowanceBudget(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual">Actual Cost ($)</Label>
                  <Input id="actual" type="number" placeholder="4500" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selDue">Due Date</Label>
                  <Input id="selDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="selSupplier">Supplier / Showroom</Label>
                <Input id="selSupplier" placeholder="e.g. Floor & Decor" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selNotes">Notes</Label>
                <Textarea id="selNotes" rows={2} placeholder="Color, finish, model number..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createSelection.isPending || !itemName}>
                {createSelection.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Selection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Selections</p><p className="text-2xl font-bold">{totalSelections}</p></div><ListChecks className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Signed Off</p><p className="text-2xl font-bold text-green-600">{signedOffCount}</p></div><CheckCircle2 className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Allowance</p><p className="text-2xl font-bold">{formatCurrency(totalAllowance)}</p></div><DollarSign className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Variance</p>
                <p className={`text-2xl font-bold ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>
                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </p>
              </div>
              {variance > 0 ? <TrendingUp className="h-8 w-8 text-red-400" /> : <TrendingDown className="h-8 w-8 text-green-400" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Overdue Alert ───────────────────────────────────── */}
      {overdueCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{overdueCount} selection{overdueCount !== 1 ? 's' : ''} overdue. Client decisions needed.</p>
        </div>
      )}

      {/* ── Selection Cards ─────────────────────────────────── */}
      {selections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selections.map((sel: any) => {
            const itemVariance = (sel.actualCost || 0) - (sel.allowanceBudget || 0);
            const isOverBudget = itemVariance > 0 && sel.actualCost;
            return (
              <Card key={sel.id} className={`relative ${isOverBudget ? 'border-red-200' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{sel.itemName}</CardTitle>
                      <CardDescription className="mt-0.5 capitalize">{sel.category.replace(/_/g, ' ')}</CardDescription>
                    </div>
                    <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[sel.status] || ''}`}>{sel.status.replace(/_/g, ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                    {sel.allowanceBudget != null && <div className="flex justify-between"><span className="text-muted-foreground">Allowance</span><span className="font-medium">{formatCurrency(sel.allowanceBudget)}</span></div>}
                    {sel.actualCost != null && <div className="flex justify-between"><span className="text-muted-foreground">Actual</span><span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(sel.actualCost)}</span></div>}
                    {sel.actualCost != null && sel.allowanceBudget != null && <div className="flex justify-between"><span className="text-muted-foreground">Variance</span><span className={`font-medium ${itemVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>{itemVariance > 0 ? '+' : ''}{formatCurrency(itemVariance)}</span></div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sel.supplier && <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"><ShoppingBag className="h-3 w-3" />{sel.supplier}</div>}
                    {sel.dueDate && <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"><CalendarDays className="h-3 w-3" />Due {formatDate(sel.dueDate)}</div>}
                  </div>
                  {sel.notes && <p className="text-sm text-muted-foreground line-clamp-2">{sel.notes}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    {sel.status !== 'signed_off' && (
                      <Button variant="outline" size="sm" className="flex-1 border-green-200 text-green-700 hover:bg-green-50" onClick={() => signOff.mutate({ id: sel.id })} disabled={signOff.isPending}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Sign Off
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSelection.mutate({ id: sel.id })} disabled={deleteSelection.isPending}>
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
          <ListChecks className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Selections</h2>
          <p className="text-sm text-muted-foreground mb-4">Track finish selections, allowance budgets, and client sign-offs.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Selection</Button>
        </Card>
      )}
    </div>
  );
}
