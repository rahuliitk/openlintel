import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  projectClients, projects, users, eq, and,
} from '@openlintel/db';

export const clientPortalRouter = router({
  // ── Invite a client to a project ───────────────────────
  inviteClient: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      clientUserId: z.string(),
      accessLevel: z.enum(['view_only', 'comment', 'approve', 'full']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Check client user exists
      const clientUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientUserId),
      });
      if (!clientUser) throw new Error('Client user not found');

      // Check if already invited
      const existing = await ctx.db.query.projectClients.findFirst({
        where: and(
          eq(projectClients.projectId, input.projectId),
          eq(projectClients.clientUserId, input.clientUserId),
        ),
      });
      if (existing) throw new Error('Client already invited to this project');

      const [client] = await ctx.db.insert(projectClients).values({
        projectId: input.projectId,
        clientUserId: input.clientUserId,
        accessLevel: input.accessLevel ?? 'view_only',
        invitedBy: ctx.userId,
      }).returning();
      return client;
    }),

  // ── List clients for a project ─────────────────────────
  listClients: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.projectClients.findMany({
        where: eq(projectClients.projectId, input.projectId),
        with: { client: true },
      });
    }),

  // ── Remove client from project ─────────────────────────
  removeClient: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clientEntry = await ctx.db.query.projectClients.findFirst({
        where: eq(projectClients.id, input.id),
        with: { project: true },
      });
      if (!clientEntry) throw new Error('Client entry not found');
      if ((clientEntry.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(projectClients).where(eq(projectClients.id, input.id));
      return { success: true };
    }),

  // ── Update client access level ─────────────────────────
  updateAccessLevel: protectedProcedure
    .input(z.object({
      id: z.string(),
      accessLevel: z.enum(['view_only', 'comment', 'approve', 'full']),
    }))
    .mutation(async ({ ctx, input }) => {
      const clientEntry = await ctx.db.query.projectClients.findFirst({
        where: eq(projectClients.id, input.id),
        with: { project: true },
      });
      if (!clientEntry) throw new Error('Client entry not found');
      if ((clientEntry.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(projectClients).set({
        accessLevel: input.accessLevel,
      }).where(eq(projectClients.id, input.id)).returning();
      return updated;
    }),
});
