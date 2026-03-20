import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  siteAnalysisItems, projects, eq, and,
} from '@openlintel/db';

/* ─── AI helper ───────────────────────────────────────────────────────── */

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

const SITE_SYSTEM_PROMPT = `You are an expert civil engineer and site planner specializing in residential and commercial land development. You have deep knowledge of:
- Topographic surveying, site grading, and earthwork calculations
- Solar orientation analysis, passive solar design, and PV potential per ASHRAE and NREL data
- Stormwater management, drainage design, and flood zone assessment per FEMA standards
- Geotechnical analysis, soil bearing capacity, and foundation suitability
- Wind exposure analysis per ASCE 7-22
- Noise mapping and acoustic site assessment
- Setback requirements, easements, and zoning compliance per IBC/IRC
- Environmental site assessment (Phase I ESA standards)

Provide data-driven, professional analysis with specific values, recommendations, and code references. Always respond with valid JSON.`;

async function aiAnalyzeSite(analysis: {
  name: string;
  analysisType: string;
  soilType: string | null;
  elevation: number | null;
  slopePercent: number | null;
  notes: string | null;
}): Promise<{ status: string; results: Record<string, unknown> }> {
  const typePrompts: Record<string, string> = {
    topography: `Analyze topographic conditions for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
- Soil Type: ${analysis.soilType ?? 'Not specified'}
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning" | "critical",
  "summary": "<2-3 sentence overview>",
  "slopeClassification": "<flat/gentle/moderate/steep/very steep>",
  "buildability": "<excellent/good/fair/poor>",
  "gradingRequired": "<none/minimal/moderate/extensive>",
  "estimatedCutFill": "<description of earthwork needed>",
  "drainageDirection": "<natural drainage flow direction>",
  "erosionRisk": "<low/moderate/high>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable code 1>", ...]
}`,

    solar: `Analyze solar orientation and potential for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
- Soil Type: ${analysis.soilType ?? 'Not specified'}
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed",
  "summary": "<2-3 sentence overview of solar potential>",
  "bestOrientation": "<optimal building orientation, e.g. South-Southeast>",
  "peakSunHours": <estimated peak sun hours per day as a number>,
  "annualSolarRadiation": "<kWh/m²/year estimate>",
  "pvPotential": "<estimated PV generation potential>",
  "passiveSolarStrategy": "<recommended passive solar approach>",
  "shadingAnalysis": "<description of potential shading issues>",
  "summerSolsticeAngle": "<max sun altitude angle>",
  "winterSolsticeAngle": "<min sun altitude angle>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable code/standard>", ...]
}`,

    grading: `Analyze grading and drainage requirements for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
- Soil Type: ${analysis.soilType ?? 'Not specified'}
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning" | "critical",
  "summary": "<2-3 sentence overview>",
  "existingConditions": "<description of current grading>",
  "proposedGradingPlan": "<grading strategy>",
  "estimatedCutVolume": "<cubic yards of cut>",
  "estimatedFillVolume": "<cubic yards of fill>",
  "drainageStrategy": "<surface drainage approach>",
  "stormwaterManagement": "<retention/detention requirements>",
  "minimumSlopeAwayFromBuilding": "<required slope per code>",
  "percolationEstimate": "<estimated perc rate based on soil>",
  "erosionControlMeasures": ["<measure 1>", ...],
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable code>", ...]
}`,

    wind: `Analyze wind exposure conditions for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning",
  "summary": "<2-3 sentence overview>",
  "prevailingDirection": "<prevailing wind direction, e.g. Northwest>",
  "exposureCategory": "<B/C/D per ASCE 7-22>",
  "basicWindSpeed": "<estimated mph for the region>",
  "windPressure": "<estimated psf on structure>",
  "upliftConcerns": "<description of uplift risk>",
  "landscapeWindbreaks": "<recommended windbreak strategy>",
  "buildingOrientationImpact": "<how wind affects building placement>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["ASCE 7-22", "<other applicable code>"]
}`,

    noise: `Analyze noise conditions for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning",
  "summary": "<2-3 sentence overview>",
  "estimatedAmbientNoise": "<dB level estimate>",
  "noiseClassification": "<quiet/moderate/noisy/very noisy>",
  "primaryNoiseSources": ["<source 1>", "<source 2>"],
  "indoorNoiseTarget": "<target dB for interior spaces>",
  "requiredSTC": "<Sound Transmission Class rating needed>",
  "bufferZoneRecommendation": "<distance or barrier recommendation>",
  "windowSpecification": "<recommended window STC rating>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable code>", ...]
}`,

    soil: `Analyze soil and bearing capacity for this site:
- Soil Type: ${analysis.soilType ?? 'Not specified'}
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning" | "critical",
  "summary": "<2-3 sentence overview>",
  "bearingCapacity": "<estimated bearing capacity in psf>",
  "soilClassification": "<USCS classification>",
  "expansiveRisk": "<none/low/moderate/high>",
  "frostDepth": "<estimated frost line depth>",
  "foundationRecommendation": "<recommended foundation type>",
  "compactionRequirements": "<compaction specs>",
  "waterTableEstimate": "<estimated depth to water table>",
  "percolationRate": "<estimated perc rate>",
  "geotechRecommendation": "<whether geotechnical investigation is needed>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable code>", ...]
}`,

    flood: `Analyze flood risk for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Soil Type: ${analysis.soilType ?? 'Not specified'}
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning" | "critical",
  "summary": "<2-3 sentence overview>",
  "estimatedFloodZone": "<Zone X/A/AE/V/VE based on available info>",
  "floodRisk": "<minimal/moderate/high/severe>",
  "baseFloodElevation": "<estimated BFE if in flood zone>",
  "requiredFreeboard": "<recommended freeboard above BFE>",
  "floodInsuranceRequired": "<yes/no/recommended>",
  "mitigationStrategies": ["<strategy 1>", "<strategy 2>"],
  "drainageCapacity": "<assessment of site drainage>",
  "historicalFloodData": "<general assessment>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["FEMA NFIP", "<other applicable code>"]
}`,

    setback: `Analyze setback and easement requirements for this site:
- Elevation: ${analysis.elevation ?? 'Not specified'} ft
- Slope: ${analysis.slopePercent ?? 'Not specified'}%
${analysis.notes ? `- Notes: ${analysis.notes}` : ''}

Respond with:
{
  "status": "completed" | "warning",
  "summary": "<2-3 sentence overview>",
  "typicalFrontSetback": "<typical front setback in feet>",
  "typicalRearSetback": "<typical rear setback in feet>",
  "typicalSideSetback": "<typical side setback in feet>",
  "buildableAreaEstimate": "<estimated % of lot that is buildable>",
  "easementTypes": ["<common easement types to check>"],
  "utilityEasements": "<typical utility easement assessment>",
  "zoningConsiderations": ["<consideration 1>", "<consideration 2>"],
  "varianceNeeded": "<likely/unlikely/possible>",
  "recommendations": ["<specific recommendation 1>", "<recommendation 2>", ...],
  "codeReferences": ["<applicable zoning code>", ...]
}`,
  };

  const userPrompt = typePrompts[analysis.analysisType] ?? typePrompts.topography;
  const content = await callOpenAI(SITE_SYSTEM_PROMPT, `Analysis Name: "${analysis.name}"\n\n${userPrompt}`);
  const result = JSON.parse(content);

  return {
    status: result.status ?? 'completed',
    results: result,
  };
}

