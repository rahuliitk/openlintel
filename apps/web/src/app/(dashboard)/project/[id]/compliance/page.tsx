'use client';

import { use, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Progress,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@openlintel/ui';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Trash2,
  Clock,
  Eye,
  FileText,
} from 'lucide-react';

/* ─── Status helpers ─────────────────────────────────────────── */

const STATUS_ICONS = {
  pass: <CheckCircle className="h-4 w-4 text-green-600" />,
  fail: <XCircle className="h-4 w-4 text-red-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  not_applicable: <Info className="h-4 w-4 text-gray-400" />,
};

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  not_applicable: 'bg-gray-100 text-gray-800',
};

const REPORT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function CompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jurisdiction, setJurisdiction] = useState<string>('IN');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  /* ── Queries ─────────────────────────────────────────────────── */

  const { data: jurisdictions } = trpc.compliance.listJurisdictions.useQuery();
  const { data: reports = [], isLoading } = trpc.compliance.list.useQuery({ projectId });

  // Show the selected report, or the latest completed report
  const activeReport = selectedReportId
    ? reports.find((r: any) => r.id === selectedReportId)
    : reports.find((r: any) => r.status === 'completed');

  const roomReports: any[] = (activeReport?.roomResults as any[]) ?? [];
  const summary = activeReport?.summary as any;

  /* ── Mutations ───────────────────────────────────────────────── */

  const runCheck = trpc.compliance.runCheck.useMutation({
    onSuccess: (data: any) => {
      utils.compliance.list.invalidate();
      setSelectedReportId(data.id);
      if (data.status === 'completed') {
        toast({
          title: 'Compliance check complete',
          description: `${(data.summary as any)?.pass ?? 0} passed, ${(data.summary as any)?.fail ?? 0} failed across ${(data.summary as any)?.totalRooms ?? 0} rooms.`,
        });
      } else if (data.status === 'failed') {
        toast({
          title: 'Compliance check failed',
          description: data.errorMessage || 'An error occurred during the check.',
          variant: 'destructive',
        });
      }
    },
    onError: (err) => {
      toast({ title: 'Failed to run compliance check', description: err.message, variant: 'destructive' });
    },
  });

  const deleteReport = trpc.compliance.delete.useMutation({
    onSuccess: () => {
      utils.compliance.list.invalidate();
      if (selectedReportId) setSelectedReportId(null);
      toast({ title: 'Report deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete report', description: err.message, variant: 'destructive' });
    },
  });

  /* ── Handlers ────────────────────────────────────────────────── */

  const toggleRoom = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  /* ── Loading state ───────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance Report</h1>
            <p className="text-sm text-muted-foreground">
              Building code compliance checks against {jurisdictions?.find((j) => j.code === jurisdiction)?.name ?? jurisdiction} standards.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={jurisdiction} onValueChange={setJurisdiction}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {(jurisdictions ?? []).map((j) => (
                <SelectItem key={j.code} value={j.code}>
                  {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => runCheck.mutate({ projectId, jurisdiction })}
            disabled={runCheck.isPending}
          >
            {runCheck.isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" />
                Run Check
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Running indicator ──────────────────────────────────── */}
      {runCheck.isPending && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Compliance check in progress...</p>
              <p className="text-xs text-blue-600">
                Analyzing rooms against {jurisdictions?.find((j) => j.code === jurisdiction)?.name ?? jurisdiction} building codes. This may take a minute.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Report History ─────────────────────────────────────── */}
      {reports.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Report History</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {reports.map((report: any) => (
              <button
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors flex-shrink-0 ${
                  activeReport?.id === report.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] px-1.5 py-0 ${REPORT_STATUS_COLORS[report.status] || ''}`}>
                      {report.status}
                    </Badge>
                    <span className="font-medium">
                      {report.jurisdiction}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(report.createdAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  {report.status === 'completed' && report.summary && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-green-600 font-medium">{(report.summary as any).pass}P</span>
                      <span className="text-red-600 font-medium">{(report.summary as any).fail}F</span>
                      <span className="text-yellow-600 font-medium">{(report.summary as any).warning}W</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-1 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReport.mutate({ id: report.id });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── No report state ────────────────────────────────────── */}
      {!activeReport && !runCheck.isPending && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Compliance Reports</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Run a compliance check to analyze your project rooms against building codes.
          </p>
          <Button
            size="sm"
            onClick={() => runCheck.mutate({ projectId, jurisdiction })}
            disabled={runCheck.isPending}
          >
            <Play className="mr-1 h-4 w-4" />
            Run Compliance Check
          </Button>
        </Card>
      )}

      {/* ── Failed report state ────────────────────────────────── */}
      {activeReport?.status === 'failed' && (
        <Card className="mb-6 border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Check Failed</p>
              <p className="text-xs text-red-600">{activeReport.errorMessage || 'An unknown error occurred.'}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => runCheck.mutate({ projectId, jurisdiction })}
              disabled={runCheck.isPending}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active report results ──────────────────────────────── */}
      {activeReport?.status === 'completed' && summary && (
        <>
          {/* ── Summary cards ──────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-5 gap-4">
            <Card className="col-span-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {summary.complianceRate >= 80 ? (
                    <ShieldCheck className="h-12 w-12 text-green-600" />
                  ) : summary.complianceRate >= 50 ? (
                    <ShieldAlert className="h-12 w-12 text-yellow-600" />
                  ) : (
                    <ShieldAlert className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <p className="text-3xl font-bold">{summary.complianceRate}%</p>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  </div>
                </div>
                <Progress value={summary.complianceRate} className="mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {summary.totalRooms} room{summary.totalRooms !== 1 ? 's' : ''} checked &middot; {summary.totalChecks} total checks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.pass}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.fail}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.warning}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Category filter ────────────────────────────────── */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Categories</TabsTrigger>
              <TabsTrigger value="room_dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="ventilation">Ventilation</TabsTrigger>
              <TabsTrigger value="fire_safety">Fire Safety</TabsTrigger>
              <TabsTrigger value="electrical">Electrical</TabsTrigger>
              <TabsTrigger value="plumbing">Plumbing</TabsTrigger>
              <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ── Room-by-room results ───────────────────────────── */}
          <div className="space-y-3">
            {roomReports.map((room: any) => {
              const isExpanded = expandedRooms.has(room.roomId);
              const filteredResults = selectedCategory === 'all'
                ? room.results
                : room.results.filter((r: any) => r.category === selectedCategory);

              if (filteredResults.length === 0) return null;

              const roomFailCount = filteredResults.filter((r: any) => r.status === 'fail').length;
              const roomPassCount = filteredResults.filter((r: any) => r.status === 'pass').length;

              return (
                <Card key={room.roomId}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleRoom(room.roomId)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{room.roomName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {room.roomType.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roomFailCount > 0 && (
                        <Badge className="bg-red-100 text-red-800 text-[10px]">
                          {roomFailCount} fail
                        </Badge>
                      )}
                      {roomPassCount > 0 && (
                        <Badge className="bg-green-100 text-green-800 text-[10px]">
                          {roomPassCount} pass
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {filteredResults.length} checks
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <Separator className="mb-3" />
                      <div className="space-y-2">
                        {filteredResults.map((result: any, idx: number) => (
                          <div
                            key={result.ruleId + '-' + idx}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <div className="mt-0.5">
                              {STATUS_ICONS[result.status as keyof typeof STATUS_ICONS]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{result.description}</p>
                                <Badge className={`text-[10px] ${STATUS_COLORS[result.status as keyof typeof STATUS_COLORS]}`}>
                                  {result.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {result.requirement}
                              </p>
                              {result.actualValue !== undefined && result.requiredValue !== undefined && (
                                <p className="text-xs mt-1">
                                  <span className="text-muted-foreground">Actual: </span>
                                  <span className={result.status === 'fail' ? 'text-red-600 font-medium' : 'font-medium'}>
                                    {result.actualValue} {result.unit}
                                  </span>
                                  <span className="text-muted-foreground"> / Required: </span>
                                  <span className="font-medium">
                                    {result.requiredValue} {result.unit}
                                  </span>
                                </p>
                              )}
                              {typeof result.actualValue === 'string' && result.requiredValue === undefined && (
                                <p className="text-xs text-yellow-600 mt-1">
                                  {result.actualValue}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Source: {result.source} - {result.clause}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {roomReports.length === 0 && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">No Rooms to Check</h2>
              <p className="text-sm text-muted-foreground">
                Add rooms with dimensions to start compliance checking.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
