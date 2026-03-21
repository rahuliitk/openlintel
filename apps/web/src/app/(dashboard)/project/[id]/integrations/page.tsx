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
  Separator,
  toast,
} from '@openlintel/ui';
import {
  Plug,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Unplug,
  Zap,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const AVAILABLE_INTEGRATIONS = [
  { id: 'revit', name: 'Autodesk Revit', category: 'CAD/BIM', description: 'Sync BIM models and families', icon: '🏗️' },
  { id: 'autocad', name: 'AutoCAD', category: 'CAD/BIM', description: 'Import/export DWG files', icon: '📐' },
  { id: 'sketchup', name: 'SketchUp', category: 'CAD/BIM', description: '3D model import and sync', icon: '🔷' },
  { id: 'quickbooks', name: 'QuickBooks', category: 'Accounting', description: 'Sync invoices and expenses', icon: '💰' },
  { id: 'xero', name: 'Xero', category: 'Accounting', description: 'Accounting and billing sync', icon: '📊' },
  { id: 'slack', name: 'Slack', category: 'Communication', description: 'Notifications and updates', icon: '💬' },
  { id: 'ms_teams', name: 'Microsoft Teams', category: 'Communication', description: 'Team collaboration and alerts', icon: '👥' },
  { id: 'google_drive', name: 'Google Drive', category: 'Storage', description: 'File storage and sharing', icon: '📁' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', description: 'Cloud file sync', icon: '📦' },
  { id: 'zillow', name: 'Zillow / MLS', category: 'Real Estate', description: 'Property data and comps', icon: '🏠' },
  { id: 'procore', name: 'Procore', category: 'Project Management', description: 'Construction PM sync', icon: '🔧' },
  { id: 'permit_api', name: 'Permit Systems', category: 'Government', description: 'Electronic permit submissions', icon: '📋' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  disconnected: 'bg-gray-100 text-gray-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function IntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [connectDialog, setConnectDialog] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const { data: connections = [], isLoading } = trpc.integrations.listConnections.useQuery({ projectId });

  const connect = trpc.integrations.connect.useMutation({
    onSuccess: () => {
      utils.integrations.listConnections.invalidate({ projectId });
      setConnectDialog(null);
      setApiKey('');
      setWebhookUrl('');
      toast({ title: 'Integration connected' });
    },
    onError: (err) => {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    },
  });

  const disconnect = trpc.integrations.disconnect.useMutation({
    onSuccess: () => {
      utils.integrations.listConnections.invalidate({ projectId });
      toast({ title: 'Integration disconnected' });
    },
  });

  const syncNow = trpc.integrations.syncNow.useMutation({
    onSuccess: () => {
      utils.integrations.listConnections.invalidate({ projectId });
      toast({ title: 'Sync initiated' });
    },
  });

  function handleConnect(integrationId: string) {
    connect.mutate({
      projectId,
      integrationId,
      apiKey: apiKey || undefined,
      webhookUrl: webhookUrl || undefined,
    });
  }

  const connectedIds = new Set(connections.map((c: any) => c.integrationId));
  const connectedCount = connections.filter((c: any) => c.status === 'connected').length;

  // Group by category
  const categories = [...new Set(AVAILABLE_INTEGRATIONS.map((i) => i.category))];

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect third-party tools for CAD/BIM, accounting, communication, and more.
              {connectedCount > 0 && <span className="font-medium text-green-600"> {connectedCount} active</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Connected Integrations */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Connections</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn: any) => {
              const info = AVAILABLE_INTEGRATIONS.find((i) => i.id === conn.integrationId);
              return (
                <Card key={conn.id} className="border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info?.icon || '🔌'}</span>
                        <div>
                          <p className="text-sm font-medium">{info?.name || conn.integrationId}</p>
                          <p className="text-xs text-muted-foreground">{info?.category}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_COLORS[conn.status] || ''}`}>{conn.status}</Badge>
                    </div>
                    {conn.lastSyncAt && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Last sync: {new Date(conn.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => syncNow.mutate({ id: conn.id })} disabled={syncNow.isPending}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Sync
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => disconnect.mutate({ id: conn.id })}>
                        <Unplug className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      {categories.map((cat) => {
        const catIntegrations = AVAILABLE_INTEGRATIONS.filter((i) => i.category === cat);
        return (
          <div key={cat} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catIntegrations.map((integration) => {
                const isConnected = connectedIds.has(integration.id);
                return (
                  <Card key={integration.id} className={isConnected ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{integration.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{integration.name}</p>
                            <p className="text-xs text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                        {isConnected ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Dialog open={connectDialog === integration.id} onOpenChange={(open) => setConnectDialog(open ? integration.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Zap className="mr-1 h-3.5 w-3.5" /> Connect
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Connect {integration.name}</DialogTitle>
                                <DialogDescription>{integration.description}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="apiKey">API Key / Token</Label>
                                  <Input id="apiKey" type="password" placeholder="Enter your API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="webhook">Webhook URL (optional)</Label>
                                  <Input id="webhook" placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
                                <Button onClick={() => handleConnect(integration.id)} disabled={connect.isPending}>
                                  {connect.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Connecting...</> : 'Connect'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
