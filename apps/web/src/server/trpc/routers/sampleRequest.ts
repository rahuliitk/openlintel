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
      const rows = await ctx.db.query.sampleRequests.findMany({
        where: and(...conditions),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
      return rows.map((row) => {
        const meta = (row.products as any) ?? {};
        // Support both old format (array of products) and new format (material metadata object)
        if (Array.isArray(meta)) {
          return row;
        }
        return {
          ...row,
          name: meta.name ?? 'Untitled Sample',
          category: meta.category ?? null,
          supplier: meta.supplier ?? null,
          color: meta.color ?? null,
          sku: meta.sku ?? null,
          room: meta.room ?? null,
          decision: meta.decision ?? null,
          notes: meta.notes ?? null,
        };
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
      // Legacy fields
      products: z.array(z.object({
        productId: z.string(),
        productName: z.string(),
        quantity: z.number().default(1),
      })).optional(),
      shippingAddress: z.string().optional(),
      // Frontend material sample fields
      name: z.string().optional(),
      category: z.string().optional(),
      supplier: z.string().optional(),
      color: z.string().optional(),
      sku: z.string().optional(),
      room: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership if provided
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
      }

      // Determine if this is a material sample request (new frontend) or legacy product request
      let productsData: any;
      if (input.name) {
        // New frontend format: store material metadata in products jsonb
        productsData = {
          name: input.name,
          category: input.category ?? null,
          supplier: input.supplier ?? null,
          color: input.color ?? null,
          sku: input.sku ?? null,
          room: input.room ?? null,
          notes: input.notes ?? null,
          decision: null,
        };
      } else {
        productsData = input.products ?? [];
      }

      const [request] = await ctx.db.insert(sampleRequests).values({
        userId: ctx.userId,
        projectId: input.projectId ?? null,
        products: productsData,
        shippingAddress: input.shippingAddress ?? null,
        status: 'requested',
      }).returning();

      // Return with unpacked metadata for new frontend format
      const meta = (request.products as any) ?? {};
      if (!Array.isArray(meta) && meta.name) {
        return {
          ...request,
          name: meta.name,
          category: meta.category,
          supplier: meta.supplier,
          color: meta.color,
          sku: meta.sku,
          room: meta.room,
          decision: meta.decision,
          notes: meta.notes,
        };
      }
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

  // ── Update decision (frontend-facing) ─────────────────
  updateDecision: protectedProcedure
    .input(z.object({
      id: z.string(),
      decision: z.enum(['approved', 'rejected', 'pending']),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.sampleRequests.findFirst({
        where: and(eq(sampleRequests.id, input.id), eq(sampleRequests.userId, ctx.userId)),
      });
      if (!request) throw new Error('Sample request not found');

      // Update decision in the products jsonb metadata
      const meta = (request.products as any) ?? {};
      if (!Array.isArray(meta)) {
        meta.decision = input.decision;
      }
      const [updated] = await ctx.db.update(sampleRequests)
        .set({ products: meta })
        .where(eq(sampleRequests.id, input.id))
        .returning();

      const updatedMeta = (updated.products as any) ?? {};
      if (!Array.isArray(updatedMeta) && updatedMeta.name) {
        return {
          ...updated,
          name: updatedMeta.name,
          category: updatedMeta.category,
          supplier: updatedMeta.supplier,
          color: updatedMeta.color,
          sku: updatedMeta.sku,
          room: updatedMeta.room,
          decision: updatedMeta.decision,
          notes: updatedMeta.notes,
        };
      }
      return updated;
    }),
});
