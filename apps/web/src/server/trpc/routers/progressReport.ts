import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  progressReports, projects, siteLogs, milestones, schedules,
  eq, and, gte, lte,
} from '@openlintel/db';

export const progressReportRouter = router({
  // ── List progress reports ──────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.progressReports.findMany({
        where: eq(progressReports.projectId, input.projectId),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Get report by ID ──────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.progressReports.findFirst({
        where: eq(progressReports.id, input.id),
        with: { project: true },
      });
      if (!report) throw new Error('Report not found');
      if ((report.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return report;
    }),

  // ── Generate report (aggregate site logs + milestones for period) ──
  generate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      reportType: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: z.date(),
      periodEnd: z.date(),
      emailedTo: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Aggregate site logs for the period
      const allSiteLogs = await ctx.db.query.siteLogs.findMany({
        where: eq(siteLogs.projectId, input.projectId),
      });
      const periodLogs = allSiteLogs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= input.periodStart && logDate <= input.periodEnd;
      });

      // Get project schedules with milestones
      const projectSchedules = await ctx.db.query.schedules.findMany({
        where: eq(schedules.projectId, input.projectId),
        with: { milestones: true },
      });

      // Aggregate milestone status
      const allMilestones = projectSchedules.flatMap((s) => (s as any).milestones ?? []);
      const milestonesDue = allMilestones.filter((m: any) => {
        if (!m.dueDate) return false;
        const due = new Date(m.dueDate);
        return due >= input.periodStart && due <= input.periodEnd;
      });
      const milestonesCompleted = milestonesDue.filter((m: any) => m.status === 'completed');
      const milestonesOverdue = milestonesDue.filter((m: any) => m.status !== 'completed' && new Date(m.dueDate) < new Date());

      // Build report content
      const content = {
        summary: {
          reportType: input.reportType,
          periodStart: input.periodStart.toISOString(),
          periodEnd: input.periodEnd.toISOString(),
          projectName: project.name,
        },
        siteLogsSummary: {
          totalEntries: periodLogs.length,
          totalWorkers: periodLogs.reduce((sum, log) => sum + (log.workersOnSite ?? 0), 0),
          entries: periodLogs.map((log) => ({
            date: log.date,
            title: log.title,
            notes: log.notes,
            weather: log.weather,
            workersOnSite: log.workersOnSite,
          })),
        },
        milestonesSummary: {
          totalDue: milestonesDue.length,
          completed: milestonesCompleted.length,
          overdue: milestonesOverdue.length,
          details: milestonesDue.map((m: any) => ({
            name: m.name,
            dueDate: m.dueDate,
            status: m.status,
            completedDate: m.completedDate,
          })),
        },
        overallProgress: allMilestones.length > 0
          ? Math.round((allMilestones.filter((m: any) => m.status === 'completed').length / allMilestones.length) * 100)
          : 0,
      };

      const [report] = await ctx.db.insert(progressReports).values({
        projectId: input.projectId,
        reportType: input.reportType,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        content,
        emailedTo: input.emailedTo ?? null,
      }).returning();
      return report;
    }),
});
