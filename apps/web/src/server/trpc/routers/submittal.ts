import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  submittalItems, projects, eq, and,
} from '@openlintel/db';

export const submittalRouter = router({
  // ── List submittals for a project ────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.submittalItems.findMany({
        where: eq(submittalItems.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Create a submittal ───────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1),
      specDivision: z.string().min(1),
      contractor: z.string().optional(),
      productName: z.string().min(1),
      manufacturer: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Auto-increment submittalNumber
      const existing = await ctx.db.query.submittalItems.findMany({
        where: eq(submittalItems.projectId, input.projectId),
      });
      const nextNumber = existing.length + 1;

      const [submittal] = await ctx.db.insert(submittalItems).values({
        projectId: input.projectId,
        title: input.title,
        submittalNumber: nextNumber,
        specDivision: input.specDivision,
        contractor: input.contractor ?? null,
        productName: input.productName,
        manufacturer: input.manufacturer ?? null,
        description: input.description ?? null,
        status: 'pending',
      }).returning();
      return submittal;
    }),

  // ── Review a submittal (approve / revise / reject) ───────────
  review: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['approved', 'approved_as_noted', 'revise_resubmit', 'rejected']),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submittal = await ctx.db.query.submittalItems.findFirst({
        where: eq(submittalItems.id, input.id),
        with: { project: true },
      });
      if (!submittal) throw new Error('Submittal not found');
      if ((submittal.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(submittalItems).set({
        status: input.status,
        reviewNotes: input.reviewNotes ?? null,
        reviewedAt: new Date(),
      }).where(eq(submittalItems.id, input.id)).returning();
      return updated;
    }),

  // ── Delete a submittal ───────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submittal = await ctx.db.query.submittalItems.findFirst({
        where: eq(submittalItems.id, input.id),
        with: { project: true },
      });
      if (!submittal) throw new Error('Submittal not found');
      if ((submittal.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(submittalItems).where(eq(submittalItems.id, input.id));
      return { success: true };
    }),
});
