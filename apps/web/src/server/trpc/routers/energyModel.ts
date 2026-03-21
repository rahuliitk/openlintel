import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  energyModelItems, projects, eq, and,
} from '@openlintel/db';

/* ─── AI-powered energy modeling ──────────────────────────────────── */

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured in environment.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

const ENERGY_SYSTEM_PROMPT = `You are a certified Building Energy Analyst (BEA) and HERS Rater specializing in residential and light-commercial energy modeling. You follow IECC 2021, ASHRAE 90.1-2022, ENERGY STAR v3.2, and RESNET/ICC 301-2019 standards.

You analyze building energy parameters and provide accurate, code-compliant energy performance estimates. Consider:
- Building envelope thermal resistance (R-values per IECC climate zone requirements)
- Window performance (U-factor, SHGC per ENERGY STAR criteria)
- Window-to-wall ratios and solar heat gain by orientation
- Heating Degree Days (HDD) and Cooling Degree Days (CDD) for typical US climates
- HVAC system efficiency (AFUE, SEER2, HSPF2)
- Lighting power density and appliance loads
- Natural ventilation and passive solar design benefits
- Solar PV production estimates (based on orientation and typical insolation)
- HERS Index scoring methodology (100 = reference home, 0 = net-zero)

Always respond with valid JSON.`;

async function aiAnalyzeModel(model: {
  name: string;
  modelType: string;
  rValue: number | null;
  windowWallRatio: number | null;
  orientation: string | null;
  notes: string | null;
}): Promise<{ status: string; result: Record<string, unknown> }> {
  const typePrompts: Record<string, string> = {
    heating_load: `Calculate the heating load for this residential building component. Consider insulation R-value, climate zone assumptions, and heat loss through the building envelope. Estimate annual heating energy in kWh and BTU, heating design load in BTU/hr, and potential energy savings vs code-minimum.`,
    cooling_load: `Calculate the cooling load for this residential building. Consider solar heat gain, window-to-wall ratio, orientation, internal gains, and cooling degree days. Estimate annual cooling energy in kWh and BTU, cooling design load in BTU/hr (tons), and SEER recommendations.`,
    lighting_load: `Analyze the lighting energy requirements. Consider daylighting potential based on window orientation and WWR, LED vs fluorescent efficiency, occupancy patterns, and lighting power density (LPD). Estimate annual lighting kWh and savings potential.`,
    insulation: `Analyze the insulation performance. Compare the given R-value against IECC 2021 code requirements for different climate zones. Calculate heat flow rate, thermal bridging effects, and energy impact. Recommend optimal R-value and insulation type.`,
    window_ratio: `Analyze the window-to-wall ratio impact on energy performance. Consider solar heat gain coefficient (SHGC), U-factor, daylighting benefits vs heat loss penalties, and orientation-specific effects. Calculate optimal WWR for energy balance.`,
    thermal_bridge: `Analyze thermal bridging effects at wall-floor junctions, window frames, and structural penetrations. Estimate the psi-value (linear thermal transmittance), overall heat loss increase, and remediation recommendations.`,
    passive_solar: `Analyze passive solar design potential. Consider building orientation, south-facing glazing area, thermal mass requirements, overhang sizing for summer shading, and annual solar heat gain. Estimate heating energy offset from passive solar.`,
    ventilation: `Analyze natural ventilation potential. Consider prevailing wind direction, cross-ventilation opportunities, stack effect, window operable area, and cooling energy savings. Estimate ventilation rate in ACH and cooling load reduction.`,
    solar_panel: `Analyze solar panel placement and production potential. Consider roof orientation, tilt angle, local solar insolation (assume 4-5 peak sun hours), system size recommendations, annual production estimate, and payback period.`,
  };

  const typeSpecificPrompt = typePrompts[model.modelType] ?? `Analyze this energy model component and provide performance estimates.`;

  const userPrompt = `${typeSpecificPrompt}

Model Parameters:
- Name: ${model.name}
- Type: ${model.modelType.replace(/_/g, ' ')}
- R-Value: ${model.rValue ?? 'Not specified'}
- Window-to-Wall Ratio: ${model.windowWallRatio != null ? model.windowWallRatio + '%' : 'Not specified'}
- Building Orientation: ${model.orientation ?? 'Not specified'}
${model.notes ? `- Additional Notes: ${model.notes}` : ''}

Respond with this exact JSON structure:
{
  "status": "completed" | "warning" | "optimized",
  "energyKwh": <estimated annual energy for this component in kWh>,
  "savings": <percentage savings vs code-minimum baseline, 0-100>,
  "heatingBtu": <heating component in BTU/hr if applicable, or null>,
  "coolingBtu": <cooling component in BTU/hr if applicable, or null>,
  "efficiencyRating": "<rating like A+, A, B, C, D based on performance>",
  "codeCompliance": "<IECC 2021 compliance status>",
  "recommendations": ["<specific improvement recommendation>"],
  "details": {
    "methodology": "<brief calculation methodology used>",
    "assumptions": "<key assumptions>",
    "standardsCited": "<applicable codes: IECC 2021, ASHRAE 90.1, etc.>",
    "climateZoneAssumption": "<assumed IECC climate zone>",
    "annualCostEstimate": "<estimated annual energy cost in USD>"
  }
}

Use "completed" status for code-compliant results, "warning" for below-code performance, "optimized" for exceeding code by 20%+.`;

  const content = await callOpenAI(ENERGY_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);

  return {
    status: parsed.status ?? 'completed',
    result: {
      energyKwh: parsed.energyKwh ?? null,
      savings: parsed.savings ?? null,
      heatingBtu: parsed.heatingBtu ?? null,
      coolingBtu: parsed.coolingBtu ?? null,
      efficiencyRating: parsed.efficiencyRating ?? null,
      codeCompliance: parsed.codeCompliance ?? null,
      recommendations: parsed.recommendations ?? [],
      details: parsed.details ?? {},
    },
  };
}

