import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  inspirationBoards, inspirationPins, projects, eq, and,
} from '@openlintel/db';

export const inspirationRouter = router({
  // ═══════════════════════════════════════════════════════
  // Inspiration Boards
  // ═══════════════════════════════════════════════════════

  // ── List boards ────────────────────────────────────────
  listBoards: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.inspirationBoards.findMany({
        where: eq(inspirationBoards.projectId, input.projectId),
        with: { pins: true },
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
    }),

  // ── Create board ───────────────────────────────────────
  createBoard: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      layout: z.enum(['masonry', 'grid', 'freeform']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [board] = await ctx.db.insert(inspirationBoards).values({
        projectId: input.projectId,
        name: input.name,
        layout: input.layout ?? 'masonry',
      }).returning();
      return board;
    }),

  // ── Delete board ───────────────────────────────────────
  deleteBoard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.inspirationBoards.findFirst({
        where: eq(inspirationBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(inspirationBoards).where(eq(inspirationBoards.id, input.id));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════
  // Inspiration Pins
  // ═══════════════════════════════════════════════════════

  // ── List pins ──────────────────────────────────────────
  listPins: protectedProcedure
    .input(z.object({
      boardId: z.string(),
      category: z.string().optional(),
      style: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.db.query.inspirationBoards.findFirst({
        where: eq(inspirationBoards.id, input.boardId),
        with: { project: true },
      });
      if (!board) throw new Error('Board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const conditions = [eq(inspirationPins.boardId, input.boardId)];
      if (input.category) conditions.push(eq(inspirationPins.category, input.category));
      if (input.style) conditions.push(eq(inspirationPins.style, input.style));

      return ctx.db.query.inspirationPins.findMany({
        where: and(...conditions),
        with: { user: true },
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),

  // ── Add pin ────────────────────────────────────────────
  addPin: protectedProcedure
    .input(z.object({
      boardId: z.string(),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
      sourceUrl: z.string().optional(),
      note: z.string().optional(),
      tags: z.array(z.string()).optional(),
      style: z.string().optional(),
      category: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.inspirationBoards.findFirst({
        where: eq(inspirationBoards.id, input.boardId),
        with: { project: true },
      });
      if (!board) throw new Error('Board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [pin] = await ctx.db.insert(inspirationPins).values({
        boardId: input.boardId,
        userId: ctx.userId,
        imageUrl: input.imageUrl ?? null,
        imageKey: input.imageKey ?? null,
        sourceUrl: input.sourceUrl ?? null,
        note: input.note ?? null,
        tags: input.tags ?? null,
        style: input.style ?? null,
        category: input.category ?? null,
        position: input.position ?? null,
      }).returning();
      return pin;
    }),

  // ── Remove pin ─────────────────────────────────────────
  removePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pin = await ctx.db.query.inspirationPins.findFirst({
        where: eq(inspirationPins.id, input.id),
        with: { board: true },
      });
      if (!pin) throw new Error('Pin not found');

      // Verify ownership via board -> project
      const board = await ctx.db.query.inspirationBoards.findFirst({
        where: eq(inspirationBoards.id, pin.boardId),
        with: { project: true },
      });
      if (!board || (board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(inspirationPins).where(eq(inspirationPins.id, input.id));
      return { success: true };
    }),
});
