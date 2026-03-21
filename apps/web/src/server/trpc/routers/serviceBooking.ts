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
      const rows = await ctx.db.query.serviceBookings.findMany({
        where: and(...conditions),
        orderBy: (b, { desc }) => [desc(b.scheduledDate)],
        with: { professional: true },
      });
      return rows.map((row) => {
        let meta: any = {};
        try { meta = JSON.parse(row.notes ?? '{}'); } catch { /* plain text notes */ }
        return {
          ...row,
          providerName: meta.providerName ?? (row as any).professional?.name ?? 'Unknown',
          providerEmail: meta.providerEmail ?? (row as any).professional?.email ?? null,
          durationMinutes: meta.durationMinutes ?? row.duration ?? 60,
          estimatedCost: meta.estimatedCost ?? row.amount ?? null,
          location: meta.location ?? null,
        };
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

  // ── Create booking (frontend-facing) ──────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      serviceType: z.string().min(1),
      providerName: z.string().min(1),
      providerEmail: z.string().optional(),
      scheduledDate: z.string(),
      durationMinutes: z.number().optional(),
      estimatedCost: z.number().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Find or create a contractor record for the provider
      let professional = await ctx.db.query.contractors.findFirst({
        where: eq(contractors.name, input.providerName),
      });
      if (!professional) {
        const [created] = await ctx.db.insert(contractors).values({
          name: input.providerName,
          email: input.providerEmail ?? null,
        }).returning();
        professional = created;
      }

      // Store extra frontend fields in notes as JSON
      const metaNotes = JSON.stringify({
        providerName: input.providerName,
        providerEmail: input.providerEmail ?? null,
        location: input.location ?? null,
        durationMinutes: input.durationMinutes ?? 60,
        estimatedCost: input.estimatedCost ?? null,
        userNotes: input.notes ?? null,
      });

      const [booking] = await ctx.db.insert(serviceBookings).values({
        professionalId: professional.id,
        projectId: input.projectId,
        clientUserId: ctx.userId,
        serviceType: input.serviceType,
        scheduledDate: new Date(input.scheduledDate),
        duration: input.durationMinutes ?? 60,
        amount: input.estimatedCost ?? null,
        notes: metaNotes,
        status: 'requested',
      }).returning();

      // Parse notes to return frontend-expected shape
      const meta = JSON.parse(booking.notes ?? '{}');
      return {
        ...booking,
        providerName: meta.providerName ?? input.providerName,
        providerEmail: meta.providerEmail ?? null,
        durationMinutes: meta.durationMinutes ?? booking.duration ?? 60,
        estimatedCost: meta.estimatedCost ?? booking.amount ?? null,
        location: meta.location ?? null,
      };
    }),
});
