/**
 * SVG Technical Drawing Generator
 *
 * Generates professional architectural SVGs for floor plans,
 * furnished plans, elevations, and electrical layouts.
 */

// ── Types ──────────────────────────────────────────────────────────

interface RoomData {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  type: string;
  name: string;
}

interface FurnitureItem {
  name: string;
  dimensions?: string; // "WxDxH in mm"
  position?: string;
  notes?: string;
}

interface SpecData {
  furniture?: FurnitureItem[];
  colorPalette?: Array<{ hex: string; name: string; usage: string }>;
  lightingPlan?: string;
  flooringRecommendation?: unknown;
  layoutDescription?: string;
}

interface TitleBlockData {
  projectName?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  roomType?: string;
  date?: string;
  revision?: string;
  drawnBy?: string;
}

interface DrawingMetadata {
  scale?: string;
  paperSize?: string;
  titleBlock?: TitleBlockData;
  drawingNumber?: string;
  title?: string;
  revision?: string;
}

type DrawingType = 'floor_plan' | 'furnished_plan' | 'elevation' | 'electrical_layout' |
  'section' | 'rcp' | 'flooring_layout';

// ── Constants ──────────────────────────────────────────────────────

const WALL_THICKNESS_MM = 150;
const DOOR_WIDTH_MM = 900;
const DOOR_HEIGHT_MM = 2100;
const WINDOW_WIDTH_MM = 1200;
const WINDOW_HEIGHT_MM = 1200;
const WINDOW_SILL_MM = 900;

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 297, h: 210 },
  A3: { w: 420, h: 297 },
  A2: { w: 594, h: 420 },
  A1: { w: 841, h: 594 },
};

const MARGIN = 15;
const TITLE_BLOCK_W = 185;
const TITLE_BLOCK_H = 35;

// Furniture approximate sizes (W x D in mm) when dimensions not parseable
const FURNITURE_DEFAULTS: Record<string, { w: number; d: number }> = {
  bed: { w: 1500, d: 2000 },
  'king bed': { w: 1800, d: 2100 },
  'queen bed': { w: 1500, d: 2000 },
  'single bed': { w: 900, d: 2000 },
  sofa: { w: 2200, d: 900 },
  desk: { w: 1200, d: 600 },
  table: { w: 1200, d: 800 },
  'dining table': { w: 1600, d: 900 },
  'coffee table': { w: 1100, d: 600 },
  'side table': { w: 500, d: 500 },
  'nightstand': { w: 450, d: 400 },
  'bedside table': { w: 450, d: 400 },
  wardrobe: { w: 1800, d: 600 },
  closet: { w: 1500, d: 600 },
  dresser: { w: 1200, d: 500 },
  bookshelf: { w: 900, d: 350 },
  'tv unit': { w: 1500, d: 450 },
  chair: { w: 550, d: 550 },
  'armchair': { w: 800, d: 800 },
  rug: { w: 2000, d: 1500 },
  'kitchen island': { w: 1200, d: 800 },
  counter: { w: 2500, d: 600 },
  sink: { w: 600, d: 500 },
  toilet: { w: 400, d: 700 },
  bathtub: { w: 1700, d: 750 },
  shower: { w: 900, d: 900 },
  vanity: { w: 900, d: 500 },
};

const FURNITURE_COLORS: Record<string, string> = {
  bed: '#dbeafe',
  sofa: '#dcfce7',
  desk: '#fef3c7',
  table: '#fef3c7',
  chair: '#e0e7ff',
  wardrobe: '#f3e8ff',
  closet: '#f3e8ff',
  dresser: '#fce7f3',
  bookshelf: '#fed7aa',
  rug: '#f0fdf4',
  default: '#f3f4f6',
};

// ── Helpers ─────────────────────────────────────────────────────────

function parseScale(s: string): number {
  const m = s.match(/1\s*:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 50;
}

function toD(realMm: number, sf: number): number {
  return realMm / sf;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseDimensions(dimStr: string | undefined): { w: number; d: number; h: number } | null {
  if (!dimStr) return null;
  // Try "WxDxH" or "W x D x H" patterns (values in mm or just numbers)
  const m = dimStr.match(/(\d+)\s*[x×X]\s*(\d+)(?:\s*[x×X]\s*(\d+))?/);
  if (!m) return null;
  return {
    w: parseInt(m[1], 10),
    d: parseInt(m[2], 10),
    h: m[3] ? parseInt(m[3], 10) : 0,
  };
}

function getFurnitureSize(item: FurnitureItem): { w: number; d: number } {
  const parsed = parseDimensions(item.dimensions);
  if (parsed && parsed.w > 0 && parsed.d > 0) return { w: parsed.w, d: parsed.d };

  const nameLower = item.name.toLowerCase();
  for (const [key, size] of Object.entries(FURNITURE_DEFAULTS)) {
    if (nameLower.includes(key)) return size;
  }
  return { w: 600, d: 600 };
}

function getFurnitureColor(name: string): string {
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(FURNITURE_COLORS)) {
    if (n.includes(key)) return color;
  }
  return FURNITURE_COLORS.default;
}

// ── Position Resolver with Collision Avoidance ─────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect, padding: number): boolean {
  return (
    a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y
  );
}

