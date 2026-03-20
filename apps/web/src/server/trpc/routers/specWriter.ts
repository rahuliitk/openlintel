import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  specSections, projects, rooms, eq, and,
} from '@openlintel/db';

/* ─── AI-powered specification writing ──────────────────────────── */

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
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

const SPEC_SYSTEM_PROMPT = `You are a senior construction specification writer with 20+ years of experience writing CSI MasterFormat specifications. You follow the Construction Specifications Institute (CSI) MasterFormat 2018, SectionFormat, and PageFormat standards.

You produce professional 3-part specifications (PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION) that are:
- Written in imperative mood specification language
- Organized per CSI SectionFormat with numbered articles and paragraphs
- Reference applicable ASTM, ANSI, UL, ACI, AISC, and other standards
- Include quality assurance, submittals, delivery/storage, and warranty requirements
- Specify products by performance criteria or acceptable manufacturers
- Include proper execution details: examination, preparation, installation, field quality control
- Use correct CSI terminology and formatting conventions

Always respond with valid JSON.`;

async function aiGenerateSections(projectInfo: {
  projectName: string;
  rooms: { name: string; type: string }[];
}): Promise<Array<{
  sectionNumber: string;
  title: string;
  division: string;
  content: string;
}>> {
  const roomList = projectInfo.rooms.length > 0
    ? projectInfo.rooms.map((r) => `- ${r.name} (${r.type})`).join('\n')
    : '- General residential spaces';

  const userPrompt = `Generate a comprehensive set of CSI MasterFormat specification sections for a residential construction project.

Project: ${projectInfo.projectName}
Rooms/Spaces:
${roomList}

Generate 8-12 relevant specification sections covering the key divisions for this residential project. For each section, write professional 3-part specification content.

Respond with this exact JSON structure:
{
  "sections": [
    {
      "sectionNumber": "<CSI section number, e.g. '03 30 00'>",
      "title": "<section title, e.g. 'Cast-in-Place Concrete'>",
      "division": "<2-digit division number, e.g. '03'>",
      "content": "<full 3-part specification content with PART 1 - GENERAL, PART 2 - PRODUCTS, PART 3 - EXECUTION>"
    }
  ]
}

Important:
- Use proper CSI section numbering (XX XX XX format)
- Division number must match the first two digits of sectionNumber
- Write realistic, detailed specification content — not placeholder text
- Reference real ASTM/ANSI standards
- Include submittal requirements, quality assurance, and warranty clauses
- Cover divisions appropriate for residential: concrete (03), masonry (04), metals (05), wood (06), thermal/moisture (07), openings (08), finishes (09), specialties (10), plumbing (22), HVAC (23), electrical (26)`;

  const content = await callOpenAI(SPEC_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);
  return parsed.sections ?? [];
}

async function aiGenerateContent(section: {
  sectionNumber: string;
  title: string;
  division: string;
}): Promise<string> {
  const divisionNames: Record<string, string> = {
    '01': 'General Requirements', '02': 'Existing Conditions', '03': 'Concrete',
    '04': 'Masonry', '05': 'Metals', '06': 'Wood, Plastics, Composites',
    '07': 'Thermal & Moisture Protection', '08': 'Openings', '09': 'Finishes',
    '10': 'Specialties', '11': 'Equipment', '12': 'Furnishings',
    '21': 'Fire Suppression', '22': 'Plumbing', '23': 'HVAC',
    '26': 'Electrical', '31': 'Earthwork', '32': 'Exterior Improvements', '33': 'Utilities',
  };

  const divName = divisionNames[section.division] ?? 'General';

  const userPrompt = `Write a complete CSI 3-part specification for:

Section: ${section.sectionNumber} - ${section.title}
Division: ${section.division} - ${divName}

Write a professional, detailed specification following CSI SectionFormat. Include all standard articles for each part.

Respond with this JSON structure:
{
  "content": "<the complete specification text with PART 1, PART 2, PART 3>"
}

The content should be plain text with proper indentation. Use standard CSI numbering:
PART 1 - GENERAL
1.1 SUMMARY
  A. Section includes...
1.2 REFERENCES
  A. ASTM ...
1.3 SUBMITTALS
1.4 QUALITY ASSURANCE
1.5 DELIVERY, STORAGE, AND HANDLING
1.6 WARRANTY

PART 2 - PRODUCTS
2.1 MATERIALS / MANUFACTURERS
2.2 ...

PART 3 - EXECUTION
3.1 EXAMINATION
3.2 PREPARATION
3.3 INSTALLATION
3.4 FIELD QUALITY CONTROL
3.5 CLEANING`;

  const content = await callOpenAI(SPEC_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(content);
  return parsed.content ?? '';
}

export const specWriterRouter = router({
  // ── List spec sections for a project ──────────────────────────
  listSections: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.specSections.findMany({
        where: eq(specSections.projectId, input.projectId),
        orderBy: (s, { asc }) => [asc(s.division), asc(s.sectionNumber)],
      });
    }),

  // ── Create a spec section ─────────────────────────────────────
  createSection: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sectionNumber: z.string().min(1),
      title: z.string().min(1),
      division: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // If no content provided, generate it with AI
      let content = input.content ?? null;
      if (!content) {
        content = await aiGenerateContent({
          sectionNumber: input.sectionNumber,
          title: input.title,
          division: input.division,
        });
      }

      const [section] = await ctx.db.insert(specSections).values({
        projectId: input.projectId,
        sectionNumber: input.sectionNumber,
        title: input.title,
        division: input.division,
        content,
        status: content ? 'generated' : 'draft',
      }).returning();
      return section;
    }),

  // ── AI-generate full spec set for project ─────────────────────
  generateWithAI: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Get project rooms for context
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });

      const sections = await aiGenerateSections({
        projectName: project.name,
        rooms: projectRooms.map((r) => ({ name: r.name, type: r.type })),
      });

      const created = [];
      for (const sec of sections) {
        const [row] = await ctx.db.insert(specSections).values({
          projectId: input.projectId,
          sectionNumber: sec.sectionNumber,
          title: sec.title,
          division: sec.division,
          content: sec.content,
          status: 'generated',
        }).returning();
        created.push(row);
      }

      return { generated: created.length };
    }),

  // ── Delete a spec section ─────────────────────────────────────
  deleteSection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.query.specSections.findFirst({
        where: eq(specSections.id, input.id),
        with: { project: true },
      });
      if (!section) throw new Error('Section not found');
      if ((section.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(specSections).where(eq(specSections.id, input.id));
      return { success: true };
    }),
});
