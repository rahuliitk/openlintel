import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  droneCaptures, projects, jobs, eq, and,
} from '@openlintel/db';

export const droneRouter = router({
  // ── List drone captures ─────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.droneCaptures.findMany({
        where: eq(droneCaptures.projectId, input.projectId),
        orderBy: (d, { desc }) => [desc(d.captureDate)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const capture = await ctx.db.query.droneCaptures.findFirst({
        where: eq(droneCaptures.id, input.id),
        with: { project: true },
      });
      if (!capture) throw new Error('Drone capture not found');
      if ((capture.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return capture;
    }),

  // ── Upload drone capture ────────────────────────────────
  upload: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      captureDate: z.string().datetime(),
      gpsData: z.any().optional(),
      imageKeys: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [capture] = await ctx.db.insert(droneCaptures).values({
        projectId: input.projectId,
        captureDate: new Date(input.captureDate),
        gpsData: input.gpsData ?? null,
        imageKeys: input.imageKeys ?? null,
        notes: input.notes ?? null,
      }).returning();
      return capture;
    }),

  // ── Update drone capture ────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      gpsData: z.any().optional(),
      imageKeys: z.array(z.string()).optional(),
      notes: z.string().optional(),
      pointCloudKey: z.string().optional(),
      terrainMeshKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const capture = await ctx.db.query.droneCaptures.findFirst({
        where: eq(droneCaptures.id, input.id),
        with: { project: true },
      });
      if (!capture) throw new Error('Drone capture not found');
      if ((capture.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(droneCaptures).set(data).where(eq(droneCaptures.id, id)).returning();
      return updated;
    }),

  // ── Delete drone capture ────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const capture = await ctx.db.query.droneCaptures.findFirst({
        where: eq(droneCaptures.id, input.id),
        with: { project: true },
      });
      if (!capture) throw new Error('Drone capture not found');
      if ((capture.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(droneCaptures).where(eq(droneCaptures.id, input.id));
      return { success: true };
    }),

  // ── Process drone capture (creates job) ─────────────────
  process: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const capture = await ctx.db.query.droneCaptures.findFirst({
        where: eq(droneCaptures.id, input.id),
        with: { project: true },
      });
      if (!capture) throw new Error('Drone capture not found');
      if ((capture.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'drone_processing',
        status: 'pending',
        inputJson: { droneCaptureId: input.id, imageKeys: capture.imageKeys },
        projectId: (capture.project as any).id,
      }).returning();

      return job;
    }),
});