function isInsideRoom(
  r: Rect, ox: number, oy: number, roomW: number, roomH: number, wallT: number,
): boolean {
  const minX = ox + wallT;
  const minY = oy + wallT;
  const maxX = ox + roomW - wallT;
  const maxY = oy + roomH - wallT;
  return r.x >= minX - 0.5 && r.y >= minY - 0.5 &&
    r.x + r.w <= maxX + 0.5 && r.y + r.h <= maxY + 0.5;
}

function findNonOverlappingPosition(
  candidate: { x: number; y: number },
  itemW: number, itemD: number,
  placedItems: Rect[],
  ox: number, oy: number,
  roomW: number, roomH: number,
  wallT: number,
): { x: number; y: number } {
  const padding = 1.5; // mm gap between furniture in drawing coords
  const candidateRect: Rect = { x: candidate.x, y: candidate.y, w: itemW, h: itemD };

  // Check if candidate position has no overlap
  const hasOverlap = placedItems.some(r => rectsOverlap(candidateRect, r, padding));
  if (!hasOverlap && isInsideRoom(candidateRect, ox, oy, roomW, roomH, wallT)) {
    return candidate;
  }

  // Try nudging in expanding spiral around the candidate
  const step = 3; // mm step in drawing coords
  for (let dist = step; dist < Math.max(roomW, roomH); dist += step) {
    // Try positions in a square ring at distance `dist`
    for (let dx = -dist; dx <= dist; dx += step) {
      for (const dy of [-dist, dist]) {
        const nx = candidate.x + dx;
        const ny = candidate.y + dy;
        const nr: Rect = { x: nx, y: ny, w: itemW, h: itemD };
        if (isInsideRoom(nr, ox, oy, roomW, roomH, wallT) &&
            !placedItems.some(r => rectsOverlap(nr, r, padding))) {
          return { x: nx, y: ny };
        }
      }
    }
    for (let dy = -dist + step; dy < dist; dy += step) {
      for (const dx of [-dist, dist]) {
        const nx = candidate.x + dx;
        const ny = candidate.y + dy;
        const nr: Rect = { x: nx, y: ny, w: itemW, h: itemD };
        if (isInsideRoom(nr, ox, oy, roomW, roomH, wallT) &&
            !placedItems.some(r => rectsOverlap(nr, r, padding))) {
          return { x: nx, y: ny };
        }
      }
    }
  }

  // Last resort: return candidate even if overlapping
  return candidate;
}

function resolvePosition(
  posStr: string | undefined,
  itemW: number, itemD: number,
  roomW: number, roomH: number,
  ox: number, oy: number,
  wallT: number,
  placedItems: Rect[],
  index: number,
): { x: number; y: number } {
  const gap = 2; // mm gap from walls in drawing coords
  const p = (posStr ?? '').toLowerCase();

  let x: number;
  let y: number;

  if (p.includes('center') || p.includes('middle')) {
    x = ox + (roomW - itemW) / 2;
    y = oy + (roomH - itemD) / 2;
  } else if (p.includes('north') || p.includes('back') || p.includes('top') || p.includes('far wall')) {
    y = oy + wallT + gap;
    x = p.includes('east') || p.includes('right')
      ? ox + roomW - wallT - gap - itemW
      : p.includes('west') || p.includes('left')
        ? ox + wallT + gap
        : ox + (roomW - itemW) / 2;
  } else if (p.includes('south') || p.includes('front') || p.includes('bottom') || p.includes('near door') || p.includes('entrance')) {
    y = oy + roomH - wallT - gap - itemD;
    x = p.includes('east') || p.includes('right')
      ? ox + roomW - wallT - gap - itemW
      : p.includes('west') || p.includes('left')
        ? ox + wallT + gap
        : ox + (roomW - itemW) / 2;
  } else if (p.includes('left') || p.includes('west')) {
    x = ox + wallT + gap;
    y = oy + (roomH - itemD) / 2;
  } else if (p.includes('right') || p.includes('east')) {
    x = ox + roomW - wallT - gap - itemW;
    y = oy + (roomH - itemD) / 2;
  } else if (p.includes('corner')) {
    // Try all four corners, pick the one with least overlap
    const corners = [
      { x: ox + wallT + gap, y: oy + wallT + gap },
      { x: ox + roomW - wallT - gap - itemW, y: oy + wallT + gap },
      { x: ox + wallT + gap, y: oy + roomH - wallT - gap - itemD },
      { x: ox + roomW - wallT - gap - itemW, y: oy + roomH - wallT - gap - itemD },
    ];
    const best = corners.find(c => {
      const r: Rect = { x: c.x, y: c.y, w: itemW, h: itemD };
      return !placedItems.some(pr => rectsOverlap(r, pr, 1.5));
    }) ?? corners[index % corners.length];
    x = best.x;
    y = best.y;
  } else if (p.includes('window')) {
    x = ox + roomW - wallT - gap - itemW;
    y = oy + (roomH - itemD) / 2;
  } else if (p.includes('opposite') || p.includes('across')) {
    // Opposite wall from door (door is on left, so place on right)
    x = ox + roomW - wallT - gap - itemW;
    y = oy + (roomH - itemD) / 2;
  } else if (p.includes('beside') || p.includes('next to') || p.includes('adjacent')) {
    // Place next to the last placed item
    if (placedItems.length > 0) {
      const last = placedItems[placedItems.length - 1];
      x = last.x + last.w + 1.5;
      y = last.y;
      // If goes out of room, try below
      if (x + itemW > ox + roomW - wallT) {
        x = last.x;
        y = last.y + last.h + 1.5;
      }
    } else {
      x = ox + wallT + gap;
      y = oy + wallT + gap;
    }
  } else {
    // Auto-place: distribute items along walls using 8 slots
    const positions = [
      { x: ox + (roomW - itemW) / 2, y: oy + wallT + gap },                     // top center
      { x: ox + wallT + gap, y: oy + (roomH - itemD) / 2 },                     // left center
      { x: ox + roomW - wallT - gap - itemW, y: oy + (roomH - itemD) / 2 },     // right center
      { x: ox + (roomW - itemW) / 2, y: oy + roomH - wallT - gap - itemD },     // bottom center
      { x: ox + wallT + gap, y: oy + wallT + gap },                             // top-left
      { x: ox + roomW - wallT - gap - itemW, y: oy + wallT + gap },             // top-right
      { x: ox + wallT + gap, y: oy + roomH - wallT - gap - itemD },             // bottom-left
      { x: ox + roomW - wallT - gap - itemW, y: oy + roomH - wallT - gap - itemD }, // bottom-right
    ];
    const pos = positions[index % positions.length];
    x = pos.x;
    y = pos.y;
  }

  // Always run collision avoidance to nudge overlapping items
  return findNonOverlappingPosition(
    { x, y }, itemW, itemD, placedItems,
    ox, oy, roomW, roomH, wallT,
  );
}

