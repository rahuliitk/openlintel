import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  theaterDesigns, rooms, eq, and,
} from '@openlintel/db';

export const theaterDesignRouter = router({
  // ── Get theater design for a room ───────────────────────
  get: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return ctx.db.query.theaterDesigns.findFirst({
        where: eq(theaterDesigns.roomId, input.roomId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
    }),

  // ── Save theater design (upsert) ───────────────────────
  save: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      id: z.string().optional(),
      screenSpec: z.any().optional(),
      speakerLayout: z.any().optional(),
      seatingLayout: z.any().optional(),
      acousticTreatment: z.any().optional(),
      lightingZones: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');

      if (input.id) {
        const existing = await ctx.db.query.theaterDesigns.findFirst({
          where: eq(theaterDesigns.id, input.id),
        });
        if (!existing) throw new Error('Theater design not found');
        const { id, roomId, ...data } = input;
        const [updated] = await ctx.db.update(theaterDesigns).set(data).where(eq(theaterDesigns.id, id)).returning();
        return updated;
      }

      const [design] = await ctx.db.insert(theaterDesigns).values({
        roomId: input.roomId,
        screenSpec: input.screenSpec ?? null,
        speakerLayout: input.speakerLayout ?? null,
        seatingLayout: input.seatingLayout ?? null,
        acousticTreatment: input.acousticTreatment ?? null,
        lightingZones: input.lightingZones ?? null,
      }).returning();
      return design;
    }),

  // ── Delete theater design ───────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.theaterDesigns.findFirst({
        where: eq(theaterDesigns.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!design) throw new Error('Theater design not found');
      if ((design.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(theaterDesigns).where(eq(theaterDesigns.id, input.id));
      return { success: true };
    }),

  // ── Calculate screen size ───────────────────────────────
  calculateScreen: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      seatingDistance: z.number().optional(),
      aspectRatio: z.enum(['16:9', '2.35:1', '4:3']).default('16:9'),
    }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const lengthMm = room.lengthMm ?? 5000;
      const widthMm = room.widthMm ?? 4000;
      const heightMm = room.heightMm ?? 2700;

      // Viewing distance: use provided or default to 60% of room length
      const viewingDistanceMm = input.seatingDistance
        ? input.seatingDistance * 1000
        : lengthMm * 0.6;

      // THX recommended: viewing angle of 36 degrees
      // SMPTE recommended: 30 degrees minimum
      const thxAngleRad = 36 * Math.PI / 180;
      const optimalScreenWidthMm = 2 * viewingDistanceMm * Math.tan(thxAngleRad / 2);

      // Cap at 80% of wall width
      const maxScreenWidthMm = widthMm * 0.8;
      const screenWidthMm = Math.min(optimalScreenWidthMm, maxScreenWidthMm);

      // Calculate height based on aspect ratio
      const ratioMap: Record<string, number> = { '16:9': 16 / 9, '2.35:1': 2.35, '4:3': 4 / 3 };
      const ratio = ratioMap[input.aspectRatio] ?? 16 / 9;
      const screenHeightMm = screenWidthMm / ratio;

      // Screen diagonal in inches
      const diagonalMm = Math.sqrt(screenWidthMm ** 2 + screenHeightMm ** 2);
      const diagonalInches = Math.round(diagonalMm / 25.4);

      // Speaker positions for 7.1 Dolby layout
      const speakerPositions = [
        { name: 'Center', x: widthMm / 2, y: 0 },
        { name: 'Front Left', x: widthMm * 0.2, y: 0 },
        { name: 'Front Right', x: widthMm * 0.8, y: 0 },
        { name: 'Surround Left', x: 0, y: lengthMm * 0.6 },
        { name: 'Surround Right', x: widthMm, y: lengthMm * 0.6 },
        { name: 'Back Surround Left', x: widthMm * 0.3, y: lengthMm },
        { name: 'Back Surround Right', x: widthMm * 0.7, y: lengthMm },
        { name: 'Subwoofer', x: widthMm * 0.15, y: lengthMm * 0.1 },
      ];

      return {
        screenWidthMm: Math.round(screenWidthMm),
        screenHeightMm: Math.round(screenHeightMm),
        diagonalInches,
        viewingDistanceMm: Math.round(viewingDistanceMm),
        aspectRatio: input.aspectRatio,
        maxSeatingRows: Math.floor((lengthMm - viewingDistanceMm * 0.3) / 1000),
        speakerPositions,
        roomDimensions: { lengthMm, widthMm, heightMm },
      };
    }),
});
