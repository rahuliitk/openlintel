import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  timeEntries, projects, eq, and,
} from '@openlintel/db';

export const timeTrackingRouter = router({
  // ── List time entries ───────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timeEntries.userId, ctx.userId)];
      if (input?.projectId) conditions.push(eq(timeEntries.projectId, input.projectId));
      if (input?.status) conditions.push(eq(timeEntries.status, input.status));
      return ctx.db.query.timeEntries.findMany({
        where: and(...conditions),
        orderBy: (t, { desc }) => [desc(t.date)],
      });
    }),

  // ── Create time entry (from UI) ──────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      description: z.string(),
      category: z.string().optional(),
      durationMinutes: z.number().min(1),
      hourlyRate: z.number().optional(),
      date: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const hours = Math.round((input.durationMinutes / 60) * 100) / 100;
      const desc = [input.description, input.notes].filter(Boolean).join(' — ');
      const [entry] = await ctx.db.insert(timeEntries).values({
        userId: ctx.userId,
        projectId: input.projectId,
        date: new Date(input.date),
        hours,
        description: desc || null,
        billable: input.hourlyRate != null && input.hourlyRate > 0,
        rate: input.hourlyRate ?? null,
      }).returning();
      return entry;
    }),

  // ── Log time entry ──────────────────────────────────────
  log: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      date: z.string().datetime(),
      hours: z.number().min(0.1).max(24),
      description: z.string().optional(),
      billable: z.boolean().optional(),
      rate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [entry] = await ctx.db.insert(timeEntries).values({
        userId: ctx.userId,
        projectId: input.projectId,
        date: new Date(input.date),
        hours: input.hours,
        description: input.description ?? null,
        billable: input.billable ?? true,
        rate: input.rate ?? null,
      }).returning();
      return entry;
    }),

  // ── Update time entry ───────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      date: z.string().datetime().optional(),
      hours: z.number().min(0.1).max(24).optional(),
      description: z.string().optional(),
      billable: z.boolean().optional(),
      rate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timeEntries.findFirst({
        where: and(eq(timeEntries.id, input.id), eq(timeEntries.userId, ctx.userId)),
      });
      if (!entry) throw new Error('Time entry not found');
      const { id, date, ...rest } = input;
      const updates: any = { ...rest };
      if (date) updates.date = new Date(date);
      const [updated] = await ctx.db.update(timeEntries).set(updates).where(eq(timeEntries.id, id)).returning();
      return updated;
    }),

  // ── Delete time entry ───────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timeEntries.findFirst({
        where: and(eq(timeEntries.id, input.id), eq(timeEntries.userId, ctx.userId)),
      });
      if (!entry) throw new Error('Time entry not found');
      await ctx.db.delete(timeEntries).where(eq(timeEntries.id, input.id));
      return { success: true };
    }),

  // ── Approve time entry ──────────────────────────────────
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timeEntries.findFirst({
        where: eq(timeEntries.id, input.id),
        with: { project: true },
      });
      if (!entry) throw new Error('Time entry not found');
      if ((entry.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const [updated] = await ctx.db.update(timeEntries).set({
        status: 'approved',
        approvedBy: ctx.userId,
      }).where(eq(timeEntries.id, input.id)).returning();
      return updated;
    }),

  // ── Summarize by project ────────────────────────────────
  summarizeByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const entries = await ctx.db.query.timeEntries.findMany({
        where: eq(timeEntries.projectId, input.projectId),
      });
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      const billableHours = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);
      const totalCost = entries.reduce((sum, e) => sum + e.hours * (e.rate ?? 0), 0);
      const byStatus = { draft: 0, approved: 0 };
      entries.forEach((e) => {
        if (e.status === 'approved') byStatus.approved += e.hours;
        else byStatus.draft += e.hours;
      });
      return {
        totalEntries: entries.length,
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        byStatus,
      };
    }),
});
