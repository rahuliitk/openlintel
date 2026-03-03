import { z } from 'zod';
import { projects, jobs, uploads, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Mock floor-plan detection — generates plausible room detection results
// without an actual vision service.
// ---------------------------------------------------------------------------

interface DetectedRoom {
  name: string;
  type: string;
  polygon: [number, number][]; // [x, y] corners
  lengthMm: number;
  widthMm: number;
  areaSqm: number;
}

function generateDetectedRooms(): DetectedRoom[] {
  // Typical residential floor plan rooms with realistic dimensions
  const roomDefs: { name: string; type: string; lengthMm: number; widthMm: number }[] = [
    { name: 'Living Room', type: 'living_room', lengthMm: 5000, widthMm: 4000 },
    { name: 'Kitchen', type: 'kitchen', lengthMm: 3600, widthMm: 3000 },
    { name: 'Bedroom 1', type: 'bedroom', lengthMm: 4200, widthMm: 3600 },
    { name: 'Bedroom 2', type: 'bedroom', lengthMm: 3600, widthMm: 3000 },
    { name: 'Bathroom', type: 'bathroom', lengthMm: 2400, widthMm: 1800 },
  ];

  // Lay out rooms in a grid-like arrangement for plausible polygon coordinates
  let offsetX = 0;
  let offsetY = 0;
  const maxRowWidth = 10000; // mm before wrapping to next row
  let currentRowMaxHeight = 0;

  const detectedRooms: DetectedRoom[] = [];

  for (const def of roomDefs) {
    // Wrap to next row if we exceed the max width
    if (offsetX + def.lengthMm > maxRowWidth && offsetX > 0) {
      offsetX = 0;
      offsetY += currentRowMaxHeight + 200; // 200mm gap between rows
      currentRowMaxHeight = 0;
    }

    const x1 = offsetX;
    const y1 = offsetY;
    const x2 = offsetX + def.lengthMm;
    const y2 = offsetY + def.widthMm;

    const polygon: [number, number][] = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];

    const areaSqm = Math.round((def.lengthMm * def.widthMm) / 1_000_000 * 100) / 100;

    detectedRooms.push({
      name: def.name,
      type: def.type,
      polygon,
      lengthMm: def.lengthMm,
      widthMm: def.widthMm,
      areaSqm,
    });

    offsetX += def.lengthMm + 200; // 200mm wall thickness gap
    currentRowMaxHeight = Math.max(currentRowMaxHeight, def.widthMm);
  }

  return detectedRooms;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const floorPlanRouter = router({
  digitize: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        uploadId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Verify upload exists and belongs to user
      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'floor_plan_digitization',
          status: 'pending',
          inputJson: {
            projectId: input.projectId,
            uploadId: input.uploadId,
            storageKey: upload.storageKey,
          },
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        // Generate mock floor plan detection results
        const detectedRooms = generateDetectedRooms();

        // Compute summary
        const totalAreaSqm = detectedRooms.reduce((s, r) => s + r.areaSqm, 0);

        const outputJson = {
          source: 'inline_mock',
          uploadId: input.uploadId,
          storageKey: upload.storageKey,
          detectedRooms,
          summary: {
            roomCount: detectedRooms.length,
            totalAreaSqm: Math.round(totalAreaSqm * 100) / 100,
            roomTypes: detectedRooms.map((r) => r.type),
          },
        };

        // Mark completed with detection results
        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson,
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!updatedJob) throw new Error('Failed to update job');

        return updatedJob;
      } catch (err) {
        // Mark failed
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!failedJob) throw new Error('Failed to update job');

        return failedJob;
      }
    }),

  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),
});
