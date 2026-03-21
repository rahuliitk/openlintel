import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  structuralElements, projects, eq, and,
} from '@openlintel/db';

/* ─── AI-powered structural analysis ──────────────────────────────────── */

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

const STRUCTURAL_SYSTEM_PROMPT = `You are a licensed Professional Engineer (PE) specializing in residential and light-commercial structural engineering. You follow IBC 2021, IRC 2021, NDS 2018, AISC 360, ACI 318-19, and ASCE 7-22 standards.

You analyze structural elements and provide accurate, code-compliant sizing recommendations. Consider:
- Load combinations per ASCE 7-22 (1.2D + 1.6L, 1.2D + 1.0W + L, etc.)
- Material properties (E, Fb, Fv for wood; Fy for steel; f'c for concrete)
- Deflection limits (L/360 for live load, L/240 for total load)
- Lateral bracing requirements
- Connection detailing considerations
- Local bearing and shear checks

Always respond with valid JSON.`;

async function aiAnalyzeElement(el: {
  name: string;
  elementType: string;
  spanLength: number | null;
  loadType: string | null;
  loadValue: number | null;
  material: string | null;
  notes: string | null;
}): Promise<{ status: string; recommendedSize: string; analysisResult: Record<string, unknown> }> {
  const userPrompt = `Analyze this structural element and provide sizing recommendation:

- Element Name: ${el.name}
- Type: ${el.elementType}
- Span/Height: ${el.spanLength ?? 'Not specified'} feet
- Load Type: ${el.loadType ?? 'Dead + Live'}
- Load Value: ${el.loadValue ?? 'Typical residential'} psf
- Material: ${el.material ?? 'Not specified (recommend best option)'}
${el.notes ? `- Additional Notes: ${el.notes}` : ''}

Respond with this exact JSON structure:
{
  "status": "pass" | "fail" | "warning",
  "recommendedSize": "Specific member size with dimensions (e.g., '2x 1-3/4 x 11-7/8 LVL' or 'W10x12 A992 Steel')",
  "analysisResult": {
    "utilizationRatio": <number between 0 and 1.5>,
    "maxDeflection": "<deflection ratio like L/480>",
    "maxStress": "<stress value with units>",
    "allowableStress": "<allowable stress with units>",
    "governingLoadCombination": "<e.g., 1.2D + 1.6L>",
    "standardsCited": "<applicable codes like IBC 2021 / NDS 2018>",
    "connectionNotes": "<brief connection recommendation>",
    "warnings": "<any warnings or notes, or null>",
    "material": "<material used>",
    "assumptions": "<key assumptions made>"
  }
}

If the element lacks sufficient data, still provide a reasonable recommendation based on typical residential construction practices, and note assumptions in the response.`;

  const content = await callOpenAI(STRUCTURAL_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(content);

  return {
    status: result.status ?? 'pass',
    recommendedSize: result.recommendedSize ?? 'See PE for sizing',
    analysisResult: result.analysisResult ?? {},
  };
}

async function aiSizeBeam(el: {
  name: string;
  spanLength: number | null;
  loadType: string | null;
  loadValue: number | null;
  material: string | null;
  notes: string | null;
}): Promise<{ size: string; material: string }> {
  const userPrompt = `Size this beam for a residential project:

- Beam Name: ${el.name}
- Span: ${el.spanLength ?? 12} feet
- Load Type: ${el.loadType ?? 'Dead + Live (floor support)'}
- Load Value: ${el.loadValue ?? 40} psf
- Preferred Material: ${el.material ?? 'Recommend the best option'}
${el.notes ? `- Notes: ${el.notes}` : ''}

Respond with this exact JSON structure:
{
  "size": "Specific beam size (e.g., '2x 1-3/4 x 11-7/8 Microllam LVL' or 'W8x10 A992 Steel' or '5-1/8 x 12 24F-V4 Glulam')",
  "material": "Material type used",
  "depthInches": <beam depth in inches>,
  "widthInches": <beam width in inches>,
  "weight": "<estimated weight like '4.2 plf' or '10 lb/ft'>",
  "maxMoment": "<maximum bending moment>",
  "maxShear": "<maximum shear force>",
  "deflection": "<expected deflection ratio like L/480>",
  "bearingLength": "<minimum required bearing length>",
  "standard": "<code reference>"
}`;

  const content = await callOpenAI(STRUCTURAL_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(content);

  return {
    size: result.size ?? 'See PE for sizing',
    material: result.material ?? 'TBD',
  };
}

async function aiGetAnalysisSummary(elements: {
  name: string;
  elementType: string;
  spanLength: number | null;
  loadType: string | null;
  loadValue: number | null;
  material: string | null;
  status: string | null;
}[]): Promise<{
  loadPathComplete: boolean;
  foundationRecommendation: string | null;
  seismicZone: number;
}> {
  const elementsSummary = elements.map((e) =>
    `- ${e.name}: ${e.elementType}, span=${e.spanLength ?? 'N/A'}ft, load=${e.loadValue ?? 'N/A'} psf (${e.loadType ?? 'N/A'}), material=${e.material ?? 'N/A'}, status=${e.status ?? 'pending'}`
  ).join('\n');

  const userPrompt = `Given these structural elements for a residential project, analyze the overall structural system:

${elementsSummary}

Respond with this exact JSON structure:
{
  "loadPathComplete": <true if there is a complete gravity load path from roof/floor through walls/columns to foundation, false if gaps exist>,
  "loadPathNotes": "<explain the load path assessment>",
  "foundationRecommendation": "<one of: slab_on_grade, crawl_space, basement, pier_and_beam, continuous_footing, spread_footing — or null if no recommendation>",
  "foundationNotes": "<why this foundation type>",
  "seismicZone": <1-4, based on the load types present; 1=low, 2=moderate, 3=high, 4=very high>,
  "seismicNotes": "<seismic assessment>",
  "overallAssessment": "<brief overall structural assessment>"
}`;

  const content = await callOpenAI(STRUCTURAL_SYSTEM_PROMPT, userPrompt);
  const result = JSON.parse(content);

  return {
    loadPathComplete: result.loadPathComplete ?? false,
    foundationRecommendation: result.foundationRecommendation ?? null,
    seismicZone: result.seismicZone ?? 1,
  };
}

export const structuralRouter = router({
  // ── List structural elements for a project ────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.structuralElements.findMany({
        where: eq(structuralElements.projectId, input.projectId),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Get AI-powered analysis summary for a project ──────────
  getAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const elements = await ctx.db.query.structuralElements.findMany({
        where: eq(structuralElements.projectId, input.projectId),
      });

      if (elements.length === 0) return null;

      // Only call AI if at least one element has been analyzed
      const hasAnalyzed = elements.some((e) => e.status !== 'pending');
      if (!hasAnalyzed) {
        // Return basic assessment without AI call
        const types = new Set(elements.map((e) => e.elementType));
        return {
          loadPathComplete: types.has('foundation') && (types.has('beam') || types.has('slab')) && (types.has('wall') || types.has('column')),
          foundationRecommendation: types.has('foundation') ? 'continuous_footing' : null,
          seismicZone: elements.some((e) => e.loadType === 'seismic') ? 3 : 1,
        };
      }

      return aiGetAnalysisSummary(elements);
    }),

  // ── Create a structural element ─────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      elementType: z.string().min(1),
      spanLength: z.number().optional(),
      loadType: z.string().optional(),
      loadValue: z.number().optional(),
      material: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [element] = await ctx.db.insert(structuralElements).values({
        projectId: input.projectId,
        name: input.name,
        elementType: input.elementType,
        spanLength: input.spanLength ?? null,
        loadType: input.loadType ?? null,
        loadValue: input.loadValue ?? null,
        material: input.material ?? null,
        notes: input.notes ?? null,
        status: 'pending',
      }).returning();
      return element;
    }),

  // ── Run AI analysis on all elements ─────────────────────────
  analyze: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const elements = await ctx.db.query.structuralElements.findMany({
        where: eq(structuralElements.projectId, input.projectId),
      });

      if (elements.length === 0) throw new Error('No structural elements to analyze');

      // Mark all as analyzing
      for (const el of elements) {
        await ctx.db.update(structuralElements).set({ status: 'analyzing' })
          .where(eq(structuralElements.id, el.id));
      }

      let passed = 0;
      let failed = 0;
      let warnings = 0;

      // Analyze elements concurrently (batch of up to 5 at a time)
      const batchSize = 5;
      for (let i = 0; i < elements.length; i += batchSize) {
        const batch = elements.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((el) => aiAnalyzeElement(el).catch((err) => ({
            status: 'warning' as const,
            recommendedSize: 'Analysis error — consult PE',
            analysisResult: { error: err.message },
          })))
        );

        for (let j = 0; j < batch.length; j++) {
          const el = batch[j];
          const result = results[j];

          await ctx.db.update(structuralElements).set({
            status: result.status,
            recommendedSize: result.recommendedSize,
            analysisResult: result.analysisResult,
          }).where(eq(structuralElements.id, el.id));

          if (result.status === 'pass') passed++;
          else if (result.status === 'fail') failed++;
          else warnings++;
        }
      }

      return { passed, failed, warnings };
    }),

  // ── AI-powered beam sizing ──────────────────────────────────
  sizeBeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const el = await ctx.db.query.structuralElements.findFirst({
        where: eq(structuralElements.id, input.id),
        with: { project: true },
      });
      if (!el) throw new Error('Element not found');
      if ((el.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { size, material } = await aiSizeBeam(el);

      await ctx.db.update(structuralElements).set({
        recommendedSize: size,
        status: 'pass',
      }).where(eq(structuralElements.id, input.id));

      return { size, material };
    }),

  // ── Delete an element ───────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const el = await ctx.db.query.structuralElements.findFirst({
        where: eq(structuralElements.id, input.id),
        with: { project: true },
      });
      if (!el) throw new Error('Element not found');
      if ((el.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(structuralElements).where(eq(structuralElements.id, input.id));
      return { success: true };
    }),
});
