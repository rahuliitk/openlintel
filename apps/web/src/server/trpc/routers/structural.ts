import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  structuralAnalyses, projects, jobs, eq, and,
} from '@openlintel/db';

export const structuralRouter = router({
  // ── List structural analyses for a project ────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.structuralAnalyses.findMany({
        where: eq(structuralAnalyses.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Create a structural analysis ──────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      analysisType: z.string().min(1),
      inputParameters: z.object({
        loadType: z.string().optional(),
        deadLoadKpa: z.number().optional(),
        liveLoadKpa: z.number().optional(),
        windSpeedMs: z.number().optional(),
        seismicZone: z.string().optional(),
        soilBearingCapacityKpa: z.number().optional(),
        foundationType: z.string().optional(),
        spanLengthMm: z.number().optional(),
        memberType: z.string().optional(),
        materialGrade: z.string().optional(),
        safetyFactor: z.number().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
      result: z.object({
        status: z.string().optional(),
        safetyMargin: z.number().optional(),
        maxDeflectionMm: z.number().optional(),
        maxStressMpa: z.number().optional(),
        allowableStressMpa: z.number().optional(),
        utilizationRatio: z.number().optional(),
        recommendations: z.array(z.string()).optional(),
        warnings: z.array(z.string()).optional(),
        memberSizing: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
      standardsCited: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [analysis] = await ctx.db.insert(structuralAnalyses).values({
        projectId: input.projectId,
        analysisType: input.analysisType,
        inputParameters: input.inputParameters,
        result: input.result,
        standardsCited: input.standardsCited ?? null,
        status: 'completed',
      }).returning();
      return analysis;
    }),

  // ── Analyze (creates a background job) ────────────────────
  analyze: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      analysisType: z.string().min(1),
      inputParameters: z.object({
        loadType: z.string().optional(),
        deadLoadKpa: z.number().optional(),
        liveLoadKpa: z.number().optional(),
        windSpeedMs: z.number().optional(),
        seismicZone: z.string().optional(),
        soilBearingCapacityKpa: z.number().optional(),
        foundationType: z.string().optional(),
        spanLengthMm: z.number().optional(),
        memberType: z.string().optional(),
        materialGrade: z.string().optional(),
        safetyFactor: z.number().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Create a job for the analysis
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'structural_analysis',
        status: 'pending',
        inputJson: {
          projectId: input.projectId,
          analysisType: input.analysisType,
          inputParameters: input.inputParameters,
        },
        projectId: input.projectId,
      }).returning();
      if (!job) throw new Error('Failed to create job');

      // Create the analysis record linked to the job
      const [analysis] = await ctx.db.insert(structuralAnalyses).values({
        projectId: input.projectId,
        analysisType: input.analysisType,
        inputParameters: input.inputParameters,
        result: { status: 'pending', message: 'Analysis in progress' },
        status: 'pending',
        jobId: job.id,
      }).returning();

      await ctx.db.update(jobs).set({
        status: 'running',
        startedAt: new Date(),
        progress: 10,
      }).where(eq(jobs.id, job.id));

      return { job, analysis };
    }),

  // ── Get structural analysis by id ─────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.db.query.structuralAnalyses.findFirst({
        where: eq(structuralAnalyses.id, input.id),
        with: { project: true, job: true },
      });
      if (!analysis) throw new Error('Structural analysis not found');
      if ((analysis.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return analysis;
    }),
});
