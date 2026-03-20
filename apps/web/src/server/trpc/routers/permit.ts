import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  permits, inspections, projects, eq, and,
} from '@openlintel/db';

export const permitRouter = router({
  // ═══════════════════════════════════════════════════════
  // Permits
  // ═══════════════════════════════════════════════════════

  // ── List permits (used by the page) ─────────────────────
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

      const conditions = [eq(permits.projectId, input.projectId)];
      if (input.status) conditions.push(eq(permits.status, input.status));

      return ctx.db.query.permits.findMany({
        where: and(...conditions),
        with: { inspections: true },
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),

  // ── Create permit (used by the page) ────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      permitType: z.string().min(1),
      permitNumber: z.string().optional(),
      jurisdiction: z.string().optional(),
      submittedDate: z.date().optional(),
      expirationDate: z.date().optional(),
      inspectorName: z.string().optional(),
      inspectorPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [permit] = await ctx.db.insert(permits).values({
        projectId: input.projectId,
        permitType: input.permitType,
        permitNumber: input.permitNumber ?? null,
        jurisdiction: input.jurisdiction ?? null,
        submittedDate: input.submittedDate ?? null,
        applicationDate: input.submittedDate ?? null,
        expirationDate: input.expirationDate ?? null,
        inspectorName: input.inspectorName ?? null,
        inspectorPhone: input.inspectorPhone ?? null,
        notes: input.notes ?? null,
        status: input.submittedDate ? 'submitted' : 'draft',
      }).returning();
      return permit;
    }),

  // ── Delete permit ──────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const permit = await ctx.db.query.permits.findFirst({
        where: eq(permits.id, input.id),
        with: { project: true },
      });
      if (!permit) throw new Error('Permit not found');
      if ((permit.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(permits).where(eq(permits.id, input.id));
      return { success: true };
    }),

  // ── Update permit ──────────────────────────────────────
  updatePermit: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'denied', 'expired']).optional(),
      permitNumber: z.string().optional(),
      approvalDate: z.date().optional(),
      expirationDate: z.date().optional(),
      documents: z.array(z.string()).optional(),
      fees: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const permit = await ctx.db.query.permits.findFirst({
        where: eq(permits.id, input.id),
        with: { project: true },
      });
      if (!permit) throw new Error('Permit not found');
      if ((permit.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...data } = input;
      const updates: any = { ...data, updatedAt: new Date() };
      if (input.status === 'approved' && input.approvalDate) {
        updates.approvalDate = input.approvalDate;
      }

      const [updated] = await ctx.db.update(permits).set(updates)
        .where(eq(permits.id, id)).returning();
      return updated;
    }),

  // ═══════════════════════════════════════════════════════
  // Inspections
  // ═══════════════════════════════════════════════════════

  // ── List inspections by project ─────────────────────────
  listInspections: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Get all permits for this project, then get their inspections
      const projectPermits = await ctx.db.query.permits.findMany({
        where: eq(permits.projectId, input.projectId),
        with: { inspections: true },
      });

      return projectPermits.flatMap((p) => (p.inspections ?? []).map((i: any) => ({
        ...i,
        permitType: p.permitType,
        permitNumber: p.permitNumber,
      })));
    }),

  // ── Schedule inspection ────────────────────────────────
  scheduleInspection: protectedProcedure
    .input(z.object({
      permitId: z.string(),
      inspectionType: z.string().min(1),
      scheduledDate: z.date(),
      inspectorName: z.string().optional(),
      inspectorPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const permit = await ctx.db.query.permits.findFirst({
        where: eq(permits.id, input.permitId),
        with: { project: true },
      });
      if (!permit) throw new Error('Permit not found');
      if ((permit.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [inspection] = await ctx.db.insert(inspections).values({
        permitId: input.permitId,
        inspectionType: input.inspectionType,
        scheduledDate: input.scheduledDate,
        inspectorName: input.inspectorName ?? null,
        inspectorPhone: input.inspectorPhone ?? null,
        notes: input.notes ?? null,
      }).returning();
      return inspection;
    }),

  // ── Record inspection result ───────────────────────────
  recordInspectionResult: protectedProcedure
    .input(z.object({
      id: z.string(),
      result: z.enum(['passed', 'failed', 'partial', 'cancelled']),
      completedDate: z.date().optional(),
      notes: z.string().optional(),
      photoKeys: z.array(z.string()).optional(),
      corrections: z.array(z.object({
        item: z.string(),
        description: z.string(),
        deadline: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const inspection = await ctx.db.query.inspections.findFirst({
        where: eq(inspections.id, input.id),
        with: { permit: true },
      });
      if (!inspection) throw new Error('Inspection not found');

      const permit = await ctx.db.query.permits.findFirst({
        where: eq(permits.id, inspection.permitId),
        with: { project: true },
      });
      if (!permit || (permit.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...data } = input;
      const [updated] = await ctx.db.update(inspections).set({
        result: data.result,
        completedDate: data.completedDate ?? new Date(),
        notes: data.notes ?? null,
        photoKeys: data.photoKeys ?? null,
        corrections: data.corrections ?? null,
      }).where(eq(inspections.id, id)).returning();
      return updated;
    }),
});
