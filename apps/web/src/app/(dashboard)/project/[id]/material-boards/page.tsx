'use client';

import { use, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { jsPDF } from 'jspdf';
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
  Palette,
  Plus,
  Loader2,
  Layers,
  Eye,
  Download,
  Share2,
  Trash2,
  Wand2,
  Grid3X3,
  Image,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const BOARD_TYPES = [
  { value: 'room', label: 'Room Board' },
  { value: 'floor_vs_wall', label: 'Floor vs. Wall' },
  { value: 'countertop', label: 'Countertop Options' },
  { value: 'color_palette', label: 'Color Palette' },
  { value: 'presentation', label: 'Client Presentation' },
] as const;

const MATERIAL_CATEGORIES = [
  'flooring', 'wall_finish', 'countertop', 'backsplash', 'cabinetry',
  'hardware', 'fabric', 'paint', 'tile', 'stone', 'wood', 'metal',
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  generating: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  shared: 'bg-purple-100 text-purple-800',
  approved: 'bg-emerald-100 text-emerald-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function MaterialBoardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardType, setBoardType] = useState('room');
  const [roomId, setRoomId] = useState('__all__');
  const [materialCategory, setMaterialCategory] = useState('flooring');
  const [description, setDescription] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: boards = [], isLoading } = trpc.materialBoard.list.useQuery({ projectId });
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createBoard = trpc.materialBoard.create.useMutation({
    onSuccess: () => {
      utils.materialBoard.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Board created', description: 'Material board has been generated.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create board', description: err.message, variant: 'destructive' });
    },
  });

  const generateBoard = trpc.materialBoard.generate.useMutation({
    onSuccess: () => {
      utils.materialBoard.list.invalidate();
      toast({ title: 'Board generated', description: 'AI has recommended materials for your board.' });
    },
    onError: (err) => {
      utils.materialBoard.list.invalidate();
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const [exporting, setExporting] = useState(false);

  const exportBoardPdf = useCallback((board: any) => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 16;
      let y = 20;

      // ── Title ──
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(board.name, margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const subtitle = `${(board.boardType ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} · ${board.materialCount ?? 0} materials`;
      doc.text(subtitle, margin, y);
      y += 4;
      if (board.description) {
        const descLines = doc.splitTextToSize(board.description, pageW - margin * 2);
        doc.text(descLines, margin, y);
        y += descLines.length * 4 + 2;
      }
      doc.setTextColor(0, 0, 0);
      y += 4;

      // ── Swatches row ──
      const swatches = (board.swatches ?? []) as string[];
      if (swatches.length > 0) {
        const swatchSize = 14;
        const gap = 4;
        swatches.slice(0, 6).forEach((hex: string, i: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          doc.setFillColor(r, g, b);
          doc.roundedRect(margin + i * (swatchSize + gap), y, swatchSize, swatchSize, 2, 2, 'F');
        });
        y += 20;
      }

      // ── Materials table ──
      const items = (board.items ?? []) as any[];
      if (items.length > 0) {
        // Header
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Material', margin + 2, y + 5.5);
        doc.text('Brand', margin + 60, y + 5.5);
        doc.text('Finish', margin + 95, y + 5.5);
        doc.text('Size', margin + 130, y + 5.5);
        doc.text('Price', pageW - margin - 2, y + 5.5, { align: 'right' });
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        items.forEach((item: any) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          // Color swatch
          if (item.color && item.color.startsWith('#')) {
            const r = parseInt(item.color.slice(1, 3), 16);
            const g = parseInt(item.color.slice(3, 5), 16);
            const b = parseInt(item.color.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.roundedRect(margin + 2, y - 2.5, 5, 5, 1, 1, 'F');
          }

          doc.text(String(item.name ?? '').substring(0, 30), margin + 10, y + 1);
          doc.text(String(item.brand ?? '').substring(0, 18), margin + 60, y + 1);
          doc.text(String(item.finish ?? '').substring(0, 18), margin + 95, y + 1);
          doc.text(String(item.size ?? '').substring(0, 14), margin + 130, y + 1);
          const price = typeof item.pricePerUnit === 'number'
            ? `$${item.pricePerUnit.toFixed(2)}/${item.unit ?? 'unit'}`
            : '';
          doc.text(price, pageW - margin - 2, y + 1, { align: 'right' });

          if (item.notes) {
            y += 5;
            doc.setTextColor(120, 120, 120);
            doc.setFontSize(7);
            const noteLines = doc.splitTextToSize(String(item.notes), pageW - margin * 2 - 10);
            doc.text(noteLines, margin + 10, y + 1);
            y += noteLines.length * 3;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
          }

          y += 7;

          // Separator line
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, y - 2, pageW - margin, y - 2);
        });

        // ── Total estimate ──
        y += 4;
        const totalEstimate = items.reduce((sum: number, it: any) => {
          return sum + (typeof it.pricePerUnit === 'number' ? it.pricePerUnit : 0);
        }, 0);
        if (totalEstimate > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`Estimated total (1 unit each): $${totalEstimate.toFixed(2)}`, margin, y + 1);
        }
      }

      // ── Footer ──
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`OpenLintel · ${board.name} · Page ${p} of ${pageCount}`, margin, 290);
        doc.text(new Date().toLocaleDateString(), pageW - margin, 290, { align: 'right' });
      }

      doc.save(`${board.name.replace(/[^a-zA-Z0-9]/g, '_')}_material_board.pdf`);
      toast({ title: 'PDF downloaded', description: 'Material board exported successfully.' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, []);

  const shareBoard = trpc.materialBoard.share.useMutation({
    onSuccess: (data) => {
      toast({ title: 'Board shared', description: `Share link copied: ${data.shareUrl}` });
    },
    onError: (err) => {
      toast({ title: 'Share failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteBoard = trpc.materialBoard.delete.useMutation({
    onSuccess: () => {
      utils.materialBoard.list.invalidate();
      toast({ title: 'Board deleted' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetForm() {
    setBoardName('');
    setBoardType('room');
    setRoomId('__all__');
    setMaterialCategory('flooring');
    setDescription('');
  }

  function handleCreate() {
    if (!boardName) return;
    createBoard.mutate({
      projectId,
      name: boardName,
      boardType,
      roomId: roomId && roomId !== '__all__' ? roomId : undefined,
      materialCategory,
      description: description || undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalBoards = boards.length;
  const readyBoards = boards.filter((b: any) => b.status === 'ready' || b.status === 'approved').length;
  const sharedBoards = boards.filter((b: any) => b.status === 'shared').length;
  const totalMaterials = boards.reduce((sum: number, b: any) => sum + (b.materialCount || 0), 0);

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
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material Boards</h1>
            <p className="text-sm text-muted-foreground">
              Generate and compare material boards with spec sheets and client presentations.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Board
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Material Board</DialogTitle>
              <DialogDescription>
                Build a material board for presentations and finish comparisons.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="boardName">Board Name</Label>
                <Input
                  id="boardName"
                  placeholder="e.g. Master Bath Finishes"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Board Type</Label>
                  <Select value={boardType} onValueChange={setBoardType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOARD_TYPES.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {bt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room (optional)</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All rooms</SelectItem>
                      {rooms.map((room: any) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Primary Material Category</Label>
                <Select value={materialCategory} onValueChange={setMaterialCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map((mc) => (
                      <SelectItem key={mc} value={mc}>
                        {mc.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boardDesc">Description</Label>
                <Textarea
                  id="boardDesc"
                  placeholder="Describe the board purpose, target aesthetic..."
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
              <Button onClick={handleCreate} disabled={createBoard.isPending || !boardName}>
                {createBoard.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Board'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Boards</p>
                <p className="text-2xl font-bold">{totalBoards}</p>
              </div>
              <Grid3X3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold text-green-600">{readyBoards}</p>
              </div>
              <Layers className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shared</p>
                <p className="text-2xl font-bold text-purple-600">{sharedBoards}</p>
              </div>
              <Share2 className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="text-2xl font-bold text-amber-600">{totalMaterials}</p>
              </div>
              <Palette className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Board Cards ─────────────────────────────────────── */}
      {boards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board: any) => (
            <Card key={board.id} className="relative overflow-hidden">
              {/* Preview area */}
              <div className="relative h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                {board.thumbnailUrl ? (
                  <img src={board.thumbnailUrl} alt={board.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex gap-2">
                    {(board.swatches ?? []).slice(0, 4).map((swatch: string, i: number) => (
                      <div key={i} className="h-12 w-12 rounded-lg shadow-sm" style={{ backgroundColor: swatch }} />
                    ))}
                    {(!board.swatches || board.swatches.length === 0) && (
                      <Image className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                )}
                <Badge className={`absolute top-2 right-2 text-[10px] ${STATUS_COLORS[board.status] || ''}`}>
                  {board.status}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base truncate">{board.name}</CardTitle>
                <CardDescription>
                  {board.boardType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  {board.materialCount != null && ` \u00b7 ${board.materialCount} materials`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {board.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{board.description}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {board.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => generateBoard.mutate({ id: board.id })}
                      disabled={generateBoard.isPending}
                    >
                      {generateBoard.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      {generateBoard.isPending ? 'Generating with AI...' : 'Generate'}
                    </Button>
                  )}
                  {board.status === 'generating' && (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      AI is generating...
                    </Button>
                  )}
                  {(board.status === 'ready' || board.status === 'approved') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBoardPdf(board)}
                        disabled={exporting}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareBoard.mutate({ id: board.id })}
                        disabled={shareBoard.isPending}
                      >
                        <Share2 className="mr-1 h-3.5 w-3.5" />
                        Share
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteBoard.mutate({ id: board.id })}
                    disabled={deleteBoard.isPending}
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
          <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Material Boards</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create material boards to compare finishes and present options to clients.
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Board
          </Button>
        </Card>
      )}
    </div>
  );
}
