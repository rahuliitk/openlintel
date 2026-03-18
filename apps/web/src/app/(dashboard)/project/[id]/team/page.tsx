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
  Progress,
  Separator,
  toast,
} from '@openlintel/ui';
import {
  UsersRound,
  Plus,
  Loader2,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Trash2,
  BarChart3,
  Star,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const ROLES = [
  { value: 'architect', label: 'Architect' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'structural_engineer', label: 'Structural Engineer' },
  { value: 'mep_engineer', label: 'MEP Engineer' },
  { value: 'site_supervisor', label: 'Site Supervisor' },
  { value: 'drafter', label: 'Drafter / CAD Operator' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'consultant', label: 'Consultant' },
] as const;

const AVAILABILITY_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-yellow-100 text-yellow-800',
  overloaded: 'bg-red-100 text-red-800',
  away: 'bg-gray-100 text-gray-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [office, setOffice] = useState('');
  const [maxHoursWeek, setMaxHoursWeek] = useState('40');

  const { data: members = [], isLoading } = trpc.team.listMembers.useQuery({ projectId });

  const addMember = trpc.team.addMember.useMutation({
    onSuccess: () => {
      utils.team.listMembers.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Team member added' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add member', description: err.message, variant: 'destructive' });
    },
  });

  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      utils.team.listMembers.invalidate({ projectId });
      toast({ title: 'Member removed' });
    },
  });

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setRole('');
    setOffice('');
    setMaxHoursWeek('40');
  }

  function handleAdd() {
    if (!name || !role) return;
    addMember.mutate({
      projectId,
      name,
      email: email || undefined,
      phone: phone || undefined,
      role,
      office: office || undefined,
      maxHoursPerWeek: parseInt(maxHoursWeek) || 40,
    });
  }

  function getWorkloadPercent(member: any): number {
    const max = member.maxHoursPerWeek || 40;
    const current = member.currentHoursWeek || 0;
    return Math.min(Math.round((current / max) * 100), 100);
  }

  function getAvailability(member: any): string {
    const pct = getWorkloadPercent(member);
    if (member.isAway) return 'away';
    if (pct >= 90) return 'overloaded';
    if (pct >= 70) return 'busy';
    return 'available';
  }

  const roleGroups = ROLES.map((r) => ({
    ...r,
    members: members.filter((m: any) => m.role === r.value),
  })).filter((r) => r.members.length > 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage team members, roles, and workload across the project.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-1 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>Add a member to the project team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Sarah Johnson" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="sarah@firm.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+1 555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office">Office / Location</Label>
                  <Input id="office" placeholder="Main Office" value={office} onChange={(e) => setOffice(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHours">Max Hours / Week</Label>
                <Input id="maxHours" type="number" placeholder="40" value={maxHoursWeek} onChange={(e) => setMaxHoursWeek(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addMember.isPending || !name || !role}>
                {addMember.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {members.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-green-600">{members.filter((m: any) => getAvailability(m) === 'available').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Busy</p>
              <p className="text-2xl font-bold text-yellow-600">{members.filter((m: any) => getAvailability(m) === 'busy').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Overloaded</p>
              <p className="text-2xl font-bold text-red-600">{members.filter((m: any) => getAvailability(m) === 'overloaded').length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Grid */}
      {members.length > 0 ? (
        <div className="space-y-6">
          {roleGroups.map((group) => (
            <div key={group.value}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.members.map((member: any) => {
                  const workload = getWorkloadPercent(member);
                  const availability = getAvailability(member);
                  return (
                    <Card key={member.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                              {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{member.name}</CardTitle>
                              <CardDescription>{group.label}</CardDescription>
                            </div>
                          </div>
                          <Badge className={`text-[10px] ${AVAILABILITY_COLORS[availability]}`}>{availability}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          {member.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {member.email}
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {member.phone}
                            </div>
                          )}
                          {member.office && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {member.office}
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Workload</span>
                            <span className="font-medium">{member.currentHoursWeek || 0}h / {member.maxHoursPerWeek || 40}h</span>
                          </div>
                          <Progress value={workload} className="h-2" />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 text-xs">
                            <Briefcase className="mr-1 h-3.5 w-3.5" />
                            View Tasks
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeMember.mutate({ id: member.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <UsersRound className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Team Members</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add team members to manage workload and track project assignments.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add Member
          </Button>
        </Card>
      )}
    </div>
  );
}
