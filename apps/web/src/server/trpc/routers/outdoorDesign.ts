import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  outdoorDesigns, projects, eq, and,
} from '@openlintel/db';

export const outdoorDesignRouter = router({
  // ── List zones (frontend-facing) ──────────────────────────
  listZones: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const designs = await ctx.db.query.outdoorDesigns.findMany({
        where: eq(outdoorDesigns.projectId, input.projectId),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
      // Unpack jsonb into the flat shape the frontend expects
      return designs.map((d) => {
        const elems = (d.elements as any) ?? {};
        const mats = (d.materials as any) ?? {};
        return {
          id: d.id,
          name: elems.name ?? d.designType,
          zoneType: d.designType,
          areaSqft: elems.areaSqft ?? null,
          material: mats.material ?? null,
          estimatedCost: elems.estimatedCost ?? null,
          description: elems.description ?? null,
          features: elems.features ?? [],
          createdAt: d.createdAt,
        };
      });
    }),

  // ── Create zone (frontend-facing) ─────────────────────────
  createZone: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      zoneType: z.string(),
      areaSqft: z.number().optional(),
      material: z.string().optional(),
      estimatedCost: z.number().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const elements = {
        name: input.name,
        areaSqft: input.areaSqft ?? null,
        description: input.description ?? null,
        features: input.features ?? [],
        estimatedCost: input.estimatedCost ?? null,
      };
      const materials = {
        material: input.material ?? null,
      };
      const [design] = await ctx.db.insert(outdoorDesigns).values({
        projectId: input.projectId,
        designType: input.zoneType,
        elements,
        materials,
      }).returning();
      return {
        id: design.id,
        name: input.name,
        zoneType: input.zoneType,
        areaSqft: input.areaSqft ?? null,
        material: input.material ?? null,
        estimatedCost: input.estimatedCost ?? null,
        description: input.description ?? null,
        features: input.features ?? [],
        createdAt: design.createdAt,
      };
    }),

  // ── Delete zone (frontend-facing) ─────────────────────────
  deleteZone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.outdoorDesigns.findFirst({
        where: eq(outdoorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Outdoor design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(outdoorDesigns).where(eq(outdoorDesigns.id, input.id));
      return { success: true };
    }),

  // ── List outdoor designs ────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.outdoorDesigns.findMany({
        where: eq(outdoorDesigns.projectId, input.projectId),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const design = await ctx.db.query.outdoorDesigns.findFirst({
        where: eq(outdoorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Outdoor design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return design;
    }),

  // ── Create outdoor design ──────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      designType: z.enum(['deck', 'patio', 'landscape', 'pool', 'outdoor_kitchen', 'garden', 'driveway', 'fence']),
      elements: z.any().optional(),
      materials: z.any().optional(),
      gradeIntegration: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [design] = await ctx.db.insert(outdoorDesigns).values({
        projectId: input.projectId,
        designType: input.designType,
        elements: input.elements ?? null,
        materials: input.materials ?? null,
        gradeIntegration: input.gradeIntegration ?? null,
      }).returning();
      return design;
    }),

  // ── Update outdoor design ──────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      designType: z.string().optional(),
      elements: z.any().optional(),
      materials: z.any().optional(),
      gradeIntegration: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.outdoorDesigns.findFirst({
        where: eq(outdoorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Outdoor design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(outdoorDesigns).set(data).where(eq(outdoorDesigns.id, id)).returning();
      return updated;
    }),

  // ── Delete outdoor design ──────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.outdoorDesigns.findFirst({
        where: eq(outdoorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Outdoor design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(outdoorDesigns).where(eq(outdoorDesigns.id, input.id));
      return { success: true };
    }),
});
