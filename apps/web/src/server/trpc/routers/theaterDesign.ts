import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  theaterDesigns, rooms, projects, eq, and, inArray,
} from '@openlintel/db';

export const theaterDesignRouter = router({
  // ── List theater designs for a project ────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Find all rooms for this project
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });
      if (projectRooms.length === 0) return [];

      const roomIds = projectRooms.map((r) => r.id);
      const designs = await ctx.db.query.theaterDesigns.findMany({
        where: inArray(theaterDesigns.roomId, roomIds),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });

      // Build a roomId -> room lookup
      const roomMap = new Map(projectRooms.map((r) => [r.id, r]));

      // Unpack the jsonb fields into the flat shape the frontend expects
      return designs.map((d) => {
        const room = roomMap.get(d.roomId);
        const screen = (d.screenSpec as any) ?? {};
        const speaker = (d.speakerLayout as any) ?? {};
        const seating = (d.seatingLayout as any) ?? {};
        return {
          id: d.id,
          name: screen.name ?? 'Theater Design',
          roomWidthFt: room ? Math.round((room.widthMm ?? 0) / 304.8 * 10) / 10 : screen.roomWidthFt ?? null,
          roomLengthFt: room ? Math.round((room.lengthMm ?? 0) / 304.8 * 10) / 10 : screen.roomLengthFt ?? null,
          roomHeightFt: room ? Math.round((room.heightMm ?? 0) / 304.8 * 10) / 10 : screen.roomHeightFt ?? null,
          displayType: screen.displayType ?? 'projector',
          screenSize: screen.screenSize ?? null,
          audioConfig: speaker.audioConfig ?? '5.1',
          speakerCount: speaker.speakerCount ?? null,
          seatingType: seating.seatingType ?? null,
          seatCount: seating.seatCount ?? null,
          notes: screen.notes ?? null,
          createdAt: d.createdAt,
        };
      });
    }),

  // ── Create theater design for a project ───────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      roomWidthFt: z.number().optional(),
      roomLengthFt: z.number().optional(),
      roomHeightFt: z.number().optional(),
      displayType: z.string(),
      screenSize: z.number().optional(),
      audioConfig: z.string(),
      seatingType: z.string().optional(),
      seatCount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Find or create a room to attach this theater design to
      let room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.projectId, input.projectId), eq(rooms.type, 'theater')),
      });
      if (!room) {
        const widthMm = input.roomWidthFt ? Math.round(input.roomWidthFt * 304.8) : null;
        const lengthMm = input.roomLengthFt ? Math.round(input.roomLengthFt * 304.8) : null;
        const heightMm = input.roomHeightFt ? Math.round(input.roomHeightFt * 304.8) : 2700;
        const [newRoom] = await ctx.db.insert(rooms).values({
          projectId: input.projectId,
          name: input.name,
          type: 'theater',
          widthMm,
          lengthMm,
          heightMm,
        }).returning();
        room = newRoom;
      }

      // Pack fields into the jsonb columns
      const screenSpec = {
        name: input.name,
        displayType: input.displayType,
        screenSize: input.screenSize ?? null,
        roomWidthFt: input.roomWidthFt ?? null,
        roomLengthFt: input.roomLengthFt ?? null,
        roomHeightFt: input.roomHeightFt ?? null,
        notes: input.notes ?? null,
      };
      const speakerLayout = {
        audioConfig: input.audioConfig,
        speakerCount: input.audioConfig === '7.1' ? 8
          : input.audioConfig === '5.1' ? 6
          : input.audioConfig === '9.1.6' ? 16
          : input.audioConfig === 'Atmos' ? 12
          : 2,
      };
      const seatingLayout = {
        seatingType: input.seatingType ?? null,
        seatCount: input.seatCount ?? null,
      };

      const [design] = await ctx.db.insert(theaterDesigns).values({
        roomId: room.id,
        screenSpec,
        speakerLayout,
        seatingLayout,
      }).returning();

      return {
        id: design.id,
        name: input.name,
        roomWidthFt: input.roomWidthFt ?? null,
        roomLengthFt: input.roomLengthFt ?? null,
        roomHeightFt: input.roomHeightFt ?? null,
        displayType: input.displayType,
        screenSize: input.screenSize ?? null,
        audioConfig: input.audioConfig,
        speakerCount: speakerLayout.speakerCount,
        seatingType: input.seatingType ?? null,
        seatCount: input.seatCount ?? null,
        notes: input.notes ?? null,
        createdAt: design.createdAt,
      };
    }),

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
