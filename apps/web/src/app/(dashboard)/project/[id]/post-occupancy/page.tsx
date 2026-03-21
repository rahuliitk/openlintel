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
  ClipboardList,
  Plus,
  Loader2,
  Send,
  Star,
  MessageSquare,
  Users,
  BarChart3,
  Trash2,
  Eye,
  ThermometerSun,
  Lightbulb,
  Volume2,
  Home,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const SURVEY_CATEGORIES = [
  { value: 'thermal_comfort', label: 'Thermal Comfort', icon: ThermometerSun },
  { value: 'lighting', label: 'Lighting Quality', icon: Lightbulb },
  { value: 'acoustics', label: 'Acoustics', icon: Volume2 },
  { value: 'air_quality', label: 'Air Quality', icon: Home },
  { value: 'spatial_quality', label: 'Spatial Quality', icon: Home },
  { value: 'overall_satisfaction', label: 'Overall Satisfaction', icon: Star },
] as const;

const SURVEY_PERIODS = [
  { value: '3_month', label: '3 Month' },
  { value: '6_month', label: '6 Month' },
  { value: '12_month', label: '12 Month' },
  { value: '24_month', label: '24 Month' },
] as const;

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

/* ─── Page Component ────────────────────────────────────────── */

export default function PostOccupancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [surveyName, setSurveyName] = useState('');
  const [period, setPeriod] = useState('');
  const [questionsInput, setQuestionsInput] = useState('');
  const [recipientEmails, setRecipientEmails] = useState('');

  const { data: surveys = [], isLoading } = trpc.postOccupancy.listSurveys.useQuery({ projectId });

  const createSurvey = trpc.postOccupancy.createSurvey.useMutation({
    onSuccess: () => {
      utils.postOccupancy.listSurveys.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Survey created' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create survey', description: err.message, variant: 'destructive' });
    },
  });

  const sendSurvey = trpc.postOccupancy.sendSurvey.useMutation({
    onSuccess: () => {
      utils.postOccupancy.listSurveys.invalidate({ projectId });
      toast({ title: 'Survey sent', description: 'Invitations have been sent to occupants.' });
    },
  });

  const deleteSurvey = trpc.postOccupancy.deleteSurvey.useMutation({
    onSuccess: () => {
      utils.postOccupancy.listSurveys.invalidate({ projectId });
      toast({ title: 'Survey deleted' });
    },
  });

  function resetForm() {
    setSurveyName('');
    setPeriod('');
    setQuestionsInput('');
    setRecipientEmails('');
  }

  function handleCreate() {
    if (!surveyName || !period) return;
    const questions = questionsInput.split('\n').map((q) => q.trim()).filter(Boolean);
    const emails = recipientEmails.split(',').map((e) => e.trim()).filter(Boolean);
    createSurvey.mutate({
      projectId,
      name: surveyName,
      period,
      questions: questions.length > 0 ? questions : undefined,
      recipientEmails: emails.length > 0 ? emails : undefined,
    });
  }

  const totalResponses = surveys.reduce((sum: number, s: any) => sum + (s.responseCount || 0), 0);
  const avgRating = surveys.length > 0
    ? surveys.reduce((sum: number, s: any) => sum + (s.averageRating || 0), 0) / surveys.filter((s: any) => s.averageRating > 0).length
    : 0;

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Post-Occupancy Evaluation</h1>
            <p className="text-sm text-muted-foreground">
              Collect and analyze occupant feedback on comfort, quality, and satisfaction.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Survey
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Post-Occupancy Survey</DialogTitle>
              <DialogDescription>Design a survey to collect occupant feedback.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="surveyName">Survey Name</Label>
                  <Input id="surveyName" placeholder="e.g. 6-Month Satisfaction Survey" value={surveyName} onChange={(e) => setSurveyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Evaluation Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      {SURVEY_PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="questions">Custom Questions (one per line)</Label>
                <Textarea id="questions" rows={4} placeholder={"How would you rate the kitchen layout?\nIs the natural lighting adequate?\nAre there any noise concerns?\nHow is the HVAC performance?"} value={questionsInput} onChange={(e) => setQuestionsInput(e.target.value)} />
                <p className="text-xs text-muted-foreground">Standard categories (thermal, lighting, acoustics, air quality) are always included.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emails">Recipient Emails (comma-separated)</Label>
                <Input id="emails" placeholder="occupant1@email.com, occupant2@email.com" value={recipientEmails} onChange={(e) => setRecipientEmails(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createSurvey.isPending || !surveyName || !period}>
                {createSurvey.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating...</> : 'Create Survey'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {surveys.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Surveys</p><p className="text-2xl font-bold">{surveys.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Responses</p><p className="text-2xl font-bold">{totalResponses}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Avg Rating</p><div className="flex items-center gap-2"><p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '--'}</p>{avgRating > 0 && renderStars(Math.round(avgRating))}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold">{surveys.length > 0 ? `${Math.round((surveys.filter((s: any) => s.responseCount > 0).length / surveys.length) * 100)}%` : '--'}</p></CardContent></Card>
        </div>
      )}

      {/* Surveys */}
      {surveys.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {surveys.map((survey: any) => (
            <Card key={survey.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{survey.name}</CardTitle>
                    <CardDescription>{survey.period?.replace(/_/g, ' ')} evaluation</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {survey.responseCount || 0} responses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Category ratings */}
                {survey.categoryRatings && (
                  <div className="space-y-2">
                    {SURVEY_CATEGORIES.map((cat) => {
                      const rating = survey.categoryRatings?.[cat.value];
                      if (!rating) return null;
                      const Icon = cat.icon;
                      return (
                        <div key={cat.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStars(Math.round(rating))}
                            <span className="text-xs font-medium w-6 text-right">{rating.toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(!survey.categoryRatings || Object.keys(survey.categoryRatings).length === 0) && (
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">No responses yet</p>
                  </div>
                )}

                {survey.averageRating > 0 && (
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Overall Score</span>
                      <div className="flex items-center gap-2">
                        {renderStars(Math.round(survey.averageRating))}
                        <span className="font-bold">{survey.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {survey.status === 'draft' && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => sendSurvey.mutate({ id: survey.id })} disabled={sendSurvey.isPending}>
                      <Send className="mr-1 h-3.5 w-3.5" /> Send Survey
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Eye className="mr-1 h-3.5 w-3.5" /> View Results
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSurvey.mutate({ id: survey.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Post-Occupancy Surveys</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create surveys to collect occupant feedback on thermal comfort, lighting, acoustics, and overall satisfaction.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Survey
          </Button>
        </Card>
      )}
    </div>
  );
}
