import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  submittals, projects, eq, and,
} from '@openlintel/db';

export const submittalRouter = router({
  // ── List submittals ────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(submittals.projectId, input.projectId)];
      if (input.status) conditions.push(eq(submittals.status, input.status));

      return ctx.db.query.submittals.findMany({
        where: and(...conditions),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Get submittal by ID ────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const submittal = await ctx.db.query.submittals.findFirst({
        where: eq(submittals.id, input.id),
        with: { project: true, submittedProduct: true },
      });
      if (!submittal) throw new Error('Submittal not found');
      if ((submittal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return submittal;
    }),

  // ── Create submittal with auto-increment submittalNumber
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      specSection: z.string().optional(),
      description: z.string().min(1),
      submittedProductId: z.string().optional(),
      specifiedProductId: z.string().optional(),
      pdfKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Auto-increment submittalNumber by counting existing submittals for this project
      const existingSubmittals = await ctx.db.query.submittals.findMany({
        where: eq(submittals.projectId, input.projectId),
      });
      const nextSubmittalNumber = existingSubmittals.length + 1;

      const [submittal] = await ctx.db.insert(submittals).values({
        projectId: input.projectId,
        submittalNumber: nextSubmittalNumber,
        specSection: input.specSection ?? null,
        description: input.description,
        submittedProductId: input.submittedProductId ?? null,
        specifiedProductId: input.specifiedProductId ?? null,
        pdfKey: input.pdfKey ?? null,
        submittedBy: ctx.userId,
        status: 'pending',
      }).returning();
      return submittal;
    }),

  // ── Review submittal (set status + stampType) ──────────
  review: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['approved', 'approved_as_noted', 'revise_and_resubmit', 'rejected']),
      stampType: z.enum(['approved', 'approved_as_noted', 'revise_and_resubmit', 'rejected']),
      reviewerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submittal = await ctx.db.query.submittals.findFirst({
        where: eq(submittals.id, input.id),
        with: { project: true },
      });
      if (!submittal) throw new Error('Submittal not found');
      if ((submittal.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(submittals).set({
        status: input.status,
        stampType: input.stampType,
        reviewerNotes: input.reviewerNotes ?? null,
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(submittals.id, input.id)).returning();
      return updated;
    }),
});
