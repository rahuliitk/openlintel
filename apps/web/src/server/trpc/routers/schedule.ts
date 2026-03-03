import { z } from 'zod';
import {
  schedules, milestones, siteLogs, changeOrders, projects, rooms, jobs,
  eq, and,
} from '@openlintel/db';
import { router, protectedProcedure } from '../init';

export const scheduleRouter = router({
  // ── Schedules ──────────────────────────────────────────────
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.schedules.findMany({
        where: eq(schedules.projectId, input.projectId),
        with: { milestones: true },
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  generate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Count rooms in the project
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });
      const roomCount = projectRooms.length || 1;

      // Create a job for tracking
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'schedule_generation',
          status: 'pending',
          inputJson: { projectId: input.projectId },
          projectId: input.projectId,
        })
        .returning();

      if (!job) throw new Error('Failed to create job');

      // Generate construction schedule phases
      const phases = [
        { name: 'Site Preparation', duration: 3, dependencies: [] as string[], trade: 'General' },
        { name: 'Demolition', duration: 2 + roomCount, dependencies: ['Site Preparation'], trade: 'Demolition' },
        { name: 'Civil & Structural', duration: 5 + roomCount * 2, dependencies: ['Demolition'], trade: 'Civil' },
        { name: 'Plumbing Rough-in', duration: 3 + roomCount, dependencies: ['Civil & Structural'], trade: 'Plumbing' },
        { name: 'Electrical Rough-in', duration: 3 + roomCount, dependencies: ['Civil & Structural'], trade: 'Electrical' },
        { name: 'HVAC Installation', duration: 4 + roomCount, dependencies: ['Plumbing Rough-in', 'Electrical Rough-in'], trade: 'HVAC' },
        { name: 'Carpentry & Woodwork', duration: 5 + roomCount * 3, dependencies: ['HVAC Installation'], trade: 'Carpentry' },
        { name: 'Flooring', duration: 3 + roomCount, dependencies: ['Carpentry & Woodwork'], trade: 'Flooring' },
        { name: 'Painting & Finishes', duration: 3 + roomCount, dependencies: ['Flooring'], trade: 'Painting' },
        { name: 'Fixture Installation', duration: 2 + roomCount, dependencies: ['Painting & Finishes'], trade: 'Fixtures' },
        { name: 'Final Cleanup & Inspection', duration: 2, dependencies: ['Fixture Installation'], trade: 'General' },
      ];

      // Calculate start/end dates for each phase using dependency resolution
      const today = new Date();
      const phaseEndDays: Record<string, number> = {};
      const tasks = phases.map((phase, idx) => {
        let startDay = 0;
        for (const dep of phase.dependencies) {
          if (phaseEndDays[dep] !== undefined && phaseEndDays[dep] > startDay) {
            startDay = phaseEndDays[dep];
          }
        }
        const endDay = startDay + phase.duration;
        phaseEndDays[phase.name] = endDay;

        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + startDay);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + endDay);

        return {
          id: `task-${idx + 1}`,
          name: phase.name,
          duration: phase.duration,
          startDay,
          endDay,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dependencies: phase.dependencies,
          trade: phase.trade,
          status: 'pending',
        };
      });

      // Total project duration
      const totalDays = Math.max(...Object.values(phaseEndDays));
      const projectEndDate = new Date(today);
      projectEndDate.setDate(projectEndDate.getDate() + totalDays);

      // Create schedule record
      const [schedule] = await ctx.db
        .insert(schedules)
        .values({
          projectId: input.projectId,
          jobId: job.id,
          tasks,
          criticalPath: tasks.map((t) => t.id),
          startDate: today,
          endDate: projectEndDate,
          metadata: { roomCount, totalDays },
        })
        .returning();

      if (!schedule) throw new Error('Failed to create schedule');

      // Create milestone records for each phase completion
      for (const task of tasks) {
        await ctx.db.insert(milestones).values({
          scheduleId: schedule.id,
          name: `${task.name} Complete`,
          description: `Completion of ${task.name} phase (${task.duration} days, ${task.trade})`,
          dueDate: new Date(task.endDate),
          status: 'pending',
        });
      }

      // Update job as completed
      const outputJson = {
        scheduleId: schedule.id,
        tasks,
        totalDays,
        roomCount,
        startDate: today.toISOString(),
        endDate: projectEndDate.toISOString(),
      };

      await ctx.db
        .update(jobs)
        .set({
          status: 'completed',
          outputJson,
          progress: 100,
          completedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      return { ...job, status: 'completed', outputJson };
    }),

  // ── Milestones ─────────────────────────────────────────────
  listMilestones: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.milestones.findMany({
        where: eq(milestones.scheduleId, input.scheduleId),
        orderBy: (m, { asc }) => [asc(m.dueDate)],
      });
    }),

  updateMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        completedDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(milestones)
        .set(data)
        .where(eq(milestones.id, id))
        .returning();
      return updated;
    }),

  // ── Site Logs ──────────────────────────────────────────────
  listSiteLogs: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.siteLogs.findMany({
        where: eq(siteLogs.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.date)],
      });
    }),

  createSiteLog: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        date: z.date(),
        title: z.string().min(1),
        notes: z.string().optional(),
        weather: z.string().optional(),
        workersOnSite: z.number().int().optional(),
        photoKeys: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [log] = await ctx.db
        .insert(siteLogs)
        .values({ ...input, userId: ctx.userId })
        .returning();
      return log;
    }),

  // ── Change Orders ──────────────────────────────────────────
  listChangeOrders: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.changeOrders.findMany({
        where: eq(changeOrders.projectId, input.projectId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    }),

  createChangeOrder: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        costImpact: z.number().optional(),
        timeImpactDays: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [order] = await ctx.db
        .insert(changeOrders)
        .values({ ...input, userId: ctx.userId })
        .returning();
      return order;
    }),

  updateChangeOrder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        approvedBy: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updates = data.status === 'approved'
        ? { ...data, approvedAt: new Date() }
        : data;
      const [updated] = await ctx.db
        .update(changeOrders)
        .set(updates)
        .where(eq(changeOrders.id, id))
        .returning();
      return updated;
    }),

  analyzeChangeOrderImpact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.query.changeOrders.findFirst({
        where: eq(changeOrders.id, input.id),
        with: { project: true },
      });
      if (!order) throw new Error('Change order not found');
      if ((order as any).project.userId !== ctx.userId) throw new Error('Access denied');

      return {
        summary: `Change order "${order.title}" has a cost impact of $${order.costImpact ?? 0} and time impact of ${order.timeImpactDays ?? 0} days.`,
        risks: [],
        recommendations: [],
      };
    }),
});
