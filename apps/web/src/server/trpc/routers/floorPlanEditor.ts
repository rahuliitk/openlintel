import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  floorPlanCanvases, wallSegments, openings, staircases,
  rooms, projects, eq, and,
} from '@openlintel/db';

export const floorPlanEditorRouter = router({
  // ── Get canvas for a project floor ────────────────────────
  getCanvas: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      floorNumber: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(floorPlanCanvases.projectId, input.projectId)];
      if (input.floorNumber !== undefined) {
        conditions.push(eq(floorPlanCanvases.floorNumber, input.floorNumber));
      }

      return ctx.db.query.floorPlanCanvases.findFirst({
        where: and(...conditions),
        with: { walls: { with: { openings: true } }, staircases: true },
      });
    }),

  // ── Save (upsert) a canvas ────────────────────────────────
  saveCanvas: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      projectId: z.string(),
      floorNumber: z.number().int().default(0),
      name: z.string().min(1),
      canvasState: z.record(z.unknown()),
      gridSize: z.number().int().optional(),
      scale: z.number().optional(),
      layers: z.array(z.record(z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      if (input.id) {
        const existing = await ctx.db.query.floorPlanCanvases.findFirst({
          where: eq(floorPlanCanvases.id, input.id),
          with: { project: true },
        });
        if (!existing) throw new Error('Canvas not found');
        if ((existing.project as any).userId !== ctx.userId) throw new Error('Access denied');

        const [updated] = await ctx.db.update(floorPlanCanvases).set({
          name: input.name,
          canvasState: input.canvasState,
          gridSize: input.gridSize ?? existing.gridSize,
          scale: input.scale ?? existing.scale,
          layers: input.layers ?? existing.layers,
          updatedAt: new Date(),
        }).where(eq(floorPlanCanvases.id, input.id)).returning();
        return updated;
      }

      const [canvas] = await ctx.db.insert(floorPlanCanvases).values({
        projectId: input.projectId,
        floorNumber: input.floorNumber,
        name: input.name,
        canvasState: input.canvasState,
        gridSize: input.gridSize ?? 100,
        scale: input.scale ?? 1.0,
        layers: input.layers ?? null,
      }).returning();
      return canvas;
    }),

  // ── Create a wall segment ─────────────────────────────────
  createWall: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      roomId: z.string().optional(),
      startX: z.number(),
      startY: z.number(),
      endX: z.number(),
      endY: z.number(),
      thickness: z.number().default(150),
      wallType: z.string().default('interior'),
      materialType: z.string().optional(),
      layer: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [wall] = await ctx.db.insert(wallSegments).values({
        canvasId: input.canvasId,
        roomId: input.roomId ?? null,
        startX: input.startX,
        startY: input.startY,
        endX: input.endX,
        endY: input.endY,
        thickness: input.thickness,
        wallType: input.wallType,
        materialType: input.materialType ?? null,
        layer: input.layer ?? 'structural',
        metadata: input.metadata ?? null,
      }).returning();
      return wall;
    }),

  // ── List walls for a canvas ───────────────────────────────
  listWalls: protectedProcedure
    .input(z.object({ canvasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      return ctx.db.query.wallSegments.findMany({
        where: eq(wallSegments.canvasId, input.canvasId),
        with: { openings: true },
      });
    }),

  // ── Update a wall segment ─────────────────────────────────
  updateWall: protectedProcedure
    .input(z.object({
      id: z.string(),
      startX: z.number().optional(),
      startY: z.number().optional(),
      endX: z.number().optional(),
      endY: z.number().optional(),
      thickness: z.number().optional(),
      wallType: z.string().optional(),
      materialType: z.string().optional(),
      layer: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wall = await ctx.db.query.wallSegments.findFirst({
        where: eq(wallSegments.id, input.id),
        with: { canvas: { with: { project: true } } },
      });
      if (!wall) throw new Error('Wall not found');
      if ((wall.canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...data } = input;
      const [updated] = await ctx.db.update(wallSegments)
        .set(data)
        .where(eq(wallSegments.id, id))
        .returning();
      return updated;
    }),

  // ── Delete a wall segment ─────────────────────────────────
  deleteWall: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const wall = await ctx.db.query.wallSegments.findFirst({
        where: eq(wallSegments.id, input.id),
        with: { canvas: { with: { project: true } } },
      });
      if (!wall) throw new Error('Wall not found');
      if ((wall.canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(wallSegments).where(eq(wallSegments.id, input.id));
      return { success: true };
    }),

  // ── Create an opening (door/window) on a wall ─────────────
  createOpening: protectedProcedure
    .input(z.object({
      wallSegmentId: z.string(),
      openingType: z.string().min(1),
      subType: z.string().optional(),
      offsetFromStart: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      sillHeight: z.number().optional(),
      swingDirection: z.string().optional(),
      swingAngle: z.number().optional(),
      layer: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wall = await ctx.db.query.wallSegments.findFirst({
        where: eq(wallSegments.id, input.wallSegmentId),
        with: { canvas: { with: { project: true } } },
      });
      if (!wall) throw new Error('Wall not found');
      if ((wall.canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [opening] = await ctx.db.insert(openings).values({
        wallSegmentId: input.wallSegmentId,
        openingType: input.openingType,
        subType: input.subType ?? null,
        offsetFromStart: input.offsetFromStart,
        width: input.width,
        height: input.height,
        sillHeight: input.sillHeight ?? 0,
        swingDirection: input.swingDirection ?? null,
        swingAngle: input.swingAngle ?? 90,
        layer: input.layer ?? 'structural',
        metadata: input.metadata ?? null,
      }).returning();
      return opening;
    }),

  // ── Create a staircase on a canvas ────────────────────────
  createStaircase: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      stairType: z.string().min(1),
      startX: z.number(),
      startY: z.number(),
      totalRise: z.number().positive(),
      riserHeight: z.number().positive().optional(),
      treadDepth: z.number().positive().optional(),
      width: z.number().positive().default(900),
      numRisers: z.number().int().positive().optional(),
      direction: z.number().optional(),
      landingDepth: z.number().optional(),
      handrailSides: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Auto-calculate riser count if not provided
      const riserHeight = input.riserHeight ?? 180;
      const numRisers = input.numRisers ?? Math.ceil(input.totalRise / riserHeight);
      const treadDepth = input.treadDepth ?? 250;

      const [staircase] = await ctx.db.insert(staircases).values({
        canvasId: input.canvasId,
        stairType: input.stairType,
        startX: input.startX,
        startY: input.startY,
        totalRise: input.totalRise,
        riserHeight,
        treadDepth,
        width: input.width,
        numRisers,
        direction: input.direction ?? 0,
        landingDepth: input.landingDepth ?? null,
        handrailSides: input.handrailSides ?? 'both',
        metadata: input.metadata ?? null,
      }).returning();
      return staircase;
    }),

  // ── Batch-create walls for a room (4 walls at once) ──────
  createRoomWalls: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      roomName: z.string().min(1),
      roomType: z.string().default('other'),
      projectId: z.string(),
      walls: z.array(z.object({
        startX: z.number(),
        startY: z.number(),
        endX: z.number(),
        endY: z.number(),
        thickness: z.number().default(150),
        wallType: z.string().default('exterior'),
        layer: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })),
      widthMm: z.number().optional(),
      lengthMm: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Create room record
      const [room] = await ctx.db.insert(rooms).values({
        projectId: input.projectId,
        name: input.roomName,
        type: input.roomType,
        widthMm: input.widthMm ?? null,
        lengthMm: input.lengthMm ?? null,
      }).returning();

      const groupId = crypto.randomUUID();

      // Create all walls in sequence (same transaction context)
      const createdWalls = [];
      for (const wall of input.walls) {
        const [created] = await ctx.db.insert(wallSegments).values({
          canvasId: input.canvasId,
          roomId: room.id,
          startX: wall.startX,
          startY: wall.startY,
          endX: wall.endX,
          endY: wall.endY,
          thickness: wall.thickness,
          wallType: wall.wallType,
          materialType: null,
          layer: wall.layer ?? 'structural',
          metadata: { ...wall.metadata, roomGroupId: groupId, roomName: input.roomName, roomType: input.roomType },
        }).returning();
        createdWalls.push(created);
      }

      return { room, walls: createdWalls };
    }),

  // ── Delete all walls belonging to a room group ──────────
  deleteRoomWalls: protectedProcedure
    .input(z.object({ roomGroupId: z.string(), canvasId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true, walls: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Delete walls that match the roomGroupId in metadata
      let deletedCount = 0;
      for (const wall of canvas.walls) {
        if ((wall.metadata as any)?.roomGroupId === input.roomGroupId) {
          await ctx.db.delete(wallSegments).where(eq(wallSegments.id, wall.id));
          deletedCount++;
        }
      }
      return { deletedCount };
    }),

  // ── Create an opening on the nearest wall ───────────────
  placeOpening: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      x: z.number(),
      y: z.number(),
      openingType: z.enum(['door', 'window']),
      width: z.number().positive().default(80),
      height: z.number().positive().default(210),
    }))
    .mutation(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true, walls: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Find the nearest wall to the click point
      let nearestWall: typeof canvas.walls[0] | null = null;
      let minDist = Infinity;
      let bestOffset = 0;

      for (const wall of canvas.walls) {
        const dx = wall.endX - wall.startX;
        const dy = wall.endY - wall.startY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        // Project point onto wall line
        const t = Math.max(0, Math.min(1,
          ((input.x - wall.startX) * dx + (input.y - wall.startY) * dy) / (len * len)
        ));
        const px = wall.startX + t * dx;
        const py = wall.startY + t * dy;
        const dist = Math.sqrt((input.x - px) ** 2 + (input.y - py) ** 2);

        if (dist < minDist) {
          minDist = dist;
          nearestWall = wall;
          bestOffset = t * len;
        }
      }

      if (!nearestWall || minDist > 50) {
        throw new Error('No wall found near click point. Click closer to a wall.');
      }

      const [opening] = await ctx.db.insert(openings).values({
        wallSegmentId: nearestWall.id,
        openingType: input.openingType,
        subType: null,
        offsetFromStart: bestOffset,
        width: input.width,
        height: input.height,
        sillHeight: input.openingType === 'window' ? 900 : 0,
        swingDirection: null,
        swingAngle: 90,
        layer: 'structural',
        metadata: null,
      }).returning();
      return opening;
    }),

  // ── Calculate areas from wall segments ────────────────────
  calculateAreas: protectedProcedure
    .input(z.object({ canvasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canvas = await ctx.db.query.floorPlanCanvases.findFirst({
        where: eq(floorPlanCanvases.id, input.canvasId),
        with: { project: true, walls: true },
      });
      if (!canvas) throw new Error('Canvas not found');
      if ((canvas.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const walls = canvas.walls;

      if (walls.length === 0) {
        return {
          grossAreaSqm: 0,
          netAreaSqm: 0,
          wallAreaSqm: 0,
          totalWallLengthMm: 0,
          overallLengthMm: 0,
          overallWidthMm: 0,
          wallCount: 0,
        };
      }

      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const wall of walls) {
        minX = Math.min(minX, wall.startX, wall.endX);
        minY = Math.min(minY, wall.startY, wall.endY);
        maxX = Math.max(maxX, wall.startX, wall.endX);
        maxY = Math.max(maxY, wall.startY, wall.endY);
      }

      const overallLengthMm = maxX - minX;
      const overallWidthMm = maxY - minY;
      const grossAreaSqm = (overallLengthMm * overallWidthMm) / 1_000_000;

      // Total wall length
      const totalWallLengthMm = walls.reduce((sum, w) => {
        const dx = w.endX - w.startX;
        const dy = w.endY - w.startY;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0);

      // Estimate wall footprint area
      const avgThickness = walls.reduce((s, w) => s + w.thickness, 0) / walls.length;
      const wallAreaSqm = (totalWallLengthMm * avgThickness) / 1_000_000;
      const netAreaSqm = Math.max(0, grossAreaSqm - wallAreaSqm);

      return {
        grossAreaSqm: Math.round(grossAreaSqm * 100) / 100,
        netAreaSqm: Math.round(netAreaSqm * 100) / 100,
        wallAreaSqm: Math.round(wallAreaSqm * 100) / 100,
        totalWallLengthMm: Math.round(totalWallLengthMm),
        overallLengthMm: Math.round(overallLengthMm),
        overallWidthMm: Math.round(overallWidthMm),
        wallCount: walls.length,
      };
    }),
});
