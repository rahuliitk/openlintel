import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  leads, leadActivities, eq, and,
} from '@openlintel/db';

export const crmRouter = router({
  // ── Leads ───────────────────────────────────────────────

  listLeads: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(leads.userId, ctx.userId)];
      if (input?.status) conditions.push(eq(leads.status, input.status));
      if (input?.projectId) conditions.push(eq(leads.projectId, input.projectId));
      const rows = await ctx.db.query.leads.findMany({
        where: and(...conditions),
        orderBy: (l, { desc }) => [desc(l.updatedAt)],
      });
      return rows.map((lead) => ({
        ...lead,
        stage: lead.status,
        company: null,
      }));
    }),

  getLeadById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.userId)),
        with: { activities: true },
      });
      if (!lead) throw new Error('Lead not found');
      return lead;
    }),

  createLead: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      source: z.string().optional(),
      estimatedValue: z.number().optional(),
      notes: z.string().optional(),
      nextFollowUp: z.string().datetime().optional(),
      projectId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db.insert(leads).values({
        userId: ctx.userId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        source: input.source ?? null,
        estimatedValue: input.estimatedValue ?? null,
        notes: input.notes ?? null,
        nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : null,
        projectId: input.projectId ?? null,
      }).returning();
      return { ...lead, company: input.company ?? null };
    }),

  updateLead: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost']).optional(),
      estimatedValue: z.number().optional(),
      notes: z.string().optional(),
      nextFollowUp: z.string().datetime().nullable().optional(),
      projectId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      const { id, nextFollowUp, ...rest } = input;
      const updates: any = { ...rest, updatedAt: new Date() };
      if (nextFollowUp !== undefined) {
        updates.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;
      }
      const [updated] = await ctx.db.update(leads).set(updates).where(eq(leads.id, id)).returning();
      return updated;
    }),

  updateLeadStage: protectedProcedure
    .input(z.object({
      id: z.string(),
      stage: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      const [updated] = await ctx.db.update(leads).set({
        status: input.stage,
        updatedAt: new Date(),
      }).where(eq(leads.id, input.id)).returning();
      return updated;
    }),

  deleteLead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      await ctx.db.delete(leads).where(eq(leads.id, input.id));
      return { success: true };
    }),

  // ── Pipeline view ───────────────────────────────────────

  getPipeline: protectedProcedure
    .query(async ({ ctx }) => {
      const allLeads = await ctx.db.query.leads.findMany({
        where: eq(leads.userId, ctx.userId),
        orderBy: (l, { desc }) => [desc(l.updatedAt)],
      });
      const pipeline: Record<string, typeof allLeads> = {
        new: [],
        contacted: [],
        qualified: [],
        proposal_sent: [],
        won: [],
        lost: [],
      };
      allLeads.forEach((lead) => {
        const status = lead.status as string;
        if (pipeline[status]) pipeline[status].push(lead);
        else pipeline.new.push(lead);
      });
      return pipeline;
    }),

  // ── Lead Activities ─────────────────────────────────────

  listActivities: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      return ctx.db.query.leadActivities.findMany({
        where: eq(leadActivities.leadId, input.leadId),
        orderBy: (a, { desc }) => [desc(a.date)],
      });
    }),

  logActivity: protectedProcedure
    .input(z.object({
      leadId: z.string(),
      activityType: z.enum(['call', 'email', 'meeting', 'note', 'site_visit', 'follow_up']),
      description: z.string().min(1),
      date: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      const [activity] = await ctx.db.insert(leadActivities).values({
        leadId: input.leadId,
        activityType: input.activityType,
        description: input.description,
        date: input.date ? new Date(input.date) : new Date(),
      }).returning();
      // Update lead's updatedAt
      await ctx.db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, input.leadId));
      return activity;
    }),

  deleteActivity: protectedProcedure
    .input(z.object({ id: z.string(), leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)),
      });
      if (!lead) throw new Error('Lead not found');
      await ctx.db.delete(leadActivities).where(eq(leadActivities.id, input.id));
      return { success: true };
    }),
});
