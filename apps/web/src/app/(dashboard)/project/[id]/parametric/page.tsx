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
  Sliders,
  Plus,
  Loader2,
  Ruler,
  LayoutTemplate,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Trash2,
  Play,
  Clock,
  SkipForward,
  ToggleLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const RULE_TYPES = [
  { value: 'min_area', label: 'Minimum Area (sqft)', unit: 'sqft', placeholder: '120' },
  { value: 'max_area', label: 'Maximum Area (sqft)', unit: 'sqft', placeholder: '500' },
  { value: 'min_width', label: 'Minimum Width (ft)', unit: 'ft', placeholder: '10' },
  { value: 'min_length', label: 'Minimum Length (ft)', unit: 'ft', placeholder: '12' },
  { value: 'min_height', label: 'Minimum Height (ft)', unit: 'ft', placeholder: '8' },
  { value: 'max_height', label: 'Maximum Height (ft)', unit: 'ft', placeholder: '12' },
  { value: 'aspect_ratio', label: 'Max Aspect Ratio', unit: 'ratio', placeholder: '2.0' },
  { value: 'window_ratio', label: 'Min Window-to-Wall Ratio (%)', unit: '%', placeholder: '15' },
] as const;

const ROOM_TYPES = [
  { value: '', label: 'All Rooms' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'dining', label: 'Dining' },
  { value: 'office', label: 'Office' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'garage', label: 'Garage' },
  { value: 'utility', label: 'Utility' },
] as const;

/* ─── Page Component ────────────────────────────────────────── */

