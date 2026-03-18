import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  propertyValuations, projects, eq, and,
} from '@openlintel/db';

export const propertyValuationRouter = router({
  // ── Get valuation for a project ─────────────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.propertyValuations.findFirst({
        where: eq(propertyValuations.projectId, input.projectId),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
      });
    }),

  // ── List valuations ─────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.propertyValuations.findMany({
        where: eq(propertyValuations.projectId, input.projectId),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
      });
    }),

  // ── Calculate ROI ───────────────────────────────────────
  calculateRoi: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      preRenovationValue: z.number().min(0),
      renovationCost: z.number().min(0),
      postRenovationEstimate: z.number().min(0),
      comparables: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const valueGain = input.postRenovationEstimate - input.preRenovationValue;
      const roi = input.renovationCost > 0
        ? Math.round((valueGain / input.renovationCost) * 100 * 100) / 100
        : 0;

      const [valuation] = await ctx.db.insert(propertyValuations).values({
        projectId: input.projectId,
        preRenovationValue: input.preRenovationValue,
        renovationCost: input.renovationCost,
        postRenovationEstimate: input.postRenovationEstimate,
        roi,
        comparables: input.comparables ?? null,
      }).returning();
      return valuation;
    }),

  // ── Delete valuation ────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const valuation = await ctx.db.query.propertyValuations.findFirst({
        where: eq(propertyValuations.id, input.id),
        with: { project: true },
      });
      if (!valuation) throw new Error('Valuation not found');
      if ((valuation.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(propertyValuations).where(eq(propertyValuations.id, input.id));
      return { success: true };
    }),
});
