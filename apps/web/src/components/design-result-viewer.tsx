'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Separator,
} from '@openlintel/ui';
import {
  Download,
  ShoppingCart,
  FileText,
  ImageIcon,
  Palette,
  Sofa,
  Layers,
  Lightbulb,
  DollarSign,
} from 'lucide-react';

interface FurnitureItem {
  name: string;
  material: string;
  dimensions?: string;
  position?: string;
  estimatedCost?: number;
  notes?: string;
}

interface ColorEntry {
  hex: string;
  name: string;
  usage: string;
}

interface MaterialEntry {
  name: string;
  application: string;
  specification?: string;
}

interface DesignSpec {
  designConcept?: string;
  furniture?: FurnitureItem[];
  colorPalette?: ColorEntry[] | string[];
  materialSuggestions?: MaterialEntry[] | string[];
  layoutDescription?: string;
  lightingPlan?: string;
  flooringRecommendation?: { type: string; specification: string; pattern?: string };
  wallTreatment?: string;
  estimatedTotalCost?: { min: number; max: number; currency: string };
  dimensions?: { lengthMm: number; widthMm: number; heightMm: number; areaSqm: number };
  [key: string]: unknown;
}

interface DesignResultViewerProps {
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  renderUrls?: string[];
  style: string;
  budgetTier: string;
  constraints?: string[];
  variantName: string;
  specJson?: DesignSpec | null;
  onGenerateBOM?: () => void;
  onGenerateDrawings?: () => void;
  onDownload?: (url: string) => void;
}

