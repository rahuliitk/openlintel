import { z } from 'zod';
import {
  costPredictions,
  timelinePredictions,
  projects,
  eq,
  and,
  desc,
} from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { callLLM } from '@/lib/llm-client';

// ── Algorithmic fallback helpers ──────────────────────────────────────
function fallbackCostPrediction(project: any) {
  // Sum all BOM costs across variants
  let bomTotal = 0;
  const categoryTotals: Record<string, number> = {};

  for (const room of project.rooms) {
    for (const variant of room.designVariants) {
      for (const bom of variant.bomResults) {
        bomTotal += bom.totalCost ?? 0;
        const items = (bom.items as Array<Record<string, unknown>>) || [];
        for (const item of items) {
          const cat = String(item.category || 'General');
          const total = Number(item.total || 0);
          categoryTotals[cat] = (categoryTotals[cat] || 0) + total;
        }
      }
    }
  }

  // If no BOM data, estimate from room area and budget tiers
  if (bomTotal === 0) {
    const COST_PER_SQM: Record<string, number> = {
      economy: 500, mid_range: 1200, premium: 2500, luxury: 5000,
    };
    for (const room of project.rooms) {
      const areaSqm = ((room.lengthMm || 3000) * (room.widthMm || 3000)) / 1e6;
      const tier = room.designVariants?.[0]?.budgetTier || 'mid_range';
      const cost = areaSqm * (COST_PER_SQM[tier] || 1200);
      bomTotal += cost;
      categoryTotals['Estimated'] = (categoryTotals['Estimated'] || 0) + cost;
    }
  }

  const predictedCost = Math.round(bomTotal * 1.15); // +15% for labor & overhead
  const confidenceLow = Math.round(predictedCost * 0.85);
  const confidenceHigh = Math.round(predictedCost * 1.25);

  const riskFactors = [
    { name: 'Material price fluctuation', impact: predictedCost * 0.08, probability: 0.6 },
    { name: 'Scope changes', impact: predictedCost * 0.12, probability: 0.4 },
    { name: 'Labor shortage delays', impact: predictedCost * 0.05, probability: 0.3 },
  ];

  const breakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount: Math.round(amount),
  }));
  if (breakdown.length === 0) {
    breakdown.push({ category: 'Total Estimated', amount: predictedCost });
  }

  return { predictedCost, confidenceLow, confidenceHigh, riskFactors, breakdown };
}

function fallbackTimelinePrediction(project: any) {
  const roomCount = Math.max(project.rooms.length, 1);
  const baseDays = 14; // minimum project duration
  const daysPerRoom = 8;

  const phases = [
    { phase: 'Site Preparation', days: 3, dependencies: [] },
    { phase: 'Demolition', days: 2 + roomCount, dependencies: ['Site Preparation'] },
    { phase: 'Civil & Structural', days: 5 + roomCount * 2, dependencies: ['Demolition'] },
    { phase: 'Plumbing Rough-in', days: 3 + roomCount, dependencies: ['Civil & Structural'] },
    { phase: 'Electrical Rough-in', days: 3 + roomCount, dependencies: ['Civil & Structural'] },
    { phase: 'HVAC Installation', days: 3 + roomCount, dependencies: ['Plumbing Rough-in', 'Electrical Rough-in'] },
    { phase: 'Carpentry & Woodwork', days: 5 + roomCount * 3, dependencies: ['HVAC Installation'] },
    { phase: 'Flooring', days: 3 + roomCount, dependencies: ['Carpentry & Woodwork'] },
    { phase: 'Painting & Finishes', days: 3 + roomCount, dependencies: ['Flooring'] },
    { phase: 'Fixture Installation', days: 2 + roomCount, dependencies: ['Painting & Finishes'] },
    { phase: 'Final Cleanup', days: 2, dependencies: ['Fixture Installation'] },
  ];

  // Critical path = sum of all phases (sequential)
  const predictedDays = Math.max(baseDays, phases.reduce((s, p) => s + p.days, 0));
  const confidenceLow = Math.round(predictedDays * 0.85);
  const confidenceHigh = Math.round(predictedDays * 1.35);

  const criticalRisks = [
    { name: 'Weather delays', delayDays: Math.round(predictedDays * 0.1), mitigation: 'Schedule buffer for rainy season' },
    { name: 'Material delivery delays', delayDays: Math.round(predictedDays * 0.08), mitigation: 'Order materials 2 weeks in advance' },
    { name: 'Permit approvals', delayDays: 7, mitigation: 'Submit permit applications early' },
  ];

  return { predictedDays, confidenceLow, confidenceHigh, criticalRisks, phaseBreakdown: phases };
}

