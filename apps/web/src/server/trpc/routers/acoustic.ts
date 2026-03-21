import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  acousticAssessments, projects, rooms, eq, and,
} from '@openlintel/db';

/* ─── AI-powered acoustic analysis ──────────────────────────────── */

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

const ACOUSTIC_SYSTEM_PROMPT = `You are a Board-Certified Acoustical Consultant specializing in residential and light-commercial building acoustics. You follow IBC 2021, IRC 2021, ASTM E90, ASTM E492, ASTM E413, ASTM C423, and ANSI S12.60 standards.

You analyze acoustic performance between rooms and within spaces, providing accurate assessments of:
- Sound Transmission Class (STC) ratings per ASTM E413 for airborne sound isolation
- Impact Insulation Class (IIC) ratings per ASTM E492 for impact sound isolation
- Reverberation Time (RT60) per Sabine/Eyring equations
- Noise Reduction Coefficient (NRC) for material recommendations
- Background noise criteria (NC curves) for room use suitability
- Code compliance: IBC requires STC 50 / IIC 50 between dwelling units, IRC recommends STC 33+ between rooms
- Wall assembly performance: single stud drywall (STC 33), double drywall (STC 40), staggered stud (STC 46), double stud insulated (STC 55+), concrete 200mm (STC 52)
- Floor assembly performance: concrete with standard finish (IIC 45), with resilient underlay (IIC 55+), floating floor (IIC 60+)
- Optimal RT60 ranges by room use: bedroom 0.3-0.6s, living room 0.4-0.8s, home theater 0.3-0.5s, music room 0.8-1.2s, office 0.3-0.5s

Always respond with valid JSON.`;

async function aiAnalyzeAssessment(assessment: {
  name: string;
  assessmentType: string;
  sourceRoomName: string | null;
  receivingRoomName: string | null;
  roomUse: string | null;
  wallType: string | null;
  notes: string | null;
}): Promise<{
  status: string;
  stcValue: number | null;
  iicValue: number | null;
  reverbTime: number | null;
  recommendation: string;
  analysisResult: Record<string, unknown>;
}> {
  const typePrompts: Record<string, string> = {
    stc: `Calculate the Sound Transmission Class (STC) rating for the wall/partition between these rooms. Consider the wall assembly type, room adjacency, and required isolation level based on room uses. Provide the STC rating, code compliance status, and upgrade recommendations if needed.`,
    iic: `Calculate the Impact Insulation Class (IIC) rating for the floor/ceiling assembly between these rooms. Consider the floor construction, room uses (especially if sensitive rooms are below noisy ones), and required isolation level. Provide the IIC rating, code compliance, and improvement options.`,
    reverberation: `Calculate the Reverberation Time (RT60) for this room using the Sabine equation. Consider the room's intended use, typical furnishing level, surface materials, and volume estimate. Provide the RT60, target range for the room use, and acoustic treatment recommendations.`,
    noise_reduction: `Develop a comprehensive noise reduction strategy for this room pair. Consider all flanking paths (walls, ceiling, floor, HVAC, doors, windows), identify the weakest link in the sound isolation chain, and provide a prioritized improvement plan with estimated STC/IIC improvements for each measure.`,
    material_recommendation: `Recommend specific acoustic materials and treatments for this space. Consider the room's intended use, aesthetic requirements, budget tiers (good/better/best), and performance ratings (NRC, STC contribution). Include specific product categories and installation guidance.`,
  };

  const typePrompt = typePrompts[assessment.assessmentType] ?? 'Analyze the acoustic performance of this space.';

  const userPrompt = `${typePrompt}

Assessment Details:
- Name: ${assessment.name}
- Type: ${assessment.assessmentType}
- Source Room: ${assessment.sourceRoomName ?? 'Not specified'}
- Receiving Room: ${assessment.receivingRoomName ?? 'Not specified'}
- Room Use: ${assessment.roomUse ?? 'general'}
- Wall/Floor Assembly: ${assessment.wallType ?? 'Standard residential construction'}
${assessment.notes ? `- Additional Notes: ${assessment.notes}` : ''}

Respond with this exact JSON structure:
{
  "status": "pass" | "warning" | "fail",
  "stcValue": <STC rating as integer, or null if not applicable>,
  "iicValue": <IIC rating as integer, or null if not applicable>,
  "reverbTime": <RT60 in seconds as decimal, or null if not applicable>,
  "recommendation": "<one concise paragraph with the key recommendation>",
  "analysisResult": {
    "codeCompliance": "<compliant / non-compliant / exceeds code>",
    "codeReference": "<applicable code section, e.g. IBC 1206.2>",
    "requiredRating": <minimum required STC or IIC per code>,
    "achievedRating": <actual calculated rating>,
    "margin": <how much above or below code requirement>,
    "flanking": "<flanking path assessment if applicable>",
    "wallAssemblyDetail": "<detailed wall/floor assembly description>",
    "improvementOptions": [
      {"measure": "<improvement>", "estimatedGain": "<STC/IIC gain>", "cost": "<relative cost>"}
    ],
    "materialSuggestions": ["<material 1>", "<material 2>"],
    "backgroundNoiseLevel": "<NC curve rating if applicable>",
    "assumptions": "<key assumptions made>"
  }
}

Use "pass" for code-compliant, "warning" for marginal (within 5 of code minimum), "fail" for below code.`;

  const content = await callOpenAI(ACOUSTIC_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);

  return {
    status: parsed.status ?? 'pass',
    stcValue: parsed.stcValue ?? null,
    iicValue: parsed.iicValue ?? null,
    reverbTime: parsed.reverbTime ?? null,
    recommendation: parsed.recommendation ?? 'Consult an acoustical engineer for detailed assessment.',
    analysisResult: parsed.analysisResult ?? {},
  };
}

