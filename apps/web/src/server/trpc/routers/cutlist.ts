import { z } from 'zod';
import { cutlistResults, designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Helpers — panel generation by room type
// ---------------------------------------------------------------------------

interface PanelItem {
  name: string;
  material: string;
  lengthMm: number;
  widthMm: number;
  thickness: number;
  grainDirection: 'horizontal' | 'vertical';
  edgeBanding: ('top' | 'bottom' | 'left' | 'right')[];
  quantity: number;
}

interface HardwareItem {
  name: string;
  specification: string;
  quantity: number;
  unit: string;
}

const SHEET_LENGTH = 2440; // 8 ft in mm
const SHEET_WIDTH = 1220; // 4 ft in mm
const STANDARD_THICKNESS = 18;

function generatePanelsForRoom(
  roomType: string,
  lengthMm: number,
  widthMm: number,
  _heightMm: number,
  style: string,
  budgetTier: string,
): PanelItem[] {
  const material =
    budgetTier === 'premium'
      ? 'Marine Plywood BWP'
      : budgetTier === 'mid'
        ? 'MR Grade Plywood'
        : 'Commercial Plywood';

  switch (roomType) {
    case 'kitchen':
      return [
        { name: 'Base Cabinet Side Panel', material, lengthMm: 720, widthMm: 560, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 6 },
        { name: 'Base Cabinet Shelf', material, lengthMm: 560, widthMm: 540, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 6 },
        { name: 'Wall Cabinet Side Panel', material, lengthMm: 720, widthMm: 300, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 6 },
        { name: 'Wall Cabinet Shelf', material, lengthMm: 560, widthMm: 280, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 6 },
        { name: 'Wall Cabinet Top/Bottom', material, lengthMm: 560, widthMm: 300, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 12 },
        { name: 'Base Cabinet Bottom', material, lengthMm: 560, widthMm: 560, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: [], quantity: 6 },
        { name: 'Countertop Panel', material: 'Granite / Quartz', lengthMm: Math.min(lengthMm, 3000), widthMm: 600, thickness: 20, grainDirection: 'horizontal', edgeBanding: ['left', 'right', 'top'], quantity: 1 },
        { name: 'Tall Unit Side Panel', material, lengthMm: 2100, widthMm: 560, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'Tall Unit Shelf', material, lengthMm: 560, widthMm: 540, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 4 },
        { name: 'Drawer Front', material, lengthMm: 560, widthMm: 180, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 6 },
      ];

    case 'bedroom':
      return [
        { name: 'Wardrobe Side Panel', material, lengthMm: 2100, widthMm: 600, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 3 },
        { name: 'Wardrobe Shelf', material, lengthMm: 900, widthMm: 580, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 8 },
        { name: 'Wardrobe Top/Bottom', material, lengthMm: 900, widthMm: 600, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 4 },
        { name: 'Wardrobe Back Panel', material: 'MDF 6mm', lengthMm: 2100, widthMm: 900, thickness: 6, grainDirection: 'vertical', edgeBanding: [], quantity: 2 },
        { name: 'Headboard Panel', material, lengthMm: 1800, widthMm: 1200, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['top', 'left', 'right'], quantity: 1 },
        { name: 'Side Table Top', material, lengthMm: 500, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 2 },
        { name: 'Side Table Side Panel', material, lengthMm: 500, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 4 },
        { name: 'Dresser Side Panel', material, lengthMm: 800, widthMm: 500, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'Dresser Drawer Front', material, lengthMm: 900, widthMm: 200, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 4 },
      ];

    case 'living_room':
      return [
        { name: 'TV Unit Side Panel', material, lengthMm: 500, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'TV Unit Shelf', material, lengthMm: 1800, widthMm: 380, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left', 'top'], quantity: 3 },
        { name: 'TV Unit Top/Bottom', material, lengthMm: 1800, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left', 'top'], quantity: 2 },
        { name: 'TV Unit Back Panel', material: 'MDF 6mm', lengthMm: 1800, widthMm: 500, thickness: 6, grainDirection: 'horizontal', edgeBanding: [], quantity: 1 },
        { name: 'Bookshelf Side Panel', material, lengthMm: 1800, widthMm: 300, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'Bookshelf Shelf', material, lengthMm: 800, widthMm: 280, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 5 },
        { name: 'Display Cabinet Door', material, lengthMm: 600, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 2 },
      ];

    case 'bathroom':
      return [
        { name: 'Vanity Side Panel', material: 'Marine Plywood BWP', lengthMm: 800, widthMm: 500, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'Vanity Shelf', material: 'Marine Plywood BWP', lengthMm: 900, widthMm: 480, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 1 },
        { name: 'Vanity Top', material: 'Marine Plywood BWP', lengthMm: 900, widthMm: 500, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['top', 'left', 'right'], quantity: 1 },
        { name: 'Mirror Cabinet Side', material: 'Marine Plywood BWP', lengthMm: 600, widthMm: 150, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'bottom', 'left', 'right'], quantity: 2 },
        { name: 'Mirror Cabinet Shelf', material: 'Marine Plywood BWP', lengthMm: 580, widthMm: 130, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 2 },
      ];

    default:
      // Generic storage for any other room type
      return [
        { name: 'Storage Cabinet Side Panel', material, lengthMm: 1800, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'vertical', edgeBanding: ['top', 'left', 'right'], quantity: 2 },
        { name: 'Storage Cabinet Shelf', material, lengthMm: 800, widthMm: 380, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 4 },
        { name: 'Storage Cabinet Top/Bottom', material, lengthMm: 800, widthMm: 400, thickness: STANDARD_THICKNESS, grainDirection: 'horizontal', edgeBanding: ['left'], quantity: 2 },
        { name: 'Storage Cabinet Back Panel', material: 'MDF 6mm', lengthMm: 1800, widthMm: 800, thickness: 6, grainDirection: 'vertical', edgeBanding: [], quantity: 1 },
      ];
  }
}

function calculateNesting(panels: PanelItem[]) {
  const sheetArea = SHEET_LENGTH * SHEET_WIDTH; // mm^2
  let totalPanelArea = 0;

  for (const panel of panels) {
    totalPanelArea += panel.lengthMm * panel.widthMm * panel.quantity;
  }

  // Simple nesting: assume 85% utilisation efficiency for real-world nesting
  const effectiveUsage = 0.85;
  const totalSheets = Math.ceil(totalPanelArea / (sheetArea * effectiveUsage));
  const usedArea = totalPanelArea;
  const totalSheetArea = totalSheets * sheetArea;
  const wastePercent = Math.round(((totalSheetArea - usedArea) / totalSheetArea) * 10000) / 100;

  // Build per-sheet breakdown
  const sheets: { sheetNumber: number; panels: string[]; utilisation: number }[] = [];
  let remainingArea = totalPanelArea;
  for (let i = 1; i <= totalSheets; i++) {
    const areaOnSheet = Math.min(remainingArea, sheetArea * effectiveUsage);
    remainingArea -= areaOnSheet;
    sheets.push({
      sheetNumber: i,
      panels: panels.map((p) => `${p.name} (x${p.quantity})`).slice(0, 4), // summary
      utilisation: Math.round((areaOnSheet / sheetArea) * 10000) / 100,
    });
  }

  return { sheets, totalSheets, wastePercent, totalPanelAreaMm2: totalPanelArea, totalSheetAreaMm2: totalSheetArea };
}

function generateHardwareSchedule(roomType: string, panels: PanelItem[]): HardwareItem[] {
  const cabinetCount = panels.filter((p) => p.name.toLowerCase().includes('side panel')).reduce((sum, p) => sum + p.quantity, 0) / 2;
  const drawerCount = panels.filter((p) => p.name.toLowerCase().includes('drawer')).reduce((sum, p) => sum + p.quantity, 0);

  const hardware: HardwareItem[] = [];

  // Hinges — 2 per door, assume ~1 door per cabinet
  const doorCount = Math.max(Math.round(cabinetCount), 2);
  hardware.push({ name: 'Soft-close Hinge', specification: '110° full overlay', quantity: doorCount * 2, unit: 'nos' });

  // Handles
  hardware.push({ name: 'Cabinet Handle', specification: '128mm CC, SS finish', quantity: doorCount + drawerCount, unit: 'nos' });

  // Drawer slides
  if (drawerCount > 0) {
    hardware.push({ name: 'Telescopic Drawer Slide', specification: '450mm full extension, 30kg', quantity: drawerCount, unit: 'pair' });
  }

  // Cam locks & dowels for flat-pack assembly
  const jointCount = panels.reduce((sum, p) => sum + p.quantity, 0) * 2;
  hardware.push({ name: 'Cam Lock + Dowel Set', specification: '15mm', quantity: jointCount, unit: 'set' });

  // Shelf supports
  const shelfCount = panels.filter((p) => p.name.toLowerCase().includes('shelf')).reduce((sum, p) => sum + p.quantity, 0);
  hardware.push({ name: 'Shelf Support Pin', specification: '5mm nickel', quantity: shelfCount * 4, unit: 'nos' });

  // Room-specific extras
  if (roomType === 'kitchen') {
    hardware.push({ name: 'Gas Spring Lift', specification: '100N for wall cabinets', quantity: Math.round(cabinetCount / 2), unit: 'pair' });
    hardware.push({ name: 'Under-sink Drip Tray', specification: 'Aluminium 600mm', quantity: 1, unit: 'nos' });
  }

  if (roomType === 'bedroom') {
    hardware.push({ name: 'Wardrobe Hanging Rod', specification: 'Oval 30x15mm chrome', quantity: 2, unit: 'nos' });
    hardware.push({ name: 'Wardrobe Rod Bracket', specification: 'Flange bracket', quantity: 4, unit: 'nos' });
  }

  return hardware;
}

// ---------------------------------------------------------------------------
// Helpers — furniture unit inference & nesting sheet builder
// ---------------------------------------------------------------------------

function inferFurnitureUnit(panelName: string): string {
  const lower = panelName.toLowerCase();
  if (lower.includes('base cabinet')) return 'Base Cabinet';
  if (lower.includes('wall cabinet')) return 'Wall Cabinet';
  if (lower.includes('tall unit')) return 'Tall Unit';
  if (lower.includes('countertop')) return 'Countertop';
  if (lower.includes('drawer')) return 'Drawer Unit';
  if (lower.includes('wardrobe')) return 'Wardrobe';
  if (lower.includes('headboard')) return 'Bed';
  if (lower.includes('side table')) return 'Side Table';
  if (lower.includes('dresser')) return 'Dresser';
  if (lower.includes('tv unit')) return 'TV Unit';
  if (lower.includes('bookshelf')) return 'Bookshelf';
  if (lower.includes('display cabinet')) return 'Display Cabinet';
  if (lower.includes('vanity')) return 'Vanity';
  if (lower.includes('mirror cabinet')) return 'Mirror Cabinet';
  if (lower.includes('storage cabinet')) return 'Storage Cabinet';
  return 'General';
}

interface TransformedPanel {
  id: string;
  partName: string;
  furnitureUnit: string;
  length: number;
  width: number;
  thickness: number;
  material: string;
  grain: 'horizontal' | 'vertical' | 'none';
  edgeBanding: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  quantity: number;
}

function buildNestingSheets(
  panels: TransformedPanel[],
  nestingCalc: { totalSheets: number; wastePercent: number },
  rawPanels: PanelItem[],
) {
  // Determine primary material and thickness
  const primaryMaterial = rawPanels.length > 0 ? rawPanels[0].material : 'Plywood';
  const primaryThickness = rawPanels.length > 0 ? rawPanels[0].thickness : STANDARD_THICKNESS;

  // Expand panels by quantity for placement
  const expanded: TransformedPanel[] = [];
  for (const panel of panels) {
    for (let i = 0; i < panel.quantity; i++) {
      expanded.push(panel);
    }
  }

  // Simple first-fit-decreasing shelf packing
  const sheets: Array<{
    sheetNumber: number;
    sheetLength: number;
    sheetWidth: number;
    material: string;
    thickness: number;
    panels: Array<{ id: string; partName: string; furnitureUnit: string; x: number; y: number; length: number; width: number; rotated: boolean }>;
    wastePercent: number;
  }> = [];

  // Sort expanded panels by area descending for better packing
  const sorted = [...expanded].sort((a, b) => (b.length * b.width) - (a.length * a.width));

  // Simple row-based packing per sheet
  let currentSheet: typeof sheets[0] | null = null;
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const panel of sorted) {
    let pLength = panel.length;
    let pWidth = panel.width;
    let rotated = false;

    // Try to fit, rotate if needed
    if (pLength > SHEET_LENGTH || pWidth > SHEET_WIDTH) {
      // Try rotating
      const tmp = pLength;
      pLength = pWidth;
      pWidth = tmp;
      rotated = true;
    }

    if (!currentSheet || (cursorX + pLength > SHEET_LENGTH && cursorY + rowHeight + pWidth > SHEET_WIDTH)) {
      // Start a new sheet
      if (currentSheet) sheets.push(currentSheet);
      currentSheet = {
        sheetNumber: sheets.length + 1,
        sheetLength: SHEET_LENGTH,
        sheetWidth: SHEET_WIDTH,
        material: panel.material || primaryMaterial,
        thickness: panel.thickness || primaryThickness,
        panels: [],
        wastePercent: 0,
      };
      cursorX = 0;
      cursorY = 0;
      rowHeight = 0;
    }

    // Check if panel fits in current row
    if (cursorX + pLength > SHEET_LENGTH) {
      // Move to next row
      cursorY += rowHeight;
      cursorX = 0;
      rowHeight = 0;

      if (cursorY + pWidth > SHEET_WIDTH) {
        // Sheet is full, start new one
        sheets.push(currentSheet);
        currentSheet = {
          sheetNumber: sheets.length + 1,
          sheetLength: SHEET_LENGTH,
          sheetWidth: SHEET_WIDTH,
          material: panel.material || primaryMaterial,
          thickness: panel.thickness || primaryThickness,
          panels: [],
          wastePercent: 0,
        };
        cursorX = 0;
        cursorY = 0;
        rowHeight = 0;
      }
    }

    currentSheet.panels.push({
      id: crypto.randomUUID(),
      partName: panel.partName,
      furnitureUnit: panel.furnitureUnit,
      x: cursorX,
      y: cursorY,
      length: pLength,
      width: pWidth,
      rotated,
    });

    cursorX += pLength;
    if (pWidth > rowHeight) rowHeight = pWidth;
  }

  if (currentSheet && currentSheet.panels.length > 0) {
    sheets.push(currentSheet);
  }

  // Calculate waste percent per sheet
  const sheetArea = SHEET_LENGTH * SHEET_WIDTH;
  for (const sheet of sheets) {
    const usedArea = sheet.panels.reduce((sum, p) => sum + p.length * p.width, 0);
    sheet.wastePercent = Math.round(((sheetArea - usedArea) / sheetArea) * 10000) / 100;
  }

  return sheets;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const cutlistRouter = router({
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

      return ctx.db.query.cutlistResults.findMany({
        where: eq(cutlistResults.designVariantId, input.designVariantId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
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
                with: { cutlistResults: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      const results = project.rooms.flatMap((room) =>
        room.designVariants.flatMap((variant) =>
          variant.cutlistResults.map((cutlist) => ({
            ...cutlist,
            variantName: variant.name,
            roomName: room.name,
          })),
        ),
      );
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

      // Create job in pending state
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'cutlist_generation',
          status: 'pending',
          inputJson: { designVariantId: input.designVariantId },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const roomType = variant.room.type ?? 'other';
        const lengthMm = variant.room.lengthMm ?? 3000;
        const widthMm = variant.room.widthMm ?? 3000;
        const heightMm = variant.room.heightMm ?? 2700;

        // Generate panels
        const rawPanels = generatePanelsForRoom(
          roomType,
          lengthMm,
          widthMm,
          heightMm,
          variant.style,
          variant.budgetTier,
        );

        // Transform panels to match CutListPanel frontend interface
        const panels = rawPanels.map((p) => ({
          id: crypto.randomUUID(),
          partName: p.name,
          furnitureUnit: inferFurnitureUnit(p.name),
          length: p.lengthMm,
          width: p.widthMm,
          thickness: p.thickness,
          material: p.material,
          grain: p.grainDirection === 'horizontal' || p.grainDirection === 'vertical' ? p.grainDirection : 'none' as const,
          edgeBanding: {
            top: p.edgeBanding.includes('top'),
            bottom: p.edgeBanding.includes('bottom'),
            left: p.edgeBanding.includes('left'),
            right: p.edgeBanding.includes('right'),
          },
          quantity: p.quantity,
        }));

        // Calculate nesting on 8x4 ft sheets
        const nestingCalc = calculateNesting(rawPanels);

        // Build NestingSheet[] with placed panels for the viewer
        const nestingResult = buildNestingSheets(panels, nestingCalc, rawPanels);

        // Hardware schedule — transform to match HardwareItem frontend interface
        const rawHardware = generateHardwareSchedule(roomType, rawPanels);
        const hardware = rawHardware.map((h) => ({
          id: crypto.randomUUID(),
          name: h.name,
          specification: h.specification,
          quantity: h.quantity,
          unit: h.unit,
          furnitureUnit: 'General',
        }));

        // Persist cutlist result
        const [cutlist] = await ctx.db
          .insert(cutlistResults)
          .values({
            designVariantId: input.designVariantId,
            jobId: job.id,
            panels,
            hardware,
            nestingResult,
            totalSheets: nestingCalc.totalSheets,
            wastePercent: nestingCalc.wastePercent,
          })
          .returning();
        if (!cutlist) throw new Error('Failed to create cutlist result');

        // Mark completed
        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              cutlistResultId: cutlist.id,
              totalPanels: panels.reduce((s, p) => s + p.quantity, 0),
              totalSheets: nestingCalc.totalSheets,
              wastePercent: nestingCalc.wastePercent,
              hardwareItems: hardware.length,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!updatedJob) throw new Error('Failed to update job');

        return updatedJob;
      } catch (err) {
        // Mark failed
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!failedJob) throw new Error('Failed to update job');

        return failedJob;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ cutlistResultId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cutlist = await ctx.db.query.cutlistResults.findFirst({
        where: eq(cutlistResults.id, input.cutlistResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!cutlist || (cutlist.designVariant as any).room.project.userId !== ctx.userId) {
        throw new Error('Cut list result not found');
      }
      await ctx.db.delete(cutlistResults).where(eq(cutlistResults.id, input.cutlistResultId));
      return { success: true };
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
});
