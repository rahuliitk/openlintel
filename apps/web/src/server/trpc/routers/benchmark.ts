import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  marketBenchmarks, laborRates, lessonsLearned, projects, eq, and,
} from '@openlintel/db';

/** Simulate market rate lookup based on category and quality level */
function generateMarketComparison(category: string, yourCost: number, qualityLevel?: string) {
  // Baseline multipliers by quality level
  const qualityMultiplier: Record<string, number> = {
    budget: 0.7,
    mid_range: 1.0,
    upscale: 1.4,
    luxury: 2.0,
  };
  const mult = qualityMultiplier[qualityLevel ?? 'mid_range'] ?? 1.0;

  // Simulate a market median around the user cost with some variance
  const variance = 0.15 + Math.random() * 0.2; // 15-35% variance
  const marketMedian = Math.round(yourCost * (0.9 + Math.random() * 0.2) * mult * 100) / 100;
  const marketLow = Math.round(marketMedian * (1 - variance) * 100) / 100;
  const marketHigh = Math.round(marketMedian * (1 + variance) * 100) / 100;

  // Calculate percentile (where the user's cost falls in the market range)
  let percentile = 50;
  if (marketHigh > marketLow) {
    percentile = Math.round(((yourCost - marketLow) / (marketHigh - marketLow)) * 100);
    percentile = Math.max(1, Math.min(99, percentile));
  }

  const yearOverYearPct = Math.round((Math.random() * 10 - 3) * 10) / 10; // -3% to +7%

  return { marketLow, marketHigh, marketMedian, percentile, yearOverYearPct };
}

