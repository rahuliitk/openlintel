import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  progressReports, projects, siteLogs, schedules,
  eq, and,
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

  // ── Create report manually ────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      reportType: z.string(),
      title: z.string().min(1),
      periodStart: z.date().optional(),
      periodEnd: z.date().optional(),
      overallProgress: z.number().min(0).max(100).optional(),
      laborHours: z.number().optional(),
      weatherDelayDays: z.number().default(0),
      summary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [report] = await ctx.db.insert(progressReports).values({
        projectId: input.projectId,
        reportType: input.reportType,
        title: input.title,
        status: 'draft',
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        overallProgress: input.overallProgress ?? null,
        laborHours: input.laborHours ?? null,
        weatherDelayDays: input.weatherDelayDays,
        summary: input.summary ?? null,
      }).returning();
      return report;
    }),

  // ── Generate report (aggregate site logs + milestones for period) ──
  generate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      reportType: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: z.date().optional(),
      periodEnd: z.date().optional(),
      emailedTo: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Default period based on report type
      const now = new Date();
      let periodEnd = input.periodEnd ?? now;
      let periodStart = input.periodStart ?? (() => {
        const d = new Date(periodEnd);
        if (input.reportType === 'daily') d.setDate(d.getDate() - 1);
        else if (input.reportType === 'weekly') d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        return d;
      })();

      // Aggregate site logs for the period
      const allSiteLogs = await ctx.db.query.siteLogs.findMany({
        where: eq(siteLogs.projectId, input.projectId),
      });
      const periodLogs = allSiteLogs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= periodStart && logDate <= periodEnd;
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
        return due >= periodStart && due <= periodEnd;
      });
      const milestonesCompleted = milestonesDue.filter((m: any) => m.status === 'completed');
      const milestonesOverdue = milestonesDue.filter((m: any) => m.status !== 'completed' && new Date(m.dueDate) < new Date());

      const computedProgress = allMilestones.length > 0
        ? Math.round((allMilestones.filter((m: any) => m.status === 'completed').length / allMilestones.length) * 100)
        : 0;

      const totalLaborHours = periodLogs.reduce((sum, log) => sum + (log.workersOnSite ?? 0) * 8, 0);

      // Build report content
      const content = {
        summary: {
          reportType: input.reportType,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
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
        overallProgress: computedProgress,
      };

      const title = `${input.reportType.charAt(0).toUpperCase() + input.reportType.slice(1)} Report – ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`;

      const [report] = await ctx.db.insert(progressReports).values({
        projectId: input.projectId,
        reportType: input.reportType,
        title,
        status: 'generated',
        periodStart,
        periodEnd,
        overallProgress: computedProgress,
        laborHours: totalLaborHours,
        summary: `${periodLogs.length} site log entries, ${milestonesCompleted.length}/${milestonesDue.length} milestones completed.`,
        content,
        emailedTo: input.emailedTo ?? null,
      }).returning();
      return report;
    }),

  // ── Send report to client ─────────────────────────────
  send: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.query.progressReports.findFirst({
        where: eq(progressReports.id, input.id),
        with: { project: true },
      });
      if (!report) throw new Error('Report not found');
      if ((report.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(progressReports)
        .set({ status: 'sent' })
        .where(eq(progressReports.id, input.id))
        .returning();
      return updated;
    }),

  // ── Export report as PDF ──────────────────────────────
  export: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.query.progressReports.findFirst({
        where: eq(progressReports.id, input.id),
        with: { project: true },
      });
      if (!report) throw new Error('Report not found');
      if ((report.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Mark as exported (actual PDF generation would be handled by a service)
      return { success: true, reportId: report.id };
    }),

  // ── Delete report ─────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.query.progressReports.findFirst({
        where: eq(progressReports.id, input.id),
        with: { project: true },
      });
      if (!report) throw new Error('Report not found');
      if ((report.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(progressReports).where(eq(progressReports.id, input.id));
      return { success: true };
    }),
});
