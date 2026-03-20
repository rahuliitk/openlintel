import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  closetLayouts, rooms, projects, eq, and, inArray,
} from '@openlintel/db';

export const closetDesignRouter = router({
  // ── Get closet layout for a room ────────────────────────
  get: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return ctx.db.query.closetLayouts.findFirst({
        where: eq(closetLayouts.roomId, input.roomId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    }),

  // ── List all closet layouts for a project or room ───────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      roomId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, input.roomId),
          with: { project: true },
        });
        if (!room) throw new Error('Room not found');
        if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');
        return ctx.db.query.closetLayouts.findMany({
          where: eq(closetLayouts.roomId, input.roomId),
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        });
      }

      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
        // Get all rooms for this project, then get closet layouts
        const projectRooms = await ctx.db.query.rooms.findMany({
          where: eq(rooms.projectId, input.projectId),
        });
        if (projectRooms.length === 0) return [];
        const roomIds = projectRooms.map((r) => r.id);
        const layouts = await ctx.db.query.closetLayouts.findMany({
          where: inArray(closetLayouts.roomId, roomIds),
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        });
        // Enrich with unpacked sections data for the frontend
        return layouts.map((layout) => {
          const sec = (layout.sections as any) ?? {};
          return {
            ...layout,
            name: sec.name ?? layout.layoutType ?? 'Closet',
            closetType: sec.closetType ?? layout.layoutType ?? null,
            room: sec.room ?? null,
            widthInches: sec.widthInches ?? null,
            depthInches: sec.depthInches ?? null,
            heightInches: sec.heightInches ?? null,
            system: sec.system ?? null,
            components: sec.components ?? null,
            notes: sec.notes ?? null,
          };
        });
      }

      throw new Error('Either projectId or roomId is required');
    }),

  // ── Create closet layout by projectId ──────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      closetType: z.string(),
      room: z.string().optional(),
      widthInches: z.number().optional(),
      depthInches: z.number().optional(),
      heightInches: z.number().optional(),
      system: z.string().optional(),
      components: z.any().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Find or create a room to anchor the closet layout
      let roomId: string;
      if (input.room) {
        // Try to find an existing room by name
        const existingRoom = await ctx.db.query.rooms.findFirst({
          where: and(eq(rooms.projectId, input.projectId), eq(rooms.name, input.room)),
        });
        if (existingRoom) {
          roomId = existingRoom.id;
        } else {
          const [newRoom] = await ctx.db.insert(rooms).values({
            projectId: input.projectId,
            name: input.room,
            type: 'closet',
          }).returning();
          roomId = newRoom!.id;
        }
      } else {
        // Use a default "Closets" room
        const defaultRoom = await ctx.db.query.rooms.findFirst({
          where: and(eq(rooms.projectId, input.projectId), eq(rooms.name, 'Closets')),
        });
        if (defaultRoom) {
          roomId = defaultRoom.id;
        } else {
          const [newRoom] = await ctx.db.insert(rooms).values({
            projectId: input.projectId,
            name: 'Closets',
            type: 'closet',
          }).returning();
          roomId = newRoom!.id;
        }
      }

      const sectionData = {
        name: input.name,
        closetType: input.closetType,
        room: input.room ?? null,
        widthInches: input.widthInches ?? null,
        depthInches: input.depthInches ?? null,
        heightInches: input.heightInches ?? null,
        system: input.system ?? null,
        components: input.components ?? null,
        notes: input.notes ?? null,
      };

      const [layout] = await ctx.db.insert(closetLayouts).values({
        roomId,
        layoutType: input.closetType,
        sections: sectionData,
        accessories: null,
        totalLinearFt: null,
      }).returning();

      return {
        ...layout,
        name: sectionData.name,
        closetType: sectionData.closetType,
        room: sectionData.room,
        widthInches: sectionData.widthInches,
        depthInches: sectionData.depthInches,
        heightInches: sectionData.heightInches,
        system: sectionData.system,
        components: sectionData.components,
        notes: sectionData.notes,
      };
    }),

  // ── Save closet layout (upsert) ────────────────────────
  save: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      id: z.string().optional(),
      layoutType: z.string().optional(),
      sections: z.any().optional(),
      accessories: z.any().optional(),
      totalLinearFt: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');

      if (input.id) {
        const existing = await ctx.db.query.closetLayouts.findFirst({
          where: eq(closetLayouts.id, input.id),
        });
        if (!existing) throw new Error('Closet layout not found');
        const { id, roomId, ...data } = input;
        const [updated] = await ctx.db.update(closetLayouts).set(data).where(eq(closetLayouts.id, id)).returning();
        return updated;
      }

      const [layout] = await ctx.db.insert(closetLayouts).values({
        roomId: input.roomId,
        layoutType: input.layoutType ?? null,
        sections: input.sections ?? null,
        accessories: input.accessories ?? null,
        totalLinearFt: input.totalLinearFt ?? null,
      }).returning();
      return layout;
    }),

  // ── Delete closet layout ────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.query.closetLayouts.findFirst({
        where: eq(closetLayouts.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!layout) throw new Error('Closet layout not found');
      if ((layout.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(closetLayouts).where(eq(closetLayouts.id, input.id));
      return { success: true };
    }),

  // ── Optimize closet layout ──────────────────────────────
  optimize: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      preferences: z.object({
        hangingPercent: z.number().min(0).max(100).default(40),
        shelvingPercent: z.number().min(0).max(100).default(30),
        drawerPercent: z.number().min(0).max(100).default(30),
        includeAccessories: z.boolean().default(true),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const lengthMm = room.lengthMm ?? 2400;
      const widthMm = room.widthMm ?? 1200;
      const heightMm = room.heightMm ?? 2700;
      const prefs = input.preferences ?? { hangingPercent: 40, shelvingPercent: 30, drawerPercent: 30, includeAccessories: true };

      // Calculate optimized layout dimensions
      const perimeterMm = 2 * (lengthMm + widthMm);
      const usableWallMm = perimeterMm - 900; // subtract door opening
      const totalLinearFt = Math.round((usableWallMm / 304.8) * 100) / 100;

      const hangingWidthMm = usableWallMm * (prefs.hangingPercent / 100);
      const shelvingWidthMm = usableWallMm * (prefs.shelvingPercent / 100);
      const drawerWidthMm = usableWallMm * (prefs.drawerPercent / 100);

      const sections = [
        { type: 'double_hang', widthMm: hangingWidthMm * 0.5, heightMm: heightMm, rods: 2 },
        { type: 'long_hang', widthMm: hangingWidthMm * 0.5, heightMm: heightMm, rods: 1 },
        { type: 'shelving', widthMm: shelvingWidthMm, heightMm: heightMm, shelfCount: Math.floor(heightMm / 350) },
        { type: 'drawers', widthMm: drawerWidthMm, heightMm: 1200, drawerCount: 5 },
      ];

      const accessories = prefs.includeAccessories ? [
        { type: 'tie_rack', location: 'door_mount' },
        { type: 'shoe_rack', location: 'floor', tiers: 3 },
        { type: 'jewelry_tray', location: 'top_drawer' },
        { type: 'pull_out_hamper', location: 'bottom' },
      ] : [];

      return {
        roomId: input.roomId,
        totalLinearFt,
        sections,
        accessories,
        estimatedCost: Math.round(totalLinearFt * 85 * 100) / 100,
        currency: 'USD',
      };
    }),
});
