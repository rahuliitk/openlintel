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

  // ── Get analysis (frontend: propertyValue.getAnalysis) ──
  getAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const latest = await ctx.db.query.propertyValuations.findFirst({
        where: eq(propertyValuations.projectId, input.projectId),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
      });
      return { currentValue: latest?.preRenovationValue || 0 };
    }),

  // ── List improvements (frontend: propertyValue.listImprovements) ──
  listImprovements: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const rows = await ctx.db.query.propertyValuations.findMany({
        where: eq(propertyValuations.projectId, input.projectId),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
      });
      return rows.map((r) => {
        const meta = (r.comparables as any) || {};
        return {
          id: r.id,
          improvementType: meta.improvementType || 'improvement',
          description: meta.description || '',
          estimatedCost: r.renovationCost || 0,
          expectedRoiPct: r.roi || 0,
        };
      });
    }),

  // ── Add improvement (frontend: propertyValue.addImprovement) ──
  addImprovement: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      improvementType: z.string(),
      description: z.string().optional(),
      estimatedCost: z.number().min(0),
      expectedRoiPct: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [row] = await ctx.db.insert(propertyValuations).values({
        projectId: input.projectId,
        renovationCost: input.estimatedCost,
        roi: input.expectedRoiPct ?? 0,
        comparables: {
          improvementType: input.improvementType,
          description: input.description || '',
        },
      }).returning();
      return row;
    }),

  // ── Delete improvement (frontend: propertyValue.deleteImprovement) ──
  deleteImprovement: protectedProcedure
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

  // ── Refresh analysis (frontend: propertyValue.refreshAnalysis) ──
  refreshAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return { success: true };
    }),
});