export const predictionRouter = router({
  // ── Cost Prediction ──────────────────────────────────────────
  predictCost: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { bomResults: true },
              },
            },
          },
          schedules: true,
        },
      });
      if (!project) throw new Error('Project not found');

      const inputSnapshot = {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        rooms: project.rooms.map((room) => ({
          id: room.id, name: room.name, type: room.type,
          lengthMm: room.lengthMm, widthMm: room.widthMm, heightMm: room.heightMm,
          designVariants: room.designVariants.map((v) => ({
            id: v.id, name: v.name, style: v.style, budgetTier: v.budgetTier,
            bomResults: v.bomResults.map((b) => ({ id: b.id, totalCost: b.totalCost, items: b.items })),
          })),
        })),
        schedules: project.schedules.map((s) => ({ id: s.id, startDate: s.startDate, endDate: s.endDate })),
      };

      let predictedCost = 0, confidenceLow = 0, confidenceHigh = 0;
      let riskFactors: unknown[] = [];
      let breakdown: unknown[] = [];
      let modelProvider = 'fallback-algorithmic';

      try {
        const systemPrompt = `You are a construction cost estimation AI. Respond with valid JSON: { "predictedCost": number, "confidenceLow": number, "confidenceHigh": number, "riskFactors": [{ "name": string, "impact": number, "probability": number }], "breakdown": [{ "category": string, "amount": number }] }`;
        const userPrompt = `Predict total cost for this project:\n${JSON.stringify(inputSnapshot, null, 2)}`;
        const llmResult = await callLLM(ctx.userId, ctx.db, systemPrompt, userPrompt);
        predictedCost = Number(llmResult.predictedCost) || 0;
        confidenceLow = Number(llmResult.confidenceLow) || 0;
        confidenceHigh = Number(llmResult.confidenceHigh) || 0;
        riskFactors = Array.isArray(llmResult.riskFactors) ? llmResult.riskFactors : [];
        breakdown = Array.isArray(llmResult.breakdown) ? llmResult.breakdown : [];
        modelProvider = 'user-configured';
      } catch {
        const fb = fallbackCostPrediction(project);
        predictedCost = fb.predictedCost;
        confidenceLow = fb.confidenceLow;
        confidenceHigh = fb.confidenceHigh;
        riskFactors = fb.riskFactors;
        breakdown = fb.breakdown;
      }

      const [prediction] = await ctx.db
        .insert(costPredictions)
        .values({
          projectId: input.projectId,
          predictedCost, confidenceLow, confidenceHigh,
          riskFactors, breakdown, modelProvider, inputSnapshot,
        })
        .returning();

      return prediction;
    }),

  // ── Timeline Prediction ──────────────────────────────────────
  predictTimeline: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { bomResults: true },
              },
            },
          },
          schedules: true,
        },
      });
      if (!project) throw new Error('Project not found');

      const inputSnapshot = {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        rooms: project.rooms.map((room) => ({
          id: room.id, name: room.name, type: room.type,
          lengthMm: room.lengthMm, widthMm: room.widthMm, heightMm: room.heightMm,
          designVariants: room.designVariants.map((v) => ({
            id: v.id, name: v.name, style: v.style, budgetTier: v.budgetTier,
            bomResults: v.bomResults.map((b) => ({ id: b.id, totalCost: b.totalCost, items: b.items })),
          })),
        })),
        schedules: project.schedules.map((s) => ({ id: s.id, startDate: s.startDate, endDate: s.endDate })),
      };

      let predictedDays = 0, confidenceLow = 0, confidenceHigh = 0;
      let criticalRisks: unknown[] = [];
      let phaseBreakdown: unknown[] = [];
      let modelProvider = 'fallback-algorithmic';

      try {
        const systemPrompt = `You are a construction timeline estimation AI. Respond with valid JSON: { "predictedDays": number, "confidenceLow": number, "confidenceHigh": number, "criticalRisks": [{ "name": string, "delayDays": number, "mitigation": string }], "phaseBreakdown": [{ "phase": string, "days": number, "dependencies": [string] }] }`;
        const userPrompt = `Predict timeline for this project:\n${JSON.stringify(inputSnapshot, null, 2)}`;
        const llmResult = await callLLM(ctx.userId, ctx.db, systemPrompt, userPrompt);
        predictedDays = Math.round(Number(llmResult.predictedDays) || 0);
        confidenceLow = Math.round(Number(llmResult.confidenceLow) || 0);
        confidenceHigh = Math.round(Number(llmResult.confidenceHigh) || 0);
        criticalRisks = Array.isArray(llmResult.criticalRisks) ? llmResult.criticalRisks : [];
        phaseBreakdown = Array.isArray(llmResult.phaseBreakdown) ? llmResult.phaseBreakdown : [];
        modelProvider = 'user-configured';
      } catch {
        const fb = fallbackTimelinePrediction(project);
        predictedDays = fb.predictedDays;
        confidenceLow = fb.confidenceLow;
        confidenceHigh = fb.confidenceHigh;
        criticalRisks = fb.criticalRisks;
        phaseBreakdown = fb.phaseBreakdown;
      }

      const [prediction] = await ctx.db
        .insert(timelinePredictions)
        .values({
          projectId: input.projectId,
          predictedDays, confidenceLow, confidenceHigh,
          criticalRisks, phaseBreakdown, modelProvider, inputSnapshot,
        })
        .returning();

      return prediction;
    }),

  // ── List Cost Predictions ────────────────────────────────────
  listCostPredictions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db
        .select()
        .from(costPredictions)
        .where(eq(costPredictions.projectId, input.projectId))
        .orderBy(desc(costPredictions.createdAt));
    }),

  // ── List Timeline Predictions ────────────────────────────────
  listTimelinePredictions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.userId),
        ),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db
        .select()
        .from(timelinePredictions)
        .where(eq(timelinePredictions.projectId, input.projectId))
        .orderBy(desc(timelinePredictions.createdAt));
    }),
});
