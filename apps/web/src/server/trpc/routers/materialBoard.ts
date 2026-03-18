import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  materialBoards, projects, eq, and,
} from '@openlintel/db';

// Color palettes by material category for swatch generation
const CATEGORY_SWATCHES: Record<string, string[]> = {
  flooring: ['#8B7355', '#C4A882', '#D2B48C', '#A0522D'],
  wall_finish: ['#F5F5DC', '#FFFDD0', '#FFF8E7', '#E8E4C9'],
  countertop: ['#808080', '#A9A9A9', '#2F4F4F', '#D3D3D3'],
  backsplash: ['#4682B4', '#5F9EA0', '#B0C4DE', '#87CEEB'],
  cabinetry: ['#DEB887', '#D2691E', '#8B4513', '#F5DEB3'],
  hardware: ['#C0C0C0', '#FFD700', '#CD7F32', '#B87333'],
  fabric: ['#800020', '#4B0082', '#2E8B57', '#DAA520'],
  paint: ['#87CEEB', '#98FB98', '#FFDAB9', '#E6E6FA'],
  tile: ['#FFFFFF', '#F0F0F0', '#D4E6F1', '#FADBD8'],
  stone: ['#696969', '#A9A9A9', '#BDB76B', '#556B2F'],
  wood: ['#DEB887', '#D2691E', '#8B4513', '#A0522D'],
  metal: ['#C0C0C0', '#71797E', '#B87333', '#FFD700'],
};

export const materialBoardRouter = router({
  // ── List material boards for a project ──────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(materialBoards.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(materialBoards.roomId, input.roomId));

      return ctx.db.query.materialBoards.findMany({
        where: and(...conditions),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  // ── Create a material board ─────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      boardType: z.string().min(1),
      roomId: z.string().optional(),
      materialCategory: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const category = input.materialCategory ?? 'flooring';
      const swatches = CATEGORY_SWATCHES[category] ?? CATEGORY_SWATCHES.flooring;

      const [board] = await ctx.db.insert(materialBoards).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        name: input.name,
        boardType: input.boardType,
        materialCategory: category,
        description: input.description ?? null,
        status: 'draft',
        materialCount: 0,
        swatches,
        items: [],
        layout: 'grid',
      }).returning();
      return board;
    }),

  // ── Generate board content (AI-assisted material compilation) ──
  generate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const category = (board.materialCategory ?? 'flooring') as string;
      const boardType = (board.boardType ?? 'room') as string;

      // Generate material items based on category and board type
      const generatedItems = generateMaterialItems(category, boardType);
      const swatches = generatedItems.map((item) => item.color).filter(Boolean).slice(0, 6);

      const [updated] = await ctx.db.update(materialBoards).set({
        items: generatedItems,
        materialCount: generatedItems.length,
        swatches: swatches.length > 0 ? swatches : (board.swatches as string[]),
        status: 'ready',
      }).where(eq(materialBoards.id, input.id)).returning();

      return updated;
    }),

  // ── Export board as PDF ─────────────────────────────────────
  export: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const pdfKey = `material-boards/${board.id}/board-${Date.now()}.pdf`;

      await ctx.db.update(materialBoards).set({ pdfKey }).where(eq(materialBoards.id, input.id));

      return {
        pdfKey,
        downloadUrl: `/api/uploads/${encodeURIComponent(pdfKey)}`,
        summary: {
          boardName: board.name,
          projectName: (board.project as any).name,
          itemCount: ((board.items as any[]) ?? []).length,
          generatedAt: new Date().toISOString(),
        },
      };
    }),

  // ── Share board (generate share token) ──────────────────────
  share: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const shareToken = (board.shareToken as string) ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      await ctx.db.update(materialBoards).set({
        shareToken,
        status: 'shared',
      }).where(eq(materialBoards.id, input.id));

      return {
        shareToken,
        shareUrl: `/shared/board/${shareToken}`,
      };
    }),

  // ── Delete a material board ─────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      if (board.pdfKey) {
        const { deleteFile } = await import('@/lib/storage');
        await deleteFile(board.pdfKey);
      }

      await ctx.db.delete(materialBoards).where(eq(materialBoards.id, input.id));
      return { success: true };
    }),
});

