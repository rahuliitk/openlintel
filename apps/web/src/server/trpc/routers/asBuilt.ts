import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  asBuiltMarkups, drawingResults, eq, and,
} from '@openlintel/db';

export const asBuiltRouter = router({
  // ── List as-built markups ───────────────────────────────
  list: protectedProcedure
    .input(z.object({ drawingResultId: z.string() }))
    .query(async ({ ctx, input }) => {
      const drawing = await ctx.db.query.drawingResults.findFirst({
        where: eq(drawingResults.id, input.drawingResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!drawing) throw new Error('Drawing result not found');
      if ((drawing.designVariant as any).room.project.userId !== ctx.userId) throw new Error('Access denied');
      return ctx.db.query.asBuiltMarkups.findMany({
        where: eq(asBuiltMarkups.drawingResultId, input.drawingResultId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const markup = await ctx.db.query.asBuiltMarkups.findFirst({
        where: eq(asBuiltMarkups.id, input.id),
        with: { drawingResult: { with: { designVariant: { with: { room: { with: { project: true } } } } } } },
      });
      if (!markup) throw new Error('As-built markup not found');
      if ((markup.drawingResult as any).designVariant.room.project.userId !== ctx.userId) throw new Error('Access denied');
      return markup;
    }),

  // ── Create as-built markup ──────────────────────────────
  create: protectedProcedure
    .input(z.object({
      drawingResultId: z.string(),
      markupData: z.any().optional(),
      deviations: z.any().optional(),
      markedUpPdfKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drawing = await ctx.db.query.drawingResults.findFirst({
        where: eq(drawingResults.id, input.drawingResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!drawing) throw new Error('Drawing result not found');
      if ((drawing.designVariant as any).room.project.userId !== ctx.userId) throw new Error('Access denied');
      const [markup] = await ctx.db.insert(asBuiltMarkups).values({
        drawingResultId: input.drawingResultId,
        markupData: input.markupData ?? null,
        deviations: input.deviations ?? null,
        markedUpPdfKey: input.markedUpPdfKey ?? null,
        createdBy: ctx.userId,
      }).returning();
      return markup;
    }),

  // ── Update markup ───────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      markupData: z.any().optional(),
      deviations: z.any().optional(),
      markedUpPdfKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const markup = await ctx.db.query.asBuiltMarkups.findFirst({
        where: eq(asBuiltMarkups.id, input.id),
        with: { drawingResult: { with: { designVariant: { with: { room: { with: { project: true } } } } } } },
      });
      if (!markup) throw new Error('As-built markup not found');
      if ((markup.drawingResult as any).designVariant.room.project.userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(asBuiltMarkups).set(data).where(eq(asBuiltMarkups.id, id)).returning();
      return updated;
    }),

  // ── Delete markup ───────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const markup = await ctx.db.query.asBuiltMarkups.findFirst({
        where: eq(asBuiltMarkups.id, input.id),
        with: { drawingResult: { with: { designVariant: { with: { room: { with: { project: true } } } } } } },
      });
      if (!markup) throw new Error('As-built markup not found');
      if ((markup.drawingResult as any).designVariant.room.project.userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(asBuiltMarkups).where(eq(asBuiltMarkups.id, input.id));
      return { success: true };
    }),

  // ── Get deviations summary ──────────────────────────────
  getDeviations: protectedProcedure
    .input(z.object({ drawingResultId: z.string() }))
    .query(async ({ ctx, input }) => {
      const drawing = await ctx.db.query.drawingResults.findFirst({
        where: eq(drawingResults.id, input.drawingResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!drawing) throw new Error('Drawing result not found');
      if ((drawing.designVariant as any).room.project.userId !== ctx.userId) throw new Error('Access denied');

      const markups = await ctx.db.query.asBuiltMarkups.findMany({
        where: eq(asBuiltMarkups.drawingResultId, input.drawingResultId),
      });

      const allDeviations: any[] = [];
      markups.forEach((m) => {
        const devs = (m.deviations as any[]) ?? [];
        allDeviations.push(...devs);
      });

      const bySeverity: Record<string, number> = { critical: 0, major: 0, minor: 0 };
      allDeviations.forEach((d) => {
        const sev = d.severity ?? 'minor';
        bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
      });

      return {
        drawingResultId: input.drawingResultId,
        totalMarkups: markups.length,
        totalDeviations: allDeviations.length,
        bySeverity,
        deviations: allDeviations,
      };
    }),
});
