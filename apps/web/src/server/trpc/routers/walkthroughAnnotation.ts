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

      const rows = await ctx.db.query.walkthroughAnnotations.findMany({
        where: and(...conditions),
        with: { room: true, creator: true },
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });

      return rows.map((row) => {
        const pos = row.position3d as Record<string, unknown> | null;
        return {
          id: row.id,
          projectId: row.projectId,
          roomId: row.roomId,
          roomName: (row.room as any)?.name ?? null,
          annotationType: row.annotationType,
          elementType: pos?.elementType as string | null ?? null,
          positionNote: pos?.positionNote as string | null ?? null,
          comment: row.content,
          content: row.content,
          status: row.status,
          authorName: (row.creator as any)?.name ?? null,
          resolution: row.resolvedAt ? 'resolved' : null,
          createdBy: row.createdBy,
          resolvedBy: row.resolvedBy,
          resolvedAt: row.resolvedAt,
          createdAt: row.createdAt,
          voiceRecordingKey: row.voiceRecordingKey,
          position3d: row.position3d,
        };
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
      annotationType: z.enum([
        'comment', 'issue', 'measurement', 'photo', 'voice',
        'dislike', 'like', 'question', 'change_request', 'general',
      ]),
      content: z.string().optional(),
      comment: z.string().optional(),
      elementType: z.string().optional(),
      positionNote: z.string().optional(),
      voiceRecordingKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Build the position3d jsonb value, merging 3d coords with elementType/positionNote
      const position3dValue: Record<string, unknown> = {};
      if (input.position3d) {
        position3dValue.x = input.position3d.x;
        position3dValue.y = input.position3d.y;
        position3dValue.z = input.position3d.z;
      }
      if (input.elementType) position3dValue.elementType = input.elementType;
      if (input.positionNote) position3dValue.positionNote = input.positionNote;

      // Accept either `comment` or `content` for the content field
      const contentValue = input.comment ?? input.content ?? null;

      const [annotation] = await ctx.db.insert(walkthroughAnnotations).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        position3d: Object.keys(position3dValue).length > 0 ? position3dValue : null,
        annotationType: input.annotationType,
        content: contentValue,
        voiceRecordingKey: input.voiceRecordingKey ?? null,
        createdBy: ctx.userId,
        status: 'open',
      }).returning();
      return annotation;
    }),

  // ── Acknowledge annotation ──────────────────────────────
  acknowledge: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await ctx.db.query.walkthroughAnnotations.findFirst({
        where: eq(walkthroughAnnotations.id, input.id),
        with: { project: true },
      });
      if (!annotation) throw new Error('Annotation not found');
      if ((annotation.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(walkthroughAnnotations).set({
        status: 'acknowledged',
      }).where(eq(walkthroughAnnotations.id, input.id)).returning();
      return updated;
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

  // ── Dismiss annotation ──────────────────────────────────
  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const annotation = await ctx.db.query.walkthroughAnnotations.findFirst({
        where: eq(walkthroughAnnotations.id, input.id),
        with: { project: true },
      });
      if (!annotation) throw new Error('Annotation not found');
      if ((annotation.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(walkthroughAnnotations).set({
        status: 'dismissed',
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