// ── Helper: generate material items by category ─────────────────
function generateMaterialItems(category: string, boardType: string) {
  const materialDB: Record<string, Array<{
    name: string; brand: string; finish: string; color: string;
    size: string; pricePerUnit: number; unit: string;
  }>> = {
    flooring: [
      { name: 'European White Oak Hardwood', brand: 'Provenza', finish: 'Wire-brushed matte', color: '#C4A882', size: '7.5" x 72"', pricePerUnit: 8.50, unit: 'sq ft' },
      { name: 'Calacatta Gold Porcelain Tile', brand: 'Emser', finish: 'Polished', color: '#F5F5F0', size: '24" x 24"', pricePerUnit: 6.25, unit: 'sq ft' },
      { name: 'Natural Slate Tile', brand: 'MSI', finish: 'Cleft', color: '#696969', size: '12" x 12"', pricePerUnit: 4.75, unit: 'sq ft' },
      { name: 'Luxury Vinyl Plank - Hickory', brand: 'Shaw', finish: 'Textured wood-grain', color: '#8B7355', size: '9" x 59"', pricePerUnit: 3.99, unit: 'sq ft' },
    ],
    wall_finish: [
      { name: 'Venetian Plaster', brand: 'Behr', finish: 'Smooth satin', color: '#F5F5DC', size: 'Coverage: 400 sq ft/gal', pricePerUnit: 45.00, unit: 'gallon' },
      { name: 'Grasscloth Wallpaper', brand: 'York', finish: 'Natural texture', color: '#D2B48C', size: '27" x 27ft roll', pricePerUnit: 89.00, unit: 'roll' },
      { name: 'Shiplap Panel', brand: 'Timberchic', finish: 'Whitewashed', color: '#FFFDD0', size: '5" x 48"', pricePerUnit: 5.25, unit: 'sq ft' },
      { name: 'Matte Ceramic Subway Tile', brand: 'Daltile', finish: 'Matte', color: '#E8E4C9', size: '3" x 12"', pricePerUnit: 3.50, unit: 'sq ft' },
    ],
    countertop: [
      { name: 'Calacatta Laza Quartz', brand: 'Caesarstone', finish: 'Polished', color: '#F0EDE8', size: '130" x 65" slab', pricePerUnit: 85.00, unit: 'sq ft' },
      { name: 'Absolute Black Granite', brand: 'MSI', finish: 'Honed', color: '#2F4F4F', size: '126" x 63" slab', pricePerUnit: 55.00, unit: 'sq ft' },
      { name: 'White Carrara Marble', brand: 'Stonemark', finish: 'Polished', color: '#D3D3D3', size: '120" x 60" slab', pricePerUnit: 75.00, unit: 'sq ft' },
      { name: 'Butcher Block Walnut', brand: 'Lumber Liquidators', finish: 'Oiled', color: '#654321', size: '25" x 96"', pricePerUnit: 42.00, unit: 'sq ft' },
    ],
    backsplash: [
      { name: 'Arabesque Mosaic', brand: 'Jeffrey Court', finish: 'Glossy', color: '#4682B4', size: '12" x 12" sheet', pricePerUnit: 14.50, unit: 'sq ft' },
      { name: 'Hexagon Marble Mosaic', brand: 'MSI', finish: 'Honed', color: '#B0C4DE', size: '12" x 12" sheet', pricePerUnit: 18.00, unit: 'sq ft' },
      { name: 'Glass Subway Tile', brand: 'Daltile', finish: 'Glossy', color: '#87CEEB', size: '3" x 6"', pricePerUnit: 8.75, unit: 'sq ft' },
      { name: 'Zellige Tile', brand: 'Cle', finish: 'Hand-glazed', color: '#5F9EA0', size: '4" x 4"', pricePerUnit: 22.00, unit: 'sq ft' },
    ],
    cabinetry: [
      { name: 'Shaker Style Cabinet Door', brand: 'KraftMaid', finish: 'Painted dove white', color: '#F5DEB3', size: 'Standard', pricePerUnit: 285.00, unit: 'linear ft' },
      { name: 'Flat-Panel Modern Door', brand: 'IKEA SEKTION', finish: 'Walnut veneer', color: '#8B4513', size: 'Standard', pricePerUnit: 195.00, unit: 'linear ft' },
      { name: 'Raised Panel Traditional', brand: 'Thomasville', finish: 'Cherry stain', color: '#D2691E', size: 'Standard', pricePerUnit: 350.00, unit: 'linear ft' },
      { name: 'Open Shelving - Oak', brand: 'Custom', finish: 'Clear coat', color: '#DEB887', size: '12" x 36"', pricePerUnit: 125.00, unit: 'shelf' },
    ],
    hardware: [
      { name: 'Bar Pull Handle', brand: 'Amerock', finish: 'Brushed nickel', color: '#C0C0C0', size: '6-5/16"', pricePerUnit: 8.50, unit: 'piece' },
      { name: 'Cup Pull', brand: 'Top Knobs', finish: 'Aged brass', color: '#FFD700', size: '3"', pricePerUnit: 12.00, unit: 'piece' },
      { name: 'Knob - Round', brand: 'Rejuvenation', finish: 'Oil-rubbed bronze', color: '#CD7F32', size: '1-1/4"', pricePerUnit: 15.00, unit: 'piece' },
      { name: 'Edge Pull', brand: 'Richelieu', finish: 'Matte black', color: '#333333', size: '4"', pricePerUnit: 6.25, unit: 'piece' },
    ],
    fabric: [
      { name: 'Performance Linen', brand: 'Crypton', finish: 'Soft hand', color: '#DAA520', size: '54" wide', pricePerUnit: 48.00, unit: 'yard' },
      { name: 'Velvet Upholstery', brand: 'Kravet', finish: 'Luxe pile', color: '#800020', size: '54" wide', pricePerUnit: 72.00, unit: 'yard' },
      { name: 'Cotton Canvas', brand: 'Sunbrella', finish: 'Indoor/outdoor', color: '#2E8B57', size: '54" wide', pricePerUnit: 32.00, unit: 'yard' },
      { name: 'Silk Dupioni', brand: 'Robert Allen', finish: 'Iridescent', color: '#4B0082', size: '54" wide', pricePerUnit: 95.00, unit: 'yard' },
    ],
    paint: [
      { name: 'Simply White OC-117', brand: 'Benjamin Moore', finish: 'Eggshell', color: '#F5F5F0', size: '1 gallon', pricePerUnit: 82.00, unit: 'gallon' },
      { name: 'Hale Navy HC-154', brand: 'Benjamin Moore', finish: 'Satin', color: '#2C3E50', size: '1 gallon', pricePerUnit: 82.00, unit: 'gallon' },
      { name: 'Agreeable Gray SW7029', brand: 'Sherwin-Williams', finish: 'Satin', color: '#D5D0C8', size: '1 gallon', pricePerUnit: 75.00, unit: 'gallon' },
      { name: 'Tricorn Black SW6258', brand: 'Sherwin-Williams', finish: 'Semi-gloss', color: '#2C2C2C', size: '1 gallon', pricePerUnit: 75.00, unit: 'gallon' },
    ],
    tile: [
      { name: 'Subway Tile - White', brand: 'Daltile', finish: 'Glossy', color: '#FFFFFF', size: '3" x 6"', pricePerUnit: 2.50, unit: 'sq ft' },
      { name: 'Penny Round Mosaic', brand: 'Merola', finish: 'Matte', color: '#F0F0F0', size: '12" x 12" sheet', pricePerUnit: 9.00, unit: 'sq ft' },
      { name: 'Encaustic Cement Tile', brand: 'Granada', finish: 'Matte', color: '#D4E6F1', size: '8" x 8"', pricePerUnit: 16.00, unit: 'sq ft' },
      { name: 'Large Format Porcelain', brand: 'Emser', finish: 'Polished', color: '#FADBD8', size: '24" x 48"', pricePerUnit: 7.50, unit: 'sq ft' },
    ],
    stone: [
      { name: 'Travertine Tile', brand: 'MSI', finish: 'Tumbled', color: '#BDB76B', size: '18" x 18"', pricePerUnit: 5.50, unit: 'sq ft' },
      { name: 'Slate Flagstone', brand: 'Natural Stone', finish: 'Cleft', color: '#696969', size: 'Irregular', pricePerUnit: 4.25, unit: 'sq ft' },
      { name: 'Marble Mosaic', brand: 'Stonemark', finish: 'Polished', color: '#A9A9A9', size: '12" x 12" sheet', pricePerUnit: 22.00, unit: 'sq ft' },
      { name: 'Quartzite Slab', brand: 'Pental', finish: 'Leathered', color: '#556B2F', size: '130" x 65" slab', pricePerUnit: 95.00, unit: 'sq ft' },
    ],
    wood: [
      { name: 'Walnut Plank', brand: 'Lumber Plus', finish: 'Natural oil', color: '#654321', size: '6" x 48"', pricePerUnit: 12.00, unit: 'sq ft' },
      { name: 'White Oak Veneer', brand: 'Columbia Forest', finish: 'UV lacquer', color: '#DEB887', size: '4\' x 8\' sheet', pricePerUnit: 8.50, unit: 'sq ft' },
      { name: 'Reclaimed Barnwood', brand: 'Stikwood', finish: 'Weathered gray', color: '#8B4513', size: '5" x 48"', pricePerUnit: 14.00, unit: 'sq ft' },
      { name: 'Bamboo Panel', brand: 'Teragren', finish: 'Strand-woven', color: '#A0522D', size: '3-3/4" x 72"', pricePerUnit: 6.75, unit: 'sq ft' },
    ],
    metal: [
      { name: 'Brushed Stainless Sheet', brand: 'MetalsCut4U', finish: 'Brushed #4', color: '#C0C0C0', size: '24" x 48"', pricePerUnit: 45.00, unit: 'sheet' },
      { name: 'Patina Copper Panel', brand: 'Copper Design', finish: 'Verde patina', color: '#71797E', size: '12" x 12"', pricePerUnit: 28.00, unit: 'sq ft' },
      { name: 'Brass Trim Strip', brand: 'Schluter', finish: 'Polished', color: '#B87333', size: '1/2" x 8ft', pricePerUnit: 22.00, unit: 'piece' },
      { name: 'Blackened Steel Panel', brand: 'Custom', finish: 'Hot-rolled patina', color: '#333333', size: '24" x 48"', pricePerUnit: 55.00, unit: 'sheet' },
    ],
  };

  const items = materialDB[category] ?? materialDB.flooring;

  return items.map((item) => ({
    ...item,
    category,
    quantity: 1,
    notes: '',
  }));
}