export const acousticRouter = router({
  // ── List acoustic assessments for a project ──────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.acousticAssessments.findMany({
        where: eq(acousticAssessments.projectId, input.projectId),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });
    }),

  // ── Create an acoustic assessment ───────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      assessmentType: z.string().min(1),
      sourceRoomId: z.string().optional(),
      receivingRoomId: z.string().optional(),
      roomUse: z.string().optional(),
      wallType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Resolve room names from IDs
      let sourceRoomName: string | null = null;
      let receivingRoomName: string | null = null;

      if (input.sourceRoomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, input.sourceRoomId),
        });
        sourceRoomName = room?.name ?? null;
      }
      if (input.receivingRoomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, input.receivingRoomId),
        });
        receivingRoomName = room?.name ?? null;
      }

      const [assessment] = await ctx.db.insert(acousticAssessments).values({
        projectId: input.projectId,
        name: input.name,
        assessmentType: input.assessmentType,
        sourceRoomId: input.sourceRoomId ?? null,
        receivingRoomId: input.receivingRoomId ?? null,
        sourceRoomName,
        receivingRoomName,
        roomUse: input.roomUse ?? null,
        wallType: input.wallType ?? null,
        notes: input.notes ?? null,
        status: 'pending',
      }).returning();
      return assessment;
    }),

  // ── Run AI calculation on all assessments ────────────────────
  calculate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const assessments = await ctx.db.query.acousticAssessments.findMany({
        where: eq(acousticAssessments.projectId, input.projectId),
      });

      if (assessments.length === 0) throw new Error('No acoustic assessments to calculate');

      // Mark all as analyzing
      for (const a of assessments) {
        await ctx.db.update(acousticAssessments).set({ status: 'analyzing' })
          .where(eq(acousticAssessments.id, a.id));
      }

      let passed = 0;
      let warnings = 0;
      let failed = 0;

      // Analyze concurrently in batches of 5
      const batchSize = 5;
      for (let i = 0; i < assessments.length; i += batchSize) {
        const batch = assessments.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((a) => aiAnalyzeAssessment(a).catch((err) => ({
            status: 'warning' as const,
            stcValue: null,
            iicValue: null,
            reverbTime: null,
            recommendation: 'Analysis error — consult acoustical engineer.',
            analysisResult: { error: err.message },
          })))
        );

        for (let j = 0; j < batch.length; j++) {
          const a = batch[j];
          const result = results[j];

          await ctx.db.update(acousticAssessments).set({
            status: result.status,
            stcValue: result.stcValue,
            iicValue: result.iicValue,
            reverbTime: result.reverbTime,
            recommendation: result.recommendation,
            analysisResult: result.analysisResult,
          }).where(eq(acousticAssessments.id, a.id));

          if (result.status === 'pass') passed++;
          else if (result.status === 'warning') warnings++;
          else failed++;
        }
      }

      return { passed, warnings, failed };
    }),

  // ── Delete an assessment ─────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.db.query.acousticAssessments.findFirst({
        where: eq(acousticAssessments.id, input.id),
        with: { project: true },
      });
      if (!assessment) throw new Error('Assessment not found');
      if ((assessment.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(acousticAssessments).where(eq(acousticAssessments.id, input.id));
      return { success: true };
    }),
});