// ── Shared SVG Elements ────────────────────────────────────────────

function svgDefs(): string {
  return `<defs>
  <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
    <path d="M0,0 L6,2 L0,4 Z" fill="#b91c1c"/>
  </marker>
  <marker id="arrow-rev" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
    <path d="M6,0 L0,2 L6,4 Z" fill="#b91c1c"/>
  </marker>
  <pattern id="wall-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="3" stroke="#9ca3af" stroke-width="0.3"/>
  </pattern>
  <pattern id="floor-hatch" width="5" height="5" patternUnits="userSpaceOnUse">
    <line x1="0" y1="5" x2="5" y2="0" stroke="#e5e7eb" stroke-width="0.2"/>
  </pattern>
</defs>`;
}

function renderBorder(pw: number, ph: number): string {
  return `<rect x="3" y="3" width="${pw - 6}" height="${ph - 6}" fill="white" stroke="#1f2937" stroke-width="0.7"/>`;
}

function renderTitleBlock(
  pw: number, ph: number, tb: TitleBlockData, drawingType: string,
): string {
  const bx = pw - MARGIN - TITLE_BLOCK_W;
  const by = ph - MARGIN - TITLE_BLOCK_H;
  const lines: string[] = [];
  lines.push(`<rect x="${bx}" y="${by}" width="${TITLE_BLOCK_W}" height="${TITLE_BLOCK_H}" fill="white" stroke="#1f2937" stroke-width="0.5"/>`);

  // Horizontal dividers
  lines.push(`<line x1="${bx}" y1="${by + 10}" x2="${bx + TITLE_BLOCK_W}" y2="${by + 10}" stroke="#1f2937" stroke-width="0.3"/>`);
  lines.push(`<line x1="${bx}" y1="${by + 20}" x2="${bx + TITLE_BLOCK_W}" y2="${by + 20}" stroke="#1f2937" stroke-width="0.3"/>`);

  // Vertical divider
  const mid = bx + 90;
  lines.push(`<line x1="${mid}" y1="${by + 20}" x2="${mid}" y2="${by + TITLE_BLOCK_H}" stroke="#1f2937" stroke-width="0.3"/>`);

  // Row 1: project name
  lines.push(`<text x="${bx + TITLE_BLOCK_W / 2}" y="${by + 7}" text-anchor="middle" font-size="4" font-weight="bold" fill="#111827">${esc(tb.projectName || 'OpenLintel Project')}</text>`);

  // Row 2: drawing title
  const title = tb.drawingTitle || drawingType.replace(/_/g, ' ').toUpperCase();
  lines.push(`<text x="${bx + TITLE_BLOCK_W / 2}" y="${by + 17}" text-anchor="middle" font-size="3.5" fill="#374151">${esc(title)}</text>`);

  // Row 3 left: dwg number, date
  lines.push(`<text x="${bx + 3}" y="${by + 27}" font-size="2.5" fill="#6b7280">DWG: ${esc(tb.drawingNumber || 'DWG-001')}</text>`);
  lines.push(`<text x="${bx + 3}" y="${by + 32}" font-size="2.5" fill="#6b7280">Date: ${esc(tb.date || new Date().toISOString().slice(0, 10))}</text>`);

  // Row 3 right: scale, revision
  lines.push(`<text x="${mid + 3}" y="${by + 27}" font-size="2.5" fill="#6b7280">Scale: ${esc(tb.scale || '1:50')}</text>`);
  lines.push(`<text x="${mid + 3}" y="${by + 32}" font-size="2.5" fill="#6b7280">Rev: ${esc(tb.revision || 'R0')}  By: ${esc(tb.drawnBy || 'OpenLintel AI')}</text>`);

  return lines.join('\n');
}

