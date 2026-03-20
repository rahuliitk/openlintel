import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  designFeedback, designVariants, lessonsLearned, projects, eq, and, ne,
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

  // ── Get aggregated insights (variant-level) ─────────────
  getInsights: protectedProcedure
    .input(
      z.union([
        z.object({ projectId: z.string() }),
        z.object({
          designVariantId: z.string().optional(),
          region: z.string().optional(),
        }),
      ]).optional(),
    )
    .query(async ({ ctx, input }) => {
      // Project-level insights (called by design-feedback page)
      if (input && 'projectId' in input && input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');

        const items = await ctx.db.query.lessonsLearned.findMany({
          where: and(
            eq(lessonsLearned.projectId, input.projectId),
            eq(lessonsLearned.userId, ctx.userId),
            ne(lessonsLearned.category, '__benchmark__'),
          ),
          orderBy: (l, { desc }) => [desc(l.createdAt)],
        });

        // Derive patterns from feedback items
        const patterns: { title: string; description: string }[] = [];
        const byCategory: Record<string, number> = {};
        let positiveCount = 0;
        let negativeCount = 0;

        items.forEach((item) => {
          const meta = (item.tags as any) ?? {};
          const outcome = meta.outcome ?? 'unknown';
          const cat = item.category ?? 'general';
          byCategory[cat] = (byCategory[cat] ?? 0) + 1;
          if (outcome === 'positive') positiveCount++;
          if (outcome === 'negative') negativeCount++;
        });

        if (items.length >= 3) {
          const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
          if (topCategory) {
            patterns.push({
              title: `Most feedback in "${topCategory[0].replace(/_/g, ' ')}"`,
              description: `${topCategory[1]} out of ${items.length} decisions relate to ${topCategory[0].replace(/_/g, ' ')}.`,
            });
          }
          if (positiveCount > negativeCount) {
            patterns.push({
              title: 'Positive trend in outcomes',
              description: `${positiveCount} positive vs ${negativeCount} negative outcomes across your recorded decisions.`,
            });
          }
        }

        return { patterns };
      }

      // Variant-level insights (original behavior)
      let allFeedback: any[];

      if (input && 'designVariantId' in input && input.designVariantId) {
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
        allFeedback = await ctx.db.query.designFeedback.findMany({
          orderBy: (f, { desc }) => [desc(f.createdAt)],
        });
      }

      if (input && 'region' in input && input.region) {
        allFeedback = allFeedback.filter((f) => f.region === input.region);
      }

      const byType: Record<string, number> = {};
      allFeedback.forEach((f) => {
        byType[f.feedbackType] = (byType[f.feedbackType] ?? 0) + 1;
      });

      const likes = byType.like ?? 0;
      const dislikes = byType.dislike ?? 0;
      const total = likes + dislikes;
      const satisfactionScore = total > 0 ? Math.round((likes / total) * 100) : null;

      const notesWithContent = allFeedback.filter((f) => f.notes).map((f) => f.notes);
      const modifications = allFeedback
        .filter((f) => f.feedbackType === 'modification' && f.changeDetails)
        .map((f) => f.changeDetails);

      return {
        totalFeedback: allFeedback.length,
        byType,
        satisfactionScore,
        recentNotes: notesWithContent.slice(0, 10),
        modificationPatterns: modifications.slice(0, 10),
        patterns: [] as { title: string; description: string }[],
        insights: {
          mostCommonFeedback: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
          satisfactionTrend: satisfactionScore !== null
            ? satisfactionScore >= 70 ? 'positive' : satisfactionScore >= 40 ? 'neutral' : 'negative'
            : 'insufficient_data',
        },
      };
    }),

  // ── Delete feedback (variant-level) ─────────────────────
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

  // ══════════════════════════════════════════════════════════
  // Project-level design feedback (used by design-feedback page)
  // Stored in the lessonsLearned table with metadata in tags jsonb
  // ══════════════════════════════════════════════════════════

  // ── List project-level feedback items ─────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.lessonsLearned.findMany({
        where: and(
          eq(lessonsLearned.projectId, input.projectId),
          eq(lessonsLearned.userId, ctx.userId),
          ne(lessonsLearned.category, '__benchmark__'),
        ),
        orderBy: (l, { desc }) => [desc(l.createdAt)],
      });

      // Map lessonsLearned rows to the shape the frontend expects
      return items.map((item) => {
        const meta = (item.tags as any) ?? {};
        return {
          id: item.id,
          title: item.title,
          feedbackType: item.category,
          decision: item.description,
          reasoning: meta.reasoning ?? null,
          outcome: meta.outcome ?? 'unknown',
          lessonsLearned: meta.lessonsLearned ?? null,
          createdAt: item.createdAt,
        };
      });
    }),

  // ── Add project-level feedback ────────────────────────────
  add: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1),
      feedbackType: z.string().min(1),
      decision: z.string().min(1),
      reasoning: z.string().optional(),
      outcome: z.string().optional(),
      lessonsLearned: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const rows = await ctx.db.insert(lessonsLearned).values({
        projectId: input.projectId,
        userId: ctx.userId,
        title: input.title,
        description: input.decision,
        category: input.feedbackType,
        tags: {
          reasoning: input.reasoning ?? null,
          outcome: input.outcome ?? 'unknown',
          lessonsLearned: input.lessonsLearned ?? null,
        },
      }).returning();
      const item = rows[0]!;

      const meta = (item.tags as any) ?? {};
      return {
        id: item.id,
        title: item.title,
        feedbackType: item.category,
        decision: item.description,
        reasoning: meta.reasoning ?? null,
        outcome: meta.outcome ?? 'unknown',
        lessonsLearned: meta.lessonsLearned ?? null,
        createdAt: item.createdAt,
      };
    }),

  // ── Generate AI insights for project feedback ─────────────
  generateInsights: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.lessonsLearned.findMany({
        where: and(
          eq(lessonsLearned.projectId, input.projectId),
          eq(lessonsLearned.userId, ctx.userId),
          ne(lessonsLearned.category, '__benchmark__'),
        ),
      });

      // Generate insight patterns from the recorded feedback
      const patterns: { title: string; description: string }[] = [];
      const byCategory: Record<string, number> = {};
      let positiveCount = 0;
      let negativeCount = 0;

      items.forEach((item) => {
        const meta = (item.tags as any) ?? {};
        const outcome = meta.outcome ?? 'unknown';
        const cat = item.category ?? 'general';
        byCategory[cat] = (byCategory[cat] ?? 0) + 1;
        if (outcome === 'positive') positiveCount++;
        if (outcome === 'negative') negativeCount++;
      });

      if (items.length === 0) {
        patterns.push({
          title: 'No feedback recorded yet',
          description: 'Start recording design decisions to unlock AI-powered insights and patterns.',
        });
      } else {
        const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          patterns.push({
            title: `Dominant area: ${topCategory[0].replace(/_/g, ' ')}`,
            description: `${topCategory[1]} of ${items.length} decisions are about ${topCategory[0].replace(/_/g, ' ')}. Consider diversifying your documented feedback.`,
          });
        }

        const successRate = (positiveCount + negativeCount) > 0
          ? Math.round((positiveCount / (positiveCount + negativeCount)) * 100)
          : null;

        if (successRate !== null) {
          patterns.push({
            title: `Success rate: ${successRate}%`,
            description: `${positiveCount} positive and ${negativeCount} negative outcomes recorded. ${
              successRate >= 70
                ? 'Your design decisions are trending well.'
                : 'Review negative outcomes for improvement opportunities.'
            }`,
          });
        }

        const withLessons = items.filter((i) => {
          const meta = (i.tags as any) ?? {};
          return meta.lessonsLearned;
        }).length;
        if (withLessons > 0) {
          patterns.push({
            title: `${withLessons} documented lessons`,
            description: 'Lessons learned are being captured. Review them before starting similar design decisions.',
          });
        }
      }

      return { patterns };
    }),

  // ── Delete project-level feedback ─────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.lessonsLearned.findFirst({
        where: and(eq(lessonsLearned.id, input.id), eq(lessonsLearned.userId, ctx.userId)),
      });
      if (!item) throw new Error('Feedback not found');
      await ctx.db.delete(lessonsLearned).where(eq(lessonsLearned.id, input.id));
      return { success: true };
    }),
});