export const benchmarkRouter = router({
  // ── Get market benchmarks ───────────────────────────────
  getBenchmarks: protectedProcedure
    .input(z.object({
      region: z.string().optional(),
      homeType: z.string().optional(),
      qualityTier: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [];
      if (input?.region) conditions.push(eq(marketBenchmarks.region, input.region));
      if (input?.homeType) conditions.push(eq(marketBenchmarks.homeType, input.homeType));
      if (input?.qualityTier) conditions.push(eq(marketBenchmarks.qualityTier, input.qualityTier));
      return ctx.db.query.marketBenchmarks.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (b, { desc }) => [desc(b.updatedAt)],
      });
    }),

  // ── Get benchmark by ID ─────────────────────────────────
  getBenchmarkById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const benchmark = await ctx.db.query.marketBenchmarks.findFirst({
        where: eq(marketBenchmarks.id, input.id),
      });
      if (!benchmark) throw new Error('Benchmark not found');
      return benchmark;
    }),

  // ── Create benchmark ────────────────────────────────────
  createBenchmark: protectedProcedure
    .input(z.object({
      region: z.string().min(1),
      homeType: z.string().optional(),
      qualityTier: z.string().optional(),
      costPerSqft: z.number().min(0),
      dataSource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [benchmark] = await ctx.db.insert(marketBenchmarks).values({
        region: input.region,
        homeType: input.homeType ?? null,
        qualityTier: input.qualityTier ?? null,
        costPerSqft: input.costPerSqft,
        dataSource: input.dataSource ?? null,
      }).returning();
      return benchmark;
    }),

  // ── Get labor rates ─────────────────────────────────────
  getRates: protectedProcedure
    .input(z.object({
      region: z.string().optional(),
      trade: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [];
      if (input?.region) conditions.push(eq(laborRates.region, input.region));
      if (input?.trade) conditions.push(eq(laborRates.trade, input.trade));
      return ctx.db.query.laborRates.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (r, { desc }) => [desc(r.updatedAt)],
      });
    }),

  // ── Get rate by ID ──────────────────────────────────────
  getRateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rate = await ctx.db.query.laborRates.findFirst({
        where: eq(laborRates.id, input.id),
      });
      if (!rate) throw new Error('Labor rate not found');
      return rate;
    }),

  // ── Create labor rate ───────────────────────────────────
  createRate: protectedProcedure
    .input(z.object({
      trade: z.string().min(1),
      region: z.string().min(1),
      hourlyRate: z.number().min(0),
      currency: z.string().default('USD'),
      dataSource: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [rate] = await ctx.db.insert(laborRates).values({
        trade: input.trade,
        region: input.region,
        hourlyRate: input.hourlyRate,
        currency: input.currency,
        dataSource: input.dataSource ?? null,
      }).returning();
      return rate;
    }),

  // ── Compare project costs against benchmarks ────────────
  compare: protectedProcedure
    .input(z.object({
      region: z.string(),
      homeType: z.string().optional(),
      qualityTier: z.string().optional(),
      actualCostPerSqft: z.number(),
      totalAreaSqft: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(marketBenchmarks.region, input.region)];
      if (input.homeType) conditions.push(eq(marketBenchmarks.homeType, input.homeType));
      if (input.qualityTier) conditions.push(eq(marketBenchmarks.qualityTier, input.qualityTier));

      const benchmarks = await ctx.db.query.marketBenchmarks.findMany({
        where: and(...conditions),
      });

      if (benchmarks.length === 0) {
        return {
          message: 'No benchmarks found for the specified criteria',
          benchmarks: [],
          comparison: null,
        };
      }

      const avgCostPerSqft = benchmarks.reduce((sum, b) => sum + (b.costPerSqft ?? 0), 0) / benchmarks.length;
      const difference = input.actualCostPerSqft - avgCostPerSqft;
      const percentDiff = avgCostPerSqft > 0
        ? Math.round((difference / avgCostPerSqft) * 100 * 100) / 100
        : 0;

      const totalActualCost = input.actualCostPerSqft * input.totalAreaSqft;
      const totalBenchmarkCost = avgCostPerSqft * input.totalAreaSqft;

      return {
        benchmarks,
        comparison: {
          actualCostPerSqft: input.actualCostPerSqft,
          benchmarkCostPerSqft: Math.round(avgCostPerSqft * 100) / 100,
          differencePerSqft: Math.round(difference * 100) / 100,
          percentDifference: percentDiff,
          totalActualCost: Math.round(totalActualCost * 100) / 100,
          totalBenchmarkCost: Math.round(totalBenchmarkCost * 100) / 100,
          totalDifference: Math.round((totalActualCost - totalBenchmarkCost) * 100) / 100,
          isAboveBenchmark: difference > 0,
        },
      };
    }),

  // ══════════════════════════════════════════════════════════
  // Project-scoped benchmarks (used by benchmarks page)
  // Stored in lessonsLearned table with benchmark data in tags jsonb
  // ══════════════════════════════════════════════════════════

  // ── List project benchmarks ───────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.lessonsLearned.findMany({
        where: and(
          eq(lessonsLearned.projectId, input.projectId),
          eq(lessonsLearned.userId, ctx.userId),
          eq(lessonsLearned.category, '__benchmark__'),
        ),
        orderBy: (l, { desc }) => [desc(l.createdAt)],
      });

      return items.map((item) => {
        const data = (item.tags as any) ?? {};
        return {
          id: item.id,
          category: item.title,
          yourCost: data.yourCost ?? 0,
          qualityLevel: data.qualityLevel ?? null,
          zipCode: data.zipCode ?? null,
          percentile: data.percentile ?? 50,
          marketLow: data.marketLow ?? 0,
          marketHigh: data.marketHigh ?? 0,
          marketMedian: data.marketMedian ?? 0,
          yearOverYearPct: data.yearOverYearPct ?? 0,
          createdAt: item.createdAt,
        };
      });
    }),

  // ── Add a project benchmark ───────────────────────────────
  add: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      category: z.string().min(1),
      yourCost: z.number().min(0),
      qualityLevel: z.string().optional(),
      zipCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Generate market comparison data
      const market = generateMarketComparison(input.category, input.yourCost, input.qualityLevel);

      const rows = await ctx.db.insert(lessonsLearned).values({
        projectId: input.projectId,
        userId: ctx.userId,
        title: input.category,
        description: `Benchmark: ${input.category} at $${input.yourCost}`,
        category: '__benchmark__',
        tags: {
          yourCost: input.yourCost,
          qualityLevel: input.qualityLevel ?? null,
          zipCode: input.zipCode ?? null,
          ...market,
        },
      }).returning();
      const item = rows[0]!;

      const data = (item.tags as any) ?? {};
      return {
        id: item.id,
        category: item.title,
        yourCost: data.yourCost ?? 0,
        qualityLevel: data.qualityLevel ?? null,
        zipCode: data.zipCode ?? null,
        percentile: data.percentile ?? 50,
        marketLow: data.marketLow ?? 0,
        marketHigh: data.marketHigh ?? 0,
        marketMedian: data.marketMedian ?? 0,
        yearOverYearPct: data.yearOverYearPct ?? 0,
        createdAt: item.createdAt,
      };
    }),

  // ── Refresh all project benchmarks ────────────────────────
  refreshAll: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.lessonsLearned.findMany({
        where: and(
          eq(lessonsLearned.projectId, input.projectId),
          eq(lessonsLearned.userId, ctx.userId),
          eq(lessonsLearned.category, '__benchmark__'),
        ),
      });

      // Refresh market data for each benchmark
      for (const item of items) {
        const data = (item.tags as any) ?? {};
        const market = generateMarketComparison(item.title, data.yourCost ?? 0, data.qualityLevel);
        await ctx.db.update(lessonsLearned).set({
          tags: {
            ...data,
            ...market,
          },
        }).where(eq(lessonsLearned.id, item.id));
      }

      return { success: true, refreshed: items.length };
    }),
});
