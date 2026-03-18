import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  lidarScans, projects, jobs, eq, and,
} from '@openlintel/db';

export const lidarRouter = router({
  // ── List lidar scans ────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.lidarScans.findMany({
        where: eq(lidarScans.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return scan;
    }),

  // ── Upload lidar scan ───────────────────────────────────
  upload: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      rawPointCloudKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [scan] = await ctx.db.insert(lidarScans).values({
        projectId: input.projectId,
        rawPointCloudKey: input.rawPointCloudKey,
        status: 'uploaded',
      }).returning();
      return scan;
    }),

  // ── Process lidar scan (creates job) ────────────────────
  process: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Create processing job
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'lidar_processing',
        status: 'pending',
        inputJson: { lidarScanId: input.id, rawPointCloudKey: scan.rawPointCloudKey },
        projectId: (scan.project as any).id,
      }).returning();

      // Mark scan as processing
      await ctx.db.update(lidarScans).set({ status: 'processing' }).where(eq(lidarScans.id, input.id));

      return job;
    }),

  // ── Update scan (after processing completes) ────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      processedPointCloudKey: z.string().optional(),
      extractedPlanKey: z.string().optional(),
      clashReport: z.any().optional(),
      status: z.enum(['uploaded', 'processing', 'completed', 'failed']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(lidarScans).set(data).where(eq(lidarScans.id, id)).returning();
      return updated;
    }),

  // ── Get clash report ────────────────────────────────────
  getClashReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return {
        scanId: scan.id,
        status: scan.status,
        clashReport: scan.clashReport,
        processedPointCloudKey: scan.processedPointCloudKey,
        extractedPlanKey: scan.extractedPlanKey,
      };
    }),

  // ── Delete scan ─────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(lidarScans).where(eq(lidarScans.id, input.id));
      return { success: true };
    }),
});
