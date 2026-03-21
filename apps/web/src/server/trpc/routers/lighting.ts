import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  lightingFixtures, projects, rooms, eq, and,
} from '@openlintel/db';

const LUX_TARGETS: Record<string, number> = {
  bedroom: 150,
  kitchen: 500,
  bathroom: 300,
  living_room: 300,
  dining_room: 200,
  home_office: 500,
  hallway: 100,
  staircase: 150,
  garage: 300,
};

const ROOM_AREA_ESTIMATES: Record<string, number> = {
  bedroom: 14,
  kitchen: 12,
  bathroom: 6,
  living_room: 20,
  dining_room: 14,
  home_office: 10,
  hallway: 6,
  staircase: 4,
  garage: 20,
};

export const lightingRouter = router({
  // ── List all fixtures for a project ─────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.lightingFixtures.findMany({
        where: eq(lightingFixtures.projectId, input.projectId),
        orderBy: (f, { desc }) => [desc(f.createdAt)],
      });
    }),

  // ── Add a fixture ───────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string(),
      fixtureType: z.string().min(1),
      lumens: z.number().int().positive(),
      wattage: z.number().positive(),
      colorTemp: z.number().int().positive(),
      quantity: z.number().int().min(1).default(1),
      switchZone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.projectId, input.projectId)),
      });
      if (!room) throw new Error('Room not found in this project');

      const [fixture] = await ctx.db.insert(lightingFixtures).values({
        projectId: input.projectId,
        roomId: input.roomId,
        fixtureType: input.fixtureType,
        lumens: input.lumens,
        wattage: input.wattage,
        colorTemp: input.colorTemp,
        quantity: input.quantity,
        switchZone: input.switchZone ?? null,
        notes: input.notes ?? null,
      }).returning();
      return fixture;
    }),

  // ── Calculate lux levels per room ───────────────────────────
  calculateLux: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });

      const fixtures = await ctx.db.query.lightingFixtures.findMany({
        where: eq(lightingFixtures.projectId, input.projectId),
      });

      const roomMap = new Map<string, { name: string; type: string; fixtures: typeof fixtures }>();
      for (const room of projectRooms) {
        roomMap.set(room.id, {
          name: room.name,
          type: (room as any).roomType ?? 'living_room',
          fixtures: [],
        });
      }
      for (const f of fixtures) {
        const entry = roomMap.get(f.roomId);
        if (entry) entry.fixtures.push(f);
      }

      const roomResults = [];
      for (const [roomId, data] of roomMap) {
        const totalLumens = data.fixtures.reduce(
          (sum, f) => sum + f.lumens * (f.quantity ?? 1), 0,
        );
        const fixtureCount = data.fixtures.reduce(
          (sum, f) => sum + (f.quantity ?? 1), 0,
        );
        const area = ROOM_AREA_ESTIMATES[data.type] || 14;
        const calculatedLux = fixtureCount > 0
          ? Math.round((totalLumens * 0.5) / area)
          : 0;

        roomResults.push({
          roomId,
          roomName: data.name,
          roomType: data.type,
          fixtureCount,
          totalLumens,
          calculatedLux,
          targetLux: LUX_TARGETS[data.type] || 300,
        });
      }

      return {
        rooms: roomResults.filter((r) => r.fixtureCount > 0),
      };
    }),

  // ── Recalculate (triggers frontend cache invalidation) ──────
  recalculate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return { success: true, recalculatedAt: new Date().toISOString() };
    }),

  // ── Delete a fixture ────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const fixture = await ctx.db.query.lightingFixtures.findFirst({
        where: eq(lightingFixtures.id, input.id),
        with: { project: true },
      });
      if (!fixture) throw new Error('Fixture not found');
      if ((fixture.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(lightingFixtures).where(eq(lightingFixtures.id, input.id));
      return { success: true };
    }),
});
