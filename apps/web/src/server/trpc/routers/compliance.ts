import { z } from 'zod';
import { projects, rooms, complianceReports, eq, and, desc } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Building Code Rules ────────────────────────────────────────
interface BuildingCodeRule {
  code_id: string;
  jurisdiction: { country: string; state?: string; city?: string };
  category: string;
  rule: {
    description: string;
    requirement: string;
    min_value?: number;
    max_value?: number;
    unit?: string;
    applies_to?: string[];
  };
  source: {
    document: string;
    edition?: string;
    clause: string;
    url?: string;
  };
}

interface ComplianceResult {
  ruleId: string;
  category: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  description: string;
  requirement: string;
  actualValue?: number | string;
  requiredValue?: number | string;
  unit?: string;
  source: string;
  clause: string;
}

// All jurisdiction files to load
const JURISDICTION_FILES = [
  'india-nbc.json',
  'us-irc.json',
  'eu-eurocode.json',
  'uk-building-regs.json',
];

const JURISDICTIONS = [
  { code: 'IN', name: 'India (NBC 2016)' },
  { code: 'US', name: 'United States (IRC 2021)' },
  { code: 'EU', name: 'European Union (Eurocode)' },
  { code: 'GB', name: 'United Kingdom (Building Regs)' },
];

// Load rules from all jurisdiction files at module init
let ALL_RULES: BuildingCodeRule[] = [];
for (const file of JURISDICTION_FILES) {
  try {
    const rulesPath = join(process.cwd(), '..', '..', 'data', 'building-codes', file);
    const rules: BuildingCodeRule[] = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    ALL_RULES = ALL_RULES.concat(rules);
  } catch {
    try {
      const rulesPath = join(process.cwd(), 'data', 'building-codes', file);
      const rules: BuildingCodeRule[] = JSON.parse(readFileSync(rulesPath, 'utf-8'));
      ALL_RULES = ALL_RULES.concat(rules);
    } catch {
      console.warn(`Building codes file ${file} not found, skipping`);
    }
  }
}

/* ─── AI-powered compliance analysis ──────────────────────────── */

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
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

const COMPLIANCE_SYSTEM_PROMPT = `You are a licensed Building Code Official and Plans Examiner with expertise in residential and light-commercial building codes. You are thoroughly familiar with:
- IBC 2021 (International Building Code)
- IRC 2021 (International Residential Code)
- NBC 2016 (National Building Code of India)
- Eurocode (EN) standards
- UK Building Regulations (Approved Documents)
- NFPA 101 (Life Safety Code)
- IMC (International Mechanical Code)
- NEC/NFPA 70 (National Electrical Code)
- IPC (International Plumbing Code)
- ADA / accessibility standards

You analyze rooms and spaces for code compliance across all categories: ventilation, fire safety, electrical, plumbing, and accessibility. You provide specific code references, actual requirements, and clear pass/fail/warning assessments.

Always respond with valid JSON.`;

const JURISDICTION_CODES: Record<string, string> = {
  IN: 'India — NBC 2016 (National Building Code of India), IS codes',
  US: 'United States — IRC 2021, IBC 2021, NEC 2023, IPC 2021, IMC 2021, ADA Standards',
  EU: 'European Union — Eurocode, EN standards, EU Energy Performance Directive',
  GB: 'United Kingdom — Building Regulations 2010 (Approved Documents A-S), BS standards',
};

