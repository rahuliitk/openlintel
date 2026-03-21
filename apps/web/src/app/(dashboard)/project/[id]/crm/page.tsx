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
  toast,
} from '@openlintel/ui';
import {
  Users,
  Plus,
  Loader2,
  Phone,
  Mail,
  MapPin,
  GripVertical,
  Trash2,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const PIPELINE_STAGES = [
  { value: 'new_lead', label: 'New Lead', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-purple-100 text-purple-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
] as const;

const LEAD_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'other', label: 'Other' },
] as const;

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function CrmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const { data: leads = [], isLoading } = trpc.crm.listLeads.useQuery({ projectId });

  const createLead = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      utils.crm.listLeads.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Lead added', description: 'New lead has been added to the pipeline.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add lead', description: err.message, variant: 'destructive' });
    },
  });

  const updateStage = trpc.crm.updateLeadStage.useMutation({
    onSuccess: () => {
      utils.crm.listLeads.invalidate({ projectId });
      toast({ title: 'Lead stage updated' });
    },
  });

  const deleteLead = trpc.crm.deleteLead.useMutation({
    onSuccess: () => {
      utils.crm.listLeads.invalidate({ projectId });
      toast({ title: 'Lead removed' });
    },
  });

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setSource('');
    setEstimatedValue('');
    setNotes('');
  }

  function handleCreate() {
    if (!name) return;
    createLead.mutate({
      projectId,
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      source: source || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      notes: notes || undefined,
    });
  }

  function moveToNextStage(leadId: string, currentStage: string) {
    const stageIndex = PIPELINE_STAGES.findIndex((s) => s.value === currentStage);
    if (stageIndex < PIPELINE_STAGES.length - 2) {
      updateStage.mutate({ id: leadId, stage: PIPELINE_STAGES[stageIndex + 1]!.value });
    }
  }

  const stageGroups = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l: any) => l.stage === stage.value),
  }));

  const totalPipelineValue = leads
    .filter((l: any) => !['won', 'lost'].includes(l.stage))
    .reduce((sum: number, l: any) => sum + (l.estimatedValue || 0), 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CRM &amp; Lead Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Track leads, manage client relationships, and monitor your sales pipeline.
              {totalPipelineValue > 0 && (
                <span className="ml-2 font-medium text-primary">
                  Pipeline: ${totalPipelineValue.toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              List
            </button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Add a potential client to your pipeline.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="jane@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="+1 555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lead Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                    <Input id="estimatedValue" type="number" placeholder="50000" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Any additional notes..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLead.isPending || !name}>
                  {createLead.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Lead'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && leads.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stageGroups.map((stage) => (
            <div key={stage.value} className="w-72 flex-shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${stage.color}`}>{stage.label}</Badge>
                  <span className="text-xs text-muted-foreground">{stage.leads.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {stage.leads.map((lead: any) => (
                  <Card key={lead.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{lead.name}</p>
                            {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteLead.mutate({ id: lead.id })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
                      </div>
                      {lead.estimatedValue > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
                          <DollarSign className="h-3 w-3" />
                          {lead.estimatedValue.toLocaleString()}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
                        {!['won', 'lost'].includes(lead.stage) && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => moveToNextStage(lead.id, lead.stage)}>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stage.leads.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' && leads.length > 0 ? (
        <div className="space-y-2">
          {leads.map((lead: any) => {
            const stage = PIPELINE_STAGES.find((s) => s.value === lead.stage);
            return (
              <Card key={lead.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.company || lead.email || 'No contact info'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {lead.estimatedValue > 0 && (
                      <span className="text-sm font-medium text-green-600">${lead.estimatedValue.toLocaleString()}</span>
                    )}
                    <Badge className={`text-[10px] ${stage?.color || ''}`}>{stage?.label || lead.stage}</Badge>
                    {lead.email && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {lead.phone && <Phone className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Leads Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your pipeline by adding potential clients and tracking their journey.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Lead
          </Button>
        </Card>
      )}
    </div>
  );
}
