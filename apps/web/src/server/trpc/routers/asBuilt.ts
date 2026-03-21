import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  asBuiltMarkups, asBuiltFieldMarkups, drawingResults, projects, eq, and, desc,
} from '@openlintel/db';

export const asBuiltRouter = router({
  // ── Project-level: list field markups ─────────────────────
  listMarkups: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.asBuiltFieldMarkups.findMany({
        where: eq(asBuiltFieldMarkups.projectId, input.projectId),
        orderBy: [desc(asBuiltFieldMarkups.createdAt)],
      });
    }),

  // ── Project-level: create field markup ────────────────────
  createMarkup: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sheetNumber: z.string().min(1),
      markupType: z.string().min(1),
      discipline: z.string().optional(),
      description: z.string().min(1),
      originalValue: z.string().optional(),
      asBuiltValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [markup] = await ctx.db.insert(asBuiltFieldMarkups).values({
        projectId: input.projectId,
        userId: ctx.userId,
        sheetNumber: input.sheetNumber,
        markupType: input.markupType,
        discipline: input.discipline || null,
        description: input.description,
        originalValue: input.originalValue || null,
        asBuiltValue: input.asBuiltValue || null,
        notes: input.notes || null,
      }).returning();

      return markup;
    }),

  // ── Project-level: delete field markup ────────────────────
  deleteMarkup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const markup = await ctx.db.query.asBuiltFieldMarkups.findFirst({
        where: eq(asBuiltFieldMarkups.id, input.id),
        with: { project: true },
      });
      if (!markup) throw new Error('Markup not found');
      if ((markup.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(asBuiltFieldMarkups).where(eq(asBuiltFieldMarkups.id, input.id));
      return { success: true };
    }),

  // ── Drawing-level: list markups (original API) ────────────
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

  // ── Drawing-level: create markup (original API) ───────────
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

  // ── Drawing-level: delete markup (original API) ───────────
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
});
