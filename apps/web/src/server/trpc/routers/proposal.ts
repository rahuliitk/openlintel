import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  contractTemplates, proposals, projects, eq, and,
} from '@openlintel/db';

export const proposalRouter = router({
  // ── Contract Templates ──────────────────────────────────

  listTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.contractTemplates.findMany({
        where: eq(contractTemplates.userId, ctx.userId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db.insert(contractTemplates).values({
        userId: ctx.userId,
        name: input.name,
        content: input.content,
        category: input.category ?? null,
      }).returning();
      return template;
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.query.contractTemplates.findFirst({
        where: and(eq(contractTemplates.id, input.id), eq(contractTemplates.userId, ctx.userId)),
      });
      if (!template) throw new Error('Template not found');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(contractTemplates).set(data).where(eq(contractTemplates.id, id)).returning();
      return updated;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.query.contractTemplates.findFirst({
        where: and(eq(contractTemplates.id, input.id), eq(contractTemplates.userId, ctx.userId)),
      });
      if (!template) throw new Error('Template not found');
      await ctx.db.delete(contractTemplates).where(eq(contractTemplates.id, input.id));
      return { success: true };
    }),

  // ── Proposals ───────────────────────────────────────────

  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.proposals.findMany({
        where: eq(proposals.projectId, input.projectId),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: { project: true, template: true },
      });
      if (!proposal) throw new Error('Proposal not found');
      if ((proposal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return proposal;
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      templateId: z.string().optional(),
      scopeOfWork: z.string().optional(),
      feeStructure: z.any().optional(),
      termsAndConditions: z.string().optional(),
      paymentSchedule: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [proposal] = await ctx.db.insert(proposals).values({
        projectId: input.projectId,
        templateId: input.templateId ?? null,
        scopeOfWork: input.scopeOfWork ?? null,
        feeStructure: input.feeStructure ?? null,
        termsAndConditions: input.termsAndConditions ?? null,
        paymentSchedule: input.paymentSchedule ?? null,
      }).returning();
      return proposal;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      scopeOfWork: z.string().optional(),
      feeStructure: z.any().optional(),
      termsAndConditions: z.string().optional(),
      paymentSchedule: z.any().optional(),
      status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: { project: true },
      });
      if (!proposal) throw new Error('Proposal not found');
      if ((proposal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const updates: any = { ...data, updatedAt: new Date() };
      if (input.status === 'accepted') updates.signedAt = new Date();
      const [updated] = await ctx.db.update(proposals).set(updates).where(eq(proposals.id, id)).returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: { project: true },
      });
      if (!proposal) throw new Error('Proposal not found');
      if ((proposal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(proposals).where(eq(proposals.id, input.id));
      return { success: true };
    }),

  generatePdf: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: { project: true },
      });
      if (!proposal) throw new Error('Proposal not found');
      if ((proposal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      // Generate a PDF key for the proposal — actual generation handled by a service
      const pdfKey = `proposals/${input.id}/proposal-${Date.now()}.pdf`;
      const [updated] = await ctx.db.update(proposals).set({ pdfKey, updatedAt: new Date() }).where(eq(proposals.id, input.id)).returning();
      return updated;
    }),

  send: protectedProcedure
    .input(z.object({
      id: z.string(),
      recipientEmail: z.string().email(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.db.query.proposals.findFirst({
        where: eq(proposals.id, input.id),
        with: { project: true },
      });
      if (!proposal) throw new Error('Proposal not found');
      if ((proposal.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const [updated] = await ctx.db.update(proposals).set({
        status: 'sent',
        signatureRequestId: `sig_${Date.now()}`,
        updatedAt: new Date(),
      }).where(eq(proposals.id, input.id)).returning();
      return { success: true, proposal: updated, sentTo: input.recipientEmail };
    }),
});
