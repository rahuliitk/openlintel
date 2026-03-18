import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  smartHomePlans, projects, eq, and,
} from '@openlintel/db';

export const smartHomeRouter = router({
  // ── Get smart home plan ─────────────────────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.smartHomePlans.findFirst({
        where: eq(smartHomePlans.projectId, input.projectId),
        orderBy: (p, { desc }) => [desc(p.updatedAt)],
      });
    }),

  // ── Save smart home plan (upsert) ──────────────────────
  save: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      id: z.string().optional(),
      networkRackLocation: z.any().optional(),
      wifiAccessPoints: z.any().optional(),
      smartDevices: z.any().optional(),
      wiringRuns: z.any().optional(),
      scenes: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      if (input.id) {
        // Update existing plan
        const existing = await ctx.db.query.smartHomePlans.findFirst({
          where: eq(smartHomePlans.id, input.id),
        });
        if (!existing) throw new Error('Smart home plan not found');
        const { id, projectId, ...data } = input;
        const [updated] = await ctx.db.update(smartHomePlans).set({
          ...data,
          updatedAt: new Date(),
        }).where(eq(smartHomePlans.id, id)).returning();
        return updated;
      }

      // Create new plan
      const [plan] = await ctx.db.insert(smartHomePlans).values({
        projectId: input.projectId,
        networkRackLocation: input.networkRackLocation ?? null,
        wifiAccessPoints: input.wifiAccessPoints ?? null,
        smartDevices: input.smartDevices ?? null,
        wiringRuns: input.wiringRuns ?? null,
        scenes: input.scenes ?? null,
      }).returning();
      return plan;
    }),

  // ── Delete smart home plan ──────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.smartHomePlans.findFirst({
        where: eq(smartHomePlans.id, input.id),
        with: { project: true },
      });
      if (!plan) throw new Error('Smart home plan not found');
      if ((plan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(smartHomePlans).where(eq(smartHomePlans.id, input.id));
      return { success: true };
    }),

  // ── Calculate wiring ────────────────────────────────────
  calculateWiring: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const plan = await ctx.db.query.smartHomePlans.findFirst({
        where: eq(smartHomePlans.projectId, input.projectId),
        orderBy: (p, { desc }) => [desc(p.updatedAt)],
      });
      if (!plan) throw new Error('No smart home plan found for this project');

      const devices = (plan.smartDevices as any[]) ?? [];
      const wiringRuns = (plan.wiringRuns as any[]) ?? [];
      const accessPoints = (plan.wifiAccessPoints as any[]) ?? [];

      // Calculate total cable length from wiring runs
      const totalCableLengthM = wiringRuns.reduce((sum: number, run: any) => sum + (run.lengthM ?? 0), 0);
      const totalDevices = devices.length;
      const totalAccessPoints = accessPoints.length;
      const estimatedCost = totalCableLengthM * 3.5 + totalDevices * 45 + totalAccessPoints * 120;

      return {
        totalDevices,
        totalAccessPoints,
        totalCableLengthM: Math.round(totalCableLengthM * 100) / 100,
        wiringRunCount: wiringRuns.length,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        currency: 'USD',
      };
    }),
});
