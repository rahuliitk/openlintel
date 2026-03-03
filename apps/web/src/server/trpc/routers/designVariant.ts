import { z } from 'zod';
import { designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Inline design spec generation helpers
// ---------------------------------------------------------------------------

const FURNITURE_BY_ROOM: Record<string, Array<{ name: string; defaultMaterial: string }>> = {
  bedroom: [
    { name: 'Queen Bed', defaultMaterial: 'Solid Wood' },
    { name: 'Wardrobe', defaultMaterial: 'MDF + Laminate' },
    { name: 'Bedside Table', defaultMaterial: 'Engineered Wood' },
    { name: 'Dresser', defaultMaterial: 'Plywood + Veneer' },
    { name: 'Study Desk', defaultMaterial: 'Plywood + Laminate' },
    { name: 'Desk Chair', defaultMaterial: 'Fabric + Metal' },
  ],
  living_room: [
    { name: '3-Seater Sofa', defaultMaterial: 'Fabric Upholstery' },
    { name: 'Coffee Table', defaultMaterial: 'Solid Wood + Glass' },
    { name: 'TV Unit', defaultMaterial: 'MDF + Laminate' },
    { name: 'Bookshelf', defaultMaterial: 'Plywood + Veneer' },
    { name: 'Accent Chair', defaultMaterial: 'Fabric + Metal' },
    { name: 'Side Table', defaultMaterial: 'Solid Wood' },
  ],
  kitchen: [
    { name: 'Base Cabinets', defaultMaterial: 'Marine Plywood + Laminate' },
    { name: 'Wall Cabinets', defaultMaterial: 'Marine Plywood + Laminate' },
    { name: 'Tall Unit', defaultMaterial: 'Marine Plywood + Laminate' },
    { name: 'Countertop', defaultMaterial: 'Quartz' },
    { name: 'Breakfast Bar', defaultMaterial: 'Solid Wood + Stone' },
    { name: 'Bar Stool', defaultMaterial: 'Metal + Cushion' },
  ],
  bathroom: [
    { name: 'Vanity Unit', defaultMaterial: 'Marine Plywood + Corian' },
    { name: 'Mirror Cabinet', defaultMaterial: 'Glass + Aluminium' },
    { name: 'Shower Enclosure', defaultMaterial: 'Tempered Glass + SS' },
    { name: 'Towel Rack', defaultMaterial: 'Stainless Steel' },
  ],
  dining_room: [
    { name: 'Dining Table (6-seater)', defaultMaterial: 'Solid Wood' },
    { name: 'Dining Chairs (6)', defaultMaterial: 'Solid Wood + Fabric' },
    { name: 'Buffet / Sideboard', defaultMaterial: 'Plywood + Veneer' },
    { name: 'Crockery Unit', defaultMaterial: 'MDF + Glass' },
  ],
};

const PALETTES_BY_STYLE: Record<string, string[]> = {
  modern: ['#2C3E50', '#ECF0F1', '#3498DB', '#E74C3C', '#1ABC9C'],
  minimalist: ['#FFFFFF', '#F5F5F5', '#333333', '#B0B0B0', '#E0E0E0'],
  scandinavian: ['#F4F0EC', '#D4C4B0', '#8B7355', '#5B8C5A', '#FAFAFA'],
  industrial: ['#2F2F2F', '#8B8B8B', '#C0392B', '#F39C12', '#ECF0F1'],
  traditional: ['#8B4513', '#DEB887', '#FFFFF0', '#D4AF37', '#4A4A4A'],
  contemporary: ['#FAFAFA', '#1A1A2E', '#16213E', '#0F3460', '#E94560'],
  bohemian: ['#C0392B', '#F39C12', '#1ABC9C', '#8E44AD', '#FDE3A7'],
  japandi: ['#F5F0E8', '#D4C4A8', '#7C6A5B', '#4A5859', '#E8DDD0'],
};

const MATERIAL_SUGGESTIONS_BY_STYLE: Record<string, string[]> = {
  modern: ['Lacquered MDF', 'Tempered Glass', 'Stainless Steel', 'Polished Concrete'],
  minimalist: ['White Laminate', 'Light Oak Veneer', 'Matte Metal', 'Clear Glass'],
  scandinavian: ['Light Birch Plywood', 'Wool Fabric', 'Matte White Laminate', 'Natural Linen'],
  industrial: ['Exposed Brick', 'Raw Steel', 'Reclaimed Wood', 'Concrete Finish Laminate'],
  traditional: ['Solid Teak', 'Marble', 'Silk Fabric', 'Brass Hardware'],
  contemporary: ['High-Gloss Laminate', 'Engineered Stone', 'Brushed Aluminium', 'Leather'],
  bohemian: ['Rattan', 'Macramé Cotton', 'Terracotta', 'Recycled Wood'],
  japandi: ['Light Ash Wood', 'Washi Paper', 'Natural Stone', 'Linen Fabric'],
};

function generateDesignSpec(
  roomType: string,
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  style: string,
  budgetTier: string,
  constraints: string[],
) {
  const lengthM = lengthMm / 1000;
  const widthM = widthMm / 1000;
  const areaSqm = lengthM * widthM;

  const baseFurniture = FURNITURE_BY_ROOM[roomType] ?? FURNITURE_BY_ROOM['living_room']!;
  const palette = PALETTES_BY_STYLE[style] ?? PALETTES_BY_STYLE['modern']!;
  const materials = MATERIAL_SUGGESTIONS_BY_STYLE[style] ?? MATERIAL_SUGGESTIONS_BY_STYLE['modern']!;

  // Place furniture items along the perimeter with sensible positions
  const furnitureItems = baseFurniture.map((item, idx) => {
    // Distribute items around the room
    const angle = (idx / baseFurniture.length) * 2 * Math.PI;
    const xOffset = Math.cos(angle) * (lengthM * 0.35);
    const yOffset = Math.sin(angle) * (widthM * 0.35);
    const posX = Math.round((lengthM / 2 + xOffset) * 1000);
    const posY = Math.round((widthM / 2 + yOffset) * 1000);

    return {
      name: item.name,
      material: item.defaultMaterial,
      position: { xMm: posX, yMm: posY },
      notes: budgetTier === 'luxury' || budgetTier === 'premium'
        ? `Premium ${item.defaultMaterial} finish`
        : `Standard ${item.defaultMaterial}`,
    };
  });

  // Layout description based on room type and dimensions
  const layoutDescriptions: Record<string, string> = {
    bedroom: `L-shaped layout with bed centered on the longest wall. Wardrobe opposite the window wall. Study zone near natural light source. Clear walkway of 915 mm maintained on all circulation paths.`,
    living_room: `Open layout with sofa facing the focal wall (TV unit). Coffee table centered in the conversation zone. Bookshelf along the secondary wall. Accent chair positioned for cross-conversation.`,
    kitchen: `Work-triangle optimized layout. Base cabinets along the primary wall, wall cabinets above. Tall unit at the corner. Breakfast bar as a divider if space permits (${areaSqm > 10 ? 'included' : 'omitted due to limited area'}).`,
    bathroom: `Wet and dry zones separated. Vanity near the entrance, shower enclosure at the far end. Mirror cabinet above vanity with concealed lighting.`,
    dining_room: `Dining table centered in the room with 915 mm chair pull-back clearance on all sides. Sideboard along the serving wall. Crockery unit adjacent.`,
  };

  return {
    roomType,
    dimensions: { lengthMm, widthMm, heightMm, areaSqm: Math.round(areaSqm * 100) / 100 },
    style,
    budgetTier,
    furniture: furnitureItems,
    colorPalette: palette,
    materialSuggestions: materials,
    layoutDescription: layoutDescriptions[roomType] ?? `Optimized layout for a ${areaSqm.toFixed(1)} sqm ${roomType} room in ${style} style. Furniture arranged to maximize circulation space while maintaining visual balance.`,
    constraints: constraints.length > 0 ? constraints : ['None specified'],
    generatedAt: new Date().toISOString(),
  };
}

export const designVariantRouter = router({
  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      return ctx.db.query.designVariants.findMany({
        where: eq(designVariants.roomId, input.roomId),
        orderBy: (dv, { desc }) => [desc(dv.createdAt)],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { rooms: { with: { designVariants: true } } },
      });
      if (!project) throw new Error('Project not found');

      // Flatten all variants across rooms, attaching room info
      return project.rooms.flatMap((room) =>
        room.designVariants.map((variant) => ({
          ...variant,
          roomName: room.name,
          roomId: room.id,
        })),
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        name: z.string().min(1).max(200),
        style: z.string().min(1),
        budgetTier: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      const [variant] = await ctx.db.insert(designVariants).values(input).returning();
      if (!variant) throw new Error('Failed to create design variant');
      return variant;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        style: z.string().optional(),
        budgetTier: z.string().optional(),
        renderUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, id),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      const [updated] = await ctx.db
        .update(designVariants)
        .set(data)
        .where(eq(designVariants.id, id))
        .returning();
      if (!updated) throw new Error('Failed to update design variant');
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      await ctx.db.delete(designVariants).where(eq(designVariants.id, input.id));
      return { success: true };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        designVariantId: z.string(),
        style: z.string().min(1),
        budgetTier: z.string().min(1),
        constraints: z.array(z.string()).optional(),
        additionalPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      // Update variant with generation parameters
      await ctx.db
        .update(designVariants)
        .set({
          style: input.style,
          budgetTier: input.budgetTier,
          constraints: input.constraints ?? [],
        })
        .where(eq(designVariants.id, input.designVariantId));

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'design_generation',
          status: 'pending',
          inputJson: {
            designVariantId: input.designVariantId,
            style: input.style,
            budgetTier: input.budgetTier,
            constraints: input.constraints,
            additionalPrompt: input.additionalPrompt,
          },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Update variant with job reference
      await ctx.db
        .update(designVariants)
        .set({ jobId: job.id })
        .where(eq(designVariants.id, input.designVariantId));

      // --- Inline design generation (replaces external microservice call) ---

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      // Generate design specification
      const spec = generateDesignSpec(
        variant.room.type,
        variant.room.lengthMm ?? 0,
        variant.room.widthMm ?? 0,
        variant.room.heightMm ?? 2700,
        input.style,
        input.budgetTier,
        input.constraints ?? [],
      );

      // Store the spec on the design variant
      await ctx.db
        .update(designVariants)
        .set({ specJson: spec })
        .where(eq(designVariants.id, input.designVariantId));

      // Mark job as completed
      await ctx.db
        .update(jobs)
        .set({
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          outputJson: {
            designVariantId: input.designVariantId,
            furnitureCount: spec.furniture.length,
            colorCount: spec.colorPalette.length,
            areaSqm: spec.dimensions.areaSqm,
          },
        })
        .where(eq(jobs.id, job.id));

      return job;
    }),
});
