import { z } from 'zod';
import { projects, rooms, complianceChatMessages, eq, and, asc } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

/* ─── AI helper ──────────────────────────────────────────────── */

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

const SYSTEM_PROMPT = `You are an expert Building Code Compliance Assistant with deep knowledge of:
- IRC 2021 (International Residential Code)
- IBC 2021 (International Building Code)
- NBC 2016 (National Building Code of India)
- Eurocode (EN) standards
- UK Building Regulations (Approved Documents A-S)
- NEC/NFPA 70 (National Electrical Code)
- IPC (International Plumbing Code)
- IMC (International Mechanical Code)
- NFPA 101 (Life Safety Code)
- ADA Standards for Accessible Design
- Fair Housing Act design requirements
- IECC (International Energy Conservation Code)

You help architects, designers, and builders understand and apply building codes to their projects.

When answering:
1. Be specific — cite actual code sections, not vague references.
2. If the user provides project/room context, tailor your answer to their specific situation.
3. Distinguish between prescriptive requirements (must do) and performance alternatives (may do).
4. Flag when requirements vary by jurisdiction or when local amendments commonly apply.
5. When a question is ambiguous, state your assumptions.

IMPORTANT: Always respond with valid JSON in this exact format:
{
  "answer": "<your detailed answer as a single string, use \\n for line breaks>",
  "citations": [
    {
      "code": "<code name, e.g. IRC 2021>",
      "section": "<section reference, e.g. Section R310.1>",
      "text": "<brief summary of what this section requires>"
    }
  ]
}

Provide 1-5 relevant citations for each answer. The citations should reference real, specific code sections that support your answer.`;

/* ─── Router ─────────────────────────────────────────────────── */

export const complianceChatRouter = router({
  listMessages: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project access
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.complianceChatMessages.findMany({
        where: and(
          eq(complianceChatMessages.projectId, input.projectId),
          eq(complianceChatMessages.userId, ctx.userId),
        ),
        orderBy: [asc(complianceChatMessages.createdAt)],
      });
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      message: z.string().min(1).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project access and get room context
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { rooms: true },
      });
      if (!project) throw new Error('Project not found');

      // Save user message
      const [userMsg] = await ctx.db.insert(complianceChatMessages).values({
        projectId: input.projectId,
        userId: ctx.userId,
        role: 'user',
        content: input.message,
      }).returning();

      // Load conversation history (last 20 messages for context)
      const history = await ctx.db.query.complianceChatMessages.findMany({
        where: and(
          eq(complianceChatMessages.projectId, input.projectId),
          eq(complianceChatMessages.userId, ctx.userId),
        ),
        orderBy: [asc(complianceChatMessages.createdAt)],
      });

      // Take last 20 messages (excluding the one we just inserted, which is at the end)
      const recentHistory = history.slice(-21, -1);

      // Build project context
      let projectContext = `\nProject: "${project.name}"`;
      if (project.rooms.length > 0) {
        projectContext += `\nRooms in this project:`;
        for (const room of project.rooms) {
          const lengthM = room.lengthMm ? (room.lengthMm / 1000).toFixed(2) : '?';
          const widthM = room.widthMm ? (room.widthMm / 1000).toFixed(2) : '?';
          const heightM = room.heightMm ? (room.heightMm / 1000).toFixed(2) : '2.70';
          const areaSqm = (room.lengthMm && room.widthMm)
            ? ((room.lengthMm * room.widthMm) / 1_000_000).toFixed(2)
            : '?';
          projectContext += `\n- ${room.name} (${room.type}): ${lengthM}m x ${widthM}m x ${heightM}m, area: ${areaSqm} sq.m`;
        }
      }

      // Build messages array for OpenAI
      const aiMessages: { role: string; content: string }[] = [
        { role: 'system', content: SYSTEM_PROMPT + projectContext },
      ];

      for (const msg of recentHistory) {
        aiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.role === 'assistant' && msg.citations
            ? JSON.stringify({ answer: msg.content, citations: msg.citations })
            : msg.content,
        });
      }

      aiMessages.push({ role: 'user', content: input.message });

      // Call AI
      const raw = await callOpenAI(aiMessages);
      let answer = '';
      let citations: { code: string; section: string; text: string }[] = [];

      try {
        const parsed = JSON.parse(raw);
        answer = parsed.answer || raw;
        citations = Array.isArray(parsed.citations) ? parsed.citations : [];
      } catch {
        answer = raw;
      }

      // Save assistant message
      const [assistantMsg] = await ctx.db.insert(complianceChatMessages).values({
        projectId: input.projectId,
        userId: ctx.userId,
        role: 'assistant',
        content: answer,
        citations,
      }).returning();

      return { userMessage: userMsg, assistantMessage: assistantMsg };
    }),

  clearHistory: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      await ctx.db.delete(complianceChatMessages).where(
        and(
          eq(complianceChatMessages.projectId, input.projectId),
          eq(complianceChatMessages.userId, ctx.userId),
        ),
      );

      return { success: true };
    }),
});