async function aiGetSummary(models: {
  name: string;
  modelType: string;
  rValue: number | null;
  windowWallRatio: number | null;
  orientation: string | null;
  status: string | null;
  result: unknown;
}[]): Promise<{
  hersScore: number;
  annualKwh: number;
  heatingBtu: number;
  coolingBtu: number;
  netZeroGapKwh: number | null;
}> {
  const modelsSummary = models.map((m) => {
    const r = m.result as Record<string, unknown> | null;
    return `- ${m.name}: type=${m.modelType}, R=${m.rValue ?? 'N/A'}, WWR=${m.windowWallRatio ?? 'N/A'}%, orientation=${m.orientation ?? 'N/A'}, status=${m.status ?? 'draft'}, energyKwh=${r?.energyKwh ?? 'N/A'}, savings=${r?.savings ?? 'N/A'}%`;
  }).join('\n');

  const userPrompt = `Given these energy model components for a residential building, provide a whole-building energy summary:

${modelsSummary}

Calculate an aggregate assessment considering all model components together. Respond with this exact JSON structure:
{
  "hersScore": <HERS Index score 0-150, where 100=reference home, 0=net-zero>,
  "annualKwh": <total estimated annual energy consumption in kWh>,
  "heatingBtu": <total annual heating load in BTU>,
  "coolingBtu": <total annual cooling load in BTU>,
  "netZeroGapKwh": <kWh gap to reach net-zero; negative means surplus, null if not enough data>,
  "overallRating": "<A+ through F energy rating>",
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "topRecommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;

  const content = await callOpenAI(ENERGY_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);

  return {
    hersScore: parsed.hersScore ?? 100,
    annualKwh: parsed.annualKwh ?? 0,
    heatingBtu: parsed.heatingBtu ?? 0,
    coolingBtu: parsed.coolingBtu ?? 0,
    netZeroGapKwh: parsed.netZeroGapKwh ?? null,
  };
}

export const energyModelRouter = router({
  // ── List energy models for a project ─────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.energyModelItems.findMany({
        where: eq(energyModelItems.projectId, input.projectId),
        orderBy: (e, { desc }) => [desc(e.createdAt)],
      });
    }),

  // ── Get AI-powered energy summary for a project ──────────────
  getSummary: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const models = await ctx.db.query.energyModelItems.findMany({
        where: eq(energyModelItems.projectId, input.projectId),
      });

      if (models.length === 0) return null;

      const hasSimulated = models.some((m) => m.status !== 'draft');
      if (!hasSimulated) {
        return {
          hersScore: null,
          annualKwh: 0,
          heatingBtu: 0,
          coolingBtu: 0,
          netZeroGapKwh: null,
        };
      }

      return aiGetSummary(models);
    }),

  // ── Create an energy model ──────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      modelType: z.string().min(1),
      rValue: z.number().optional(),
      windowWallRatio: z.number().optional(),
      orientation: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [model] = await ctx.db.insert(energyModelItems).values({
        projectId: input.projectId,
        name: input.name,
        modelType: input.modelType,
        rValue: input.rValue ?? null,
        windowWallRatio: input.windowWallRatio ?? null,
        orientation: input.orientation ?? null,
        notes: input.notes ?? null,
        status: 'draft',
      }).returning();
      return model;
    }),

  // ── Run AI simulation on all models ──────────────────────────
  simulate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const models = await ctx.db.query.energyModelItems.findMany({
        where: eq(energyModelItems.projectId, input.projectId),
      });

      if (models.length === 0) throw new Error('No energy models to simulate');

      // Mark all as calculating
      for (const m of models) {
        await ctx.db.update(energyModelItems).set({ status: 'calculating' })
          .where(eq(energyModelItems.id, m.id));
      }

      // Analyze models concurrently (batch of up to 5)
      const batchSize = 5;
      for (let i = 0; i < models.length; i += batchSize) {
        const batch = models.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((m) => aiAnalyzeModel(m).catch((err) => ({
            status: 'warning' as const,
            result: { error: err.message, energyKwh: null, savings: null },
          })))
        );

        for (let j = 0; j < batch.length; j++) {
          const m = batch[j];
          const res = results[j];
          await ctx.db.update(energyModelItems).set({
            status: res.status,
            result: res.result,
          }).where(eq(energyModelItems.id, m.id));
        }
      }

      // Get overall summary
      const updatedModels = await ctx.db.query.energyModelItems.findMany({
        where: eq(energyModelItems.projectId, input.projectId),
      });

      const summary = await aiGetSummary(updatedModels).catch(() => ({
        hersScore: 100,
        annualKwh: 0,
        heatingBtu: 0,
        coolingBtu: 0,
        netZeroGapKwh: null,
      }));

      return {
        hersScore: summary.hersScore,
        annualKwh: summary.annualKwh,
      };
    }),

  // ── Delete an energy model ───────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const model = await ctx.db.query.energyModelItems.findFirst({
        where: eq(energyModelItems.id, input.id),
        with: { project: true },
      });
      if (!model) throw new Error('Model not found');
      if ((model.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(energyModelItems).where(eq(energyModelItems.id, input.id));
      return { success: true };
    }),
});
