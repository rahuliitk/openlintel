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
  Separator,
  toast,
} from '@openlintel/ui';
import {
  Shield,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Trash2,
  Calendar,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const INSURANCE_TYPES = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'professional_liability', label: 'Professional Liability (E&O)' },
  { value: 'workers_comp', label: "Workers' Compensation" },
  { value: 'builders_risk', label: "Builder's Risk" },
  { value: 'auto', label: 'Commercial Auto' },
  { value: 'umbrella', label: 'Umbrella / Excess' },
  { value: 'pollution', label: 'Pollution Liability' },
  { value: 'cyber', label: 'Cyber Liability' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-blue-100 text-blue-800',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getCertStatus(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'expired';
  if (daysUntil < 30) return 'expiring_soon';
  return 'active';
}

/* ─── Page Component ────────────────────────────────────────── */

export default function InsurancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyRole, setPartyRole] = useState('');
  const [insuranceType, setInsuranceType] = useState('');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  const { data: certificates = [], isLoading } = trpc.insurance.listCertificates.useQuery({ projectId });

  const createCert = trpc.insurance.createCertificate.useMutation({
    onSuccess: () => {
      utils.insurance.listCertificates.invalidate({ projectId });
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Certificate added', description: 'Insurance certificate recorded successfully.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add certificate', description: err.message, variant: 'destructive' });
    },
  });

  const deleteCert = trpc.insurance.deleteCertificate.useMutation({
    onSuccess: () => {
      utils.insurance.listCertificates.invalidate({ projectId });
      toast({ title: 'Certificate removed' });
    },
  });

  function resetForm() {
    setPartyName('');
    setPartyRole('');
    setInsuranceType('');
    setCarrier('');
    setPolicyNumber('');
    setCoverageAmount('');
    setEffectiveDate('');
    setExpirationDate('');
  }

  function handleCreate() {
    if (!partyName || !insuranceType || !expirationDate) return;
    createCert.mutate({
      projectId,
      partyName,
      partyRole: partyRole || undefined,
      insuranceType,
      carrier: carrier || undefined,
      policyNumber: policyNumber || undefined,
      coverageAmount: coverageAmount ? parseFloat(coverageAmount) : undefined,
      effectiveDate: effectiveDate || undefined,
      expirationDate,
    });
  }

  const activeCount = certificates.filter((c: any) => getCertStatus(c.expirationDate) === 'active').length;
  const expiringCount = certificates.filter((c: any) => getCertStatus(c.expirationDate) === 'expiring_soon').length;
  const expiredCount = certificates.filter((c: any) => getCertStatus(c.expirationDate) === 'expired').length;

  // Group by party for matrix view
  const partiesMap = certificates.reduce((acc: Record<string, any[]>, cert: any) => {
    if (!acc[cert.partyName ?? 'Unknown']) acc[cert.partyName ?? 'Unknown'] = [];
    acc[cert.partyName ?? 'Unknown'].push(cert);
    return acc;
  }, {});

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Insurance &amp; Certificates</h1>
            <p className="text-sm text-muted-foreground">
              Track insurance certificates for all project parties and monitor expiration dates.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Insurance Certificate</DialogTitle>
              <DialogDescription>Record a certificate of insurance for a project participant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partyName">Party / Company Name</Label>
                  <Input id="partyName" placeholder="ABC Construction" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyRole">Role</Label>
                  <Input id="partyRole" placeholder="General Contractor" value={partyRole} onChange={(e) => setPartyRole(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Insurance Type</Label>
                  <Select value={insuranceType} onValueChange={setInsuranceType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {INSURANCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input id="carrier" placeholder="Hartford Insurance" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policyNum">Policy Number</Label>
                  <Input id="policyNum" placeholder="POL-12345" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage">Coverage Amount ($)</Label>
                  <Input id="coverage" type="number" placeholder="1000000" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effDate">Effective Date</Label>
                  <Input id="effDate" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expDate">Expiration Date</Label>
                  <Input id="expDate" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCert.isPending || !partyName || !insuranceType || !expirationDate}>
                {createCert.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Adding...</> : 'Add Certificate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {certificates.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">{expiringCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Certificate Matrix by Party */}
      {certificates.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(partiesMap).map(([party, certs]) => (
            <Card key={party}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{party}</CardTitle>
                <CardDescription>{(certs as any[])[0]?.partyRole || 'Project participant'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(certs as any[]).map((cert: any) => {
                    const status = getCertStatus(cert.expirationDate);
                    return (
                      <div key={cert.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{cert.insuranceType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                            <p className="text-xs text-muted-foreground">
                              {cert.carrier && <span>{cert.carrier} &middot; </span>}
                              {cert.policyNumber && <span>{cert.policyNumber}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {cert.coverageAmount > 0 && (
                            <span className="text-sm font-medium">${(cert.coverageAmount || 0).toLocaleString()}</span>
                          )}
                          <div className="text-right">
                            <Badge className={`text-[10px] ${STATUS_COLORS[status]}`}>{status.replace(/_/g, ' ')}</Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Exp: {formatDate(cert.expirationDate)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCert.mutate({ id: cert.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Insurance Certificates</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Track insurance certificates for contractors, subcontractors, and other project participants.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Certificate
          </Button>
        </Card>
      )}
    </div>
  );
}
