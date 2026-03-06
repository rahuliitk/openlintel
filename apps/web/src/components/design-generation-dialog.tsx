'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { FileUpload } from '@/components/file-upload';
import {
  Button,
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
  Badge,
  Textarea,
  Separator,
  toast,
} from '@openlintel/ui';
import { Sparkles, Plus, X, Check, Upload, Loader2 } from 'lucide-react';
import { JobProgress } from './job-progress';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'dining', label: 'Dining Room' },
  { value: 'study', label: 'Study' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'utility', label: 'Utility' },
  { value: 'foyer', label: 'Foyer' },
  { value: 'pooja_room', label: 'Pooja Room' },
  { value: 'garage', label: 'Garage' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'other', label: 'Other' },
] as const;

const DESIGN_STYLES = [
  'modern', 'contemporary', 'minimalist', 'scandinavian', 'industrial',
  'traditional', 'transitional', 'bohemian', 'coastal', 'rustic',
] as const;

const BUDGET_TIERS = ['economy', 'standard', 'premium', 'luxury'] as const;

const COLOR_PALETTES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'warm_tones', label: 'Warm Tones' },
  { value: 'cool_tones', label: 'Cool Tones' },
  { value: 'earth_tones', label: 'Earth Tones' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'vibrant', label: 'Vibrant' },
];

const FURNITURE_DENSITY = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'rich', label: 'Rich' },
];

const MATERIALS = [
  { value: 'wood', label: 'Wood' },
  { value: 'marble', label: 'Marble' },
  { value: 'glass', label: 'Glass' },
  { value: 'metal', label: 'Metal' },
  { value: 'mixed', label: 'Mixed' },
];

const LIGHTING_MOODS = [
  { value: 'bright_daylight', label: 'Bright Daylight' },
  { value: 'soft_ambient', label: 'Soft Ambient' },
  { value: 'warm_cozy', label: 'Warm & Cozy' },
  { value: 'dramatic', label: 'Dramatic' },
];

function OptionPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
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

interface DesignGenerationDialogProps {
  designVariantId: string;
  roomId: string;
  projectId: string;
  currentStyle?: string;
  currentBudget?: string;
  currentRoomType?: string;
  onGenerated?: () => void;
  trigger?: React.ReactNode;
}

