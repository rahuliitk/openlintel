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
  Sparkles,
  Plus,
  Loader2,
  Heart,
  Pin,
  Image,
  Search,
  Wand2,
  Tag,
  Trash2,
  Share2,
  Grid3X3,
  LayoutGrid,
  Users,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */

const BOARD_CATEGORIES = [
  { value: 'overall_style', label: 'Overall Style' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'color_palette', label: 'Color Palette' },
  { value: 'materials', label: 'Materials' },
  { value: 'furniture', label: 'Furniture' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  shared: 'bg-purple-100 text-purple-800',
};

/* ─── Page Component ────────────────────────────────────────── */

export default function InspirationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardCategory, setBoardCategory] = useState('overall_style');
  const [description, setDescription] = useState('');

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinBoardId, setPinBoardId] = useState('');
  const [pinUrl, setPinUrl] = useState('');
  const [pinCaption, setPinCaption] = useState('');
  const [pinTags, setPinTags] = useState('');

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: boards = [], isLoading } = trpc.inspiration.listBoards.useQuery({ projectId });
  const { data: pins = [] } = trpc.inspiration.listPins.useQuery({ projectId });

  /* ── Mutations ────────────────────────────────────────────── */
  const createBoard = trpc.inspiration.createBoard.useMutation({
    onSuccess: () => {
      utils.inspiration.listBoards.invalidate();
      setDialogOpen(false);
      resetBoardForm();
      toast({ title: 'Board created', description: 'Inspiration board is ready for pinning.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to create board', description: err.message, variant: 'destructive' });
    },
  });

  const addPin = trpc.inspiration.addPin.useMutation({
    onSuccess: () => {
      utils.inspiration.listPins.invalidate();
      utils.inspiration.listBoards.invalidate();
      setPinDialogOpen(false);
      resetPinForm();
      toast({ title: 'Pin added', description: 'Inspiration image has been pinned.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to add pin', description: err.message, variant: 'destructive' });
    },
  });

  const findSimilar = trpc.inspiration.findSimilar.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Similar items found',
        description: `Found ${data.count} visually similar images.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteBoard = trpc.inspiration.deleteBoard.useMutation({
    onSuccess: () => {
      utils.inspiration.listBoards.invalidate();
      toast({ title: 'Board deleted' });
    },
  });

  const removePin = trpc.inspiration.removePin.useMutation({
    onSuccess: () => {
      utils.inspiration.listPins.invalidate();
      utils.inspiration.listBoards.invalidate();
      toast({ title: 'Pin removed' });
    },
  });

  /* ── Form helpers ─────────────────────────────────────────── */
  function resetBoardForm() {
    setBoardName('');
    setBoardCategory('overall_style');
    setDescription('');
  }

  function resetPinForm() {
    setPinBoardId('');
    setPinUrl('');
    setPinCaption('');
    setPinTags('');
  }

  function handleCreateBoard() {
    if (!boardName) return;
    createBoard.mutate({
      projectId,
      name: boardName,
      category: boardCategory,
      description: description || undefined,
    });
  }

  function handleAddPin() {
    if (!pinBoardId || !pinUrl) return;
    addPin.mutate({
      boardId: pinBoardId,
      imageUrl: pinUrl,
      caption: pinCaption || undefined,
      tags: pinTags ? pinTags.split(',').map((t) => t.trim()) : undefined,
    });
  }

  /* ── Derived data ─────────────────────────────────────────── */
  const totalBoards = boards.length;
  const totalPins = pins.length;
  const sharedBoards = boards.filter((b: any) => b.status === 'shared').length;
  const tagCount = [...new Set(pins.flatMap((p: any) => p.tags || []))].length;

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
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inspiration Boards</h1>
            <p className="text-sm text-muted-foreground">
              Collect inspiration, pin images, and collaborate with clients on design preferences.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPinDialogOpen(true)}
            disabled={boards.length === 0}
          >
            <Pin className="mr-1 h-4 w-4" />
            Add Pin
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />New Board</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Inspiration Board</DialogTitle>
                <DialogDescription>Create a board to collect and organize inspiration images.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ibName">Board Name</Label>
                  <Input id="ibName" placeholder="e.g. Kitchen Ideas" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={boardCategory} onValueChange={setBoardCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BOARD_CATEGORIES.map((bc) => <SelectItem key={bc.value} value={bc.value}>{bc.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ibDesc">Description</Label>
                  <Textarea id="ibDesc" placeholder="What kind of inspiration are you collecting?" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateBoard} disabled={createBoard.isPending || !boardName}>
                  {createBoard.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Creating...</> : 'Create Board'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pin Dialog */}
          <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Inspiration Pin</DialogTitle>
                <DialogDescription>Pin an image to an inspiration board with tags and captions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Board</Label>
                  <Select value={pinBoardId} onValueChange={setPinBoardId}><SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger><SelectContent>{boards.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinUrl">Image URL</Label>
                  <Input id="pinUrl" placeholder="https://..." value={pinUrl} onChange={(e) => setPinUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinCaption">Caption</Label>
                  <Input id="pinCaption" placeholder="e.g. Love this backsplash pattern" value={pinCaption} onChange={(e) => setPinCaption(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinTags">Tags (comma-separated)</Label>
                  <Input id="pinTags" placeholder="e.g. modern, white, subway tile" value={pinTags} onChange={(e) => setPinTags(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddPin} disabled={addPin.isPending || !pinBoardId || !pinUrl}>
                  {addPin.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Pin className="mr-1 h-4 w-4" />}
                  Pin It
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Boards</p><p className="text-2xl font-bold">{totalBoards}</p></div><LayoutGrid className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pins</p><p className="text-2xl font-bold text-pink-600">{totalPins}</p></div><Heart className="h-8 w-8 text-pink-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Shared</p><p className="text-2xl font-bold text-purple-600">{sharedBoards}</p></div><Users className="h-8 w-8 text-purple-400" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tags</p><p className="text-2xl font-bold text-blue-600">{tagCount}</p></div><Tag className="h-8 w-8 text-blue-400" /></div></CardContent></Card>
      </div>

      {/* ── Board Cards ─────────────────────────────────────── */}
      {boards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board: any) => {
            const boardPins = pins.filter((p: any) => p.boardId === board.id);
            return (
              <Card key={board.id} className="relative overflow-hidden">
                {/* Preview mosaic */}
                <div className="relative h-36 bg-gradient-to-br from-pink-50 to-purple-50">
                  {boardPins.length > 0 ? (
                    <div className="grid grid-cols-3 h-full gap-0.5 p-0.5">
                      {boardPins.slice(0, 3).map((pin: any, i: number) => (
                        <div key={pin.id} className="bg-muted rounded overflow-hidden">
                          {pin.imageUrl ? (
                            <img src={pin.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full flex items-center justify-center"><Image className="h-6 w-6 text-muted-foreground/30" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 right-2 text-[10px] ${STATUS_COLORS[board.status] || ''}`}>{board.status}</Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{board.name}</CardTitle>
                  <CardDescription className="capitalize">
                    {board.category.replace(/_/g, ' ')} &middot; {boardPins.length} pin{boardPins.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {board.description && <p className="text-sm text-muted-foreground line-clamp-2">{board.description}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setPinBoardId(board.id); setPinDialogOpen(true); }}>
                      <Pin className="mr-1 h-3.5 w-3.5" />Add Pin
                    </Button>
                    {boardPins.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => findSimilar.mutate({ boardId: board.id })} disabled={findSimilar.isPending}>
                        {findSimilar.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />}
                        Find Similar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteBoard.mutate({ id: board.id })} disabled={deleteBoard.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No Inspiration Boards</h2>
          <p className="text-sm text-muted-foreground mb-4">Create boards to collect and organize design inspiration with your clients.</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Board</Button>
        </Card>
      )}
    </div>
  );
}
