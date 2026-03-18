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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  FileSignature,
  Plus,
  Loader2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Trash2,
  Copy,
  Download,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

const PROPOSAL_TYPES = [
  { value: 'design', label: 'Design Services' },
  { value: 'construction', label: 'Construction' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'full_service', label: 'Full Service' },
] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function ProposalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [proposalType, setProposalType] = useState('');
  const [amount, setAmount] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [scope, setScope] = useState('');
  const [terms, setTerms] = useState('');

  const { data: proposals = [], isLoading } = trpc.proposal.list.useQuery({ projectId });

  const createProposal = trpc.proposal.create.useMutation({
    onSuccess: () => {
      utils.proposal.list.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Proposal created', description: 'Your proposal draft has been saved.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create proposal', description: err.message, variant: 'destructive' });
    },
  });

  const sendProposal = trpc.proposal.send.useMutation({
    onSuccess: () => {
      utils.proposal.list.invalidate({ projectId });
      toast({ title: 'Proposal sent', description: 'The proposal has been emailed to the client.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to send proposal', description: err.message, variant: 'destructive' });
    },
  });

  const deleteProposal = trpc.proposal.delete.useMutation({
    onSuccess: () => {
      utils.proposal.list.invalidate({ projectId });
      toast({ title: 'Proposal deleted' });
    },
  });

  function resetForm() {
    setTitle('');
    setClientName('');
    setClientEmail('');
    setProposalType('');
    setAmount('');
    setValidDays('30');
    setScope('');
    setTerms('');
  }

  function handleCreate() {
    if (!title || !clientName || !proposalType) return;
    createProposal.mutate({
      projectId,
      title,
      clientName,
      clientEmail: clientEmail || undefined,
      proposalType,
      amount: amount ? parseFloat(amount) : 0,
      validDays: parseInt(validDays) || 30,
      scope: scope || undefined,
      terms: terms || undefined,
    });
  }

  const totalValue = proposals.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const acceptedCount = proposals.filter((p: any) => p.status === 'accepted').length;
  const pendingCount = proposals.filter((p: any) => ['draft', 'sent', 'viewed'].includes(p.status)).length;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proposals &amp; Contracts</h1>
            <p className="text-sm text-muted-foreground">
              Generate, send, and track project proposals and contracts.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
              <DialogDescription>Draft a new proposal or contract for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Proposal Title</Label>
                <Input id="title" placeholder="e.g. Kitchen Renovation Proposal" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input id="clientName" placeholder="John Smith" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input id="clientEmail" type="email" placeholder="john@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposal Type</Label>
                  <Select value={proposalType} onValueChange={setProposalType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input id="amount" type="number" placeholder="25000" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validDays">Valid For (days)</Label>
                <Input id="validDays" type="number" placeholder="30" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scope">Scope of Work</Label>
                <Textarea id="scope" placeholder="Describe the scope of work..." rows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms &amp; Conditions</Label>
                <Textarea id="terms" placeholder="Payment terms, timeline, etc." rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createProposal.isPending || !title || !clientName || !proposalType}>
                {createProposal.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {proposals.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Proposals</p>
                  <p className="text-2xl font-bold">{proposals.length}</p>
                </div>
                <FileSignature className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Proposals Grid */}
      {proposals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal: any) => (
            <Card key={proposal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{proposal.title}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {proposal.clientName}
                      {proposal.proposalType && <span> &middot; {proposal.proposalType.replace(/_/g, ' ')}</span>}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[proposal.status] || ''}`}>
                    {proposal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold">{formatCurrency(proposal.amount || 0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{formatDate(proposal.createdAt)}</span>
                  </div>
                  {proposal.expiresAt && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Expires</span>
                      <span className="font-medium">{formatDate(proposal.expiresAt)}</span>
                    </div>
                  )}
                </div>

                {proposal.scope && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{proposal.scope}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {proposal.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={sendProposal.isPending}
                      onClick={() => sendProposal.mutate({ id: proposal.id })}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Send
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Duplicate
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteProposal.mutate({ id: proposal.id })}
                    disabled={deleteProposal.isPending}
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
          <FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Proposals Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first proposal to share with clients and track contract status.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Proposal
          </Button>
        </Card>
      )}
    </div>
  );
}
