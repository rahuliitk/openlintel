import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  serviceBookings, contractors, projects, eq, and,
} from '@openlintel/db';

export const serviceBookingRouter = router({
  // ── List bookings ───────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(serviceBookings.clientUserId, ctx.userId)];
      if (input?.projectId) conditions.push(eq(serviceBookings.projectId, input.projectId));
      if (input?.status) conditions.push(eq(serviceBookings.status, input.status));
      return ctx.db.query.serviceBookings.findMany({
        where: and(...conditions),
        orderBy: (b, { desc }) => [desc(b.scheduledDate)],
        with: { professional: true },
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.query.serviceBookings.findFirst({
        where: and(eq(serviceBookings.id, input.id), eq(serviceBookings.clientUserId, ctx.userId)),
        with: { professional: true, project: true },
      });
      if (!booking) throw new Error('Booking not found');
      return booking;
    }),

  // ── Book a service ──────────────────────────────────────
  book: protectedProcedure
    .input(z.object({
      professionalId: z.string(),
      projectId: z.string().optional(),
      serviceType: z.string().min(1),
      scheduledDate: z.string().datetime(),
      duration: z.number().min(1).optional(),
      amount: z.number().min(0).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify professional exists
      const professional = await ctx.db.query.contractors.findFirst({
        where: eq(contractors.id, input.professionalId),
      });
      if (!professional) throw new Error('Professional not found');

      // Verify project ownership if provided
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
      }

      const [booking] = await ctx.db.insert(serviceBookings).values({
        professionalId: input.professionalId,
        projectId: input.projectId ?? null,
        clientUserId: ctx.userId,
        serviceType: input.serviceType,
        scheduledDate: new Date(input.scheduledDate),
        duration: input.duration ?? null,
        amount: input.amount ?? null,
        notes: input.notes ?? null,
        status: 'pending',
      }).returning();
      return booking;
    }),

  // ── Update booking status ───────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.serviceBookings.findFirst({
        where: and(eq(serviceBookings.id, input.id), eq(serviceBookings.clientUserId, ctx.userId)),
      });
      if (!booking) throw new Error('Booking not found');
      const [updated] = await ctx.db.update(serviceBookings).set({
        status: input.status,
      }).where(eq(serviceBookings.id, input.id)).returning();
      return updated;
    }),

  // ── Cancel booking ──────────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.serviceBookings.findFirst({
        where: and(eq(serviceBookings.id, input.id), eq(serviceBookings.clientUserId, ctx.userId)),
      });
      if (!booking) throw new Error('Booking not found');
      if (booking.status === 'completed') throw new Error('Cannot cancel a completed booking');
      const [updated] = await ctx.db.update(serviceBookings).set({
        status: 'cancelled',
      }).where(eq(serviceBookings.id, input.id)).returning();
      return updated;
    }),

  // ── Complete booking ────────────────────────────────────
  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.serviceBookings.findFirst({
        where: and(eq(serviceBookings.id, input.id), eq(serviceBookings.clientUserId, ctx.userId)),
      });
      if (!booking) throw new Error('Booking not found');
      if (booking.status === 'cancelled') throw new Error('Cannot complete a cancelled booking');
      const [updated] = await ctx.db.update(serviceBookings).set({
        status: 'completed',
      }).where(eq(serviceBookings.id, input.id)).returning();
      return updated;
    }),

  // ── Delete booking ──────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.serviceBookings.findFirst({
        where: and(eq(serviceBookings.id, input.id), eq(serviceBookings.clientUserId, ctx.userId)),
      });
      if (!booking) throw new Error('Booking not found');
      await ctx.db.delete(serviceBookings).where(eq(serviceBookings.id, input.id));
      return { success: true };
    }),
});
