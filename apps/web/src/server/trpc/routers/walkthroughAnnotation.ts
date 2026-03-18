import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  walkthroughAnnotations, projects, eq, and,
} from '@openlintel/db';

export const walkthroughAnnotationRouter = router({
  // ── List annotations ───────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
      status: z.string().optional(),
      annotationType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(walkthroughAnnotations.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(walkthroughAnnotations.roomId, input.roomId));
      if (input.status) conditions.push(eq(walkthroughAnnotations.status, input.status));
      if (input.annotationType) conditions.push(eq(walkthroughAnnotations.annotationType, input.annotationType));

      return ctx.db.query.walkthroughAnnotations.findMany({
        where: and(...conditions),
        with: { room: true, creator: true },
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });
    }),

  // ── Create annotation ─────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
      position3d: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }).optional(),
      annotationType: z.enum(['comment', 'issue', 'measurement', 'photo', 'voice']),
      content: z.string().optional(),
      voiceRecordingKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [annotation] = await ctx.db.insert(walkthroughAnnotations).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        position3d: input.position3d ?? null,
        annotationType: input.annotationType,
        content: input.content ?? null,
        voiceRecordingKey: input.voiceRecordingKey ?? null,
        createdBy: ctx.userId,
        status: 'open',
      }).returning();
      return annotation;
    }),

  // ── Resolve annotation ─────────────────────────────────
  resolve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await ctx.db.query.walkthroughAnnotations.findFirst({
        where: eq(walkthroughAnnotations.id, input.id),
        with: { project: true },
      });
      if (!annotation) throw new Error('Annotation not found');
      if ((annotation.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(walkthroughAnnotations).set({
        status: 'resolved',
        resolvedBy: ctx.userId,
        resolvedAt: new Date(),
      }).where(eq(walkthroughAnnotations.id, input.id)).returning();
      return updated;
    }),

  // ── Delete annotation ──────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await ctx.db.query.walkthroughAnnotations.findFirst({
        where: eq(walkthroughAnnotations.id, input.id),
        with: { project: true },
      });
      if (!annotation) throw new Error('Annotation not found');
      if ((annotation.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(walkthroughAnnotations).where(eq(walkthroughAnnotations.id, input.id));
      return { success: true };
    }),
});