function renderDimLine(
  x1: number, y1: number, x2: number, y2: number,
  labelMm: number, offset: number, orientation: 'h' | 'v',
): string {
  const lines: string[] = [];
  const label = `${Math.round(labelMm)}`;

  if (orientation === 'h') {
    const dy = y1 + offset;
    // Extension lines
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${dy}" stroke="#b91c1c" stroke-width="0.15" stroke-dasharray="0.5,0.5"/>`);
    lines.push(`<line x1="${x2}" y1="${y1}" x2="${x2}" y2="${dy}" stroke="#b91c1c" stroke-width="0.15" stroke-dasharray="0.5,0.5"/>`);
    // Dimension line
    lines.push(`<line x1="${x1}" y1="${dy}" x2="${x2}" y2="${dy}" stroke="#b91c1c" stroke-width="0.25" marker-start="url(#arrow-rev)" marker-end="url(#arrow)"/>`);
    // Label
    const mx = (x1 + x2) / 2;
    lines.push(`<rect x="${mx - 6}" y="${dy - 2.5}" width="12" height="3.5" fill="white"/>`);
    lines.push(`<text x="${mx}" y="${dy}" text-anchor="middle" font-size="2.8" fill="#b91c1c">${label}</text>`);
  } else {
    const dx = x1 + offset;
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${dx}" y2="${y1}" stroke="#b91c1c" stroke-width="0.15" stroke-dasharray="0.5,0.5"/>`);
    lines.push(`<line x1="${x1}" y1="${y2}" x2="${dx}" y2="${y2}" stroke="#b91c1c" stroke-width="0.15" stroke-dasharray="0.5,0.5"/>`);
    lines.push(`<line x1="${dx}" y1="${y1}" x2="${dx}" y2="${y2}" stroke="#b91c1c" stroke-width="0.25" marker-start="url(#arrow-rev)" marker-end="url(#arrow)"/>`);
    const my = (y1 + y2) / 2;
    lines.push(`<rect x="${dx - 6}" y="${my - 2}" width="12" height="3.5" fill="white"/>`);
    lines.push(`<text x="${dx}" y="${my + 0.8}" text-anchor="middle" font-size="2.8" fill="#b91c1c">${label}</text>`);
  }

  return lines.join('\n');
}

// ── Room outline (walls, door, window) ─────────────────────────────

function renderRoomOutline(
  ox: number, oy: number,
  rw: number, rh: number,
  wt: number, sf: number,
  room: RoomData,
  includeDoor: boolean,
  includeWindow: boolean,
): string {
  const lines: string[] = [];

  // Outer wall
  lines.push(`<rect x="${ox}" y="${oy}" width="${rw}" height="${rh}" fill="none" stroke="#1f2937" stroke-width="1.5"/>`);
  // Inner wall
  lines.push(`<rect x="${ox + wt}" y="${oy + wt}" width="${rw - 2 * wt}" height="${rh - 2 * wt}" fill="#fafafa" stroke="#1f2937" stroke-width="0.4"/>`);

  // Wall hatching (top, bottom, left, right)
  // Top wall
  lines.push(`<rect x="${ox}" y="${oy}" width="${rw}" height="${wt}" fill="url(#wall-hatch)" stroke="none"/>`);
  // Bottom wall
  lines.push(`<rect x="${ox}" y="${oy + rh - wt}" width="${rw}" height="${wt}" fill="url(#wall-hatch)" stroke="none"/>`);
  // Left wall
  lines.push(`<rect x="${ox}" y="${oy}" width="${wt}" height="${rh}" fill="url(#wall-hatch)" stroke="none"/>`);
  // Right wall
  lines.push(`<rect x="${ox + rw - wt}" y="${oy}" width="${wt}" height="${rh}" fill="url(#wall-hatch)" stroke="none"/>`);

  if (includeDoor) {
    // Door on left wall, centered vertically
    const doorW = toD(DOOR_WIDTH_MM, sf);
    const doorY = oy + (rh - doorW) / 2;
    // Clear wall for door opening
    lines.push(`<rect x="${ox}" y="${doorY}" width="${wt}" height="${doorW}" fill="white" stroke="none"/>`);
    // Door swing arc
    lines.push(`<path d="M${ox + wt},${doorY} A${doorW},${doorW} 0 0,0 ${ox + wt},${doorY + doorW}" fill="none" stroke="#4b5563" stroke-width="0.3" stroke-dasharray="1,0.5"/>`);
    // Door leaf line
    lines.push(`<line x1="${ox + wt}" y1="${doorY}" x2="${ox + wt + doorW * 0.7}" y2="${doorY + doorW * 0.7}" stroke="#4b5563" stroke-width="0.4"/>`);
  }

  if (includeWindow) {
    // Window on right wall, centered vertically
    const winW = toD(WINDOW_WIDTH_MM, sf);
    const winY = oy + (rh - winW) / 2;
    // Clear wall
    lines.push(`<rect x="${ox + rw - wt}" y="${winY}" width="${wt}" height="${winW}" fill="white" stroke="none"/>`);
    // Window symbol: three parallel lines
    const wx = ox + rw - wt;
    lines.push(`<line x1="${wx}" y1="${winY}" x2="${wx}" y2="${winY + winW}" stroke="#3b82f6" stroke-width="0.8"/>`);
    lines.push(`<line x1="${wx + wt / 2}" y1="${winY}" x2="${wx + wt / 2}" y2="${winY + winW}" stroke="#3b82f6" stroke-width="0.4"/>`);
    lines.push(`<line x1="${wx + wt}" y1="${winY}" x2="${wx + wt}" y2="${winY + winW}" stroke="#3b82f6" stroke-width="0.8"/>`);
  }

  return lines.join('\n');
}

