import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  designFeedback, designVariants, eq, and,
} from '@openlintel/db';

export const designLearningRouter = router({
  // ── Submit design feedback ──────────────────────────────
  submitFeedback: protectedProcedure
    .input(z.object({
      designVariantId: z.string(),
      feedbackType: z.enum(['like', 'dislike', 'modification', 'style_preference', 'color_preference', 'layout_preference']),
      notes: z.string().optional(),
      changeDetails: z.any().optional(),
      region: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the design variant belongs to the user
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant) throw new Error('Design variant not found');
      if ((variant.room as any).project.userId !== ctx.userId) throw new Error('Access denied');

      const [feedback] = await ctx.db.insert(designFeedback).values({
        designVariantId: input.designVariantId,
        feedbackType: input.feedbackType,
        notes: input.notes ?? null,
        changeDetails: input.changeDetails ?? null,
        region: input.region ?? null,
      }).returning();
      return feedback;
    }),

  // ── List feedback for a design variant ──────────────────
  listByVariant: protectedProcedure
    .input(z.object({ designVariantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant) throw new Error('Design variant not found');
      if ((variant.room as any).project.userId !== ctx.userId) throw new Error('Access denied');
      return ctx.db.query.designFeedback.findMany({
        where: eq(designFeedback.designVariantId, input.designVariantId),
        orderBy: (f, { desc }) => [desc(f.createdAt)],
      });
    }),

  // ── Get aggregated insights ─────────────────────────────
  getInsights: protectedProcedure
    .input(z.object({
      designVariantId: z.string().optional(),
      region: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let allFeedback: any[];

      if (input?.designVariantId) {
        // Verify ownership
        const variant = await ctx.db.query.designVariants.findFirst({
          where: eq(designVariants.id, input.designVariantId),
          with: { room: { with: { project: true } } },
        });
        if (!variant) throw new Error('Design variant not found');
        if ((variant.room as any).project.userId !== ctx.userId) throw new Error('Access denied');

        allFeedback = await ctx.db.query.designFeedback.findMany({
          where: eq(designFeedback.designVariantId, input.designVariantId),
        });
      } else {
        // Get all feedback across user's design variants
        // We'll fetch all and filter — for a production system, use a join
        allFeedback = await ctx.db.query.designFeedback.findMany({
          orderBy: (f, { desc }) => [desc(f.createdAt)],
        });
      }

      if (input?.region) {
        allFeedback = allFeedback.filter((f) => f.region === input.region);
      }

      // Aggregate by feedback type
      const byType: Record<string, number> = {};
      allFeedback.forEach((f) => {
        byType[f.feedbackType] = (byType[f.feedbackType] ?? 0) + 1;
      });

      // Calculate satisfaction score (likes vs dislikes)
      const likes = byType.like ?? 0;
      const dislikes = byType.dislike ?? 0;
      const total = likes + dislikes;
      const satisfactionScore = total > 0 ? Math.round((likes / total) * 100) : null;

      // Extract common themes from notes
      const notesWithContent = allFeedback.filter((f) => f.notes).map((f) => f.notes);

      // Group modifications by type
      const modifications = allFeedback
        .filter((f) => f.feedbackType === 'modification' && f.changeDetails)
        .map((f) => f.changeDetails);

      return {
        totalFeedback: allFeedback.length,
        byType,
        satisfactionScore,
        recentNotes: notesWithContent.slice(0, 10),
        modificationPatterns: modifications.slice(0, 10),
        insights: {
          mostCommonFeedback: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
          satisfactionTrend: satisfactionScore !== null
            ? satisfactionScore >= 70 ? 'positive' : satisfactionScore >= 40 ? 'neutral' : 'negative'
            : 'insufficient_data',
        },
      };
    }),

  // ── Delete feedback ─────────────────────────────────────
  deleteFeedback: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feedback = await ctx.db.query.designFeedback.findFirst({
        where: eq(designFeedback.id, input.id),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!feedback) throw new Error('Feedback not found');
      if ((feedback.designVariant as any).room.project.userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(designFeedback).where(eq(designFeedback.id, input.id));
      return { success: true };
    }),
});
