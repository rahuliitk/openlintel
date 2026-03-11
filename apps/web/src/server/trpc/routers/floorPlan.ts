import { z } from 'zod';
import { projects, jobs, uploads, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { getFile } from '@/lib/storage';
import { fileToAllImageBuffers } from '@/lib/file-to-image';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Prompt — uses relative positioning (rightOf / below) instead of x,y coords
// GPT-4o is great at reading dimensions and spatial relationships but bad
// at determining precise pixel coordinates. We resolve positions ourselves.
// ---------------------------------------------------------------------------

const FLOOR_PLAN_ANALYSIS_PROMPT = `You are an expert architectural floor plan analyzer.

TASK: Analyze this floor plan image. Extract every room/space with dimensions and layout.

MULTIPLE FLOORS: If the image shows multiple floors (e.g., "Ground Floor" and "First Floor" drawn side by side or stacked), return EACH as a separate entry in the "floors" array. Look for headings like "Ground Floor", "First Floor", "GF", "FF", etc.

FOR EACH ROOM:
1. Read the room name from labels on the plan.
2. Read dimensions from dimension lines. Convert to millimeters. lengthMm = horizontal extent, widthMm = vertical extent.
3. Describe the room's position RELATIVE to other rooms on the SAME floor:
   - "rightOf": the name of the room directly to the LEFT of this one (they share a vertical wall). null if nothing is to the left.
   - "below": the name of the room directly ABOVE this one (they share a horizontal wall). null if nothing is above.
   - The top-left room of each floor has both rightOf and below as null.
4. Count doors (arc/swing symbols) and windows (parallel lines on walls). For each, just note which wall: "top", "bottom", "left", or "right".

ROOM TYPES: living_room, bedroom, kitchen, bathroom, dining_room, hallway, utility, balcony, garage, office, closet, store_room, pooja_room, wash_area, foyer, passage, staircase, terrace, drawing_room, other

INCLUDE ALL SPACES: hallways, passages, staircases, balconies, wash areas, store rooms, etc.

Return ONLY valid JSON:
{
  "floors": [
    {
      "floorName": "Ground Floor",
      "wallThicknessMm": 150,
      "rooms": [
        {
          "name": "Living Room",
          "type": "living_room",
          "lengthMm": 5000,
          "widthMm": 4000,
          "areaSqm": 20.0,
          "rightOf": null,
          "below": null,
          "doors": [{"wallSide": "left", "widthMm": 900}],
          "windows": [{"wallSide": "top", "widthMm": 1200}]
        },
        {
          "name": "Kitchen",
          "type": "kitchen",
          "lengthMm": 3500,
          "widthMm": 4000,
          "areaSqm": 14.0,
          "rightOf": "Living Room",
          "below": null,
          "doors": [{"wallSide": "left", "widthMm": 900}],
          "windows": []
        },
        {
          "name": "Bedroom 1",
          "type": "bedroom",
          "lengthMm": 4000,
          "widthMm": 3500,
          "areaSqm": 14.0,
          "rightOf": null,
          "below": "Living Room",
          "doors": [{"wallSide": "top", "widthMm": 800}],
          "windows": [{"wallSide": "bottom", "widthMm": 1200}]
        }
      ],
      "summary": {
        "totalAreaSqm": 85.5,
        "roomCount": 6,
        "floorPlanType": "2BHK Apartment"
      }
    }
  ]
}

RULES:
- rightOf/below reference rooms on the SAME floor only.
- The top-left room has rightOf=null AND below=null.
- Every other room MUST have at least one of rightOf or below set to a valid room name.
- If a room is both to the right of one room AND below another, set BOTH rightOf and below.
- lengthMm = horizontal size, widthMm = vertical size. Read from dimension lines.
- areaSqm = (lengthMm * widthMm) / 1000000, using INTERIOR dimensions (subtract ~300mm from each for walls).

SELF-CHECK:
- Did you detect ALL separate floor drawings on the page?
- Does every room (except the anchor) have rightOf or below set?
- Do dimensions match the labels on the plan?
- Are ALL visible rooms/spaces included?`;

// ---------------------------------------------------------------------------
// Floor data type
// ---------------------------------------------------------------------------

interface FloorData {
  floorName: string;
  rooms: any[];
  overallLengthMm: number;
  overallWidthMm: number;
  wallThicknessMm: number;
  summary: any;
}

// ---------------------------------------------------------------------------
// Layout resolver: convert relative positions (rightOf/below) to x,y coords
// ---------------------------------------------------------------------------

function resolveLayout(rooms: any[], wallT: number): any[] {
  if (rooms.length === 0) return [];
  if (rooms.length === 1) {
    rooms[0].x = 0;
    rooms[0].y = 0;
    return rooms;
  }

  const byName: Record<string, any> = {};
  for (const r of rooms) byName[r.name] = r;

  // Find anchor (no rightOf, no below)
  let anchor = rooms.find((r: any) => !r.rightOf && !r.below);
  if (!anchor) anchor = rooms[0]; // fallback

  anchor.x = 0;
  anchor.y = 0;

  const resolved = new Set<string>([anchor.name]);
  let changed = true;
  let iterations = 0;

  // Iteratively resolve positions until all rooms are placed
  while (changed && iterations < rooms.length * 3) {
    changed = false;
    iterations++;

    for (const room of rooms) {
      if (resolved.has(room.name)) continue;

      let x: number | null = null;
      let y: number | null = null;

      // rightOf: this room is to the RIGHT of the named room
      if (room.rightOf && byName[room.rightOf] && resolved.has(room.rightOf)) {
        const ref = byName[room.rightOf];
        x = (ref.x || 0) + (ref.lengthMm || 0) - wallT;
        y = ref.y ?? 0; // top-aligned with reference
      }

      // below: this room is BELOW the named room
      if (room.below && byName[room.below] && resolved.has(room.below)) {
        const ref = byName[room.below];
        y = (ref.y || 0) + (ref.widthMm || 0) - wallT;
        if (x === null) x = ref.x ?? 0; // left-aligned with reference
      }

      if (x !== null || y !== null) {
        room.x = x ?? 0;
        room.y = y ?? 0;
        resolved.add(room.name);
        changed = true;
      }
    }
  }

  // Place any remaining unresolved rooms using auto-layout fallback
  if (resolved.size < rooms.length) {
    let maxY = 0;
    for (const r of rooms) {
      if (resolved.has(r.name)) {
        const bottom = (r.y || 0) + (r.widthMm || 0);
        if (bottom > maxY) maxY = bottom;
      }
    }
    let fx = 0;
    for (const room of rooms) {
      if (!resolved.has(room.name)) {
        room.x = fx;
        room.y = maxY + 500; // place below everything
        fx += (room.lengthMm || 3000) - wallT;
      }
    }
  }

  // Normalize: shift all rooms so minimum x,y is 0
  let minX = Infinity, minY = Infinity;
  for (const r of rooms) {
    if ((r.x || 0) < minX) minX = r.x || 0;
    if ((r.y || 0) < minY) minY = r.y || 0;
  }
  if (minX !== 0 || minY !== 0) {
    for (const r of rooms) {
      r.x = (r.x || 0) - minX;
      r.y = (r.y || 0) - minY;
    }
  }

  return rooms;
}

// ---------------------------------------------------------------------------
// Analyze a floor plan image with GPT-4o — returns multiple floors
// ---------------------------------------------------------------------------

async function analyzeSingleFloorImage(
  imageBuffer: Buffer,
  imageMimeType: string,
  pageHint: string,
): Promise<FloorData[]> {
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${imageMimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 16384,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: FLOOR_PLAN_ANALYSIS_PROMPT + pageHint },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      console.error('[FloorPlan] Failed to parse GPT response:', content.slice(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  // Accept { floors: [...] } or legacy { rooms: [...] }
  let rawFloors: any[] = [];
  if (Array.isArray(parsed.floors) && parsed.floors.length > 0) {
    rawFloors = parsed.floors;
  } else if (Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
    rawFloors = [{
      floorName: parsed.floorName || 'Floor Plan',
      rooms: parsed.rooms,
      wallThicknessMm: parsed.wallThicknessMm,
      summary: parsed.summary,
    }];
  } else {
    return [{
      floorName: 'Floor Plan', rooms: [], overallLengthMm: 10000,
      overallWidthMm: 8000, wallThicknessMm: 150,
      summary: { totalAreaSqm: 0, roomCount: 0, floorPlanType: 'Unknown' },
    }];
  }

  const result: FloorData[] = [];
  for (const raw of rawFloors) {
    const wallT = raw.wallThicknessMm || 150;
    const rooms = resolveLayout(raw.rooms || [], wallT);

    // Compute bounding box
    let overallW = 0, overallH = 0;
    for (const r of rooms) {
      const right = (r.x || 0) + (r.lengthMm || 0);
      const bottom = (r.y || 0) + (r.widthMm || 0);
      if (right > overallW) overallW = right;
      if (bottom > overallH) overallH = bottom;
    }

    result.push({
      floorName: raw.floorName || 'Floor Plan',
      rooms,
      overallLengthMm: overallW || 10000,
      overallWidthMm: overallH || 8000,
      wallThicknessMm: wallT,
      summary: raw.summary || {
        totalAreaSqm: rooms.reduce((s: number, r: any) => s + (r.areaSqm || 0), 0),
        roomCount: rooms.length,
        floorPlanType: 'Unknown',
      },
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Multi-page analysis
// ---------------------------------------------------------------------------

async function analyzeFloorPlanWithAI(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
  onProgress?: (pct: number) => Promise<void>,
): Promise<{ floors: FloorData[] }> {
  const pages = await fileToAllImageBuffers(fileBuffer, mimeType, filename);
  if (onProgress) await onProgress(30);

  const allFloors: FloorData[] = [];

  for (let i = 0; i < pages.length; i++) {
    const { imageBuffer, imageMimeType } = pages[i];
    const pageHint = pages.length > 1
      ? `\n\nThis is page ${i + 1} of ${pages.length} in a multi-page PDF. This page may show one or more floors.`
      : '';

    const floorsFromPage = await analyzeSingleFloorImage(imageBuffer, imageMimeType, pageHint);
    allFloors.push(...floorsFromPage);

    if (onProgress) {
      await onProgress(30 + Math.round(((i + 1) / pages.length) * 60));
    }
  }

  return { floors: allFloors };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const floorPlanRouter = router({
  digitize: protectedProcedure
    .input(z.object({ projectId: z.string(), uploadId: z.string() }))
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
          inputJson: { projectId: input.projectId, uploadId: input.uploadId, storageKey: upload.storageKey },
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db.update(jobs).set({ status: 'running', startedAt: new Date(), progress: 10 }).where(eq(jobs.id, job.id));

      const db = ctx.db;
      void (async () => {
        try {
          const fileBuffer = await getFile(upload.storageKey);
          if (!fileBuffer) throw new Error('Upload file not found on disk');

          const onProgress = async (pct: number) => {
            await db.update(jobs).set({ progress: pct }).where(eq(jobs.id, job.id));
          };

          const { floors } = await analyzeFloorPlanWithAI(
            fileBuffer, upload.mimeType || 'image/png',
            upload.filename || 'floor-plan.png', onProgress,
          );

          const allRooms = floors.flatMap((f) => f.rooms);
          const totalArea = floors.reduce((s, f) => s + (f.summary?.totalAreaSqm || 0), 0);
          const totalRooms = floors.reduce((s, f) => s + (f.rooms?.length || 0), 0);

          const outputJson = {
            source: 'gpt4o_vision',
            uploadId: input.uploadId,
            storageKey: upload.storageKey,
            floors,
            detectedRooms: allRooms,
            width: 800, height: 600, scale: 1,
            summary: {
              totalAreaSqm: Math.round(totalArea * 100) / 100,
              roomCount: totalRooms,
              floorCount: floors.length,
              floorPlanType: floors.length > 1
                ? `${floors.length}-Floor Building`
                : floors[0]?.summary?.floorPlanType || 'Floor Plan',
            },
          };

          await db.update(jobs).set({
            status: 'completed', progress: 100, completedAt: new Date(), outputJson,
          }).where(eq(jobs.id, job.id));
        } catch (err) {
          console.error('Floor plan AI analysis failed:', err);
          await db.update(jobs).set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          }).where(eq(jobs.id, job.id));
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
        where: and(eq(jobs.projectId, input.projectId), eq(jobs.userId, ctx.userId)),
        orderBy: (j, { desc }) => [desc(j.createdAt)],
      });

      return allJobs.filter((j) => j.type === 'floor_plan_digitization' && j.status === 'completed');
    }),
});
