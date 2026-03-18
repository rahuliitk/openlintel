import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  rfis, projects, eq, and, count, desc,
} from '@openlintel/db';

export const rfiRouter = router({
  // ── List RFIs with optional filters ─────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
      priority: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(rfis.projectId, input.projectId)];
      if (input.status) conditions.push(eq(rfis.status, input.status));
      if (input.priority) conditions.push(eq(rfis.priority, input.priority));

      return ctx.db.query.rfis.findMany({
        where: and(...conditions),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Get RFI by ID ──────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rfi = await ctx.db.query.rfis.findFirst({
        where: eq(rfis.id, input.id),
        with: { project: true, asker: true, relatedDrawing: true },
      });
      if (!rfi) throw new Error('RFI not found');
      if ((rfi.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return rfi;
    }),

  // ── Create RFI with auto-increment rfiNumber ───────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      subject: z.string().min(1),
      question: z.string().min(1),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      assignedTo: z.string().optional(),
      relatedDrawingId: z.string().optional(),
      relatedSpecSection: z.string().optional(),
      attachments: z.array(z.string()).optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Auto-increment rfiNumber by counting existing RFIs for this project
      const existingRfis = await ctx.db.query.rfis.findMany({
        where: eq(rfis.projectId, input.projectId),
      });
      const nextRfiNumber = existingRfis.length + 1;

      const [rfi] = await ctx.db.insert(rfis).values({
        projectId: input.projectId,
        rfiNumber: nextRfiNumber,
        subject: input.subject,
        question: input.question,
        priority: input.priority ?? 'normal',
        askedBy: ctx.userId,
        assignedTo: input.assignedTo ?? null,
        relatedDrawingId: input.relatedDrawingId ?? null,
        relatedSpecSection: input.relatedSpecSection ?? null,
        attachments: input.attachments ?? null,
        dueDate: input.dueDate ?? null,
        status: 'open',
      }).returning();
      return rfi;
    }),

  // ── Respond to an RFI ──────────────────────────────────
  respond: protectedProcedure
    .input(z.object({
      id: z.string(),
      response: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const rfi = await ctx.db.query.rfis.findFirst({
        where: eq(rfis.id, input.id),
        with: { project: true },
      });
      if (!rfi) throw new Error('RFI not found');
      if ((rfi.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(rfis).set({
        response: input.response,
        respondedBy: ctx.userId,
        respondedAt: new Date(),
        status: 'answered',
        updatedAt: new Date(),
      }).where(eq(rfis.id, input.id)).returning();
      return updated;
    }),

  // ── Close an RFI ───────────────────────────────────────
  close: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rfi = await ctx.db.query.rfis.findFirst({
        where: eq(rfis.id, input.id),
        with: { project: true },
      });
      if (!rfi) throw new Error('RFI not found');
      if ((rfi.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(rfis).set({
        status: 'closed',
        updatedAt: new Date(),
      }).where(eq(rfis.id, input.id)).returning();
      return updated;
    }),

  // ── Escalate an RFI ────────────────────────────────────
  escalate: protectedProcedure
    .input(z.object({
      id: z.string(),
      assignedTo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rfi = await ctx.db.query.rfis.findFirst({
        where: eq(rfis.id, input.id),
        with: { project: true },
      });
      if (!rfi) throw new Error('RFI not found');
      if ((rfi.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(rfis).set({
        assignedTo: input.assignedTo,
        priority: 'urgent',
        status: 'escalated',
        updatedAt: new Date(),
      }).where(eq(rfis.id, input.id)).returning();
      return updated;
    }),
});
