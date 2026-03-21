import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  teams, teamMembers, projectAssignments, projects, users, eq, and,
} from '@openlintel/db';

export const teamRouter = router({
  // ── Teams ───────────────────────────────────────────────

  listTeams: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.teams.findMany({
        where: eq(teams.userId, ctx.userId),
        with: { members: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
    }),

  createTeam: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const [team] = await ctx.db.insert(teams).values({
        userId: ctx.userId,
        name: input.name,
      }).returning();
      return team;
    }),

  updateTeam: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.query.teams.findFirst({
        where: and(eq(teams.id, input.id), eq(teams.userId, ctx.userId)),
      });
      if (!team) throw new Error('Team not found');
      const [updated] = await ctx.db.update(teams).set({ name: input.name }).where(eq(teams.id, input.id)).returning();
      return updated;
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.query.teams.findFirst({
        where: and(eq(teams.id, input.id), eq(teams.userId, ctx.userId)),
      });
      if (!team) throw new Error('Team not found');
      await ctx.db.delete(teams).where(eq(teams.id, input.id));
      return { success: true };
    }),

  // ── Team Members ────────────────────────────────────────

  listMembers: protectedProcedure
    .input(z.object({ teamId: z.string().optional(), projectId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // If projectId provided, list members for the project's team (or project assignments)
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
        const assignments = await ctx.db.query.projectAssignments.findMany({
          where: eq(projectAssignments.projectId, input.projectId),
          orderBy: (a, { desc }) => [desc(a.createdAt)],
        });
        // Enrich with user data for the frontend
        const enriched = await Promise.all(
          assignments.map(async (a) => {
            const user = await ctx.db.query.users.findFirst({
              where: eq(users.id, a.userId),
            });
            return {
              ...a,
              name: (user as any)?.name ?? 'Unknown',
              email: (user as any)?.email ?? null,
              phone: null,
              office: null,
              maxHoursPerWeek: 40,
              currentHoursWeek: Math.round((a.allocationPercent ?? 100) * 40 / 100),
              isAway: false,
            };
          }),
        );
        return enriched;
      }
      // Otherwise require teamId
      if (!input.teamId) return [];
      const team = await ctx.db.query.teams.findFirst({
        where: and(eq(teams.id, input.teamId), eq(teams.userId, ctx.userId)),
      });
      if (!team) throw new Error('Team not found');
      return ctx.db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, input.teamId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  addMember: protectedProcedure
    .input(z.object({
      teamId: z.string().optional(),
      projectId: z.string().optional(),
      userId: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      role: z.string().min(1),
      office: z.string().optional(),
      maxHoursPerWeek: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If projectId provided, create a project assignment
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');
        const [assignment] = await ctx.db.insert(projectAssignments).values({
          projectId: input.projectId,
          userId: input.userId ?? ctx.userId,
          role: input.role,
          allocationPercent: input.maxHoursPerWeek ? Math.round((input.maxHoursPerWeek / 40) * 100) : 100,
        }).returning();
        return {
          ...assignment,
          name: input.name ?? '',
          email: input.email ?? null,
          phone: input.phone ?? null,
          office: input.office ?? null,
          maxHoursPerWeek: input.maxHoursPerWeek ?? 40,
          currentHoursWeek: 0,
          isAway: false,
        };
      }
      // Otherwise require teamId
      if (!input.teamId) throw new Error('Either teamId or projectId is required');
      const team = await ctx.db.query.teams.findFirst({
        where: and(eq(teams.id, input.teamId), eq(teams.userId, ctx.userId)),
      });
      if (!team) throw new Error('Team not found');
      const [member] = await ctx.db.insert(teamMembers).values({
        teamId: input.teamId,
        userId: input.userId ?? ctx.userId,
        role: input.role,
      }).returning();
      return member;
    }),

  updateMember: protectedProcedure
    .input(z.object({
      id: z.string(),
      role: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.teamMembers.findFirst({
        where: eq(teamMembers.id, input.id),
        with: { team: true },
      });
      if (!member) throw new Error('Member not found');
      if ((member.team as any).userId !== ctx.userId) throw new Error('Access denied');
      const [updated] = await ctx.db.update(teamMembers).set({ role: input.role }).where(eq(teamMembers.id, input.id)).returning();
      return updated;
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.teamMembers.findFirst({
        where: eq(teamMembers.id, input.id),
        with: { team: true },
      });
      if (!member) throw new Error('Member not found');
      if ((member.team as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(teamMembers).where(eq(teamMembers.id, input.id));
      return { success: true };
    }),

  // ── Project Assignments ─────────────────────────────────

  listAssignments: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.projectAssignments.findMany({
        where: eq(projectAssignments.projectId, input.projectId),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });
    }),

  assignToProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
      role: z.string().min(1),
      allocationPercent: z.number().min(0).max(100).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [assignment] = await ctx.db.insert(projectAssignments).values({
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
        allocationPercent: input.allocationPercent ?? 100,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      }).returning();
      return assignment;
    }),

  removeAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.query.projectAssignments.findFirst({
        where: eq(projectAssignments.id, input.id),
        with: { project: true },
      });
      if (!assignment) throw new Error('Assignment not found');
      if ((assignment.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(projectAssignments).where(eq(projectAssignments.id, input.id));
      return { success: true };
    }),

  // ── Workload overview ───────────────────────────────────
  getWorkload: protectedProcedure
    .query(async ({ ctx }) => {
      const myTeams = await ctx.db.query.teams.findMany({
        where: eq(teams.userId, ctx.userId),
        with: { members: true },
      });
      const memberUserIds = myTeams.flatMap((t) => (t.members as any[]).map((m: any) => m.userId));
      const uniqueUserIds = [...new Set(memberUserIds)];
      const allAssignments = await ctx.db.query.projectAssignments.findMany();
      const workload = uniqueUserIds.map((userId) => {
        const userAssignments = allAssignments.filter((a) => a.userId === userId);
        const totalAllocation = userAssignments.reduce((sum, a) => sum + (a.allocationPercent ?? 100), 0);
        return {
          userId,
          activeProjects: userAssignments.length,
          totalAllocationPercent: totalAllocation,
          isOverallocated: totalAllocation > 100,
        };
      });
      return workload;
    }),
});