// ── Floor Plan Renderer ────────────────────────────────────────────

function renderFloorPlan(
  room: RoomData, _spec: SpecData | null, metadata: DrawingMetadata,
  ox: number, oy: number, rw: number, rh: number, wt: number, sf: number,
  pw: number, ph: number,
): string {
  const parts: string[] = [];

  // Room outline
  parts.push(renderRoomOutline(ox, oy, rw, rh, wt, sf, room, true, true));

  // Dimension lines
  parts.push(renderDimLine(ox, oy + rh, ox + rw, oy + rh, room.lengthMm, 12, 'h'));
  parts.push(renderDimLine(ox, oy, ox, oy + rh, room.widthMm, -12, 'v'));

  // Room label
  const cx = ox + rw / 2;
  const cy = oy + rh / 2;
  const areaM2 = Math.round((room.lengthMm * room.widthMm) / 1e6 * 100) / 100;
  const typeLabel = room.type.replace(/_/g, ' ').toUpperCase();
  parts.push(`<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="4.5" font-weight="bold" fill="#1f2937">${esc(typeLabel)}</text>`);
  parts.push(`<text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="3" fill="#6b7280">${esc(room.name)}</text>`);
  parts.push(`<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="2.8" fill="#9ca3af">${areaM2} m²</text>`);

  // North arrow
  const nax = pw - MARGIN - 12;
  const nay = MARGIN + 12;
  parts.push(`<g transform="translate(${nax},${nay})">`);
  parts.push(`<line x1="0" y1="8" x2="0" y2="-5" stroke="#374151" stroke-width="0.5" marker-end="url(#arrow)"/>`);
  parts.push(`<text x="0" y="-7" text-anchor="middle" font-size="3" font-weight="bold" fill="#374151">N</text>`);
  parts.push(`</g>`);

  // Title block
  parts.push(renderTitleBlock(pw, ph, metadata.titleBlock ?? {}, 'floor_plan'));

  return parts.join('\n');
}

// ── Furnished Plan Renderer ────────────────────────────────────────

function renderFurnishedPlan(
  room: RoomData, spec: SpecData | null, metadata: DrawingMetadata,
  ox: number, oy: number, rw: number, rh: number, wt: number, sf: number,
  pw: number, ph: number,
): string {
  const parts: string[] = [];

  // Base floor plan (without title block — we add our own)
  parts.push(renderRoomOutline(ox, oy, rw, rh, wt, sf, room, true, true));

  // Dimension lines
  parts.push(renderDimLine(ox, oy + rh, ox + rw, oy + rh, room.lengthMm, 12, 'h'));
  parts.push(renderDimLine(ox, oy, ox, oy + rh, room.widthMm, -12, 'v'));

  // Room label (smaller)
  const cx = ox + rw / 2;
  const cy = oy + rh / 2;
  const typeLabel = room.type.replace(/_/g, ' ').toUpperCase();
  parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" font-size="3" fill="#9ca3af">${esc(typeLabel)}</text>`);

  // Furniture
  const furniture = spec?.furniture ?? [];
  const placed: Rect[] = [];
  const legendItems: string[] = [];

  furniture.forEach((item, i) => {
    const size = getFurnitureSize(item);
    const iw = toD(size.w, sf);
    const id = toD(size.d, sf);
    const pos = resolvePosition(item.position, iw, id, rw, rh, ox, oy, wt, placed, i);
    placed.push({ x: pos.x, y: pos.y, w: iw, h: id });

    const color = getFurnitureColor(item.name);
    const num = i + 1;

    parts.push(`<rect x="${pos.x}" y="${pos.y}" width="${iw}" height="${id}" fill="${color}" stroke="#6b7280" stroke-width="0.4" rx="0.5"/>`);
    // Number label
    parts.push(`<text x="${pos.x + iw / 2}" y="${pos.y + id / 2 + 1}" text-anchor="middle" font-size="2.5" font-weight="bold" fill="#374151">${num}</text>`);

    legendItems.push(`<text x="${MARGIN + 5}" y="${ph - MARGIN - TITLE_BLOCK_H - 5 - (furniture.length - i) * 4}" font-size="2.2" fill="#374151">${num}. ${esc(item.name)}</text>`);
  });

  // Furniture legend
  if (legendItems.length > 0) {
    const ly = ph - MARGIN - TITLE_BLOCK_H - 8 - furniture.length * 4;
    parts.push(`<text x="${MARGIN + 5}" y="${ly}" font-size="2.8" font-weight="bold" fill="#1f2937">FURNITURE SCHEDULE</text>`);
    parts.push(legendItems.join('\n'));
  }

  // Title block
  parts.push(renderTitleBlock(pw, ph, metadata.titleBlock ?? {}, 'furnished_plan'));

  return parts.join('\n');
}

// ── Elevation Renderer ─────────────────────────────────────────────

