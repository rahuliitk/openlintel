import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  safetyRecords, safetyChecklists, safetyIncidents, safetyTrainingRecords,
  projects, eq, and,
} from '@openlintel/db';

export const safetyRouter = router({
  // ═══════════════════════════════════════════════════════
  // Unified Safety Records (used by the Safety page)
  // ═══════════════════════════════════════════════════════

  // ── List all safety records ─────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.safetyRecords.findMany({
        where: eq(safetyRecords.projectId, input.projectId),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Create a safety record ──────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1),
      recordType: z.string(),
      severity: z.string().default('minor'),
      phase: z.string().default('framing'),
      description: z.string().optional(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [record] = await ctx.db.insert(safetyRecords).values({
        projectId: input.projectId,
        title: input.title,
        recordType: input.recordType,
        severity: input.severity,
        phase: input.phase,
        status: 'open',
        description: input.description ?? null,
        assignedTo: input.assignedTo ?? null,
      }).returning();
      return record;
    }),

  // ── Resolve a safety record ─────────────────────────────
  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.query.safetyRecords.findFirst({
        where: eq(safetyRecords.id, input.id),
        with: { project: true },
      });
      if (!record) throw new Error('Record not found');
      if ((record.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(safetyRecords)
        .set({ status: 'resolved' })
        .where(eq(safetyRecords.id, input.id))
        .returning();
      return updated;
    }),

  // ── Delete a safety record ──────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.query.safetyRecords.findFirst({
        where: eq(safetyRecords.id, input.id),
        with: { project: true },
      });
      if (!record) throw new Error('Record not found');
      if ((record.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(safetyRecords).where(eq(safetyRecords.id, input.id));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════
  // Safety Checklists (legacy)
  // ═══════════════════════════════════════════════════════

  listChecklists: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(safetyChecklists.projectId, input.projectId)];
      if (input.status) conditions.push(eq(safetyChecklists.status, input.status));

      return ctx.db.query.safetyChecklists.findMany({
        where: and(...conditions),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    }),

  createChecklist: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      phase: z.string().min(1),
      templateName: z.string().min(1),
      items: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
        note: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [checklist] = await ctx.db.insert(safetyChecklists).values({
        projectId: input.projectId,
        phase: input.phase,
        templateName: input.templateName,
        items: input.items,
        status: 'pending',
      }).returning();
      return checklist;
    }),

  completeChecklist: protectedProcedure
    .input(z.object({
      id: z.string(),
      items: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
        note: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const checklist = await ctx.db.query.safetyChecklists.findFirst({
        where: eq(safetyChecklists.id, input.id),
        with: { project: true },
      });
      if (!checklist) throw new Error('Checklist not found');
      if ((checklist.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const allChecked = input.items.every((item) => item.checked);

      const [updated] = await ctx.db.update(safetyChecklists).set({
        items: input.items,
        completedBy: ctx.userId,
        completedAt: new Date(),
        status: allChecked ? 'completed' : 'incomplete',
      }).where(eq(safetyChecklists.id, input.id)).returning();
      return updated;
    }),

  // ═══════════════════════════════════════════════════════
  // Safety Incidents (legacy)
  // ═══════════════════════════════════════════════════════

  listIncidents: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      severity: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(safetyIncidents.projectId, input.projectId)];
      if (input.severity) conditions.push(eq(safetyIncidents.severity, input.severity));
      if (input.status) conditions.push(eq(safetyIncidents.status, input.status));

      return ctx.db.query.safetyIncidents.findMany({
        where: and(...conditions),
        orderBy: (i, { desc }) => [desc(i.date)],
      });
    }),

  reportIncident: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      incidentType: z.string().min(1),
      severity: z.enum(['minor', 'moderate', 'serious', 'critical']).optional(),
      date: z.date(),
      description: z.string().min(1),
      location: z.string().optional(),
      witnesses: z.array(z.string()).optional(),
      photoKeys: z.array(z.string()).optional(),
      correctiveActions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [incident] = await ctx.db.insert(safetyIncidents).values({
        projectId: input.projectId,
        incidentType: input.incidentType,
        severity: input.severity ?? 'minor',
        date: input.date,
        description: input.description,
        location: input.location ?? null,
        witnesses: input.witnesses ?? null,
        photoKeys: input.photoKeys ?? null,
        correctiveActions: input.correctiveActions ?? null,
        reportedBy: ctx.userId,
        status: 'reported',
      }).returning();
      return incident;
    }),

  updateIncident: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['reported', 'investigating', 'resolved', 'closed']).optional(),
      correctiveActions: z.string().optional(),
      photoKeys: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const incident = await ctx.db.query.safetyIncidents.findFirst({
        where: eq(safetyIncidents.id, input.id),
        with: { project: true },
      });
      if (!incident) throw new Error('Incident not found');
      if ((incident.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...data } = input;
      const [updated] = await ctx.db.update(safetyIncidents).set(data)
        .where(eq(safetyIncidents.id, id)).returning();
      return updated;
    }),

  // ═══════════════════════════════════════════════════════
  // Safety Training Records (legacy)
  // ═══════════════════════════════════════════════════════

  listTrainingRecords: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      trainingType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(safetyTrainingRecords.projectId, input.projectId)];
      if (input.trainingType) conditions.push(eq(safetyTrainingRecords.trainingType, input.trainingType));

      return ctx.db.query.safetyTrainingRecords.findMany({
        where: and(...conditions),
        orderBy: (t, { desc }) => [desc(t.completedDate)],
      });
    }),

  addTrainingRecord: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      workerName: z.string().min(1),
      trainingType: z.string().min(1),
      certificationNumber: z.string().optional(),
      completedDate: z.date(),
      expirationDate: z.date().optional(),
      documentKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [record] = await ctx.db.insert(safetyTrainingRecords).values({
        projectId: input.projectId,
        workerName: input.workerName,
        trainingType: input.trainingType,
        certificationNumber: input.certificationNumber ?? null,
        completedDate: input.completedDate,
        expirationDate: input.expirationDate ?? null,
        documentKey: input.documentKey ?? null,
      }).returning();
      return record;
    }),
});
