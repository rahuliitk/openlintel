import { z } from 'zod';
import { projects, jobs, uploads, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { getFile } from '@/lib/storage';
import { fileToImageBuffer } from '@/lib/file-to-image';
import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// OpenAI client for GPT-4o vision-based floor plan analysis
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// AI-powered floor plan room detection using GPT-4o vision
// ---------------------------------------------------------------------------

const FLOOR_PLAN_ANALYSIS_PROMPT = `You are an expert architectural floor plan analyzer with years of experience reading blueprints and technical drawings.

TASK: Carefully analyze the floor plan image. Identify every room, space, and area visible.

CRITICAL INSTRUCTIONS FOR ACCURACY:
1. READ all text labels on the floor plan carefully. Use the EXACT room names shown (e.g., if it says "KITCHEN" use "Kitchen", if it says "BED ROOM-1" use "Bed Room 1").
2. LOOK at dimension lines/measurements on the plan. Use those EXACT dimensions in mm. If the plan shows "3.5m x 4.0m", use lengthMm: 4000, widthMm: 3500.
3. For polygon coordinates: These are percentages (0-100) of the image width and height. Look at WHERE each room actually is in the image:
   - A room in the top-left corner would have polygon points near x:5-30, y:5-30
   - A room in the bottom-right would have points near x:60-95, y:60-95
   - Make sure rooms DO NOT overlap and their positions match the actual layout in the image
4. Carefully trace the BOUNDARY of each room. If a room is L-shaped, approximate it as the best-fitting rectangle.
5. Count doors and windows by looking for door arc symbols (quarter circles) and window symbols (double lines on walls).

For each room provide:
- name: The exact label from the plan, or descriptive name if unlabeled
- type: One of: living_room, bedroom, kitchen, bathroom, dining_room, hallway, utility, balcony, garage, office, closet, store_room, pooja_room, wash_area, other
- polygon: 4 corner points as percentages [top-left, top-right, bottom-right, bottom-left]. MUST accurately reflect where the room is positioned in the image.
- lengthMm: Room length in millimeters (read from dimension lines if available, otherwise estimate)
- widthMm: Room width in millimeters
- areaSqm: Calculated area in square meters (length × width / 1,000,000)
- doors: Array of doors with position (x,y as percentage), width (~35), and side
- windows: Array of windows with position (x,y as percentage), width (~50), and side

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "rooms": [
    {
      "name": "Living Room",
      "type": "living_room",
      "polygon": [{"x": 5, "y": 5}, {"x": 45, "y": 5}, {"x": 45, "y": 50}, {"x": 5, "y": 50}],
      "lengthMm": 5000,
      "widthMm": 4000,
      "areaSqm": 20.0,
      "doors": [{"x": 25, "y": 50, "width": 35, "side": "bottom"}],
      "windows": [{"x": 5, "y": 25, "width": 50, "side": "left"}]
    }
  ],
  "summary": {
    "totalAreaSqm": 85.5,
    "roomCount": 6,
    "floorPlanType": "2BHK Apartment"
  }
}`;

async function analyzeFloorPlanWithAI(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{
  rooms: any[];
  width: number;
  height: number;
  scale: number;
  summary: any;
}> {
  // Convert PDF/DXF/DWG to image before sending to GPT-4o
  const { imageBuffer, imageMimeType } = await fileToImageBuffer(fileBuffer, mimeType, filename);

  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${imageMimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: FLOOR_PLAN_ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';

  // Parse the JSON response — strip markdown code fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr);
  const rooms = parsed.rooms || [];

  // Convert percentage-based polygons to pixel coordinates for an 800x600 SVG viewport
  const W = 800;
  const H = 600;

  const convertedRooms = rooms.map((room: any) => ({
    ...room,
    polygon: (room.polygon || []).map((p: any) => ({
      x: Math.round((p.x / 100) * W),
      y: Math.round((p.y / 100) * H),
    })),
    doors: (room.doors || []).map((d: any) => ({
      ...d,
      x: Math.round((d.x / 100) * W),
      y: Math.round((d.y / 100) * H),
    })),
    windows: (room.windows || []).map((w: any) => ({
      ...w,
      x: Math.round((w.x / 100) * W),
      y: Math.round((w.y / 100) * H),
    })),
  }));

  return {
    rooms: convertedRooms,
    width: W,
    height: H,
    scale: 1,
    summary: parsed.summary || {
      totalAreaSqm: convertedRooms.reduce((s: number, r: any) => s + (r.areaSqm || 0), 0),
      roomCount: convertedRooms.length,
      floorPlanType: 'Unknown',
    },
  };
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

      // Run AI analysis in the background (fire-and-forget)
      void (async () => {
        try {
          // Read the uploaded file from storage
          const fileBuffer = await getFile(upload.storageKey);
          if (!fileBuffer) throw new Error('Upload file not found on disk');

          await ctx.db
            .update(jobs)
            .set({ progress: 30 })
            .where(eq(jobs.id, job.id));

          // Convert file to image (handles PDF, DXF, DWG) and analyze with GPT-4o vision
          const { rooms, width, height, scale, summary } = await analyzeFloorPlanWithAI(
            fileBuffer,
            upload.mimeType || 'image/png',
            upload.filename || 'floor-plan.png',
          );

          const outputJson = {
            source: 'gpt4o_vision',
            uploadId: input.uploadId,
            storageKey: upload.storageKey,
            detectedRooms: rooms,
            width,
            height,
            scale,
            summary,
          };

          await ctx.db
            .update(jobs)
            .set({
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputJson,
            })
            .where(eq(jobs.id, job.id));
        } catch (err) {
          console.error('Floor plan AI analysis failed:', err);
          await ctx.db
            .update(jobs)
            .set({
              status: 'failed',
              error: err instanceof Error ? err.message : 'Unknown error',
              completedAt: new Date(),
            })
            .where(eq(jobs.id, job.id));
        }
      })();

      return job;
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

  listDigitizationJobs: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const allJobs = await ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.projectId, input.projectId),
          eq(jobs.userId, ctx.userId),
        ),
        orderBy: (j, { desc }) => [desc(j.createdAt)],
      });

      // Filter to floor plan digitization jobs
      return allJobs.filter(
        (j) => j.type === 'floor_plan_digitization' && j.status === 'completed',
      );
    }),
});
