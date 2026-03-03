import { z } from 'zod';
import { bomResults, designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { DEFAULT_WASTE_FACTORS } from '@openlintel/config';

// ---------------------------------------------------------------------------
// Inline BOM generation helpers
// ---------------------------------------------------------------------------

const BUDGET_MULTIPLIERS: Record<string, number> = {
  economy: 0.6,
  mid_range: 1.0,
  premium: 1.5,
  luxury: 2.5,
};

interface BOMItem {
  name: string;
  category: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  wasteFactor: number;
  total: number;
}

function generateBOMItems(
  roomType: string,
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  style: string,
  budgetTier: string,
): BOMItem[] {
  const areaSqm = (lengthMm * widthMm) / 1e6;
  const perimeterM = 2 * (lengthMm + widthMm) / 1000;
  const wallAreaSqm = perimeterM * (heightMm / 1000);
  const multiplier = BUDGET_MULTIPLIERS[budgetTier] ?? 1.0;

  const items: BOMItem[] = [];

  // ---------- Flooring ----------
  const flooringWaste = DEFAULT_WASTE_FACTORS.tiles_straight;
  const flooringSpec = style === 'industrial'
    ? 'Polished Concrete Finish Tiles 600x600mm'
    : style === 'scandinavian'
      ? 'Light Oak Engineered Wood Planks 190x1200mm'
      : style === 'traditional'
        ? 'Italian Marble Tiles 800x800mm'
        : 'Vitrified Floor Tiles 600x600mm';
  const flooringUnitPrice = Math.round(
    (style === 'traditional' ? 85 : style === 'scandinavian' ? 55 : 35) * multiplier * 100,
  ) / 100;
  const flooringQty = Math.ceil(areaSqm * (1 + flooringWaste));

  items.push({
    name: 'Floor Tiles / Planks',
    category: 'Flooring',
    specification: flooringSpec,
    quantity: flooringQty,
    unit: 'sqm',
    unitPrice: flooringUnitPrice,
    wasteFactor: flooringWaste,
    total: Math.round(flooringQty * flooringUnitPrice * 100) / 100,
  });

  // Flooring adhesive
  const adhesiveQty = Math.ceil(areaSqm * 0.4);
  const adhesivePrice = Math.round(12 * multiplier * 100) / 100;
  items.push({
    name: 'Tile Adhesive',
    category: 'Flooring',
    specification: 'Cement-based tile adhesive, 20kg bags',
    quantity: adhesiveQty,
    unit: 'bags',
    unitPrice: adhesivePrice,
    wasteFactor: 0.05,
    total: Math.round(adhesiveQty * adhesivePrice * 100) / 100,
  });

  // ---------- Paint & Finishes ----------
  const paintWaste = DEFAULT_WASTE_FACTORS.paint;
  // 1 litre covers ~12 sqm, 2 coats
  const paintLitres = Math.ceil((wallAreaSqm * 2) / 12 * (1 + paintWaste));
  const paintPrice = Math.round(18 * multiplier * 100) / 100;

  items.push({
    name: 'Wall Paint',
    category: 'Paint & Finishes',
    specification: `Premium Emulsion Paint - ${style === 'minimalist' ? 'Matt White' : style === 'industrial' ? 'Charcoal Grey' : 'Custom Shade'}`,
    quantity: paintLitres,
    unit: 'litres',
    unitPrice: paintPrice,
    wasteFactor: paintWaste,
    total: Math.round(paintLitres * paintPrice * 100) / 100,
  });

  // Primer
  const primerLitres = Math.ceil(wallAreaSqm / 14 * (1 + paintWaste));
  const primerPrice = Math.round(14 * multiplier * 100) / 100;
  items.push({
    name: 'Wall Primer',
    category: 'Paint & Finishes',
    specification: 'Water-based acrylic wall primer',
    quantity: primerLitres,
    unit: 'litres',
    unitPrice: primerPrice,
    wasteFactor: paintWaste,
    total: Math.round(primerLitres * primerPrice * 100) / 100,
  });

  // ---------- Furniture (room-type specific) ----------
  const furnitureItems = getFurnitureForRoom(roomType, style, multiplier);
  items.push(...furnitureItems);

  // ---------- Fixtures ----------
  const fixtureItems = getFixturesForRoom(roomType, multiplier);
  items.push(...fixtureItems);

  // ---------- Hardware ----------
  items.push({
    name: 'Cabinet Hinges',
    category: 'Hardware',
    specification: 'Soft-close concealed hinges, 110deg',
    quantity: roomType === 'kitchen' ? 24 : roomType === 'bedroom' ? 12 : 6,
    unit: 'pcs',
    unitPrice: Math.round(4.5 * multiplier * 100) / 100,
    wasteFactor: 0,
    total: 0, // filled below
  });
  items[items.length - 1]!.total = Math.round(
    items[items.length - 1]!.quantity * items[items.length - 1]!.unitPrice * 100,
  ) / 100;

  items.push({
    name: 'Drawer Slides',
    category: 'Hardware',
    specification: 'Full-extension ball-bearing slides, 450mm',
    quantity: roomType === 'kitchen' ? 12 : roomType === 'bedroom' ? 6 : 4,
    unit: 'pairs',
    unitPrice: Math.round(8 * multiplier * 100) / 100,
    wasteFactor: 0,
    total: 0,
  });
  items[items.length - 1]!.total = Math.round(
    items[items.length - 1]!.quantity * items[items.length - 1]!.unitPrice * 100,
  ) / 100;

  items.push({
    name: 'Cabinet Handles',
    category: 'Hardware',
    specification: style === 'modern' ? 'Profile / J-pull aluminium handles' : 'Brass bar handles 160mm',
    quantity: roomType === 'kitchen' ? 20 : roomType === 'bedroom' ? 10 : 8,
    unit: 'pcs',
    unitPrice: Math.round(6 * multiplier * 100) / 100,
    wasteFactor: 0,
    total: 0,
  });
  items[items.length - 1]!.total = Math.round(
    items[items.length - 1]!.quantity * items[items.length - 1]!.unitPrice * 100,
  ) / 100;

  return items;
}

function getFurnitureForRoom(roomType: string, style: string, multiplier: number): BOMItem[] {
  const plywoodWaste = DEFAULT_WASTE_FACTORS.plywood;
  const items: BOMItem[] = [];

  if (roomType === 'bedroom') {
    items.push(
      {
        name: 'Wardrobe',
        category: 'Furniture',
        specification: `2-door sliding wardrobe 2400x600x2100mm, ${style === 'modern' ? 'Lacquer' : 'Laminate'} finish`,
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(850 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(850 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Bed Frame',
        category: 'Furniture',
        specification: `Queen bed with storage, ${style === 'scandinavian' ? 'Light Oak' : 'Walnut'} finish`,
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(600 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(600 * multiplier * 100) / 100,
      },
      {
        name: 'Study Table',
        category: 'Furniture',
        specification: 'Wall-mounted study table 1200x500mm with cable management',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(280 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(280 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Bedside Table',
        category: 'Furniture',
        specification: 'Bedside table with drawer 450x400x500mm',
        quantity: 2,
        unit: 'units',
        unitPrice: Math.round(120 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(2 * 120 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
    );
  } else if (roomType === 'kitchen') {
    items.push(
      {
        name: 'Base Cabinets',
        category: 'Furniture',
        specification: 'Marine plywood base cabinets with SS basket system',
        quantity: 6,
        unit: 'modules',
        unitPrice: Math.round(220 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(6 * 220 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Wall Cabinets',
        category: 'Furniture',
        specification: 'Wall-mounted cabinets with lift-up shutters 720mm height',
        quantity: 4,
        unit: 'modules',
        unitPrice: Math.round(160 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(4 * 160 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Countertop',
        category: 'Furniture',
        specification: style === 'luxury' || style === 'premium' ? 'Granite slab 20mm' : 'Quartz countertop 20mm',
        quantity: Math.ceil((3.5 * 0.6) * 10) / 10, // typical kitchen countertop
        unit: 'sqm',
        unitPrice: Math.round(150 * multiplier * 100) / 100,
        wasteFactor: 0.05,
        total: Math.round(2.1 * 150 * multiplier * 1.05 * 100) / 100,
      },
    );
  } else if (roomType === 'living_room') {
    items.push(
      {
        name: 'TV Unit',
        category: 'Furniture',
        specification: `Wall-mounted TV unit 1800x400x500mm, ${style} finish`,
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(450 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(450 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Display / Bookshelf',
        category: 'Furniture',
        specification: 'Open bookshelf unit 900x300x1800mm',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(320 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(320 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
      {
        name: 'Shoe Cabinet',
        category: 'Furniture',
        specification: 'Wall-mounted shoe cabinet with flip-down compartments',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(200 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(200 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
    );
  } else if (roomType === 'bathroom') {
    items.push(
      {
        name: 'Vanity Unit',
        category: 'Furniture',
        specification: 'Wall-mounted vanity 900x500mm with basin cutout, marine plywood',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(350 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(350 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
    );
  } else {
    // Generic furniture for other room types
    items.push(
      {
        name: 'Storage Unit',
        category: 'Furniture',
        specification: `Custom storage unit, ${style} finish`,
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(400 * multiplier * 100) / 100,
        wasteFactor: plywoodWaste,
        total: Math.round(400 * multiplier * (1 + plywoodWaste) * 100) / 100,
      },
    );
  }

  return items;
}

function getFixturesForRoom(roomType: string, multiplier: number): BOMItem[] {
  const items: BOMItem[] = [];

  // Lighting — common to all rooms
  items.push({
    name: 'Ceiling Light',
    category: 'Fixtures',
    specification: 'LED panel light / pendant, 18W',
    quantity: roomType === 'kitchen' ? 3 : roomType === 'living_room' ? 2 : 1,
    unit: 'pcs',
    unitPrice: Math.round(45 * multiplier * 100) / 100,
    wasteFactor: 0,
    total: 0,
  });
  items[items.length - 1]!.total = Math.round(
    items[items.length - 1]!.quantity * items[items.length - 1]!.unitPrice * 100,
  ) / 100;

  if (roomType === 'kitchen') {
    items.push(
      {
        name: 'Kitchen Sink',
        category: 'Fixtures',
        specification: 'Single-bowl stainless steel sink with drainer',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(120 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(120 * multiplier * 100) / 100,
      },
      {
        name: 'Kitchen Faucet',
        category: 'Fixtures',
        specification: 'Pull-down spray mixer faucet',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(85 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(85 * multiplier * 100) / 100,
      },
    );
  }

  if (roomType === 'bathroom') {
    items.push(
      {
        name: 'Shower Set',
        category: 'Fixtures',
        specification: 'Rain shower head with hand shower and diverter',
        quantity: 1,
        unit: 'set',
        unitPrice: Math.round(180 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(180 * multiplier * 100) / 100,
      },
      {
        name: 'WC',
        category: 'Fixtures',
        specification: 'Wall-hung WC with concealed cistern',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(250 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(250 * multiplier * 100) / 100,
      },
      {
        name: 'Basin Mixer',
        category: 'Fixtures',
        specification: 'Single-lever basin mixer tap, chrome finish',
        quantity: 1,
        unit: 'unit',
        unitPrice: Math.round(65 * multiplier * 100) / 100,
        wasteFactor: 0,
        total: Math.round(65 * multiplier * 100) / 100,
      },
    );
  }

  // Electrical points
  items.push({
    name: 'Electrical Points',
    category: 'Fixtures',
    specification: 'Switch + socket points (modular)',
    quantity: roomType === 'kitchen' ? 10 : roomType === 'bedroom' ? 8 : roomType === 'living_room' ? 10 : 4,
    unit: 'points',
    unitPrice: Math.round(15 * multiplier * 100) / 100,
    wasteFactor: 0,
    total: 0,
  });
  items[items.length - 1]!.total = Math.round(
    items[items.length - 1]!.quantity * items[items.length - 1]!.unitPrice * 100,
  ) / 100;

  return items;
}

export const bomRouter = router({
  listByDesignVariant: protectedProcedure
    .input(z.object({ designVariantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      return ctx.db.query.bomResults.findMany({
        where: eq(bomResults.designVariantId, input.designVariantId),
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { bomResults: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      return project.rooms.flatMap((room) =>
        room.designVariants.flatMap((variant) =>
          variant.bomResults.map((bom) => ({
            ...bom,
            variantName: variant.name,
            roomName: room.name,
          })),
        ),
      );
    }),

  generate: protectedProcedure
    .input(
      z.object({
        designVariantId: z.string(),
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

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'bom_calculation',
          status: 'pending',
          inputJson: { designVariantId: input.designVariantId },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // --- Inline BOM generation (replaces external microservice call) ---

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      // Generate BOM items
      const items = generateBOMItems(
        variant.room.type,
        variant.room.lengthMm ?? 0,
        variant.room.widthMm ?? 0,
        variant.room.heightMm ?? 2700,
        variant.style,
        variant.budgetTier,
      );

      const totalCost = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

      // Store BOM result
      await ctx.db.insert(bomResults).values({
        designVariantId: input.designVariantId,
        jobId: job.id,
        items,
        totalCost,
        currency: 'USD',
        metadata: {
          roomType: variant.room.type,
          style: variant.style,
          budgetTier: variant.budgetTier,
          areaSqm: Math.round(((variant.room.lengthMm ?? 0) * (variant.room.widthMm ?? 0)) / 1e6 * 100) / 100,
          itemCount: items.length,
          generatedAt: new Date().toISOString(),
        },
      });

      // Mark job as completed
      await ctx.db
        .update(jobs)
        .set({
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          outputJson: {
            designVariantId: input.designVariantId,
            totalCost,
            itemCount: items.length,
            currency: 'USD',
          },
        })
        .where(eq(jobs.id, job.id));

      return job;
    }),

  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),

  exportUrl: protectedProcedure
    .input(z.object({ bomResultId: z.string(), format: z.enum(['xlsx', 'pdf']) }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const bom = await ctx.db.query.bomResults.findFirst({
        where: eq(bomResults.id, input.bomResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!bom || (bom.designVariant as any).room.project.userId !== ctx.userId) {
        throw new Error('BOM result not found');
      }
      return { url: `/api/bom/export/${input.bomResultId}?format=${input.format}` };
    }),
});