function renderElevation(
  room: RoomData, spec: SpecData | null, metadata: DrawingMetadata,
  ox: number, oy: number, rw: number, rh: number, wt: number, sf: number,
  pw: number, ph: number,
): string {
  const parts: string[] = [];

  // For elevation, rw = room length, rh = room height (use different scale)
  const elevSf = parseScale(metadata.scale ?? '1:25');
  const elevW = toD(room.lengthMm, elevSf);
  const elevH = toD(room.heightMm, elevSf);
  const elevOx = (pw - elevW) / 2;
  const elevOy = (ph - TITLE_BLOCK_H - MARGIN * 2 - elevH) / 2 + MARGIN;

  // Floor line (thick)
  parts.push(`<line x1="${elevOx - 10}" y1="${elevOy + elevH}" x2="${elevOx + elevW + 10}" y2="${elevOy + elevH}" stroke="#1f2937" stroke-width="1.2"/>`);
  // Floor hatch
  for (let i = 0; i < elevW + 20; i += 3) {
    parts.push(`<line x1="${elevOx - 10 + i}" y1="${elevOy + elevH}" x2="${elevOx - 10 + i - 2}" y2="${elevOy + elevH + 3}" stroke="#9ca3af" stroke-width="0.2"/>`);
  }

  // Wall outline
  parts.push(`<rect x="${elevOx}" y="${elevOy}" width="${elevW}" height="${elevH}" fill="#fafaf9" stroke="#1f2937" stroke-width="1"/>`);

  // Ceiling line
  parts.push(`<line x1="${elevOx - 10}" y1="${elevOy}" x2="${elevOx + elevW + 10}" y2="${elevOy}" stroke="#1f2937" stroke-width="0.6"/>`);

  // Skirting board
  const skirtH = toD(100, elevSf);
  parts.push(`<rect x="${elevOx}" y="${elevOy + elevH - skirtH}" width="${elevW}" height="${skirtH}" fill="#e5e7eb" stroke="#9ca3af" stroke-width="0.3"/>`);

  // Crown molding
  const crownH = toD(60, elevSf);
  parts.push(`<rect x="${elevOx}" y="${elevOy}" width="${elevW}" height="${crownH}" fill="#f3f4f6" stroke="#9ca3af" stroke-width="0.3"/>`);

  // Window (centered, if room typically has one)
  const hasWindow = !['bathroom', 'corridor', 'utility', 'store'].includes(room.type);
  if (hasWindow) {
    const winW = toD(WINDOW_WIDTH_MM, elevSf);
    const winH = toD(WINDOW_HEIGHT_MM, elevSf);
    const winSill = toD(WINDOW_SILL_MM, elevSf);
    const winX = elevOx + (elevW - winW) / 2;
    const winY = elevOy + elevH - winSill - winH;

    parts.push(`<rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="#dbeafe" stroke="#3b82f6" stroke-width="0.5"/>`);
    // Mullion cross
    parts.push(`<line x1="${winX + winW / 2}" y1="${winY}" x2="${winX + winW / 2}" y2="${winY + winH}" stroke="#3b82f6" stroke-width="0.3"/>`);
    parts.push(`<line x1="${winX}" y1="${winY + winH / 2}" x2="${winX + winW}" y2="${winY + winH / 2}" stroke="#3b82f6" stroke-width="0.3"/>`);
    // Sill
    parts.push(`<rect x="${winX - 1}" y="${winY + winH}" width="${winW + 2}" height="${toD(30, elevSf)}" fill="#d4d4d4" stroke="#9ca3af" stroke-width="0.2"/>`);
  }

  // Door (on left side if long wall)
  const doorW = toD(DOOR_WIDTH_MM, elevSf);
  const doorH = toD(DOOR_HEIGHT_MM, elevSf);
  const doorX = elevOx + toD(300, elevSf);
  const doorY = elevOy + elevH - doorH;
  parts.push(`<rect x="${doorX}" y="${doorY}" width="${doorW}" height="${doorH}" fill="#fef3c7" stroke="#92400e" stroke-width="0.5"/>`);
  // Door panels
  const panelMargin = doorW * 0.12;
  const panelW = doorW - panelMargin * 2;
  const panelH = doorH * 0.35;
  parts.push(`<rect x="${doorX + panelMargin}" y="${doorY + doorH * 0.1}" width="${panelW}" height="${panelH}" fill="none" stroke="#b45309" stroke-width="0.3" rx="0.3"/>`);
  parts.push(`<rect x="${doorX + panelMargin}" y="${doorY + doorH * 0.52}" width="${panelW}" height="${panelH}" fill="none" stroke="#b45309" stroke-width="0.3" rx="0.3"/>`);
  // Door handle
  parts.push(`<circle cx="${doorX + doorW - panelMargin - 1}" cy="${doorY + doorH * 0.5}" r="0.8" fill="#92400e"/>`);

  // Dimension lines
  // Horizontal: room length
  parts.push(renderDimLine(elevOx, elevOy + elevH, elevOx + elevW, elevOy + elevH, room.lengthMm, 10, 'h'));
  // Vertical: room height
  parts.push(renderDimLine(elevOx + elevW, elevOy, elevOx + elevW, elevOy + elevH, room.heightMm, 10, 'v'));

  // Wall finish label
  const palette = spec?.colorPalette;
  if (palette && palette.length > 0) {
    const wallColor = palette.find(c => c.usage?.toLowerCase().includes('wall')) ?? palette[0];
    if (wallColor) {
      parts.push(`<rect x="${elevOx + elevW - 30}" y="${elevOy + 8}" width="4" height="4" fill="${wallColor.hex}" stroke="#9ca3af" stroke-width="0.2"/>`);
      parts.push(`<text x="${elevOx + elevW - 24}" y="${elevOy + 11.5}" font-size="2.2" fill="#6b7280">${esc(wallColor.name)}</text>`);
    }
  }

  // Title block
  parts.push(renderTitleBlock(pw, ph, metadata.titleBlock ?? {}, 'elevation'));

  return parts.join('\n');
}