export function DesignGenerationDialog({
  designVariantId,
  roomId,
  projectId,
  currentStyle = 'modern',
  currentBudget = 'standard',
  currentRoomType = 'living_room',
  onGenerated,
  trigger,
}: DesignGenerationDialogProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(currentStyle);
  const [budget, setBudget] = useState(currentBudget);
  const [roomType, setRoomType] = useState(currentRoomType);
  const [constraintInput, setConstraintInput] = useState('');
  const [constraints, setConstraints] = useState<string[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'input' | 'progress'>('input');

  // New preference fields
  const [colorPalette, setColorPalette] = useState('neutral');
  const [furnitureDensity, setFurnitureDensity] = useState('balanced');
  const [materialPreference, setMaterialPreference] = useState('mixed');
  const [lightingMood, setLightingMood] = useState('soft_ambient');

  // Photo selection
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const utils = trpc.useUtils();

  // Fetch room photos
  const { data: roomUploads = [] } = trpc.upload.listByRoom.useQuery(
    { roomId },
    { enabled: !!roomId },
  );
  const imageUploads = roomUploads.filter((u: any) => u.mimeType?.startsWith('image/'));

  // Text spec generation
  const generateDesign = trpc.designVariant.generate.useMutation({
    onSuccess: (job) => {
      setJobId(job.id);
      setPhase('progress');
      toast({ title: 'Design generation started' });
    },
    onError: (err) => {
      toast({ title: 'Failed to start generation', description: err.message });
    },
  });

  // Image generation (when photo is selected)
  const generateRedesigns = trpc.roomRedesign.generateRedesigns.useMutation({
    onSuccess: (data) => {
      setIsGeneratingImages(false);
      toast({ title: 'Room image generated' });
      onGenerated?.();
    },
    onError: (err) => {
      setIsGeneratingImages(false);
      toast({ title: 'Image generation failed', description: err.message });
    },
  });

  const addConstraint = () => {
    const trimmed = constraintInput.trim();
    if (trimmed && !constraints.includes(trimmed)) {
      setConstraints((prev) => [...prev, trimmed]);
      setConstraintInput('');
    }
  };

  const removeConstraint = (index: number) => {
    setConstraints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConstraintKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addConstraint();
    }
  };

  const handleGenerate = () => {
    // Build combined constraints from preference fields
    const allConstraints = [
      ...constraints,
      `Color palette: ${colorPalette.replace(/_/g, ' ')}`,
      `Furniture density: ${furnitureDensity}`,
      `Materials: ${materialPreference}`,
      `Lighting: ${lightingMood.replace(/_/g, ' ')}`,
    ];

    // 1. Always generate text design spec
    generateDesign.mutate({
      designVariantId,
      style,
      budgetTier: budget,
      constraints: allConstraints,
      additionalPrompt: additionalPrompt.trim() || undefined,
    });

    // 2. If a photo is selected, also generate room redesign images on the same variant
    if (selectedUploadId) {
      setIsGeneratingImages(true);
      generateRedesigns.mutate({
        roomId,
        uploadId: selectedUploadId,
        designVariantId,
        roomType,
        designStyle: style,
        colorPalette,
        furnitureDensity,
        materialPreference,
        lightingMood,
        budgetLevel: budget,
        numVariations: 1,
      });
    }
  };

  const handleJobComplete = () => {
    utils.designVariant.listByProject.invalidate({ projectId });
    utils.designVariant.listByRoom.invalidate({ roomId });
    utils.upload.listByRoom.invalidate({ roomId });
    utils.roomRedesign.listByRoom.invalidate({ roomId });
    onGenerated?.();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPhase('input');
      setJobId(null);
      setConstraintInput('');
      setAdditionalPrompt('');
      setIsGeneratingImages(false);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Sparkles className="mr-1 h-4 w-4" />
            Generate AI Design
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {phase === 'input' ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate AI Design</DialogTitle>
              <DialogDescription>
                Upload a room photo, set your preferences, and generate a complete AI-powered
                design with room images.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Photo Upload & Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Room Photo (optional — enables image generation)
                </Label>

                <FileUpload
                  projectId={projectId}
                  roomId={roomId}
                  onUploadComplete={() => {
                    utils.upload.listByRoom.invalidate({ roomId });
                  }}
                  accept="image/*"
                />

                {imageUploads.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select a photo for AI room redesign:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {imageUploads.map((upload: any) => (
                        <button
                          key={upload.id}
                          type="button"
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                            selectedUploadId === upload.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                          onClick={() =>
                            setSelectedUploadId(
                              selectedUploadId === upload.id ? null : upload.id,
                            )
                          }
                        >
                          <img
                            src={`/api/uploads/${encodeURIComponent(upload.storageKey)}`}
                            alt={upload.filename}
                            className="aspect-square w-full object-cover"
                          />
                          {selectedUploadId === upload.id && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary bg-white rounded-full p-0.5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Room Type */}
              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Design Style */}
              <div className="space-y-2">
                <Label>Design Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget Tier */}
              <div className="space-y-2">
                <Label>Budget Tier</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <Label>Color Palette</Label>
                <OptionPills
                  options={COLOR_PALETTES}
                  value={colorPalette}
                  onChange={setColorPalette}
                />
              </div>

              {/* Furniture Density */}
              <div className="space-y-2">
                <Label>Furniture Density</Label>
                <OptionPills
                  options={FURNITURE_DENSITY}
                  value={furnitureDensity}
                  onChange={setFurnitureDensity}
                />
              </div>

              {/* Material Preference */}
              <div className="space-y-2">
                <Label>Material Preference</Label>
                <OptionPills
                  options={MATERIALS}
                  value={materialPreference}
                  onChange={setMaterialPreference}
                />
              </div>

              {/* Lighting */}
              <div className="space-y-2">
                <Label>Lighting Mood</Label>
                <OptionPills
                  options={LIGHTING_MOODS}
                  value={lightingMood}
                  onChange={setLightingMood}
                />
              </div>

              <Separator />

              {/* Design Constraints */}
              <div className="space-y-2">
                <Label>Design Constraints</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Must keep existing flooring"
                    value={constraintInput}
                    onChange={(e) => setConstraintInput(e.target.value)}
                    onKeyDown={handleConstraintKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addConstraint}
                    disabled={!constraintInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {constraints.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {constraints.map((constraint, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {constraint}
                        <button
                          onClick={() => removeConstraint(i)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>Additional Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any specific requirements or preferences..."
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateDesign.isPending}
              >
                {generateDesign.isPending ? (
                  'Starting...'
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" />
                    Generate Design
                    {selectedUploadId && ' + Images'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Generating Design</DialogTitle>
              <DialogDescription>
                AI is creating your design
                {isGeneratingImages ? ' and room image' : ''}. This may take a
                few minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              {/* Text spec progress */}
              {jobId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Design Specification
                  </p>
                  <JobProgress
                    jobId={jobId}
                    onComplete={handleJobComplete}
                    onFailed={() => {
                      toast({
                        title: 'Generation failed',
                        description:
                          'Please try again with different parameters.',
                      });
                    }}
                  />
                </div>
              )}

              {/* Image generation progress */}
              {isGeneratingImages && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Room Images
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating redesigned room image...
                  </div>
                </div>
              )}

              {!isGeneratingImages && selectedUploadId && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  Room image generated
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
