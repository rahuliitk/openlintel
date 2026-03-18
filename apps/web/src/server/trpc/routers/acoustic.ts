import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  acousticAnalyses, projects, rooms, eq, and,
} from '@openlintel/db';

export const acousticRouter = router({
  // ── Get acoustic analysis for a project ───────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.acousticAnalyses.findFirst({
        where: eq(acousticAnalyses.projectId, input.projectId),
      });
    }),

  // ── Create an acoustic analysis ───────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomPairs: z.array(z.object({
        sourceRoomId: z.string(),
        receiverRoomId: z.string(),
        wallType: z.string().optional(),
        wallThicknessMm: z.number().optional(),
        hasInsulation: z.boolean().optional(),
      })).optional(),
      stcRatings: z.array(z.object({
        sourceRoomId: z.string(),
        receiverRoomId: z.string(),
        rating: z.number(),
        wallAssembly: z.string().optional(),
      })).optional(),
      iicRatings: z.array(z.object({
        upperRoomId: z.string(),
        lowerRoomId: z.string(),
        rating: z.number(),
        floorAssembly: z.string().optional(),
      })).optional(),
      reverbTime: z.array(z.object({
        roomId: z.string(),
        rt60: z.number(),
        frequency: z.number().optional(),
      })).optional(),
      recommendations: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [analysis] = await ctx.db.insert(acousticAnalyses).values({
        projectId: input.projectId,
        roomPairs: input.roomPairs ?? null,
        stcRatings: input.stcRatings ?? null,
        iicRatings: input.iicRatings ?? null,
        reverbTime: input.reverbTime ?? null,
        recommendations: input.recommendations ?? null,
      }).returning();
      return analysis;
    }),

  // ── Calculate acoustic properties ─────────────────────────
  calculate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Get all rooms for the project
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
        orderBy: (r, { asc }) => [asc(r.floor), asc(r.createdAt)],
      });

      if (projectRooms.length === 0) {
        throw new Error('No rooms found in this project');
      }

      // Calculate STC ratings for adjacent room pairs (same floor)
      const stcRatings: Array<{
        sourceRoomId: string; receiverRoomId: string;
        sourceRoomName: string; receiverRoomName: string;
        rating: number; wallAssembly: string; meetsCode: boolean;
      }> = [];

      // STC by wall type (simplified lookup)
      const stcByWallType: Record<string, number> = {
        'single_stud_drywall': 33,
        'double_drywall_single_stud': 40,
        'staggered_stud': 46,
        'double_stud_insulated': 55,
        'concrete_200mm': 52,
        'cmu_200mm_plastered': 48,
        'brick_230mm_plastered': 50,
      };

      // Generate pairs for rooms on the same floor
      const roomsByFloor = new Map<number, typeof projectRooms>();
      for (const room of projectRooms) {
        const floor = room.floor ?? 0;
        if (!roomsByFloor.has(floor)) roomsByFloor.set(floor, []);
        roomsByFloor.get(floor)!.push(room);
      }

      for (const [, floorRooms] of roomsByFloor) {
        for (let i = 0; i < floorRooms.length; i++) {
          for (let j = i + 1; j < floorRooms.length; j++) {
            const source = floorRooms[i]!;
            const receiver = floorRooms[j]!;

            // Estimate wall assembly based on room types
            let wallAssembly = 'double_drywall_single_stud';
            const sensitiveTypes = ['bedroom', 'office', 'bathroom'];
            const noisyTypes = ['kitchen', 'living_room', 'utility', 'garage'];

            if (sensitiveTypes.includes(source.type) || sensitiveTypes.includes(receiver.type)) {
              wallAssembly = 'staggered_stud';
            }
            if (
              (sensitiveTypes.includes(source.type) && noisyTypes.includes(receiver.type)) ||
              (noisyTypes.includes(source.type) && sensitiveTypes.includes(receiver.type))
            ) {
              wallAssembly = 'double_stud_insulated';
            }

            const rating = stcByWallType[wallAssembly] ?? 40;
            // IRC requires STC 50+ between dwelling units; STC 33+ minimum between rooms
            const meetsCode = rating >= 33;

            stcRatings.push({
              sourceRoomId: source.id,
              receiverRoomId: receiver.id,
              sourceRoomName: source.name,
              receiverRoomName: receiver.name,
              rating,
              wallAssembly,
              meetsCode,
            });
          }
        }
      }

      // Calculate IIC for rooms above/below each other
      const iicRatings: Array<{
        upperRoomId: string; lowerRoomId: string;
        upperRoomName: string; lowerRoomName: string;
        rating: number; floorAssembly: string; meetsCode: boolean;
      }> = [];

      const floors = Array.from(roomsByFloor.keys()).sort();
      for (let fi = 0; fi < floors.length - 1; fi++) {
        const upperFloor = roomsByFloor.get(floors[fi + 1]!) || [];
        const lowerFloor = roomsByFloor.get(floors[fi]!) || [];

        for (const upper of upperFloor) {
          for (const lower of lowerFloor) {
            const sensitiveBelow = ['bedroom', 'office'].includes(lower.type);
            const floorAssembly = sensitiveBelow
              ? 'concrete_with_resilient_underlay'
              : 'concrete_with_standard_finish';
            const rating = sensitiveBelow ? 55 : 45;
            const meetsCode = rating >= 45; // IBC minimum IIC 45

            iicRatings.push({
              upperRoomId: upper.id,
              lowerRoomId: lower.id,
              upperRoomName: upper.name,
              lowerRoomName: lower.name,
              rating,
              floorAssembly,
              meetsCode,
            });
          }
        }
      }

      // Calculate reverberation time (Sabine equation) per room
      const reverbTime: Array<{
        roomId: string; roomName: string; roomType: string;
        volumeCuM: number; rt60: number;
        targetRt60: { min: number; max: number }; meetsTarget: boolean;
      }> = [];

      // Target RT60 by room type (seconds)
      const targetRt60: Record<string, { min: number; max: number }> = {
        living_room: { min: 0.4, max: 0.8 },
        bedroom: { min: 0.3, max: 0.6 },
        kitchen: { min: 0.4, max: 0.7 },
        bathroom: { min: 0.5, max: 1.0 },
        office: { min: 0.3, max: 0.5 },
        dining_room: { min: 0.4, max: 0.8 },
        hallway: { min: 0.5, max: 1.0 },
      };

      for (const room of projectRooms) {
        const length = (room.lengthMm ?? 4000) / 1000;
        const width = (room.widthMm ?? 3000) / 1000;
        const height = (room.heightMm ?? 2700) / 1000;
        const volume = length * width * height;

        // Estimate total absorption (alpha * area)
        // Average absorption coefficient ~ 0.2 for furnished residential rooms
        const totalSurfaceArea = 2 * (length * width + length * height + width * height);
        const avgAbsorption = room.type === 'bathroom' ? 0.1 : 0.2;
        const totalAbsorption = totalSurfaceArea * avgAbsorption;

        // Sabine equation: RT60 = 0.161 * V / A
        const rt60 = totalAbsorption > 0 ? (0.161 * volume) / totalAbsorption : 0;

        const target = targetRt60[room.type] ?? { min: 0.4, max: 0.8 };
        const meetsTarget = rt60 >= target.min && rt60 <= target.max;

        reverbTime.push({
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          volumeCuM: Math.round(volume * 100) / 100,
          rt60: Math.round(rt60 * 100) / 100,
          targetRt60: target,
          meetsTarget,
        });
      }

      // Generate recommendations
      const recommendations: string[] = [];

      const lowStcPairs = stcRatings.filter((s) => s.rating < 45);
      if (lowStcPairs.length > 0) {
        recommendations.push(
          `${lowStcPairs.length} wall(s) have STC below 45 — consider upgrading to staggered or double stud assembly`,
        );
      }

      const lowIicPairs = iicRatings.filter((i) => i.rating < 50);
      if (lowIicPairs.length > 0) {
        recommendations.push(
          `${lowIicPairs.length} floor(s) have IIC below 50 — add resilient underlay or floating floor`,
        );
      }

      const highReverb = reverbTime.filter((r) => r.rt60 > (targetRt60[r.roomType]?.max ?? 0.8));
      if (highReverb.length > 0) {
        recommendations.push(
          `${highReverb.length} room(s) have excessive reverberation — add soft furnishings or acoustic panels`,
        );
      }

      // Upsert the acoustic analysis
      const existing = await ctx.db.query.acousticAnalyses.findFirst({
        where: eq(acousticAnalyses.projectId, input.projectId),
      });

      const analysisData = {
        projectId: input.projectId,
        roomPairs: stcRatings.map((s) => ({
          sourceRoomId: s.sourceRoomId,
          receiverRoomId: s.receiverRoomId,
          wallAssembly: s.wallAssembly,
        })),
        stcRatings,
        iicRatings,
        reverbTime,
        recommendations,
      };

      let analysis;
      if (existing) {
        const [updated] = await ctx.db.update(acousticAnalyses)
          .set(analysisData)
          .where(eq(acousticAnalyses.id, existing.id))
          .returning();
        analysis = updated;
      } else {
        const [created] = await ctx.db.insert(acousticAnalyses)
          .values(analysisData)
          .returning();
        analysis = created;
      }

      return {
        analysis,
        summary: {
          roomCount: projectRooms.length,
          wallPairsAnalyzed: stcRatings.length,
          floorPairsAnalyzed: iicRatings.length,
          avgStc: stcRatings.length > 0
            ? Math.round(stcRatings.reduce((s, r) => s + r.rating, 0) / stcRatings.length)
            : null,
          avgIic: iicRatings.length > 0
            ? Math.round(iicRatings.reduce((s, r) => s + r.rating, 0) / iicRatings.length)
            : null,
          recommendationCount: recommendations.length,
        },
      };
    }),
});