async function aiAnalyzeRoom(
  room: { name: string; type: string; lengthMm: number | null; widthMm: number | null; heightMm: number | null },
  jurisdiction: string,
  categories: string[],
): Promise<ComplianceResult[]> {
  const lengthMm = room.lengthMm || 0;
  const widthMm = room.widthMm || 0;
  const heightMm = room.heightMm || 2700;
  const areaSqm = (lengthMm * widthMm) / 1_000_000;
  const volumeCuM = areaSqm * (heightMm / 1000);

  const jurisdictionDesc = JURISDICTION_CODES[jurisdiction] ?? 'International Building Code';

  const userPrompt = `Analyze this room for building code compliance under ${jurisdictionDesc}.

Room Details:
- Name: ${room.name}
- Type: ${room.type}
- Length: ${lengthMm} mm (${(lengthMm / 1000).toFixed(2)} m)
- Width: ${widthMm} mm (${(widthMm / 1000).toFixed(2)} m)
- Height: ${heightMm} mm (${(heightMm / 1000).toFixed(2)} m)
- Area: ${areaSqm.toFixed(2)} sq.m
- Volume: ${volumeCuM.toFixed(2)} cu.m

Check compliance for these categories: ${categories.join(', ')}

For each category, provide 2-4 specific code checks. For each check provide:
- A specific, measurable assessment (not just "requires manual verification")
- Based on the room type and dimensions, determine if the requirement is likely met
- Reference actual code sections

Respond with this exact JSON structure:
{
  "checks": [
    {
      "ruleId": "<jurisdiction-category-number, e.g. IRC-VN-001>",
      "category": "<one of: ventilation, fire_safety, electrical, plumbing, accessibility>",
      "status": "pass" | "fail" | "warning",
      "description": "<what is being checked>",
      "requirement": "<the specific code requirement>",
      "actualValue": <number or string — what this room provides or is estimated to provide>,
      "requiredValue": <number or string — what the code requires>,
      "unit": "<unit if numeric, e.g. sq.m, cfm, inches, etc.>",
      "source": "<code document name, e.g. IRC 2021>",
      "clause": "<specific section, e.g. Section R303.1>"
    }
  ]
}

Guidelines for assessment:
- ventilation: Check natural ventilation area (typically 4-8% of floor area), mechanical ventilation requirements, exhaust for kitchens/bathrooms
- fire_safety: Check egress requirements, smoke detector placement, fire-rated assemblies, exit width, window egress dimensions
- electrical: Check outlet spacing (IRC: every 12ft, within 6ft of door), GFCI requirements for wet areas, lighting requirements, circuit capacity
- plumbing: Check fixture requirements per room type, drainage, water supply, trap requirements
- accessibility: Check door widths (min 32" clear), maneuvering clearances, grab bar provisions, threshold heights

Use "pass" when the room dimensions/type clearly meet requirements, "fail" when they clearly don't, "warning" when the room is marginal or additional information is needed.`;

  const content = await callOpenAI(COMPLIANCE_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);

  return (parsed.checks ?? []).map((c: any) => ({
    ruleId: c.ruleId ?? 'AI-CHECK',
    category: c.category ?? 'general',
    status: c.status ?? 'warning',
    description: c.description ?? '',
    requirement: c.requirement ?? '',
    actualValue: c.actualValue,
    requiredValue: c.requiredValue,
    unit: c.unit,
    source: c.source ?? jurisdictionDesc,
    clause: c.clause ?? '',
  }));
}

function checkRoomDimensions(
  room: { name: string; type: string; lengthMm: number | null; widthMm: number | null; heightMm: number | null },
  rules: BuildingCodeRule[],
): ComplianceResult[] {
  const results: ComplianceResult[] = [];
  const lengthMm = room.lengthMm || 0;
  const widthMm = room.widthMm || 0;
  const heightMm = room.heightMm || 2700;
  const areaSqm = (lengthMm * widthMm) / 1_000_000;
  const minDimensionMm = Math.min(lengthMm, widthMm);

  for (const rule of rules) {
    if (rule.category !== 'room_dimensions') continue;

    const appliesTo = rule.rule.applies_to || [];
    if (appliesTo.length > 0 && !appliesTo.includes(room.type)) continue;

    if (lengthMm === 0 || widthMm === 0) {
      results.push({
        ruleId: rule.code_id,
        category: rule.category,
        status: 'warning',
        description: rule.rule.description,
        requirement: rule.rule.requirement,
        actualValue: 'Unknown (no dimensions)',
        source: rule.source.document,
        clause: rule.source.clause,
      });
      continue;
    }

    if (rule.rule.unit === 'sqm' && rule.rule.min_value) {
      results.push({
        ruleId: rule.code_id,
        category: rule.category,
        status: areaSqm >= rule.rule.min_value ? 'pass' : 'fail',
        description: rule.rule.description,
        requirement: rule.rule.requirement,
        actualValue: Math.round(areaSqm * 100) / 100,
        requiredValue: rule.rule.min_value,
        unit: 'sq.m',
        source: rule.source.document,
        clause: rule.source.clause,
      });
    } else if (rule.rule.unit === 'mm') {
      if (rule.rule.description.toLowerCase().includes('width')) {
        results.push({
          ruleId: rule.code_id,
          category: rule.category,
          status: minDimensionMm >= (rule.rule.min_value || 0) ? 'pass' : 'fail',
          description: rule.rule.description,
          requirement: rule.rule.requirement,
          actualValue: minDimensionMm,
          requiredValue: rule.rule.min_value,
          unit: 'mm',
          source: rule.source.document,
          clause: rule.source.clause,
        });
      } else if (rule.rule.description.toLowerCase().includes('ceiling') || rule.rule.description.toLowerCase().includes('height')) {
        results.push({
          ruleId: rule.code_id,
          category: rule.category,
          status: heightMm >= (rule.rule.min_value || 0) ? 'pass' : 'fail',
          description: rule.rule.description,
          requirement: rule.rule.requirement,
          actualValue: heightMm,
          requiredValue: rule.rule.min_value,
          unit: 'mm',
          source: rule.source.document,
          clause: rule.source.clause,
        });
      }
    }
  }

  return results;
}

