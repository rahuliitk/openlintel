import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  complianceQueries, projects, eq, and,
} from '@openlintel/db';

export const complianceQueryRouter = router({
  // ── Ask a compliance question ───────────────────────────
  ask: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      query: z.string().min(1),
      jurisdiction: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership if projectId provided
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
      }

      // Create the query record — the AI response would be filled in asynchronously
      // For now, create a placeholder that a background service will process
      const [query] = await ctx.db.insert(complianceQueries).values({
        projectId: input.projectId ?? null,
        userId: ctx.userId,
        query: input.query,
        jurisdiction: input.jurisdiction ?? null,
        response: null,
        codeReferences: null,
      }).returning();
      return query;
    }),

  // ── Get a specific query result ─────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const query = await ctx.db.query.complianceQueries.findFirst({
        where: and(eq(complianceQueries.id, input.id), eq(complianceQueries.userId, ctx.userId)),
      });
      if (!query) throw new Error('Compliance query not found');
      return query;
    }),

  // ── List query history ──────────────────────────────────
  listHistory: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(complianceQueries.userId, ctx.userId)];
      if (input?.projectId) conditions.push(eq(complianceQueries.projectId, input.projectId));
      const queries = await ctx.db.query.complianceQueries.findMany({
        where: and(...conditions),
        orderBy: (q, { desc }) => [desc(q.createdAt)],
        limit: input?.limit ?? 50,
      });
      return queries;
    }),

  // ── Delete a query ──────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const query = await ctx.db.query.complianceQueries.findFirst({
        where: and(eq(complianceQueries.id, input.id), eq(complianceQueries.userId, ctx.userId)),
      });
      if (!query) throw new Error('Compliance query not found');
      await ctx.db.delete(complianceQueries).where(eq(complianceQueries.id, input.id));
      return { success: true };
    }),
});