function BeforeAfterImages({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">Before</Badge>
        <div className="overflow-hidden rounded-lg border">
          <img
            src={beforeUrl}
            alt="Before design"
            className="w-full object-contain"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Badge variant="secondary" className="text-xs">After</Badge>
        <div className="overflow-hidden rounded-lg border">
          <img
            src={afterUrl}
            alt="After design"
            className="w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function DesignResultViewer({
  beforeImageUrl,
  afterImageUrl,
  renderUrls = [],
  style,
  budgetTier,
  constraints = [],
  variantName,
  specJson,
  onGenerateBOM,
  onGenerateDrawings,
  onDownload,
}: DesignResultViewerProps) {
  const [selectedRender, setSelectedRender] = useState(0);
  const allRenderUrls = afterImageUrl
    ? [afterImageUrl, ...renderUrls.filter((u) => u !== afterImageUrl)]
    : renderUrls;
  const currentRenderUrl = allRenderUrls[selectedRender] ?? null;

  const handleDownload = (url: string) => {
    if (onDownload) {
      onDownload(url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${variantName}-render.png`;
      link.click();
    }
  };

  // Normalize color palette (can be string[] or ColorEntry[])
  const colors: ColorEntry[] = specJson?.colorPalette
    ? (specJson.colorPalette as (string | ColorEntry)[]).map((c, i) =>
        typeof c === 'string'
          ? { hex: c, name: `Color ${i + 1}`, usage: '' }
          : c,
      )
    : [];

  // Normalize materials (can be string[] or MaterialEntry[])
  const materials: MaterialEntry[] = specJson?.materialSuggestions
    ? (specJson.materialSuggestions as (string | MaterialEntry)[]).map((m) =>
        typeof m === 'string'
          ? { name: m, application: '', specification: '' }
          : m,
      )
    : [];

  const furniture: FurnitureItem[] = specJson?.furniture ?? [];

  return (
    <div className="space-y-6">
      {/* Before/After Comparison */}
      {beforeImageUrl && currentRenderUrl ? (
        <BeforeAfterImages
          beforeUrl={beforeImageUrl}
          afterUrl={currentRenderUrl}
        />
      ) : currentRenderUrl ? (
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-lg border">
            <img
              src={currentRenderUrl}
              alt={variantName}
              className="w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {/* Render thumbnails */}
      {allRenderUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allRenderUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelectedRender(i)}
              className={`shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === selectedRender
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              <img
                src={url}
                alt={`Render ${i + 1}`}
                className="h-16 w-24 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Design Concept */}
      {specJson?.designConcept && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Design Concept
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {specJson.designConcept}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Layout Description */}
      {specJson?.layoutDescription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {specJson.layoutDescription}
            </p>
            {specJson.dimensions && (
              <div className="flex flex-wrap gap-3 pt-1">
                <Badge variant="outline" className="text-xs">
                  {specJson.dimensions.areaSqm} sqm
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {specJson.dimensions.lengthMm / 1000}m x {specJson.dimensions.widthMm / 1000}m
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Height: {specJson.dimensions.heightMm / 1000}m
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Color Palette */}
      {colors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Color Palette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {colors.map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-md border shadow-sm"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  <div>
                    <p className="text-xs font-medium">{color.name}</p>
                    {color.usage && (
                      <p className="text-xs text-muted-foreground">{color.usage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Furniture List */}
      {furniture.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sofa className="h-4 w-4" />
              Furniture ({furniture.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Material</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Position</th>
                    {furniture.some((f) => f.estimatedCost) && (
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Est. Cost</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {furniture.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.dimensions && (
                            <p className="text-xs text-muted-foreground">{item.dimensions}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{item.material}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.position || '-'}</td>
                      {furniture.some((f) => f.estimatedCost) && (
                        <td className="px-3 py-2 text-right">
                          {item.estimatedCost ? `$${item.estimatedCost.toLocaleString()}` : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Material Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {materials.map((mat, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{mat.name}</p>
                  {mat.application && (
                    <p className="text-xs text-muted-foreground">{mat.application}</p>
                  )}
                  {mat.specification && (
                    <p className="text-xs text-muted-foreground">{mat.specification}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lighting & Flooring */}
      {(specJson?.lightingPlan || specJson?.flooringRecommendation || specJson?.wallTreatment) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Finishes & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {specJson.lightingPlan && (
              <div>
                <p className="text-sm font-medium mb-1">Lighting Plan</p>
                <p className="text-sm text-muted-foreground">{specJson.lightingPlan}</p>
              </div>
            )}
            {specJson.flooringRecommendation && (
              <div>
                <p className="text-sm font-medium mb-1">Flooring</p>
                <p className="text-sm text-muted-foreground">
                  {specJson.flooringRecommendation.type} — {specJson.flooringRecommendation.specification}
                  {specJson.flooringRecommendation.pattern && ` (${specJson.flooringRecommendation.pattern})`}
                </p>
              </div>
            )}
            {specJson.wallTreatment && (
              <div>
                <p className="text-sm font-medium mb-1">Wall Treatment</p>
                <p className="text-sm text-muted-foreground">{specJson.wallTreatment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estimated Cost */}
      {specJson?.estimatedTotalCost && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Estimated Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {specJson.estimatedTotalCost.currency || 'USD'}{' '}
              {specJson.estimatedTotalCost.min.toLocaleString()} –{' '}
              {specJson.estimatedTotalCost.max.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimate based on {budgetTier} budget tier
            </p>
          </CardContent>
        </Card>
      )}

      {/* Design Details Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Design Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </Badge>
            <Badge variant="outline">
              {budgetTier.charAt(0).toUpperCase() + budgetTier.slice(1)}
            </Badge>
          </div>

          {constraints.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Constraints Applied</p>
                <div className="flex flex-wrap gap-1.5">
                  {constraints.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {currentRenderUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(currentRenderUrl)}
              >
                <Download className="mr-1 h-4 w-4" />
                Download Render
              </Button>
            )}
            {onGenerateBOM && (
              <Button variant="outline" size="sm" onClick={onGenerateBOM}>
                <ShoppingCart className="mr-1 h-4 w-4" />
                Generate BOM
              </Button>
            )}
            {onGenerateDrawings && (
              <Button variant="outline" size="sm" onClick={onGenerateDrawings}>
                <FileText className="mr-1 h-4 w-4" />
                Generate Drawings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
