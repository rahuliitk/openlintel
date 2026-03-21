import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  multiUnitPlans, projects, eq, and,
} from '@openlintel/db';

export const multiUnitRouter = router({
  // ── Get multi-unit plan ─────────────────────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.multiUnitPlans.findFirst({
        where: eq(multiUnitPlans.projectId, input.projectId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  // ── List multi-unit plans ───────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.multiUnitPlans.findMany({
        where: eq(multiUnitPlans.projectId, input.projectId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  // ── Save multi-unit plan (upsert) ──────────────────────
  save: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      id: z.string().optional(),
      unitCount: z.number().min(1),
      units: z.any().optional(),
      sharedSpaces: z.any().optional(),
      parkingSpaces: z.number().optional(),
      zoningCompliance: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      if (input.id) {
        const existing = await ctx.db.query.multiUnitPlans.findFirst({
          where: eq(multiUnitPlans.id, input.id),
        });
        if (!existing) throw new Error('Multi-unit plan not found');
        const { id, projectId, ...data } = input;
        const [updated] = await ctx.db.update(multiUnitPlans).set(data).where(eq(multiUnitPlans.id, id)).returning();
        return updated;
      }

      const [plan] = await ctx.db.insert(multiUnitPlans).values({
        projectId: input.projectId,
        unitCount: input.unitCount,
        units: input.units ?? null,
        sharedSpaces: input.sharedSpaces ?? null,
        parkingSpaces: input.parkingSpaces ?? null,
        zoningCompliance: input.zoningCompliance ?? null,
      }).returning();
      return plan;
    }),

  // ── Delete plan ─────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.multiUnitPlans.findFirst({
        where: eq(multiUnitPlans.id, input.id),
        with: { project: true },
      });
      if (!plan) throw new Error('Multi-unit plan not found');
      if ((plan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(multiUnitPlans).where(eq(multiUnitPlans.id, input.id));
      return { success: true };
    }),

  // ── List individual units (from jsonb) ─────────────────
  listUnits: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const plan = await ctx.db.query.multiUnitPlans.findFirst({
        where: eq(multiUnitPlans.projectId, input.projectId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
      if (!plan) return [];
      const units = (plan.units as any[]) ?? [];
      return units.map((u: any, idx: number) => ({
        id: u.id ?? `${plan.id}-unit-${idx}`,
        name: u.name ?? `Unit ${idx + 1}`,
        unitType: u.unitType ?? null,
        constructionType: u.constructionType ?? null,
        sqft: u.sqft ?? null,
        bedrooms: u.bedrooms ?? null,
        bathrooms: u.bathrooms ?? null,
        estimatedRent: u.estimatedRent ?? null,
        estimatedCost: u.estimatedCost ?? null,
        notes: u.notes ?? null,
        createdAt: u.createdAt ?? plan.createdAt,
      }));
    }),

  // ── Create a unit (append to jsonb array) ─────────────
  createUnit: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      unitType: z.string(),
      constructionType: z.string().optional(),
      sqft: z.number().optional(),
      bedrooms: z.number(),
      bathrooms: z.number(),
      estimatedRent: z.number().optional(),
      estimatedCost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      let plan = await ctx.db.query.multiUnitPlans.findFirst({
        where: eq(multiUnitPlans.projectId, input.projectId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });

      const newUnit = {
        id: crypto.randomUUID(),
        name: input.name,
        unitType: input.unitType,
        constructionType: input.constructionType ?? null,
        sqft: input.sqft ?? null,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        estimatedRent: input.estimatedRent ?? null,
        estimatedCost: input.estimatedCost ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };

      if (plan) {
        const existingUnits = (plan.units as any[]) ?? [];
        existingUnits.push(newUnit);
        const [updated] = await ctx.db.update(multiUnitPlans).set({
          units: existingUnits,
          unitCount: existingUnits.length,
        }).where(eq(multiUnitPlans.id, plan.id)).returning();
        return newUnit;
      }

      const [created] = await ctx.db.insert(multiUnitPlans).values({
        projectId: input.projectId,
        unitCount: 1,
        units: [newUnit],
        sharedSpaces: null,
        parkingSpaces: null,
        zoningCompliance: null,
      }).returning();
      return newUnit;
    }),

  // ── Delete a unit (remove from jsonb array) ───────────
  deleteUnit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // We need to find which plan contains this unit
      // Get all plans for projects owned by this user
      const userProjects = await ctx.db.query.projects.findMany({
        where: eq(projects.userId, ctx.userId),
      });
      const projectIds = userProjects.map((p) => p.id);
      if (projectIds.length === 0) throw new Error('Unit not found');

      const plans = await ctx.db.query.multiUnitPlans.findMany();
      for (const plan of plans) {
        if (!projectIds.includes(plan.projectId)) continue;
        const units = (plan.units as any[]) ?? [];
        const idx = units.findIndex((u: any) => u.id === input.id);
        if (idx !== -1) {
          units.splice(idx, 1);
          await ctx.db.update(multiUnitPlans).set({
            units: units,
            unitCount: Math.max(units.length, 1),
          }).where(eq(multiUnitPlans.id, plan.id));
          return { success: true };
        }
      }
      throw new Error('Unit not found');
    }),

  // ── Check zoning compliance ─────────────────────────────
  checkZoning: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      unitCount: z.number().min(1),
      totalAreaSqm: z.number().optional(),
      buildingHeight: z.number().optional(),
      parkingSpaces: z.number().optional(),
      zoningDistrict: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Basic zoning compliance checks
      const checks: any[] = [];

      // Parking ratio check (typical: 1.5 spaces per unit)
      const requiredParking = Math.ceil(input.unitCount * 1.5);
      const parkingProvided = input.parkingSpaces ?? 0;
      checks.push({
        check: 'parking_ratio',
        passed: parkingProvided >= requiredParking,
        required: requiredParking,
        provided: parkingProvided,
        message: parkingProvided >= requiredParking
          ? `Parking requirement met (${parkingProvided}/${requiredParking})`
          : `Insufficient parking: need ${requiredParking}, have ${parkingProvided}`,
      });

      // Density check (typical: 40 units/acre for R-3 zoning)
      if (input.totalAreaSqm) {
        const acres = input.totalAreaSqm / 4046.86;
        const density = input.unitCount / acres;
        checks.push({
          check: 'density',
          passed: density <= 40,
          density: Math.round(density * 10) / 10,
          maxAllowed: 40,
          message: density <= 40
            ? `Density within limits (${Math.round(density * 10) / 10} units/acre)`
            : `Density exceeds limit: ${Math.round(density * 10) / 10} > 40 units/acre`,
        });
      }

      // Height check (typical max: 12m for R-3)
      if (input.buildingHeight) {
        const maxHeight = 12;
        checks.push({
          check: 'building_height',
          passed: input.buildingHeight <= maxHeight,
          height: input.buildingHeight,
          maxAllowed: maxHeight,
          message: input.buildingHeight <= maxHeight
            ? `Height within limits (${input.buildingHeight}m)`
            : `Height exceeds limit: ${input.buildingHeight}m > ${maxHeight}m`,
        });
      }

      const passedAll = checks.every((c) => c.passed);

      return {
        projectId: input.projectId,
        zoningDistrict: input.zoningDistrict ?? 'R-3 (default)',
        overallCompliance: passedAll ? 'compliant' : 'non_compliant',
        checks,
        recommendations: checks.filter((c) => !c.passed).map((c) => c.message),
      };
    }),
});