// ── Electrical Layout Renderer ─────────────────────────────────────

function renderElectricalLayout(
  room: RoomData, spec: SpecData | null, metadata: DrawingMetadata,
  ox: number, oy: number, rw: number, rh: number, wt: number, sf: number,
  pw: number, ph: number,
): string {
  const parts: string[] = [];

  // Room outline (thinner walls)
  parts.push(`<rect x="${ox}" y="${oy}" width="${rw}" height="${rh}" fill="#fafafa" stroke="#1f2937" stroke-width="1"/>`);
  parts.push(`<rect x="${ox + wt}" y="${oy + wt}" width="${rw - 2 * wt}" height="${rh - 2 * wt}" fill="white" stroke="#1f2937" stroke-width="0.3"/>`);

  // Door indicator
  const doorW = toD(DOOR_WIDTH_MM, sf);
  const doorY = oy + (rh - doorW) / 2;
  parts.push(`<rect x="${ox}" y="${doorY}" width="${wt}" height="${doorW}" fill="white" stroke="none"/>`);
  parts.push(`<line x1="${ox}" y1="${doorY}" x2="${ox}" y2="${doorY + doorW}" stroke="#4b5563" stroke-width="0.5" stroke-dasharray="1,0.5"/>`);

  // Symbol functions
  const outlet = (x: number, y: number, rot = 0) =>
    `<g transform="translate(${x},${y}) rotate(${rot})">
      <circle cx="0" cy="0" r="1.8" fill="none" stroke="#059669" stroke-width="0.4"/>
      <line x1="-0.7" y1="-0.5" x2="-0.7" y2="0.5" stroke="#059669" stroke-width="0.3"/>
      <line x1="0.7" y1="-0.5" x2="0.7" y2="0.5" stroke="#059669" stroke-width="0.3"/>
    </g>`;

  const switchSym = (x: number, y: number, rot = 0) =>
    `<g transform="translate(${x},${y}) rotate(${rot})">
      <circle cx="0" cy="0" r="1.5" fill="none" stroke="#7c3aed" stroke-width="0.4"/>
      <line x1="0" y1="0" x2="2" y2="-1.5" stroke="#7c3aed" stroke-width="0.3"/>
    </g>`;

  const ceilingLight = (x: number, y: number) =>
    `<g transform="translate(${x},${y})">
      <circle cx="0" cy="0" r="2.5" fill="none" stroke="#d97706" stroke-width="0.4"/>
      <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#d97706" stroke-width="0.3"/>
      <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#d97706" stroke-width="0.3"/>
    </g>`;

  const recessedLight = (x: number, y: number) =>
    `<g transform="translate(${x},${y})">
      <circle cx="0" cy="0" r="2" fill="none" stroke="#d97706" stroke-width="0.4"/>
      <text x="0" y="0.8" text-anchor="middle" font-size="2" fill="#d97706">R</text>
    </g>`;

  const exhaustFan = (x: number, y: number) =>
    `<g transform="translate(${x},${y})">
      <rect x="-2" y="-2" width="4" height="4" fill="none" stroke="#0891b2" stroke-width="0.4"/>
      <circle cx="0" cy="0" r="1.5" fill="none" stroke="#0891b2" stroke-width="0.3"/>
      <text x="0" y="0.7" text-anchor="middle" font-size="1.5" fill="#0891b2">F</text>
    </g>`;

  // Place outlets along walls (every ~1800mm, starting 450mm from corner)
  const outletSpacing = toD(1800, sf);
  const outletOffset = toD(450, sf);

  // Bottom wall outlets
  for (let x = ox + wt + outletOffset; x < ox + rw - wt - 2; x += outletSpacing) {
    parts.push(outlet(x, oy + rh - wt / 2));
  }
  // Top wall outlets
  for (let x = ox + wt + outletOffset; x < ox + rw - wt - 2; x += outletSpacing) {
    parts.push(outlet(x, oy + wt / 2));
  }
  // Right wall outlets
  for (let y = oy + wt + outletOffset; y < oy + rh - wt - 2; y += outletSpacing) {
    parts.push(outlet(ox + rw - wt / 2, y, 90));
  }
  // Left wall outlets (skip door area)
  for (let y = oy + wt + outletOffset; y < oy + rh - wt - 2; y += outletSpacing) {
    if (y > doorY - 2 && y < doorY + doorW + 2) continue;
    parts.push(outlet(ox + wt / 2, y, 90));
  }

  // Switch near door
  parts.push(switchSym(ox + wt + 3, doorY - 3));

  // Ceiling lights based on room type
  const roomCx = ox + rw / 2;
  const roomCy = oy + rh / 2;

  if (room.type === 'kitchen') {
    // Multiple recessed lights
    const spacing = rw / 4;
    for (let i = 1; i <= 3; i++) {
      parts.push(recessedLight(ox + spacing * i, roomCy));
    }
    // Under-cabinet lighting indicator (dashed line along top wall)
    parts.push(`<line x1="${ox + wt + 5}" y1="${oy + wt + 6}" x2="${ox + rw - wt - 5}" y2="${oy + wt + 6}" stroke="#d97706" stroke-width="0.3" stroke-dasharray="2,1"/>`);
    parts.push(`<text x="${ox + rw / 2}" y="${oy + wt + 4}" text-anchor="middle" font-size="1.8" fill="#d97706">under-cabinet lighting</text>`);
  } else if (room.type === 'bathroom') {
    parts.push(recessedLight(roomCx, roomCy));
    parts.push(exhaustFan(ox + rw - wt - 5, oy + wt + 5));
    // Extra GFCI outlet near vanity
    parts.push(outlet(ox + rw / 3, oy + wt / 2));
  } else if (room.type === 'living_room' || room.type === 'dining') {
    // Central pendant/chandelier + recessed perimeter
    parts.push(ceilingLight(roomCx, roomCy));
    parts.push(recessedLight(ox + rw * 0.25, oy + rh * 0.25));
    parts.push(recessedLight(ox + rw * 0.75, oy + rh * 0.25));
    parts.push(recessedLight(ox + rw * 0.25, oy + rh * 0.75));
    parts.push(recessedLight(ox + rw * 0.75, oy + rh * 0.75));
  } else {
    // Default: single ceiling light
    parts.push(ceilingLight(roomCx, roomCy));
  }

  // Wiring runs (dashed lines connecting fixtures to switch)
  const switchX = ox + wt + 3;
  const switchY = doorY - 3;
  parts.push(`<line x1="${switchX}" y1="${switchY}" x2="${roomCx}" y2="${roomCy}" stroke="#d97706" stroke-width="0.2" stroke-dasharray="1.5,1"/>`);

  // Legend
  const lx = MARGIN + 5;
  const ly = ph - MARGIN - TITLE_BLOCK_H - 30;
  parts.push(`<rect x="${lx - 2}" y="${ly - 5}" width="45" height="28" fill="white" stroke="#d1d5db" stroke-width="0.3" rx="1"/>`);
  parts.push(`<text x="${lx}" y="${ly}" font-size="2.8" font-weight="bold" fill="#1f2937">LEGEND</text>`);
  parts.push(outlet(lx + 2, ly + 5));
  parts.push(`<text x="${lx + 6}" y="${ly + 5.8}" font-size="2" fill="#374151">Duplex Outlet</text>`);
  parts.push(switchSym(lx + 2, ly + 10));
  parts.push(`<text x="${lx + 6}" y="${ly + 10.8}" font-size="2" fill="#374151">Light Switch</text>`);
  parts.push(ceilingLight(lx + 2, ly + 15));
  parts.push(`<text x="${lx + 6}" y="${ly + 15.8}" font-size="2" fill="#374151">Ceiling Light</text>`);
  parts.push(recessedLight(lx + 2, ly + 20));
  parts.push(`<text x="${lx + 6}" y="${ly + 20.8}" font-size="2" fill="#374151">Recessed Light</text>`);

  // Room label
  const typeLabel = room.type.replace(/_/g, ' ').toUpperCase();
  parts.push(`<text x="${roomCx}" y="${oy + rh - wt - 3}" text-anchor="middle" font-size="3" fill="#9ca3af">${esc(typeLabel)}</text>`);

  // Title block
  parts.push(renderTitleBlock(pw, ph, metadata.titleBlock ?? {}, 'electrical_layout'));

  return parts.join('\n');
}

