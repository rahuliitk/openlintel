'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { FileUpload } from '@/components/file-upload';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
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
  Wand2,
  Loader2,
  Check,
  Upload,
  Maximize2,
  Trash2,
  RotateCcw,
} from 'lucide-react';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining', label: 'Dining Room' },
  { value: 'study', label: 'Office / Study' },
  { value: 'bathroom', label: 'Bathroom' },
];

const DESIGN_STYLES = [
  { value: 'modern', label: 'Modern' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'rustic', label: 'Rustic' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'coastal', label: 'Coastal' },
  { value: 'contemporary', label: 'Contemporary' },
];

const COLOR_PALETTES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'warm_tones', label: 'Warm Tones' },
  { value: 'cool_tones', label: 'Cool Tones' },
  { value: 'earth_tones', label: 'Earth Tones' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'vibrant', label: 'Vibrant' },
];

const FURNITURE_DENSITY = [
  { value: 'minimal', label: 'Minimal Furniture' },
  { value: 'balanced', label: 'Balanced Layout' },
  { value: 'rich', label: 'Richly Furnished' },
];

const MATERIALS = [
  { value: 'wood', label: 'Wood' },
  { value: 'marble', label: 'Marble' },
  { value: 'glass', label: 'Glass' },
  { value: 'metal', label: 'Metal' },
  { value: 'mixed', label: 'Mixed Materials' },
];

const LIGHTING_MOODS = [
  { value: 'bright_daylight', label: 'Bright Daylight' },
  { value: 'soft_ambient', label: 'Soft Ambient' },
  { value: 'warm_cozy', label: 'Warm & Cozy' },
  { value: 'dramatic', label: 'Dramatic Lighting' },
];

const BUDGET_LEVELS = [
  { value: 'budget_friendly', label: 'Budget Friendly' },
  { value: 'mid_range', label: 'Mid Range' },
  { value: 'premium', label: 'Premium' },
];

interface DesignStudioProps {
  roomId: string;
  projectId: string;
  roomType: string;
  onDesignsGenerated: () => void;
}

function OptionPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Inline design studio — upload photos, fill questionnaire, generate & view results.
 * Meant to be embedded directly in the Designs tab.
 */
