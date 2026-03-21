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

  // ── List scans (frontend-facing) ──────────────────────
  listScans: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const rows = await ctx.db.query.lidarScans.findMany({
        where: eq(lidarScans.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
      return rows.map((row) => {
        const meta = (row.clashReport as any) ?? {};
        return {
          id: row.id,
          name: meta.name ?? 'Untitled Scan',
          scanType: meta.scanType ?? 'terrestrial',
          status: row.status,
          scanDate: meta.scanDate ?? row.createdAt,
          scanner: meta.scanner ?? null,
          pointCount: meta.pointCount ?? 0,
          fileSize: meta.fileSize ?? null,
          fileFormat: meta.fileFormat ?? null,
          progress: meta.progress ?? 0,
          notes: meta.notes ?? null,
          createdAt: row.createdAt,
        };
      });
    }),

  // ── Create scan (frontend-facing) ─────────────────────
  createScan: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      scanType: z.string().min(1),
      fileFormat: z.string().optional(),
      scanDate: z.string().optional(),
      scanner: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const clashReport = {
        name: input.name,
        scanType: input.scanType,
        fileFormat: input.fileFormat ?? null,
        scanDate: input.scanDate ?? new Date().toISOString(),
        scanner: input.scanner ?? null,
        pointCount: 0,
        fileSize: null,
        progress: 0,
        notes: input.notes ?? null,
      };
      const [scan] = await ctx.db.insert(lidarScans).values({
        projectId: input.projectId,
        status: 'uploaded',
        clashReport,
      }).returning();
      const meta = (scan.clashReport as any) ?? {};
      return {
        id: scan.id,
        name: meta.name,
        scanType: meta.scanType,
        status: scan.status,
        scanDate: meta.scanDate,
        scanner: meta.scanner,
        pointCount: meta.pointCount,
        fileSize: meta.fileSize,
        fileFormat: meta.fileFormat,
        progress: meta.progress,
        notes: meta.notes,
        createdAt: scan.createdAt,
      };
    }),

  // ── Process scan (frontend-facing) ────────────────────
  processScan: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scan = await ctx.db.query.lidarScans.findFirst({
        where: eq(lidarScans.id, input.id),
        with: { project: true },
      });
      if (!scan) throw new Error('LiDAR scan not found');
      if ((scan.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Update status
      await ctx.db.update(lidarScans).set({ status: 'processing' }).where(eq(lidarScans.id, input.id));

      // Create processing job
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'lidar_processing',
        status: 'pending',
        inputJson: { lidarScanId: input.id, rawPointCloudKey: scan.rawPointCloudKey },
        projectId: (scan.project as any).id,
      }).returning();

      return job;
    }),

  // ── Delete scan (frontend-facing) ─────────────────────
  deleteScan: protectedProcedure
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
