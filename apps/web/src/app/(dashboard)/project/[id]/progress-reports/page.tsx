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
  Progress,
} from '@openlintel/ui';
import {
  BarChart3,
  Plus,
  Loader2,
  Calendar,
  Download,
  Send,
  Trash2,
  TrendingUp,
  Clock,
  Users,
  CloudRain,
  Camera,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'milestone', label: 'Milestone Report' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  generated: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ─── Page Component ────────────────────────────────────────── */

export default function ProgressReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [overallProgress, setOverallProgress] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [weatherDelays, setWeatherDelays] = useState('0');
  const [summary, setSummary] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: reports = [], isLoading } = trpc.progressReport.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createReport = trpc.progressReport.create.useMutation({
    onSuccess: () => {
      utils.progressReport.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Report created', description: 'Progress report has been generated.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create report', description: err.message, variant: 'destructive' });
    },
  });

  const generateReport = trpc.progressReport.generate.useMutation({
    onSuccess: () => {
      utils.progressReport.list.invalidate();
      toast({ title: 'Report generated', description: 'Data aggregated from site logs and milestones.' });
    },
    onError: (err) => {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const sendReport = trpc.progressReport.send.useMutation({
    onSuccess: () => {
      utils.progressReport.list.invalidate();
      toast({ title: 'Report sent', description: 'Client has been emailed the progress report.' });
    },
    onError: (err) => {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    },
  });

  const exportReport = trpc.progressReport.export.useMutation({
    onSuccess: () => {
      toast({ title: 'Report exported', description: 'PDF download will start shortly.' });
    },
  });

  const deleteReport = trpc.progressReport.delete.useMutation({
    onSuccess: () => {
      utils.progressReport.list.invalidate();
      toast({ title: 'Report deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setReportType('weekly');
    setTitle('');
    setPeriodStart('');
    setPeriodEnd('');
    setOverallProgress('');
    setLaborHours('');
    setWeatherDelays('0');
    setSummary('');
  }

  function handleCreate() {
    if (!title) return;
    createReport.mutate({
      projectId,
      reportType,
      title,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      overallProgress: overallProgress ? parseInt(overallProgress, 10) : undefined,
      laborHours: laborHours ? parseFloat(laborHours) : undefined,
      weatherDelayDays: parseInt(weatherDelays, 10) || 0,
      summary: summary || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalReports = reports.length;
  const sentCount = reports.filter((r: any) => r.status === 'sent' || r.status === 'approved').length;
  const latestProgress = reports.length > 0 ? reports[0]?.overallProgress : null;
  const totalLaborHours = reports.reduce((sum: number, r: any) => sum + (r.laborHours || 0), 0);

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
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Progress Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generate and share progress reports with completion tracking and photo comparisons.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateReport.mutate({ projectId, reportType: 'weekly' })}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-1 h-4 w-4" />}
            Auto Generate
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Progress Report</DialogTitle>
                <DialogDescription>Create a daily, weekly, or milestone progress report.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prTitle">Report Title</Label>
                    <Input id="prTitle" placeholder="e.g. Week 12 Progress" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((rt) => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prStart">Period Start</Label>
                    <Input id="prStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prEnd">Period End</Label>
                    <Input id="prEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prProgress">Progress %</Label>
                    <Input id="prProgress" type="number" placeholder="65" value={overallProgress} onChange={(e) => setOverallProgress(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prLabor">Labor Hours</Label>
                    <Input id="prLabor" type="number" placeholder="240" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prWeather">Weather Delays</Label>
                    <Input id="prWeather" type="number" placeholder="0" value={weatherDelays} onChange={(e) => setWeatherDelays(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prSummary">Summary</Label>
                  <Textarea id="prSummary" placeholder="Key accomplishments, challenges, next steps..." rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createReport.isPending || !title}>
                  {createReport.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Report'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Reports</p><p className="text-2xl font-bold">{totalReports}</p></div><BarChart3 className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Sent to Client</p><p className="text-2xl font-bold text-green-600">{sentCount}</p></div><Send className="h-8 w-8 text-green-400" /></div></CardContent></Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall Progress</p>
            <p className="text-2xl font-bold text-blue-600">{latestProgress ?? 0}%</p>
            <Progress value={latestProgress ?? 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Labor Hours</p><p className="text-2xl font-bold">{totalLaborHours.toLocaleString()}</p></div><Users className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
      </div>

      {/* ── Report Cards ────────────────────────────────────── */}
      {reports.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report: any) => (
            <Card key={report.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{report.title}</CardTitle>
                    <CardDescription className="mt-0.5 capitalize">
                      {report.reportType} Report
                      {report.periodStart && report.periodEnd && (
                        <> &middot; {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}</>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-[10px] ${STATUS_COLORS[report.status] || ''}`}>
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.overallProgress != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{report.overallProgress}%</span>
                    </div>
                    <Progress value={report.overallProgress} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {report.laborHours != null && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Users className="h-3 w-3" />
                      {report.laborHours}h labor
                    </div>
                  )}
                  {report.weatherDelayDays > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                      <CloudRain className="h-3 w-3" />
                      {report.weatherDelayDays}d delays
                    </div>
                  )}
                  {report.photoCount > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Camera className="h-3 w-3" />
                      {report.photoCount} photos
                    </div>
                  )}
                </div>
                {report.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{report.summary}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {report.status === 'generated' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => sendReport.mutate({ id: report.id })}
                      disabled={sendReport.isPending}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Send to Client
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport.mutate({ id: report.id })}
                    disabled={exportReport.isPending}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteReport.mutate({ id: report.id })}
                    disabled={deleteReport.isPending}
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
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Progress Reports</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate progress reports from site logs, milestones, and photos.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Report
          </Button>
        </Card>
      )}
    </div>
  );
}
