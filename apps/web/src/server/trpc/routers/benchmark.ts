import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  marketBenchmarks, laborRates, eq, and,
} from '@openlintel/db';

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
});
