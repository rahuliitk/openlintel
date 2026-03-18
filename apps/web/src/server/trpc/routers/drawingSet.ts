import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  drawingSetConfigs, eq, and,
} from '@openlintel/db';

export const drawingSetRouter = router({
  // ── Get drawing set config ──────────────────────────────
  get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.drawingSetConfigs.findFirst({
        where: eq(drawingSetConfigs.userId, ctx.userId),
        orderBy: (c, { desc }) => [desc(c.updatedAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.query.drawingSetConfigs.findFirst({
        where: and(eq(drawingSetConfigs.id, input.id), eq(drawingSetConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Drawing set config not found');
      return config;
    }),

  // ── Save drawing set config (upsert) ───────────────────
  save: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      titleBlockTemplate: z.any().optional(),
      sheetNumberingScheme: z.string().optional(),
      symbolLegend: z.any().optional(),
      abbreviationKey: z.any().optional(),
      firmLogo: z.string().optional(),
      firmName: z.string().optional(),
      defaultScale: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const existing = await ctx.db.query.drawingSetConfigs.findFirst({
          where: and(eq(drawingSetConfigs.id, input.id), eq(drawingSetConfigs.userId, ctx.userId)),
        });
        if (!existing) throw new Error('Drawing set config not found');
        const { id, ...data } = input;
        const [updated] = await ctx.db.update(drawingSetConfigs).set({
          ...data,
          updatedAt: new Date(),
        }).where(eq(drawingSetConfigs.id, id)).returning();
        return updated;
      }

      // Create new config
      const [config] = await ctx.db.insert(drawingSetConfigs).values({
        userId: ctx.userId,
        titleBlockTemplate: input.titleBlockTemplate ?? null,
        sheetNumberingScheme: input.sheetNumberingScheme ?? null,
        symbolLegend: input.symbolLegend ?? null,
        abbreviationKey: input.abbreviationKey ?? null,
        firmLogo: input.firmLogo ?? null,
        firmName: input.firmName ?? null,
        defaultScale: input.defaultScale ?? null,
      }).returning();
      return config;
    }),

  // ── Delete config ───────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.query.drawingSetConfigs.findFirst({
        where: and(eq(drawingSetConfigs.id, input.id), eq(drawingSetConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Drawing set config not found');
      await ctx.db.delete(drawingSetConfigs).where(eq(drawingSetConfigs.id, input.id));
      return { success: true };
    }),
});
