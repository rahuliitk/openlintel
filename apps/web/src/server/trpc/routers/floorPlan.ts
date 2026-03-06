import { z } from 'zod';
import { projects, jobs, uploads, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Mock floor-plan detection — generates plausible room detection results.
// Polygons are in pixel coordinates (0-800 x 0-600) matching the SVG viewBox.
// ---------------------------------------------------------------------------

interface DetectedRoom {
  name: string;
  type: string;
  polygon: { x: number; y: number }[];
  lengthMm: number;
  widthMm: number;
  areaSqm: number;
  doors: { x: number; y: number; width: number; side: string }[];
  windows: { x: number; y: number; width: number; side: string }[];
}

function generateDetectedRooms(): {
  rooms: DetectedRoom[];
  width: number;
  height: number;
  scale: number;
} {
  const W = 800;
  const H = 600;
  const WALL = 6; // wall thickness in px

  // Layout: realistic apartment floor plan
  //  ┌──────────────┬────────────┐
  //  │              │  Kitchen   │
  //  │  Living Room │            │
  //  │              ├────────────┤
  //  │              │  Bathroom  │
  //  ├──────────────┤            │
  //  │   Bedroom 1  ├────────────┤
  //  │              │  Bedroom 2 │
  //  └──────────────┴────────────┘

  const midX = 460;
  const midY1 = 280;
  const midY2 = 380;

  const rooms: DetectedRoom[] = [
    {
      name: 'Living Room',
      type: 'living_room',
      polygon: [
        { x: WALL, y: WALL },
        { x: midX - WALL, y: WALL },
        { x: midX - WALL, y: midY1 - WALL },
        { x: WALL, y: midY1 - WALL },
      ],
      lengthMm: 5000,
      widthMm: 4000,
      areaSqm: 20,
      doors: [{ x: midX - WALL, y: 100, width: 40, side: 'right' }],
      windows: [{ x: 150, y: WALL, width: 80, side: 'top' }],
    },
    {
      name: 'Kitchen',
      type: 'kitchen',
      polygon: [
        { x: midX + WALL, y: WALL },
        { x: W - WALL, y: WALL },
        { x: W - WALL, y: midY1 - WALL },
        { x: midX + WALL, y: midY1 - WALL },
      ],
      lengthMm: 3600,
      widthMm: 3000,
      areaSqm: 10.8,
      doors: [{ x: midX + WALL, y: 100, width: 40, side: 'left' }],
      windows: [{ x: W - 120, y: WALL, width: 60, side: 'top' }],
    },
    {
      name: 'Bathroom',
      type: 'bathroom',
      polygon: [
        { x: midX + WALL, y: midY1 + WALL },
        { x: W - WALL, y: midY1 + WALL },
        { x: W - WALL, y: midY2 - WALL },
        { x: midX + WALL, y: midY2 - WALL },
      ],
      lengthMm: 2400,
      widthMm: 1800,
      areaSqm: 4.32,
      doors: [{ x: midX + WALL, y: midY1 + 20, width: 30, side: 'left' }],
      windows: [{ x: W - 80, y: midY1 + 30, width: 40, side: 'right' }],
    },
    {
      name: 'Bedroom 1',
      type: 'bedroom',
      polygon: [
        { x: WALL, y: midY1 + WALL },
        { x: midX - WALL, y: midY1 + WALL },
        { x: midX - WALL, y: H - WALL },
        { x: WALL, y: H - WALL },
      ],
      lengthMm: 4200,
      widthMm: 3600,
      areaSqm: 15.12,
      doors: [{ x: midX - WALL, y: midY1 + 40, width: 40, side: 'right' }],
      windows: [{ x: 100, y: H - WALL, width: 80, side: 'bottom' }],
    },
    {
      name: 'Bedroom 2',
      type: 'bedroom',
      polygon: [
        { x: midX + WALL, y: midY2 + WALL },
        { x: W - WALL, y: midY2 + WALL },
        { x: W - WALL, y: H - WALL },
        { x: midX + WALL, y: H - WALL },
      ],
      lengthMm: 3600,
      widthMm: 3000,
      areaSqm: 10.8,
      doors: [{ x: midX + WALL, y: midY2 + 20, width: 40, side: 'left' }],
      windows: [{ x: W - 100, y: H - WALL, width: 60, side: 'bottom' }],
    },
  ];

  return { rooms, width: W, height: H, scale: 1 };
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
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

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

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const { rooms, width, height, scale } = generateDetectedRooms();

        const totalAreaSqm = rooms.reduce((s, r) => s + r.areaSqm, 0);

        const outputJson = {
          source: 'inline_mock',
          uploadId: input.uploadId,
          storageKey: upload.storageKey,
          detectedRooms: rooms,
          width,
          height,
          scale,
          summary: {
            roomCount: rooms.length,
            totalAreaSqm: Math.round(totalAreaSqm * 100) / 100,
            roomTypes: rooms.map((r) => r.type),
          },
        };

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
