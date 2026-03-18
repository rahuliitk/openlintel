import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  closetLayouts, rooms, eq, and,
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

  // ── List all closet layouts for a room ──────────────────
  list: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
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
