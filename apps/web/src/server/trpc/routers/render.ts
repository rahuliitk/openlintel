import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  renderJobs, projects, jobs, eq, and,
} from '@openlintel/db';

export const renderRouter = router({
  // ── List render jobs for a project ────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(renderJobs.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(renderJobs.roomId, input.roomId));

      return ctx.db.query.renderJobs.findMany({
        where: and(...conditions),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Create a render job ───────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
      renderType: z.string().min(1),
      resolution: z.string().min(1),
      timeOfDay: z.string().optional(),
      season: z.string().optional(),
      cameraPosition: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        lookAtX: z.number().optional(),
        lookAtY: z.number().optional(),
        lookAtZ: z.number().optional(),
        fov: z.number().optional(),
      }).optional(),
      sceneKey: z.string().optional(),
      samples: z.number().int().min(1).max(4096).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Create a tracking job
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'photorealistic_render',
        status: 'pending',
        inputJson: {
          projectId: input.projectId,
          roomId: input.roomId,
          renderType: input.renderType,
          resolution: input.resolution,
          timeOfDay: input.timeOfDay,
          season: input.season,
          samples: input.samples ?? 256,
        },
        projectId: input.projectId,
        roomId: input.roomId ?? null,
      }).returning();
      if (!job) throw new Error('Failed to create job');

      // Create the render job record
      const [render] = await ctx.db.insert(renderJobs).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        jobId: job.id,
        renderType: input.renderType,
        resolution: input.resolution,
        timeOfDay: input.timeOfDay ?? null,
        season: input.season ?? null,
        cameraPosition: input.cameraPosition ?? null,
        sceneKey: input.sceneKey ?? null,
        samples: input.samples ?? 256,
        status: 'pending',
      }).returning();

      // Mark job as running
      await ctx.db.update(jobs).set({
        status: 'running',
        startedAt: new Date(),
        progress: 5,
      }).where(eq(jobs.id, job.id));

      return { job, render };
    }),

  // ── Get render status ─────────────────────────────────────
  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const render = await ctx.db.query.renderJobs.findFirst({
        where: eq(renderJobs.id, input.id),
        with: { project: true, job: true },
      });
      if (!render) throw new Error('Render job not found');
      if ((render.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const job = render.job;
      return {
        id: render.id,
        renderType: render.renderType,
        resolution: render.resolution,
        status: render.status,
        outputKey: render.outputKey,
        jobStatus: job ? {
          status: job.status,
          progress: job.progress ?? 0,
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        } : null,
      };
    }),

  // ── Delete a render job ───────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const render = await ctx.db.query.renderJobs.findFirst({
        where: eq(renderJobs.id, input.id),
        with: { project: true },
      });
      if (!render) throw new Error('Render job not found');
      if ((render.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Delete output file if present
      if (render.outputKey) {
        const { deleteFile } = await import('@/lib/storage');
        await deleteFile(render.outputKey);
      }

      await ctx.db.delete(renderJobs).where(eq(renderJobs.id, input.id));
      return { success: true };
    }),
});
