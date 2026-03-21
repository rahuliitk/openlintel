import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  spacePlans, rooms, projects, jobs, eq, and,
} from '@openlintel/db';

export const spacePlanningRouter = router({
  // ── List space plans for a room ─────────────────────────
  list: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return ctx.db.query.spacePlans.findMany({
        where: eq(spacePlans.roomId, input.roomId),
        orderBy: (sp, { desc }) => [desc(sp.createdAt)],
      });
    }),

  // ── Get single space plan ───────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.spacePlans.findFirst({
        where: eq(spacePlans.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!plan) throw new Error('Space plan not found');
      if ((plan.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      return plan;
    }),

  // ── Generate space plan (creates a job) ─────────────────
  generate: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      furnitureList: z.array(z.string()).optional(),
      priorities: z.array(z.enum(['circulation', 'feng_shui', 'accessibility', 'natural_light'])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'space_planning',
        status: 'pending',
        inputJson: {
          roomId: input.roomId,
          furnitureList: input.furnitureList ?? [],
          priorities: input.priorities ?? ['circulation'],
        },
        projectId: (room.project as any).id,
        roomId: input.roomId,
      }).returning();

      // In background, the AI service would process this job and insert into spacePlans
      // For now, return the job so the client can poll for completion
      return job;
    }),

  // ── Save / update a space plan ──────────────────────────
  save: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      layoutVariant: z.number().default(1),
      furniturePlacements: z.any().optional(),
      circulationScore: z.number().optional(),
      fengShuiScore: z.number().optional(),
      accessibilityScore: z.number().optional(),
      prosAndCons: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room) throw new Error('Room not found');
      if ((room.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const [plan] = await ctx.db.insert(spacePlans).values({
        roomId: input.roomId,
        layoutVariant: input.layoutVariant,
        furniturePlacements: input.furniturePlacements ?? null,
        circulationScore: input.circulationScore ?? null,
        fengShuiScore: input.fengShuiScore ?? null,
        accessibilityScore: input.accessibilityScore ?? null,
        prosAndCons: input.prosAndCons ?? null,
      }).returning();
      return plan;
    }),

  // ── Delete a space plan ─────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.spacePlans.findFirst({
        where: eq(spacePlans.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!plan) throw new Error('Space plan not found');
      if ((plan.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(spacePlans).where(eq(spacePlans.id, input.id));
      return { success: true };
    }),

  // ── Apply plan to editor ────────────────────────────────
  applyToEditor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.spacePlans.findFirst({
        where: eq(spacePlans.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!plan) throw new Error('Space plan not found');
      if ((plan.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      // Return the furniture placements in editor-compatible format
      return {
        roomId: plan.roomId,
        layoutVariant: plan.layoutVariant,
        furniturePlacements: plan.furniturePlacements,
        scores: {
          circulation: plan.circulationScore,
          fengShui: plan.fengShuiScore,
          accessibility: plan.accessibilityScore,
        },
      };
    }),
});