export function DesignStudio({
  roomId,
  projectId,
  roomType,
  onDesignsGenerated,
}: DesignStudioProps) {
  const utils = trpc.useUtils();

  // Uploads
  const { data: roomUploads = [] } = trpc.upload.listByRoom.useQuery({ roomId });
  const imageUploads = roomUploads.filter((u: any) => u.mimeType?.startsWith('image/'));

  const deleteUpload = trpc.upload.delete.useMutation({
    onSuccess: () => {
      utils.upload.listByRoom.invalidate({ roomId });
      toast({ title: 'Photo deleted' });
    },
  });

  // Photo selection
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  // Preferences
  const [selectedRoomType, setSelectedRoomType] = useState(roomType || 'living_room');
  const [designStyle, setDesignStyle] = useState('modern');
  const [colorPalette, setColorPalette] = useState('neutral');
  const [furnitureDensity, setFurnitureDensity] = useState('balanced');
  const [materialPreference, setMaterialPreference] = useState('mixed');
  const [lightingMood, setLightingMood] = useState('soft_ambient');
  const [budgetLevel, setBudgetLevel] = useState('mid_range');
  const [numVariations, setNumVariations] = useState(4);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRedesigns = trpc.roomRedesign.generateRedesigns.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      toast({ title: `Generated ${data.variationCount} design variations` });
      onDesignsGenerated();
    },
    onError: (err) => {
      setIsGenerating(false);
      toast({ title: 'Generation failed', description: err.message });
    },
  });

  const handleGenerate = () => {
    if (!selectedUploadId) return;
    setIsGenerating(true);
    generateRedesigns.mutate({
      roomId,
      uploadId: selectedUploadId,
      roomType: selectedRoomType,
      designStyle,
      colorPalette,
      furnitureDensity,
      materialPreference,
      lightingMood,
      budgetLevel,
      numVariations,
    });
  };

  // Auto-select first image if none selected
  if (!selectedUploadId && imageUploads.length > 0) {
    setSelectedUploadId(imageUploads[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Upload & Select Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            1. Room Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            projectId={projectId}
            roomId={roomId}
            onUploadComplete={() => {
              utils.upload.listByRoom.invalidate({ roomId });
            }}
          />

          {imageUploads.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Select the photo to redesign:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {imageUploads.map((upload: any) => (
                  <button
                    key={upload.id}
                    type="button"
                    className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                      selectedUploadId === upload.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setSelectedUploadId(upload.id)}
                  >
                    <img
                      src={`/api/uploads/${encodeURIComponent(upload.storageKey)}`}
                      alt={upload.filename}
                      className="aspect-square w-full object-cover"
                    />
                    {selectedUploadId === upload.id && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary bg-white rounded-full p-0.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Design Preferences Questionnaire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            2. Design Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Room Type */}
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Design Style */}
          <div className="space-y-2">
            <Label>Design Style</Label>
            <OptionPills options={DESIGN_STYLES} value={designStyle} onChange={setDesignStyle} />
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <Label>Color Palette</Label>
            <OptionPills options={COLOR_PALETTES} value={colorPalette} onChange={setColorPalette} />
          </div>

          {/* Furniture + Materials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Furniture Density</Label>
              <OptionPills
                options={FURNITURE_DENSITY}
                value={furnitureDensity}
                onChange={setFurnitureDensity}
              />
            </div>
            <div className="space-y-2">
              <Label>Material Preference</Label>
              <OptionPills
                options={MATERIALS}
                value={materialPreference}
                onChange={setMaterialPreference}
              />
            </div>
          </div>

          {/* Lighting + Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lighting Mood</Label>
              <OptionPills
                options={LIGHTING_MOODS}
                value={lightingMood}
                onChange={setLightingMood}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget Level</Label>
              <OptionPills
                options={BUDGET_LEVELS}
                value={budgetLevel}
                onChange={setBudgetLevel}
              />
            </div>
          </div>

          {/* Number of Variations */}
          <div className="space-y-2">
            <Label>Number of Variations</Label>
            <div className="flex gap-2">
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                    numVariations === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                  onClick={() => setNumVariations(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        {isGenerating ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center py-10 space-y-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center space-y-1">
                <p className="font-medium">Generating {numVariations} design variations...</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing room structure and creating unique designs. This may take 1-2 minutes.
                </p>
              </div>
              <Progress value={50} className="w-64" />
            </CardContent>
          </Card>
        ) : (
          <Button
            size="lg"
            className="px-8"
            onClick={handleGenerate}
            disabled={!selectedUploadId || imageUploads.length === 0}
          >
            <Wand2 className="mr-2 h-5 w-5" />
            Generate {numVariations} Design Variations
          </Button>
        )}
      </div>
    </div>
  );
}

/** Card displaying a single redesign result with original vs variations comparison */
export function RedesignResultsCard({
  variant,
  sourceStorageKey,
  onDelete,
}: {
  variant: {
    id: string;
    name: string;
    style: string;
    budgetTier: string;
    renderUrls: unknown;
    metadata: unknown;
    createdAt: Date;
  };
  sourceStorageKey?: string;
  onDelete?: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  const renderUrls = (variant.renderUrls as string[]) ?? [];
  const meta = variant.metadata as any;
  const variations = meta?.variations ?? [];
  const preferences = meta?.preferences;

  if (renderUrls.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{variant.name}</CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary">{variant.style}</Badge>
              <Badge variant="outline">{variant.budgetTier.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(variant.createdAt).toLocaleDateString()}
              </span>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-1"
                  onClick={() => {
                    if (confirm('Delete this redesign?')) onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {/* Preference tags */}
          {preferences && (
            <div className="flex flex-wrap gap-1 mt-1">
              {preferences.colorPalette && (
                <Badge variant="outline" className="text-[10px]">
                  {preferences.colorPalette.replace(/_/g, ' ')}
                </Badge>
              )}
              {preferences.furnitureDensity && (
                <Badge variant="outline" className="text-[10px]">
                  {preferences.furnitureDensity}
                </Badge>
              )}
              {preferences.materialPreference && (
                <Badge variant="outline" className="text-[10px]">
                  {preferences.materialPreference}
                </Badge>
              )}
              {preferences.lightingMood && (
                <Badge variant="outline" className="text-[10px]">
                  {preferences.lightingMood.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-3">
            {sourceStorageKey && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Original</p>
                <img
                  src={`/api/uploads/${encodeURIComponent(sourceStorageKey)}`}
                  alt="Original"
                  className="w-full aspect-square object-cover rounded-lg border cursor-pointer"
                  onClick={() =>
                    setFullscreen(`/api/uploads/${encodeURIComponent(sourceStorageKey)}`)
                  }
                />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {variations[selectedIndex]?.label ?? `Variation ${selectedIndex + 1}`}
              </p>
              <div className="relative group">
                <img
                  src={renderUrls[selectedIndex]}
                  alt={`Variation ${selectedIndex + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border cursor-pointer"
                  onClick={() => setFullscreen(renderUrls[selectedIndex])}
                />
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setFullscreen(renderUrls[selectedIndex])}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Variation thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {renderUrls.map((url, i) => (
              <button
                key={i}
                className={`flex-shrink-0 rounded-md border-2 overflow-hidden transition-all ${
                  selectedIndex === i
                    ? 'border-primary ring-1 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/30'
                }`}
                onClick={() => setSelectedIndex(i)}
              >
                <img src={url} alt={`Var ${i + 1}`} className="w-16 h-16 object-cover" />
                <p className="text-[9px] text-muted-foreground text-center py-0.5 truncate w-16 px-0.5">
                  {variations[i]?.label ?? `Var ${i + 1}`}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(null)}
        >
          <img
            src={fullscreen}
            alt="Fullscreen"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          <p className="absolute bottom-4 text-white/60 text-sm">Click anywhere to close</p>
        </div>
      )}
    </>
  );
}
