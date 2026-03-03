import { z } from 'zod';
import { projects, rooms, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

export const reconstructionRouter = router({
  startReconstruction: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        roomId: z.string(),
        uploadIds: z.array(z.string()).min(1),
        referenceObject: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.projectId, input.projectId)),
      });
      if (!room) throw new Error('Room not found');

      // Create a job for tracking
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'reconstruction',
          status: 'pending',
          inputJson: {
            projectId: input.projectId,
            roomId: input.roomId,
            uploadIds: input.uploadIds,
            referenceObject: input.referenceObject,
          },
          projectId: input.projectId,
          roomId: input.roomId,
        })
        .returning();

      if (!job) throw new Error('Failed to create job');

      // Generate mock reconstruction results using room dimensions from DB
      const length = room.lengthMm || 4000;
      const width = room.widthMm || 3000;
      const height = room.heightMm || 2700;

      const outputJson = {
        modelUrl: null,
        measurements: {
          length,
          width,
          height,
          confidence: 0.85,
        },
        pointCount: 50000,
        meshFaces: 25000,
        roomId: input.roomId,
        roomName: room.name,
        uploadIds: input.uploadIds,
      };

      // Update job as completed with mock reconstruction data
      await ctx.db
        .update(jobs)
        .set({
          status: 'completed',
          outputJson,
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      return { ...job, status: 'completed', outputJson };
    }),

  getResult: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');

      return {
        id: job.id,
        status: job.status,
        progress: (job as any).progress ?? 0,
        outputJson: (job as any).outputJson ?? null,
        error: (job as any).error ?? null,
        createdAt: job.createdAt,
      };
    }),

  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if (room.project.userId !== ctx.userId) throw new Error('Access denied');

      return ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.roomId, input.roomId),
          eq(jobs.type, 'reconstruction'),
          eq(jobs.userId, ctx.userId),
        ),
        orderBy: (j, { desc }) => [desc(j.createdAt)],
      });
    }),
});