async function aiSolarStudy(analyses: {
  name: string;
  analysisType: string;
  elevation: number | null;
  slopePercent: number | null;
  notes: string | null;
}[]): Promise<{ peakSunHours: number; bestOrientation: string }> {
  const siteContext = analyses.map((a) =>
    `- ${a.name} (${a.analysisType}): elevation=${a.elevation ?? 'N/A'}ft, slope=${a.slopePercent ?? 'N/A'}%${a.notes ? `, notes: ${a.notes}` : ''}`
  ).join('\n');

  const userPrompt = `Given these site analyses for a residential project, provide a comprehensive solar study:

${siteContext || 'No site data available yet — provide general residential guidance.'}

Respond with:
{
  "peakSunHours": <estimated peak sun hours per day as a number, e.g. 5.2>,
  "bestOrientation": "<optimal building orientation, e.g. South-Southeast>",
  "annualSolarRadiation": "<kWh/m²/year>",
  "pvSystemSize": "<recommended PV system size in kW>",
  "estimatedAnnualGeneration": "<estimated annual kWh>",
  "passiveSolarDesign": {
    "windowToWallRatio": "<recommended south-facing window ratio>",
    "overhangDepth": "<recommended overhang for summer shading>",
    "thermalMassStrategy": "<recommended thermal mass approach>"
  },
  "seasonalAnalysis": {
    "summer": "<summer solar conditions and strategy>",
    "winter": "<winter solar conditions and strategy>"
  },
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}`;

  const content = await callOpenAI(SITE_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(content);

  return {
    peakSunHours: typeof result.peakSunHours === 'number' ? result.peakSunHours : 5.0,
    bestOrientation: result.bestOrientation ?? 'South',
  };
}

export const siteAnalysisRouter = router({
  // ── List site analysis items for a project ──────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.siteAnalysisItems.findMany({
        where: eq(siteAnalysisItems.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Get site overview (aggregated stats) ────────────────────
  getOverview: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.siteAnalysisItems.findMany({
        where: eq(siteAnalysisItems.projectId, input.projectId),
      });

      // Find solar analysis results for peak sun hours
      const solarItem = items.find((i) => i.analysisType === 'solar' && i.results);
      const peakSunHours = solarItem ? (solarItem.results as any)?.peakSunHours ?? null : null;

      return {
        totalAnalyses: items.length,
        completed: items.filter((i) => i.status === 'completed').length,
        warnings: items.filter((i) => i.status === 'warning' || i.status === 'critical').length,
        peakSunHours,
      };
    }),

  // ── Create a site analysis (AI-powered) ─────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      analysisType: z.string().min(1),
      soilType: z.string().optional(),
      elevation: z.number().optional(),
      slopePercent: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Create the record in pending state
      const [item] = await ctx.db.insert(siteAnalysisItems).values({
        projectId: input.projectId,
        name: input.name,
        analysisType: input.analysisType,
        soilType: input.soilType ?? null,
        elevation: input.elevation ?? null,
        slopePercent: input.slopePercent ?? null,
        notes: input.notes ?? null,
        status: 'processing',
      }).returning();

      // Run AI analysis
      try {
        const { status, results } = await aiAnalyzeSite({
          name: input.name,
          analysisType: input.analysisType,
          soilType: input.soilType ?? null,
          elevation: input.elevation ?? null,
          slopePercent: input.slopePercent ?? null,
          notes: input.notes ?? null,
        });

        const [updated] = await ctx.db.update(siteAnalysisItems).set({
          status,
          results,
        }).where(eq(siteAnalysisItems.id, item.id)).returning();

        return updated;
      } catch (err: any) {
        // On AI failure, still return the item with a warning status
        await ctx.db.update(siteAnalysisItems).set({
          status: 'warning',
          results: { summary: `Analysis could not be completed: ${err.message}` },
        }).where(eq(siteAnalysisItems.id, item.id));

        return { ...item, status: 'warning' };
      }
    }),

  // ── Run AI solar study across all analyses ──────────────────
  runSolar: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const items = await ctx.db.query.siteAnalysisItems.findMany({
        where: eq(siteAnalysisItems.projectId, input.projectId),
      });

      const { peakSunHours, bestOrientation } = await aiSolarStudy(items);

      return { peakSunHours, bestOrientation };
    }),

  // ── Delete an analysis ──────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.siteAnalysisItems.findFirst({
        where: eq(siteAnalysisItems.id, input.id),
        with: { project: true },
      });
      if (!item) throw new Error('Analysis not found');
      if ((item.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(siteAnalysisItems).where(eq(siteAnalysisItems.id, input.id));
      return { success: true };
    }),
});
