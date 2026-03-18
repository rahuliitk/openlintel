import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  sampleRequests, projects, eq, and,
} from '@openlintel/db';

export const sampleRequestRouter = router({
  // ── List sample requests ────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(sampleRequests.userId, ctx.userId)];
      if (input?.projectId) conditions.push(eq(sampleRequests.projectId, input.projectId));
      if (input?.status) conditions.push(eq(sampleRequests.status, input.status));
      return ctx.db.query.sampleRequests.findMany({
        where: and(...conditions),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.query.sampleRequests.findFirst({
        where: and(eq(sampleRequests.id, input.id), eq(sampleRequests.userId, ctx.userId)),
      });
      if (!request) throw new Error('Sample request not found');
      return request;
    }),

  // ── Request samples ─────────────────────────────────────
  request: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      products: z.array(z.object({
        productId: z.string(),
        productName: z.string(),
        quantity: z.number().default(1),
      })),
      shippingAddress: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership if provided
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
      }

      const [request] = await ctx.db.insert(sampleRequests).values({
        userId: ctx.userId,
        projectId: input.projectId ?? null,
        products: input.products,
        shippingAddress: input.shippingAddress,
        status: 'requested',
      }).returning();
      return request;
    }),

  // ── Update status ───────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['requested', 'approved', 'shipped', 'delivered', 'cancelled']),
      trackingNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.sampleRequests.findFirst({
        where: and(eq(sampleRequests.id, input.id), eq(sampleRequests.userId, ctx.userId)),
      });
      if (!request) throw new Error('Sample request not found');
      const updates: any = { status: input.status };
      if (input.trackingNumber) updates.trackingNumber = input.trackingNumber;
      const [updated] = await ctx.db.update(sampleRequests).set(updates).where(eq(sampleRequests.id, input.id)).returning();
      return updated;
    }),

  // ── Cancel request ──────────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.sampleRequests.findFirst({
        where: and(eq(sampleRequests.id, input.id), eq(sampleRequests.userId, ctx.userId)),
      });
      if (!request) throw new Error('Sample request not found');
      if (request.status === 'delivered') throw new Error('Cannot cancel a delivered request');
      const [updated] = await ctx.db.update(sampleRequests).set({
        status: 'cancelled',
      }).where(eq(sampleRequests.id, input.id)).returning();
      return updated;
    }),

  // ── Delete request ──────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.sampleRequests.findFirst({
        where: and(eq(sampleRequests.id, input.id), eq(sampleRequests.userId, ctx.userId)),
      });
      if (!request) throw new Error('Sample request not found');
      await ctx.db.delete(sampleRequests).where(eq(sampleRequests.id, input.id));
      return { success: true };
    }),
});
