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
  Users,
  Plus,
  Loader2,
  UserCircle,
  Mail,
  Shield,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  Camera,
  Trash2,
  Send,
  Link,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ACCESS_LEVELS = [
  { value: 'view_only', label: 'View Only' },
  { value: 'comment', label: 'View + Comment' },
  { value: 'approve', label: 'View + Approve' },
  { value: 'full', label: 'Full Access' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_invite: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-gray-100 text-gray-800',
  revoked: 'bg-red-100 text-red-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('comment');
  const [notes, setNotes] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: clients = [], isLoading } = trpc.clientPortal.list.useQuery({ projectId });
  const { data: approvals = [] } = trpc.clientPortal.listApprovals.useQuery({ projectId });
  const { data: decisions = [] } = trpc.clientPortal.listDecisions.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const inviteClient = trpc.clientPortal.invite.useMutation({
    onSuccess: () => {
      utils.clientPortal.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Client invited', description: 'Invitation email has been sent.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to invite client', description: err.message, variant: 'destructive' });
    },
  });

  const revokeAccess = trpc.clientPortal.revokeAccess.useMutation({
    onSuccess: () => {
      utils.clientPortal.list.invalidate();
      toast({ title: 'Access revoked' });
    },
  });

  const sendReminder = trpc.clientPortal.sendReminder.useMutation({
    onSuccess: () => {
      toast({ title: 'Reminder sent', description: 'Client has been notified of pending decisions.' });
    },
  });

  const deleteClient = trpc.clientPortal.delete.useMutation({
    onSuccess: () => {
      utils.clientPortal.list.invalidate();
      toast({ title: 'Client removed' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setClientName('');
    setClientEmail('');
    setAccessLevel('comment');
    setNotes('');
  }

  function handleInvite() {
    if (!clientName || !clientEmail) return;
    inviteClient.mutate({
      projectId,
      name: clientName,
      email: clientEmail,
      accessLevel,
      notes: notes || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalClients = clients.length;
  const activeClients = clients.filter((c: any) => c.status === 'active').length;
  const pendingApprovals = approvals.filter((a: any) => a.status === 'pending').length;
  const upcomingDeadlines = decisions.filter((d: any) => d.status === 'pending').length;

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
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
            <p className="text-sm text-muted-foreground">
              Manage client access, design approvals, payment milestones, and decision deadlines.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Invite Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Client</DialogTitle>
              <DialogDescription>Send a portal invitation with access level configuration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cpName">Client Name</Label>
                <Input id="cpName" placeholder="e.g. John & Jane Smith" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpEmail">Email</Label>
                <Input id="cpEmail" type="email" placeholder="client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={accessLevel} onValueChange={setAccessLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map((al) => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpNotes">Notes</Label>
                <Textarea id="cpNotes" placeholder="Special instructions or welcome message..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviteClient.isPending || !clientName || !clientEmail}>
                {inviteClient.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-1 h-4 w-4" />Send Invite</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Clients</p><p className="text-2xl font-bold">{totalClients}</p></div><Users className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{activeClients}</p></div><CheckCircle2 className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Approvals</p><p className="text-2xl font-bold text-yellow-600">{pendingApprovals}</p></div><Clock className="h-8 w-8 text-yellow-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Decision Deadlines</p><p className="text-2xl font-bold text-blue-600">{upcomingDeadlines}</p></div><Bell className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
      </div>

      {/* ── Client Cards ────────────────────────────────────── */}
      {clients.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client: any) => (
            <Card key={client.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{client.name}</CardTitle>
                      <CardDescription className="mt-0.5 truncate">{client.email}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[client.status] || ''}`}>{client.status.replace(/_/g, ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <Shield className="h-3 w-3" />
                    {ACCESS_LEVELS.find((al) => al.value === client.accessLevel)?.label || client.accessLevel}
                  </div>
                  {client.lastLoginAt && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      Last login: {formatDate(client.lastLoginAt)}
                    </div>
                  )}
                </div>

                {/* Client activity summary */}
                <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Approvals Given</span><span className="font-medium">{client.approvalsCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comments</span><span className="font-medium">{client.commentsCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Invited</span><span className="font-medium">{formatDate(client.createdAt)}</span></div>
                </div>

                {client.notes && <p className="text-sm text-muted-foreground line-clamp-2">{client.notes}</p>}

                <div className="flex items-center gap-2 pt-1">
                  {client.status === 'active' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => sendReminder.mutate({ clientId: client.id })} disabled={sendReminder.isPending}>
                        <Bell className="mr-1 h-3.5 w-3.5" />Remind
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-700" onClick={() => revokeAccess.mutate({ id: client.id })} disabled={revokeAccess.isPending}>
                        Revoke
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteClient.mutate({ id: client.id })} disabled={deleteClient.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Clients Invited</h2>
          <p className="text-sm text-muted-foreground mb-4">Invite clients to view progress, approve designs, and track payments.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Invite Client</Button>
        </Card>
      )}

      {/* ── Pending Decisions ───────────────────────────────── */}
      {decisions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5" />Pending Client Decisions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {decisions.filter((d: any) => d.status === 'pending').map((decision: any) => (
              <Card key={decision.id} className="p-4">
                <p className="text-sm font-medium truncate">{decision.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{decision.category}</p>
                {decision.deadline && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" />Due {formatDate(decision.deadline)}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
