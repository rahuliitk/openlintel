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
          status: 'pending',
          inputJson: { designVariantId: input.designVariantId },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const lengthMm = variant.room.lengthMm ?? 4000;
        const widthMm = variant.room.widthMm ?? 3500;
        const heightMm = variant.room.heightMm ?? 2700;
        const areaSqm = Math.round((lengthMm * widthMm) / 1e6 * 100) / 100;
        const perimeterM = Math.round(2 * (lengthMm + widthMm) / 1000 * 100) / 100;
        const wallAreaSqm = Math.round(perimeterM * (heightMm / 1000) * 100) / 100;

        const specContext = variant.specJson
          ? `\nDesign Specification:\n${JSON.stringify(variant.specJson, null, 2)}`
          : '';

        const prompt = `You are an expert quantity surveyor and interior cost estimator. Generate a detailed Bill of Materials (BOM) for a ${variant.room.type.replace(/_/g, ' ')} room.

Room Details:
- Dimensions: ${lengthMm / 1000}m x ${widthMm / 1000}m x ${heightMm / 1000}m (${areaSqm} sqm)
- Perimeter: ${perimeterM}m
- Wall Area: ~${wallAreaSqm} sqm
- Design Style: ${variant.style}
- Budget Tier: ${variant.budgetTier}
${specContext}

Respond ONLY with a valid JSON object (no markdown, no code fences, no explanation) with this structure:
{
  "items": [
    {
      "name": "Item Name",
      "category": "Flooring",
      "specification": "Detailed specification",
      "quantity": 10,
      "unit": "sqm",
      "unitPrice": 35.00,
      "wasteFactor": 0.08,
      "total": 378.00
    }
  ],
  "totalCost": 5000.00,
  "currency": "USD"
}

Categories: Flooring, Paint & Finishes, Furniture, Fixtures, Hardware, Electrical, Plumbing.
Calculate quantities from room dimensions. Apply waste factors (5-10% tiles, 10% paint, 8% plywood).
Make prices realistic for ${variant.budgetTier} budget tier. Total = quantity * unitPrice * (1 + wasteFactor).
Include 12-20 items.`;

        await ctx.db
          .update(jobs)
          .set({ progress: 30 })
          .where(eq(jobs.id, job.id));

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 3000,
        });

        await ctx.db
          .update(jobs)
          .set({ progress: 70 })
          .where(eq(jobs.id, job.id));

        const responseText = completion.choices[0]?.message?.content ?? '';
        const cleanedText = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

        let bomData: { items: Array<{ name: string; category: string; specification: string; quantity: number; unit: string; unitPrice: number; wasteFactor: number; total: number }>; totalCost: number; currency: string; summary?: Record<string, number> };
        try {
          bomData = JSON.parse(cleanedText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            bomData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse AI BOM response as JSON');
          }
        }

        // Recalculate totals and assign unique IDs
        const items = bomData.items.map((item) => ({
          id: crypto.randomUUID(),
          ...item,
          total: Math.round(item.quantity * item.unitPrice * (1 + (item.wasteFactor || 0)) * 100) / 100,
        }));
        const totalCost = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

        await ctx.db.insert(bomResults).values({
          designVariantId: input.designVariantId,
          jobId: job.id,
          items,
          totalCost,
          currency: bomData.currency || 'USD',
          metadata: {
            roomType: variant.room.type,
            style: variant.style,
            budgetTier: variant.budgetTier,
            areaSqm,
            itemCount: items.length,
            summary: bomData.summary,
            model: 'gpt-4o-mini',
            generatedAt: new Date().toISOString(),
          },
        });

        // Mark job as completed
        await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: { designVariantId: input.designVariantId, totalCost, itemCount: items.length, currency: bomData.currency || 'USD' },
          })
          .where(eq(jobs.id, job.id));
      } catch (error) {
        console.error('[BOM Generation Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during BOM generation';
        await ctx.db
          .update(jobs)
          .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
          .where(eq(jobs.id, job.id));
      }

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
