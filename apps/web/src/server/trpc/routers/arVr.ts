import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { arVrSessions, projects, floorPlanCanvases, spacePlans, rooms as roomsTable, eq, and, inArray } from '@openlintel/db';

export const arVrRouter = router({
  // ── Get floor plan data for 3D rendering ─────────────────
  getFloorPlanData: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { rooms: true },
      });
      if (!project) throw new Error('Project not found');

      // Fetch floor plan canvases with wall segments, openings, and staircases
      const canvases = await ctx.db.query.floorPlanCanvases.findMany({
        where: eq(floorPlanCanvases.projectId, input.projectId),
        with: {
          walls: {
            with: { openings: true },
          },
          staircases: true,
        },
      });

      // Fetch space plans (furniture placements) for each room
      const roomIds = (project.rooms as any[]).map((r: any) => r.id);
      const spacePlansList = roomIds.length > 0
        ? await ctx.db.query.spacePlans.findMany({
            where: inArray(spacePlans.roomId, roomIds),
          })
        : [];

      return {
        rooms: project.rooms,
        canvases,
        spacePlans: spacePlansList,
      };
    }),

  // ── List sessions for a project ───────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.arVrSessions.findMany({
        where: eq(arVrSessions.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.updatedAt)],
      });
    }),

  // ── Get by ID ─────────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.query.arVrSessions.findFirst({
        where: eq(arVrSessions.id, input.id),
        with: { project: true },
      });
      if (!session) throw new Error('AR/VR session not found');
      if ((session.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return session;
    }),

  // ── Save / create session ─────────────────────────────────
  save: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      mode: z.enum(['ar', 'vr']),
      placedItems: z.any().optional(),
      vrState: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [session] = await ctx.db.insert(arVrSessions).values({
        projectId: input.projectId,
        name: input.name,
        mode: input.mode,
        placedItems: input.placedItems ?? null,
        vrState: input.vrState ?? null,
      }).returning();
      return session;
    }),

  // ── Update session ────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      placedItems: z.any().optional(),
      vrState: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.arVrSessions.findFirst({
        where: eq(arVrSessions.id, input.id),
        with: { project: true },
      });
      if (!session) throw new Error('AR/VR session not found');
      if ((session.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(arVrSessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(arVrSessions.id, id))
        .returning();
      return updated;
    }),

  // ── Delete session ────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.arVrSessions.findFirst({
        where: eq(arVrSessions.id, input.id),
        with: { project: true },
      });
      if (!session) throw new Error('AR/VR session not found');
      if ((session.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(arVrSessions).where(eq(arVrSessions.id, input.id));
      return { success: true };
    }),
});
