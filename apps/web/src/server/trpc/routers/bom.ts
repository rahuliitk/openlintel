import { z } from 'zod';
import { bomResults, designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const bomRouter = router({
  listByDesignVariant: protectedProcedure
    .input(z.object({ designVariantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      return ctx.db.query.bomResults.findMany({
        where: eq(bomResults.designVariantId, input.designVariantId),
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { bomResults: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      const results = project.rooms.flatMap((room) =>
        room.designVariants.flatMap((variant) =>
          variant.bomResults.map((bom) => ({
            ...bom,
            variantName: variant.name,
            roomName: room.name,
          })),
        ),
      );
      // Sort by createdAt descending so most recent is first
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  generate: protectedProcedure
    .input(z.object({ designVariantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'bom_calculation',
          status: 'running',
          inputJson: { designVariantId: input.designVariantId },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
          startedAt: new Date(),
          progress: 10,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Run BOM generation in background — return job immediately
      const db = ctx.db;
      const designVariantId = input.designVariantId;
      const bomVariant = variant;

      void (async () => {
        try {
          const lengthMm = bomVariant.room.lengthMm ?? 4000;
          const widthMm = bomVariant.room.widthMm ?? 3500;
          const heightMm = bomVariant.room.heightMm ?? 2700;
          const areaSqm = Math.round((lengthMm * widthMm) / 1e6 * 100) / 100;
          const perimeterM = Math.round(2 * (lengthMm + widthMm) / 1000 * 100) / 100;
          const wallAreaSqm = Math.round(perimeterM * (heightMm / 1000) * 100) / 100;

          const specSummary = bomVariant.specJson
            ? `\nDesign spec: ${JSON.stringify(bomVariant.specJson).slice(0, 500)}`
            : '';

          const prompt = `You are a quantity surveyor. Generate a BOM for a ${bomVariant.room.type.replace(/_/g, ' ')} room.

Room: ${lengthMm / 1000}m x ${widthMm / 1000}m x ${heightMm / 1000}m (${areaSqm}sqm), wall area ~${wallAreaSqm}sqm
Style: ${bomVariant.style}, Budget: ${bomVariant.budgetTier}${specSummary}

Return compact JSON (no extra whitespace): {"items":[{"name":"...","category":"...","specification":"...","quantity":0,"unit":"...","unitPrice":0,"wasteFactor":0.08,"total":0}],"totalCost":0,"currency":"USD"}

Categories: Flooring, Paint & Finishes, Furniture, Fixtures, Hardware, Electrical, Plumbing.
Calculate quantities from dimensions. Waste factors: 5-10% tiles, 10% paint, 8% plywood.
Realistic prices for ${bomVariant.budgetTier} tier. total = quantity * unitPrice * (1 + wasteFactor).
Keep specification field short (under 40 chars). Include 10-15 items.`;

          await db
            .update(jobs)
            .set({ progress: 30 })
            .where(eq(jobs.id, job.id));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a quantity surveyor. Output only valid compact JSON with no extra whitespace or newlines. Keep specification fields under 30 characters.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 16384,
            response_format: { type: 'json_object' },
          });

          await db
            .update(jobs)
            .set({ progress: 70 })
            .where(eq(jobs.id, job.id));

          const finishReason = completion.choices[0]?.finish_reason;
          const responseText = completion.choices[0]?.message?.content ?? '';
          console.log('[BOM] OpenAI response length:', responseText.length, 'finish_reason:', finishReason);

          if (finishReason === 'length') {
            throw new Error('BOM response was truncated by token limit');
          }

          if (!responseText.trim()) {
            throw new Error(`OpenAI returned empty response (finish_reason: ${finishReason})`);
          }

          let bomData: { items: Array<{ name: string; category: string; specification: string; quantity: number; unit: string; unitPrice: number; wasteFactor: number; total: number }>; totalCost: number; currency: string; summary?: Record<string, number> };
          try {
            bomData = JSON.parse(responseText);
          } catch {
            const cleaned = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              bomData = JSON.parse(jsonMatch[0]);
            } else {
              console.error('[BOM] Failed to parse response:', responseText.slice(0, 500));
              throw new Error('Failed to parse AI BOM response as JSON');
            }
          }

          const items = bomData.items.map((item) => ({
            id: crypto.randomUUID(),
            ...item,
            total: Math.round(item.quantity * item.unitPrice * (1 + (item.wasteFactor || 0)) * 100) / 100,
          }));
          const totalCost = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

          await db.insert(bomResults).values({
            designVariantId,
            jobId: job.id,
            items,
            totalCost,
            currency: bomData.currency || 'USD',
            metadata: {
              roomType: bomVariant.room.type,
              style: bomVariant.style,
              budgetTier: bomVariant.budgetTier,
              areaSqm,
              itemCount: items.length,
              summary: bomData.summary,
              model: 'gpt-4o-mini',
              generatedAt: new Date().toISOString(),
            },
          });

          await db
            .update(jobs)
            .set({
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputJson: { designVariantId, totalCost, itemCount: items.length, currency: bomData.currency || 'USD' },
            })
            .where(eq(jobs.id, job.id));

          console.log('[BOM] Generation completed successfully, totalCost:', totalCost);
        } catch (error) {
          console.error('[BOM Generation Error]', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during BOM generation';
          await db
            .update(jobs)
            .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
            .where(eq(jobs.id, job.id));
        }
      })();

      return job;
    }),

  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),

  delete: protectedProcedure
    .input(z.object({ bomResultId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bom = await ctx.db.query.bomResults.findFirst({
        where: eq(bomResults.id, input.bomResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!bom || (bom.designVariant as any).room.project.userId !== ctx.userId) {
        throw new Error('BOM result not found');
      }
      await ctx.db.delete(bomResults).where(eq(bomResults.id, input.bomResultId));
      return { success: true };
    }),

  exportUrl: protectedProcedure
    .input(z.object({ bomResultId: z.string(), format: z.enum(['xlsx', 'pdf']) }))
    .query(async ({ ctx, input }) => {
      const bom = await ctx.db.query.bomResults.findFirst({
        where: eq(bomResults.id, input.bomResultId),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!bom || (bom.designVariant as any).room.project.userId !== ctx.userId) {
        throw new Error('BOM result not found');
      }
      return { url: `/api/bom/export/${input.bomResultId}?format=${input.format}` };
    }),
});
