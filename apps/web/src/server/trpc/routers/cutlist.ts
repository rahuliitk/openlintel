import { z } from 'zod';
import { cutlistResults, designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SHEET_LENGTH = 2440; // 8 ft in mm
const SHEET_WIDTH = 1220; // 4 ft in mm

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

function calculateNesting(panels: TransformedPanel[]) {
  const sheetArea = SHEET_LENGTH * SHEET_WIDTH;
  let totalPanelArea = 0;
  for (const panel of panels) {
    totalPanelArea += panel.length * panel.width * panel.quantity;
  }

  const effectiveUsage = 0.85;
  const totalSheets = Math.ceil(totalPanelArea / (sheetArea * effectiveUsage));
  const totalSheetArea = totalSheets * sheetArea;
  const wastePercent = Math.round(((totalSheetArea - totalPanelArea) / totalSheetArea) * 10000) / 100;

  return { totalSheets, wastePercent };
}

function buildNestingSheets(panels: TransformedPanel[]) {
  const primaryMaterial = panels.length > 0 ? panels[0]!.material : 'Plywood';
  const primaryThickness = panels.length > 0 ? panels[0]!.thickness : 18;

  // Expand panels by quantity for placement
  const expanded: TransformedPanel[] = [];
  for (const panel of panels) {
    for (let i = 0; i < panel.quantity; i++) {
      expanded.push(panel);
    }
  }

  const sheets: Array<{
    sheetNumber: number;
    sheetLength: number;
    sheetWidth: number;
    material: string;
    thickness: number;
    panels: Array<{ id: string; partName: string; furnitureUnit: string; x: number; y: number; length: number; width: number; rotated: boolean }>;
    wastePercent: number;
  }> = [];

  // Sort by area descending for better packing
  const sorted = [...expanded].sort((a, b) => (b.length * b.width) - (a.length * a.width));

  let currentSheet: typeof sheets[0] | null = null;
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const panel of sorted) {
    let pLength = panel.length;
    let pWidth = panel.width;
    let rotated = false;

    if (pLength > SHEET_LENGTH || pWidth > SHEET_WIDTH) {
      const tmp = pLength;
      pLength = pWidth;
      pWidth = tmp;
      rotated = true;
    }

    if (!currentSheet || (cursorX + pLength > SHEET_LENGTH && cursorY + rowHeight + pWidth > SHEET_WIDTH)) {
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

    if (cursorX + pLength > SHEET_LENGTH) {
      cursorY += rowHeight;
      cursorX = 0;
      rowHeight = 0;

      if (cursorY + pWidth > SHEET_WIDTH) {
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

      // Create job
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

      // Run in background — return job immediately
      const db = ctx.db;
      const designVariantId = input.designVariantId;
      const cutVariant = variant;

      void (async () => {
        try {
          await db
            .update(jobs)
            .set({ status: 'running', startedAt: new Date(), progress: 10 })
            .where(eq(jobs.id, job.id));

          const roomType = cutVariant.room.type ?? 'other';
          const lengthMm = cutVariant.room.lengthMm ?? 3000;
          const widthMm = cutVariant.room.widthMm ?? 3000;
          const heightMm = cutVariant.room.heightMm ?? 2700;
          const lengthM = lengthMm / 1000;
          const widthM = widthMm / 1000;

          // Build context from design spec if available
          const specJson = cutVariant.specJson as Record<string, unknown> | null;
          let furnitureContext = '';
          if (specJson?.furniture && Array.isArray(specJson.furniture)) {
            furnitureContext = `\nFurniture from design spec:\n${JSON.stringify(specJson.furniture).slice(0, 1500)}`;
          }
          if (specJson?.materialSuggestions) {
            furnitureContext += `\nMaterials: ${JSON.stringify(specJson.materialSuggestions).slice(0, 500)}`;
          }

          const prompt = `You are a furniture manufacturing expert. Generate a CNC-ready cut list for a ${roomType.replace(/_/g, ' ')} room.

Room: ${lengthM}m x ${widthM}m x ${heightMm / 1000}m
Style: ${cutVariant.style}, Budget: ${cutVariant.budgetTier}
${furnitureContext}

Break down ALL furniture into individual panel cut parts. For each furniture piece, list every structural panel (sides, top, bottom, shelves, back panel, doors, drawer fronts, drawer sides/bottom).

Return compact JSON:
{"panels":[{"name":"Part Name","furnitureUnit":"Furniture Name","material":"Plywood/MDF/etc","lengthMm":600,"widthMm":400,"thickness":18,"grainDirection":"horizontal","edgeBanding":["top","left"],"quantity":2}],"hardware":[{"name":"Hardware Name","specification":"details","quantity":4,"unit":"nos","furnitureUnit":"Furniture Name"}]}

Rules:
- All dimensions in mm. Standard sheet: 2440x1220mm. Common thicknesses: 6,12,18,25mm.
- Include back panels (usually 6mm MDF), shelves, partitions, doors, drawer components.
- Edge banding: array of sides needing banding (visible edges only).
- Grain: "horizontal" for shelves/tops, "vertical" for side panels.
- Hardware: hinges (2 per door), handles, drawer slides (pair per drawer), shelf pins (4 per shelf), cam locks, specific items for room type.
- Budget tier affects material choice: economy=commercial plywood, standard=MR grade, premium=marine/BWP, luxury=solid wood/veneer.
- Be thorough: a typical room has 15-40 unique panel parts and 8-15 hardware items.`;

          await db.update(jobs).set({ progress: 20 }).where(eq(jobs.id, job.id));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a furniture manufacturing expert. Output only valid compact JSON. Be thorough — list every structural panel for every furniture piece.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 16384,
            response_format: { type: 'json_object' },
          });

          await db.update(jobs).set({ progress: 60 }).where(eq(jobs.id, job.id));

          const finishReason = completion.choices[0]?.finish_reason;
          const responseText = completion.choices[0]?.message?.content ?? '';
          console.log('[Cutlist] OpenAI response length:', responseText.length, 'finish_reason:', finishReason);

          if (finishReason === 'length') {
            throw new Error('Cutlist response was truncated by token limit');
          }
          if (!responseText.trim()) {
            throw new Error(`OpenAI returned empty response (finish_reason: ${finishReason})`);
          }

          let cutlistData: { panels: any[]; hardware: any[] };
          try {
            cutlistData = JSON.parse(responseText);
          } catch {
            const cleaned = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cutlistData = JSON.parse(jsonMatch[0]);
            } else {
              console.error('[Cutlist] Failed to parse response:', responseText.slice(0, 500));
              throw new Error('Failed to parse AI cutlist response as JSON');
            }
          }

          if (!Array.isArray(cutlistData.panels) || cutlistData.panels.length === 0) {
            throw new Error('AI returned no panel data');
          }

          await db.update(jobs).set({ progress: 75 }).where(eq(jobs.id, job.id));

          // Transform AI panels to frontend format
          const panels: TransformedPanel[] = cutlistData.panels.map((p: any) => ({
            id: crypto.randomUUID(),
            partName: p.name || p.partName || 'Unknown',
            furnitureUnit: p.furnitureUnit || 'General',
            length: p.lengthMm ?? p.length ?? 0,
            width: p.widthMm ?? p.width ?? 0,
            thickness: p.thickness ?? 18,
            material: p.material || 'Plywood',
            grain: (p.grainDirection === 'horizontal' || p.grainDirection === 'vertical') ? p.grainDirection : 'none' as const,
            edgeBanding: Array.isArray(p.edgeBanding)
              ? {
                  top: p.edgeBanding.includes('top'),
                  bottom: p.edgeBanding.includes('bottom'),
                  left: p.edgeBanding.includes('left'),
                  right: p.edgeBanding.includes('right'),
                }
              : { top: false, bottom: false, left: false, right: false },
            quantity: p.quantity ?? 1,
          }));

          // Transform AI hardware to frontend format
          const hardware = (cutlistData.hardware || []).map((h: any) => ({
            id: crypto.randomUUID(),
            name: h.name || 'Unknown',
            specification: h.specification || h.spec || '',
            quantity: h.quantity ?? 1,
            unit: h.unit || 'nos',
            furnitureUnit: h.furnitureUnit || 'General',
          }));

          // Calculate nesting and build sheet layouts
          const nestingCalc = calculateNesting(panels);
          const nestingResult = buildNestingSheets(panels);

          await db.update(jobs).set({ progress: 90 }).where(eq(jobs.id, job.id));

          // Persist cutlist result
          const [cutlist] = await db
            .insert(cutlistResults)
            .values({
              designVariantId,
              jobId: job.id,
              panels,
              hardware,
              nestingResult,
              totalSheets: nestingCalc.totalSheets,
              wastePercent: nestingCalc.wastePercent,
            })
            .returning();
          if (!cutlist) throw new Error('Failed to create cutlist result');

          await db
            .update(jobs)
            .set({
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputJson: {
                cutlistResultId: cutlist.id,
                totalPanels: panels.reduce((s, p) => s + p.quantity, 0),
                uniqueParts: panels.length,
                totalSheets: nestingCalc.totalSheets,
                wastePercent: nestingCalc.wastePercent,
                hardwareItems: hardware.length,
              },
            })
            .where(eq(jobs.id, job.id));

          console.log('[Cutlist] Generation completed:', panels.length, 'parts,', hardware.length, 'hardware items');
        } catch (err) {
          console.error('[Cutlist Generation Error]', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error during cutlist generation';
          await db
            .update(jobs)
            .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
            .where(eq(jobs.id, job.id));
        }
      })();

      return job;
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