export const complianceRouter = router({
  // List past compliance reports for a project
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.complianceReports.findMany({
        where: eq(complianceReports.projectId, input.projectId),
        orderBy: [desc(complianceReports.createdAt)],
      });
    }),

  // Get a specific report
  getReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.complianceReports.findFirst({
        where: and(eq(complianceReports.id, input.id), eq(complianceReports.userId, ctx.userId)),
      });
      if (!report) throw new Error('Report not found');
      return report;
    }),

  // Run a new compliance check and persist results
  runCheck: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      jurisdiction: z.string().default('IN'),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { rooms: true },
      });
      if (!project) throw new Error('Project not found');
      if (project.rooms.length === 0) throw new Error('Project has no rooms. Add rooms with dimensions first.');

      // Create a pending report
      const [report] = await ctx.db.insert(complianceReports).values({
        projectId: input.projectId,
        userId: ctx.userId,
        jurisdiction: input.jurisdiction,
        status: 'running',
      }).returning();

      // Run checks asynchronously but still within the mutation
      try {
        const applicableRules = ALL_RULES.filter(
          (r) => r.jurisdiction.country === input.jurisdiction,
        );
        const aiCategories = ['ventilation', 'fire_safety', 'electrical', 'plumbing', 'accessibility'];

        // Process rooms in batches
        const batchSize = 3;
        const roomReports = [];

        for (let i = 0; i < project.rooms.length; i += batchSize) {
          const batch = project.rooms.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (room) => {
              const dimensionResults = checkRoomDimensions(
                { name: room.name, type: room.type, lengthMm: room.lengthMm, widthMm: room.widthMm, heightMm: room.heightMm },
                applicableRules,
              );

              const aiResults = await aiAnalyzeRoom(
                { name: room.name, type: room.type, lengthMm: room.lengthMm, widthMm: room.widthMm, heightMm: room.heightMm },
                input.jurisdiction,
                aiCategories,
              ).catch(() => []);

              const results = [...dimensionResults, ...aiResults];
              const passCount = results.filter((r) => r.status === 'pass').length;
              const failCount = results.filter((r) => r.status === 'fail').length;

              return {
                roomId: room.id,
                roomName: room.name,
                roomType: room.type,
                results,
                passCount,
                failCount,
                warningCount: results.filter((r) => r.status === 'warning').length,
              };
            })
          );
          roomReports.push(...batchResults);
        }

        const totalPass = roomReports.reduce((sum, r) => sum + r.passCount, 0);
        const totalFail = roomReports.reduce((sum, r) => sum + r.failCount, 0);
        const totalWarning = roomReports.reduce((sum, r) => sum + r.warningCount, 0);

        const summary = {
          totalRooms: project.rooms.length,
          totalChecks: totalPass + totalFail + totalWarning,
          pass: totalPass,
          fail: totalFail,
          warning: totalWarning,
          complianceRate: (totalPass + totalFail) > 0
            ? Math.round((totalPass / (totalPass + totalFail)) * 100)
            : 100,
        };

        // Update report with results
        const [updated] = await ctx.db.update(complianceReports)
          .set({
            status: 'completed',
            summary,
            roomResults: roomReports,
            completedAt: new Date(),
          })
          .where(eq(complianceReports.id, report.id))
          .returning();

        return updated;
      } catch (err: any) {
        // Mark report as failed
        const [failed] = await ctx.db.update(complianceReports)
          .set({
            status: 'failed',
            errorMessage: err.message || 'Unknown error during compliance check',
            completedAt: new Date(),
          })
          .where(eq(complianceReports.id, report.id))
          .returning();

        return failed;
      }
    }),

  // Delete a compliance report
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.query.complianceReports.findFirst({
        where: and(eq(complianceReports.id, input.id), eq(complianceReports.userId, ctx.userId)),
      });
      if (!report) throw new Error('Report not found');

      await ctx.db.delete(complianceReports).where(eq(complianceReports.id, input.id));
      return { success: true };
    }),

  // List all available rules
  listRules: protectedProcedure
    .input(z.object({
      jurisdiction: z.string().default('IN'),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let filtered = ALL_RULES.filter(
        (r) => r.jurisdiction.country === input.jurisdiction,
      );
      if (input.category) {
        filtered = filtered.filter((r) => r.category === input.category);
      }
      return filtered;
    }),

  // List available jurisdictions
  listJurisdictions: protectedProcedure
    .query(async () => {
      return JURISDICTIONS;
    }),
});
