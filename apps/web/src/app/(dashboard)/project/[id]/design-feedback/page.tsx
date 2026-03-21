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
  Brain,
  Plus,
  Loader2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  TrendingUp,
  Lightbulb,
  BookOpen,
  BarChart3,
  Trash2,
  RefreshCw,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const FEEDBACK_TYPES = [
  { value: 'design_choice', label: 'Design Choice' },
  { value: 'material_selection', label: 'Material Selection' },
  { value: 'layout_decision', label: 'Layout Decision' },
  { value: 'cost_optimization', label: 'Cost Optimization' },
  { value: 'client_preference', label: 'Client Preference' },
  { value: 'code_issue', label: 'Code / Compliance Issue' },
  { value: 'constructability', label: 'Constructability' },
] as const;

const OUTCOME_OPTIONS = [
  { value: 'positive', label: 'Positive Outcome' },
  { value: 'negative', label: 'Negative Outcome' },
  { value: 'neutral', label: 'Neutral / Mixed' },
  { value: 'unknown', label: 'Not Yet Determined' },
] as const;

const OUTCOME_COLORS: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  neutral: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-gray-100 text-gray-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function DesignFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [decision, setDecision] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [outcome, setOutcome] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');

  const { data: feedbackItems = [], isLoading } = trpc.designFeedback.list.useQuery({ projectId });
  const { data: insights } = trpc.designFeedback.getInsights.useQuery({ projectId });

  const addFeedback = trpc.designFeedback.add.useMutation({
    onSuccess: () => {
      utils.designFeedback.list.invalidate({ projectId });
      utils.designFeedback.getInsights.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Feedback recorded' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add feedback', description: err.message, variant: 'destructive' });
    },
  });

  const generateInsights = trpc.designFeedback.generateInsights.useMutation({
    onSuccess: () => {
      utils.designFeedback.getInsights.invalidate({ projectId });
      toast({ title: 'Insights generated', description: 'AI has analyzed your design decisions and patterns.' });
    },
  });

  const deleteFeedback = trpc.designFeedback.delete.useMutation({
    onSuccess: () => {
      utils.designFeedback.list.invalidate({ projectId });
      utils.designFeedback.getInsights.invalidate({ projectId });
      toast({ title: 'Feedback removed' });
    },
  });

  function resetForm() {
    setTitle('');
    setFeedbackType('');
    setDecision('');
    setReasoning('');
    setOutcome('');
    setLessonsLearned('');
  }

  function handleAdd() {
    if (!title || !feedbackType || !decision) return;
    addFeedback.mutate({
      projectId,
      title,
      feedbackType,
      decision,
      reasoning: reasoning || undefined,
      outcome: outcome || undefined,
      lessonsLearned: lessonsLearned || undefined,
    });
  }

  const positiveCount = feedbackItems.filter((f: any) => f.outcome === 'positive').length;
  const negativeCount = feedbackItems.filter((f: any) => f.outcome === 'negative').length;
  const successRate = feedbackItems.length > 0
    ? Math.round((positiveCount / feedbackItems.filter((f: any) => f.outcome !== 'unknown').length) * 100) || 0
    : 0;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Design Learning &amp; Feedback</h1>
            <p className="text-sm text-muted-foreground">
              Record design decisions, track outcomes, and learn from patterns across projects.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generateInsights.mutate({ projectId })} disabled={generateInsights.isPending}>
            {generateInsights.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            AI Insights
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Design Feedback</DialogTitle>
                <DialogDescription>Document a design decision and its outcome for future learning.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Decision Title</Label>
                  <Input id="title" placeholder="e.g. Open floor plan for kitchen/living" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Feedback Type</Label>
                    <Select value={feedbackType} onValueChange={setFeedbackType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decision">Decision Made</Label>
                  <Textarea id="decision" rows={2} placeholder="What was decided and why..." value={decision} onChange={(e) => setDecision(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reasoning">Reasoning</Label>
                  <Textarea id="reasoning" rows={2} placeholder="The rationale behind this decision..." value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessons">Lessons Learned</Label>
                  <Textarea id="lessons" rows={2} placeholder="What would you do differently? What worked well?" value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addFeedback.isPending || !title || !feedbackType || !decision}>
                  {addFeedback.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : 'Save Feedback'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      {feedbackItems.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Decisions</p><p className="text-2xl font-bold">{feedbackItems.length}</p></CardContent></Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{successRate}%</p>
              <Progress value={successRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Positive</p><p className="text-2xl font-bold text-green-600">{positiveCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Negative</p><p className="text-2xl font-bold text-red-600">{negativeCount}</p></CardContent></Card>
        </div>
      )}

      {/* AI Insights Panel */}
      {insights && insights.patterns && insights.patterns.length > 0 && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI-Generated Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.patterns.map((pattern: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{pattern.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Items */}
      {feedbackItems.length > 0 ? (
        <div className="space-y-3">
          {feedbackItems.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {item.outcome === 'positive' ? (
                      <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : item.outcome === 'negative' ? (
                      <ThumbsDown className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge className={`text-[10px] ${OUTCOME_COLORS[item.outcome] || OUTCOME_COLORS.unknown}`}>
                          {item.outcome?.replace(/_/g, ' ') || 'unknown'}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.feedbackType?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.decision}</p>
                      {item.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Reasoning: {item.reasoning}</p>
                      )}
                      {item.lessonsLearned && (
                        <div className="mt-2 flex items-start gap-2 rounded-md bg-blue-50 p-2">
                          <BookOpen className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700">{item.lessonsLearned}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteFeedback.mutate({ id: item.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Design Feedback</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Record design decisions and their outcomes to build an institutional knowledge base and improve future projects.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Feedback
          </Button>
        </Card>
      )}
    </div>
  );
}
