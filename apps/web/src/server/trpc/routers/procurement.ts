import { z } from 'zod';
import {
  purchaseOrders, projects, jobs, bomResults, vendors,
  schedules, eq, and,
} from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// Delivery lead days by category
const CATEGORY_LEAD_DAYS: Record<string, number> = {
  Furniture: 14,
  Flooring: 10,
  Paint: 7,
  Fixtures: 12,
  Hardware: 7,
  Lighting: 10,
  Plumbing: 10,
  Electrical: 8,
  HVAC: 14,
  Appliances: 14,
};

export const procurementRouter = router({
  generateOrders: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      bomResultId: z.string(),
      targetBudget: z.number().optional(),
      currency: z.string().default('INR'),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Load BOM items from DB with ownership verification
      const bomResult = await ctx.db.query.bomResults.findFirst({
        where: eq(bomResults.id, input.bomResultId),
        with: {
          designVariant: { with: { room: { with: { project: true } } } },
        },
      });
      if (!bomResult) throw new Error('BOM result not found');
      const bomProject = (bomResult.designVariant as any)?.room?.project;
      if (!bomProject || bomProject.userId !== ctx.userId) {
        throw new Error('Access denied');
      }

      const bomItems = (bomResult.items as any[]).map((item) => ({
        name: item.name,
        category: item.category,
        specification: item.specification || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      }));

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'procurement_generation',
          status: 'pending',
          inputJson: { projectId: input.projectId, bomResultId: input.bomResultId },
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Group items by category
      const categoryGroups: Record<string, typeof bomItems> = {};
      for (const item of bomItems) {
        const cat = item.category || 'General';
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(item);
      }

      // Load active vendors for potential matching
      const vendorList = await ctx.db.query.vendors.findMany({
        where: eq(vendors.isActive, true),
      });

      const now = new Date();
      const createdOrders: any[] = [];

      // For each category group, create a purchase order
      for (const [category, items] of Object.entries(categoryGroups)) {
        const totalAmount = items.reduce(
          (sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0),
          0,
        );

        const leadDays = CATEGORY_LEAD_DAYS[category] || 10;
        const expectedDelivery = new Date(now);
        expectedDelivery.setDate(expectedDelivery.getDate() + leadDays);

        // Try to match a vendor by category metadata
        const matchedVendor = vendorList.find((v) => {
          const meta = v.metadata as any;
          if (meta?.categories && Array.isArray(meta.categories)) {
            return meta.categories.some(
              (c: string) => c.toLowerCase() === category.toLowerCase(),
            );
          }
          return false;
        });

        const orderItems = items.map((item) => ({
          name: item.name,
          category: item.category,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        }));

        const [order] = await ctx.db
          .insert(purchaseOrders)
          .values({
            projectId: input.projectId,
            vendorId: matchedVendor?.id || null,
            status: 'draft',
            items: orderItems,
            totalAmount,
            currency: input.currency,
            expectedDelivery,
            notes: `Category: ${category}`,
          })
          .returning();
        if (!order) throw new Error('Failed to create purchase order');

        createdOrders.push({
          id: order.id,
          category,
          items: orderItems,
          totalAmount,
          vendorId: matchedVendor?.id || null,
          vendorName: matchedVendor?.name || null,
          expectedDelivery: expectedDelivery.toISOString(),
        });
      }

      // Update job as completed
      const outputJson = {
        orders: createdOrders,
        totalOrders: createdOrders.length,
        totalAmount: createdOrders.reduce((s, o) => s + o.totalAmount, 0),
        currency: input.currency,
      };

      await ctx.db
        .update(jobs)
        .set({
          status: 'completed',
          outputJson,
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      return { ...job, status: 'completed', outputJson };
    }),

  // Poll job and persist results when complete
  syncOrderResults: protectedProcedure
    .input(z.object({ jobId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      if (job.status !== 'completed') return { synced: false, status: job.status };

      // Check if orders already persisted
      const existing = await ctx.db.query.purchaseOrders.findMany({
        where: eq(purchaseOrders.projectId, input.projectId),
      });

      const output = job.outputJson as any;
      if (!output?.orders?.length) return { synced: false, status: 'no_orders' };

      // Only persist if we don't already have orders from this job
      const jobOrderIds = new Set((output.orders as any[]).map((o: any) => o.id));
      const alreadyPersisted = existing.some((e) => jobOrderIds.has(e.id));
      if (alreadyPersisted) return { synced: true, status: 'already_persisted' };

      // Persist purchase orders to DB
      for (const order of output.orders as any[]) {
        // Find or skip vendor matching
        const vendorMatch = order.vendor_id
          ? await ctx.db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
          : null;

        await ctx.db.insert(purchaseOrders).values({
          projectId: input.projectId,
          vendorId: vendorMatch?.id || null,
          status: 'draft',
          items: order.items || [],
          totalAmount: order.total || order.subtotal || 0,
          currency: order.currency || 'INR',
          expectedDelivery: order.expected_delivery ? new Date(order.expected_delivery) : null,
          notes: order.phase ? `Phase: ${order.phase}` : null,
        });
      }

      return { synced: true, status: 'persisted', count: (output.orders as any[]).length };
    }),

  listOrders: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.purchaseOrders.findMany({
        where: eq(purchaseOrders.projectId, input.projectId),
        with: { vendor: true },
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),

  getOrder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.id),
        with: { vendor: true, project: true },
      });
      if (!order) throw new Error('Order not found');
      if ((order.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return order;
    }),

  updateOrderStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['draft', 'submitted', 'confirmed', 'shipped', 'delivered', 'cancelled']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.id),
        with: { project: true },
      });
      if (!order) throw new Error('Order not found');
      if ((order.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db
        .update(purchaseOrders)
        .set({
          status: input.status,
          notes: input.notes || order.notes,
          actualDelivery: input.status === 'delivered' ? new Date() : order.actualDelivery,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id))
        .returning();
      if (!updated) throw new Error('Failed to update purchase order');
      return updated;
    }),

  trackDelivery: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, input.orderId),
      });
      return { status: order?.status || 'unknown', tracking: null };
    }),

  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),
});