export default function ParametricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('min_area');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleTarget, setRuleTarget] = useState('');
  const [description, setDescription] = useState('');

  // Validation results panel
  const [showResults, setShowResults] = useState(false);
  const [validationResults, setValidationResults] = useState<Array<{
    ruleId: string;
    ruleName: string;
    status: 'satisfied' | 'violated' | 'skipped';
    details: string;
  }> | null>(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: rules = [], isLoading } = trpc.parametric.listRules.useQuery({ projectId });
  const { data: templates = [] } = trpc.parametric.listTemplates.useQuery({ projectId });
  const { data: history = [] } = trpc.parametric.getHistory.useQuery(
    { projectId, limit: 20 },
    { enabled: showHistory },
  );

  /* ── Mutations ────────────────────────────────────────────── */
  const createRule = trpc.parametric.createRule.useMutation({
    onSuccess: () => {
      utils.parametric.listRules.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Rule created', description: 'Parametric rule has been added.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create rule', description: err.message, variant: 'destructive' });
    },
  });

  const deleteRule = trpc.parametric.deleteRule.useMutation({
    onSuccess: () => {
      utils.parametric.listRules.invalidate();
      utils.parametric.getHistory.invalidate();
      toast({ title: 'Rule deleted' });
    },
    onError: (err) => {
      toast({ title: 'Failed to delete rule', description: err.message, variant: 'destructive' });
    },
  });

  const toggleRule = trpc.parametric.toggleRule.useMutation({
    onSuccess: () => {
      utils.parametric.listRules.invalidate();
    },
    onError: (err) => {
      toast({ title: 'Failed to toggle rule', description: err.message, variant: 'destructive' });
    },
  });

  const validateRules = trpc.parametric.validate.useMutation({
    onSuccess: (data) => {
      utils.parametric.listRules.invalidate();
      utils.parametric.getHistory.invalidate();
      setValidationResults(data.results);
      setShowResults(true);
      toast({
        title: 'Validation complete',
        description: `${data.satisfied} satisfied, ${data.violated} violated, ${data.skipped} skipped out of ${data.total} rules.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Validation failed', description: err.message, variant: 'destructive' });
    },
  });

  const applyTemplate = trpc.parametric.applyTemplate.useMutation({
    onSuccess: (data) => {
      utils.parametric.listRules.invalidate();
      utils.parametric.getHistory.invalidate();
      toast({
        title: `Template "${data.templateName}" applied`,
        description: `Created ${data.roomsCreated} rooms and ${data.rulesCreated} rules.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Failed to apply template', description: err.message, variant: 'destructive' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setRuleName('');
    setRuleType('min_area');
    setRuleValue('');
    setRuleTarget('');
    setDescription('');
  }

  function handleCreate() {
    if (!ruleName || !ruleValue) return;
    createRule.mutate({
      projectId,
      name: ruleName,
      ruleType,
      value: parseFloat(ruleValue),
      targetRoom: ruleTarget || undefined,
      description: description || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalRules = rules.length;
  const activeRules = rules.filter((r: any) => r.isActive).length;
  const currentRuleTypeMeta = RULE_TYPES.find((rt) => rt.value === ruleType);

  // Count from last validation
  const violatedCount = validationResults?.filter((r) => r.status === 'violated').length ?? 0;
  const satisfiedCount = validationResults?.filter((r) => r.status === 'satisfied').length ?? 0;

  /* ── Helper to display rule info ──────────────────────────── */
  function getRuleDisplay(rule: any) {
    const expr = rule.expression as Record<string, any>;
    const friendlyType = expr?.friendlyType || rule.ruleType;
    const value = expr?.value;
    const unit = expr?.unit || '';
    const target = expr?.targetRoom;
    const desc = expr?.description;
    const meta = RULE_TYPES.find((rt) => rt.value === friendlyType);

    return {
      typeLabel: meta?.label || friendlyType.replace(/_/g, ' '),
      value: value != null ? `${value} ${unit}` : 'N/A',
      target: target || 'All rooms',
      description: desc || null,
    };
  }

  /* ── Validation result for a specific rule ─────────────────── */
  function getValidationStatus(ruleId: string) {
    if (!validationResults) return null;
    return validationResults.find((r) => r.ruleId === ruleId) ?? null;
  }

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sliders className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parametric Design</h1>
            <p className="text-sm text-muted-foreground">
              Define design rules and constraints, validate against your rooms.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="mr-1 h-4 w-4" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => validateRules.mutate({ projectId })}
            disabled={validateRules.isPending || rules.length === 0}
          >
            {validateRules.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            Validate All
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Parametric Rule</DialogTitle>
                <DialogDescription>
                  Define a constraint that rooms must satisfy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Rule Name</Label>
                  <Input
                    id="ruleName"
                    placeholder="e.g. Bedrooms must be at least 120 sqft"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Constraint Type</Label>
                    <Select value={ruleType} onValueChange={setRuleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((rt) => (
                          <SelectItem key={rt.value} value={rt.value}>
                            {rt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ruleValue">
                      Value {currentRuleTypeMeta?.unit ? `(${currentRuleTypeMeta.unit})` : ''}
                    </Label>
                    <Input
                      id="ruleValue"
                      type="number"
                      placeholder={currentRuleTypeMeta?.placeholder ?? '0'}
                      value={ruleValue}
                      onChange={(e) => setRuleValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Apply To</Label>
                  <Select value={ruleTarget || '__all__'} onValueChange={(v) => setRuleTarget(v === '__all__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((rt) => (
                        <SelectItem key={rt.value || '__all__'} value={rt.value || '__all__'}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ruleDescription">Description (optional)</Label>
                  <Textarea
                    id="ruleDescription"
                    placeholder="Why this constraint matters..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createRule.isPending || !ruleName || !ruleValue}
                >
                  {createRule.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Rule'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{totalRules}</p>
              </div>
              <Settings2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{activeRules}</p>
              </div>
              <ToggleLeft className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Validation</p>
                <p className="text-2xl font-bold text-emerald-600">{satisfiedCount}</p>
                <p className="text-xs text-muted-foreground">passed</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Violations</p>
                <p className="text-2xl font-bold text-red-600">{violatedCount}</p>
                <p className="text-xs text-muted-foreground">failed</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Validation Results ───────────────────────────────── */}
      {showResults && validationResults && validationResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Validation Results</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowResults(false)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationResults.map((result) => (
                <div
                  key={result.ruleId}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    result.status === 'satisfied'
                      ? 'bg-emerald-50 text-emerald-800'
                      : result.status === 'violated'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'satisfied' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {result.status === 'violated' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    {result.status === 'skipped' && <SkipForward className="h-4 w-4 text-gray-400" />}
                    <span className="font-medium">{result.ruleName}</span>
                  </div>
                  <span className="text-xs">{result.details}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Rules Grid ──────────────────────────────────────── */}
      {rules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule: any) => {
            const display = getRuleDisplay(rule);
            const vStatus = getValidationStatus(rule.id);

            return (
              <Card key={rule.id} className={`relative transition-colors ${
                vStatus?.status === 'violated' ? 'border-red-200 bg-red-50/30' :
                vStatus?.status === 'satisfied' ? 'border-emerald-200 bg-emerald-50/30' :
                ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{rule.name}</CardTitle>
                      <CardDescription className="mt-0.5">
                        {display.typeLabel}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {vStatus && (
                        <Badge className={`text-[10px] ${
                          vStatus.status === 'satisfied' ? 'bg-emerald-100 text-emerald-800' :
                          vStatus.status === 'violated' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {vStatus.status}
                        </Badge>
                      )}
                      <Badge className={`text-[10px] ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.isActive ? 'active' : 'disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {display.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{display.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      <Ruler className="h-3 w-3" />
                      {display.value}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      Target: {display.target}
                    </div>
                  </div>
                  {vStatus?.status === 'violated' && (
                    <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      {vStatus.details}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-xs ${rule.isActive ? 'text-green-600' : 'text-muted-foreground'}`}
                      onClick={() => toggleRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                      disabled={toggleRule.isPending}
                    >
                      <ToggleLeft className="mr-1 h-4 w-4" />
                      {rule.isActive ? 'Enabled' : 'Disabled'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteRule.mutate({ id: rule.id })}
                      disabled={deleteRule.isPending}
                    >
                      {deleteRule.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Sliders className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Parametric Rules</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Define parametric rules to set constraints on room dimensions, area, and proportions.
            <br />
            Then click &quot;Validate All&quot; to check your project&apos;s rooms against these rules.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Rule
          </Button>
        </Card>
      )}

      {/* ── Templates Section ───────────────────────────────── */}
      {templates.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Design Templates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template: any) => {
              const roomDefs = (template.roomDefinitions as any[]) ?? [];
              const ruleDefs = (template.defaultRules as any[]) ?? [];
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <p className="text-sm font-semibold capitalize">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{template.homeType.replace(/_/g, ' ')}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{roomDefs.length} rooms</span>
                      <span>{ruleDefs.length} rules</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => applyTemplate.mutate({ projectId, templateId: template.id })}
                      disabled={applyTemplate.isPending}
                    >
                      {applyTemplate.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="mr-1 h-3 w-3" />
                      )}
                      Apply Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── History Panel ────────────────────────────────────── */}
      {showHistory && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Change History
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      entry.action.startsWith('create') ? 'bg-green-500' :
                      entry.action.startsWith('delete') ? 'bg-red-500' :
                      entry.action.startsWith('validate') ? 'bg-blue-500' :
                      entry.action.startsWith('apply') ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-medium">{entry.action.replace(/_/g, ' ').replace(/:/g, ': ')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No history yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