// ── Main Entry ─────────────────────────────────────────────────────

export function generateSvg(
  drawingType: string,
  room: RoomData,
  spec: SpecData | null,
  metadata: DrawingMetadata,
): string {
  const paper = PAPER_SIZES[metadata.paperSize ?? 'A2'] ?? PAPER_SIZES.A2;
  const pw = paper.w;
  const ph = paper.h;

  // Use elevation-appropriate scale for elevation drawings
  const isElevation = drawingType === 'elevation' || drawingType === 'section';
  const defaultScale = isElevation ? '1:25' : '1:50';
  const sf = parseScale(metadata.scale ?? defaultScale);

  const wt = toD(WALL_THICKNESS_MM, sf);
  const rw = toD(room.lengthMm, sf);
  const rh = toD(room.widthMm, sf);

  // Available area
  const availW = pw - MARGIN * 2;
  const availH = ph - MARGIN * 2 - TITLE_BLOCK_H - 5;

  // Center room in available area
  const ox = MARGIN + (availW - rw) / 2;
  const oy = MARGIN + (availH - rh) / 2;

  let content: string;

  switch (drawingType) {
    case 'floor_plan':
      content = renderFloorPlan(room, spec, metadata, ox, oy, rw, rh, wt, sf, pw, ph);
      break;
    case 'furnished_plan':
      content = renderFurnishedPlan(room, spec, metadata, ox, oy, rw, rh, wt, sf, pw, ph);
      break;
    case 'elevation':
    case 'section':
      content = renderElevation(room, spec, metadata, ox, oy, rw, rh, wt, sf, pw, ph);
      break;
    case 'electrical_layout':
      content = renderElectricalLayout(room, spec, metadata, ox, oy, rw, rh, wt, sf, pw, ph);
      break;
    default:
      // For unsupported types, render a basic floor plan
      content = renderFloorPlan(room, spec, metadata, ox, oy, rw, rh, wt, sf, pw, ph);
      break;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pw} ${ph}"
  width="${pw}mm" height="${ph}mm"
  font-family="'Helvetica Neue', Arial, sans-serif">
${svgDefs()}
${renderBorder(pw, ph)}
${content}
</svg>`;
}
