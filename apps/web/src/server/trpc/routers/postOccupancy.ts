import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  postOccupancySurveys, lessonsLearned, projects, eq, and,
} from '@openlintel/db';

export const postOccupancyRouter = router({
  // ── Post-Occupancy Surveys ──────────────────────────────

  listSurveys: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.postOccupancySurveys.findMany({
        where: eq(postOccupancySurveys.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  getSurvey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const survey = await ctx.db.query.postOccupancySurveys.findFirst({
        where: eq(postOccupancySurveys.id, input.id),
        with: { project: true },
      });
      if (!survey) throw new Error('Survey not found');
      if ((survey.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return survey;
    }),

  createSurvey: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      surveyType: z.enum(['3_month', '6_month', '12_month', 'custom']),
      responses: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [survey] = await ctx.db.insert(postOccupancySurveys).values({
        projectId: input.projectId,
        surveyType: input.surveyType,
        responses: input.responses ?? null,
        sentAt: new Date(),
      }).returning();
      return survey;
    }),

  submitSurvey: protectedProcedure
    .input(z.object({
      id: z.string(),
      responses: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const survey = await ctx.db.query.postOccupancySurveys.findFirst({
        where: eq(postOccupancySurveys.id, input.id),
        with: { project: true },
      });
      if (!survey) throw new Error('Survey not found');
      if ((survey.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const [updated] = await ctx.db.update(postOccupancySurveys).set({
        responses: input.responses,
        completedAt: new Date(),
      }).where(eq(postOccupancySurveys.id, input.id)).returning();
      return updated;
    }),

  deleteSurvey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const survey = await ctx.db.query.postOccupancySurveys.findFirst({
        where: eq(postOccupancySurveys.id, input.id),
        with: { project: true },
      });
      if (!survey) throw new Error('Survey not found');
      if ((survey.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(postOccupancySurveys).where(eq(postOccupancySurveys.id, input.id));
      return { success: true };
    }),

  // ── Lessons Learned ─────────────────────────────────────

  listLessons: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(lessonsLearned.userId, ctx.userId)];
      if (input?.projectId) conditions.push(eq(lessonsLearned.projectId, input.projectId));
      if (input?.category) conditions.push(eq(lessonsLearned.category, input.category));
      return ctx.db.query.lessonsLearned.findMany({
        where: and(...conditions),
        orderBy: (l, { desc }) => [desc(l.createdAt)],
      });
    }),

  createLesson: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      category: z.string().optional(),
      title: z.string().min(1),
      description: z.string().min(1),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership if provided
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
      }
      const [lesson] = await ctx.db.insert(lessonsLearned).values({
        userId: ctx.userId,
        projectId: input.projectId ?? null,
        category: input.category ?? null,
        title: input.title,
        description: input.description,
        tags: input.tags ?? null,
      }).returning();
      return lesson;
    }),

  updateLesson: protectedProcedure
    .input(z.object({
      id: z.string(),
      category: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.query.lessonsLearned.findFirst({
        where: and(eq(lessonsLearned.id, input.id), eq(lessonsLearned.userId, ctx.userId)),
      });
      if (!lesson) throw new Error('Lesson not found');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(lessonsLearned).set(data).where(eq(lessonsLearned.id, id)).returning();
      return updated;
    }),

  deleteLesson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.query.lessonsLearned.findFirst({
        where: and(eq(lessonsLearned.id, input.id), eq(lessonsLearned.userId, ctx.userId)),
      });
      if (!lesson) throw new Error('Lesson not found');
      await ctx.db.delete(lessonsLearned).where(eq(lessonsLearned.id, input.id));
      return { success: true };
    }),
});
