import { z } from 'zod';
import { drawingResults, designVariants, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import OpenAI from 'openai';
import { generateSvg } from '@/lib/svg-generator';
import { generateStorageKey, saveFile } from '@/lib/storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const drawingRouter = router({
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

      return ctx.db.query.drawingResults.findMany({
        where: eq(drawingResults.designVariantId, input.designVariantId),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
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
                with: { drawingResults: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      return project.rooms.flatMap((room) =>
        room.designVariants.flatMap((variant) =>
          variant.drawingResults.map((drawing) => ({
            ...drawing,
            variantName: variant.name,
            roomName: room.name,
          })),
        ),
      );
    }),

  generate: protectedProcedure
    .input(
      z.object({
        designVariantId: z.string(),
        drawingTypes: z.array(z.string()).default([
          'floor_plan', 'furnished_plan', 'elevation', 'electrical_layout',
        ]),
      }),
    )
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
          type: 'drawing_generation',
          status: 'pending',
          inputJson: {
            designVariantId: input.designVariantId,
            drawingTypes: input.drawingTypes,
          },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 5 })
        .where(eq(jobs.id, job.id));

      try {
        const lengthMm = variant.room.lengthMm ?? 4000;
        const widthMm = variant.room.widthMm ?? 3500;
        const heightMm = variant.room.heightMm ?? 2700;
        const areaSqm = Math.round((lengthMm * widthMm) / 1e6 * 100) / 100;

        const specContext = variant.specJson
          ? `\nDesign Specification:\n${JSON.stringify(variant.specJson, null, 2)}`
          : '';

        const prompt = `You are an expert architectural drafter. Generate detailed drawing specifications for a ${variant.room.type.replace(/_/g, ' ')} room.

Room Details:
- Dimensions: ${lengthMm / 1000}m x ${widthMm / 1000}m x ${heightMm / 1000}m (${areaSqm} sqm)
- Design Style: ${variant.style}
- Budget Tier: ${variant.budgetTier}
${specContext}

Generate specifications for these drawing types: ${input.drawingTypes.join(', ')}

Respond ONLY with a valid JSON object (no markdown, no code fences, no explanation) with this structure:
{
  "drawings": [
    {
      "drawingType": "floor_plan",
      "drawingNumber": "DWG-001",
      "scale": "1:50",
      "paperSize": "A2",
      "title": "Floor Plan - Room Name",
      "description": "Detailed description of what this drawing shows",
      "keyElements": ["Walls", "Doors", "Windows"],
      "notes": ["Important construction notes"],
      "layers": ["Walls", "Doors", "Windows", "Dimensions"],
      "revision": "R0"
    }
  ]
}

For each drawing type provide appropriate scale (1:50 for plans, 1:25 for elevations/sections), paper size, detailed description, key elements, and construction notes.`;

        await ctx.db
          .update(jobs)
          .set({ progress: 20 })
          .where(eq(jobs.id, job.id));

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 3000,
        });

        await ctx.db
          .update(jobs)
          .set({ progress: 50 })
          .where(eq(jobs.id, job.id));

        const responseText = completion.choices[0]?.message?.content ?? '';
        const cleanedText = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

        let drawingData: { drawings: Array<Record<string, unknown>> };
        try {
          drawingData = JSON.parse(cleanedText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            drawingData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse AI drawing response as JSON');
          }
        }

        const drawingRecords = [];
        for (let i = 0; i < drawingData.drawings.length; i++) {
          const drawing = drawingData.drawings[i]!;
          const drawingType = (drawing.drawingType as string) || input.drawingTypes[i] || 'floor_plan';

          const drawingMetadata = {
            ...drawing,
            titleBlock: {
              projectName: variant.room.project.name,
              drawingTitle: (drawing.title as string) || `${drawingType.replace(/_/g, ' ')} - ${variant.name}`,
              drawingNumber: drawing.drawingNumber as string,
              scale: drawing.scale as string,
              roomType: variant.room.type.replace(/_/g, ' '),
              date: new Date().toISOString().split('T')[0],
              revision: (drawing.revision as string) || 'R0',
              drawnBy: 'OpenLintel AI',
              checkedBy: 'Pending review',
            },
            sheets: 1,
            generatedAt: new Date().toISOString(),
            model: 'gpt-4o-mini',
          };

          // Generate actual SVG drawing
          const svgString = generateSvg(
            drawingType,
            {
              lengthMm,
              widthMm,
              heightMm,
              type: variant.room.type,
              name: variant.room.name ?? variant.name,
            },
            variant.specJson as Record<string, unknown> | null,
            {
              scale: drawing.scale as string,
              paperSize: drawing.paperSize as string,
              titleBlock: drawingMetadata.titleBlock,
              drawingNumber: drawing.drawingNumber as string,
              title: drawing.title as string,
              revision: drawing.revision as string,
            },
          );

          const svgBuffer = Buffer.from(svgString, 'utf-8');
          const svgKey = generateStorageKey('drawing.svg');
          await saveFile(svgBuffer, svgKey, 'image/svg+xml');

          const [record] = await ctx.db
            .insert(drawingResults)
            .values({
              designVariantId: input.designVariantId,
              jobId: job.id,
              drawingType,
              metadata: drawingMetadata,
              dxfStorageKey: null,
              pdfStorageKey: null,
              svgStorageKey: svgKey,
              ifcStorageKey: null,
            })
            .returning();
          if (!record) throw new Error('Failed to create drawing record');

          drawingRecords.push(record);

          const progress = Math.round(50 + ((i + 1) / drawingData.drawings.length) * 45);
          await ctx.db
            .update(jobs)
            .set({ progress })
            .where(eq(jobs.id, job.id));
        }

        // Mark job as completed
        await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              designVariantId: input.designVariantId,
              drawingCount: drawingRecords.length,
              drawingTypes: input.drawingTypes,
              drawingIds: drawingRecords.map((r) => r.id),
            },
          })
          .where(eq(jobs.id, job.id));
      } catch (error) {
        console.error('[Drawing Generation Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during drawing generation';
        await ctx.db
          .update(jobs)
          .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
          .where(eq(jobs.id, job.id));
      }

      return job;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const drawing = await ctx.db.query.drawingResults.findFirst({
        where: eq(drawingResults.id, input.id),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!drawing || drawing.designVariant.room.project.userId !== ctx.userId) {
        throw new Error('Drawing not found');
      }
      return drawing;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const drawing = await ctx.db.query.drawingResults.findFirst({
        where: eq(drawingResults.id, input.id),
        with: { designVariant: { with: { room: { with: { project: true } } } } },
      });
      if (!drawing || drawing.designVariant.room.project.userId !== ctx.userId) {
        throw new Error('Drawing not found');
      }

      // Delete stored files
      if (drawing.svgStorageKey) {
        const { deleteFile } = await import('@/lib/storage');
        await deleteFile(drawing.svgStorageKey);
      }

      await ctx.db.delete(drawingResults).where(eq(drawingResults.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { drawingResults: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      const { deleteFile } = await import('@/lib/storage');
      const allDrawings = project.rooms.flatMap(r =>
        r.designVariants.flatMap(v => v.drawingResults),
      );

      for (const drawing of allDrawings) {
        if (drawing.svgStorageKey) await deleteFile(drawing.svgStorageKey);
        await ctx.db.delete(drawingResults).where(eq(drawingResults.id, drawing.id));
      }

      return { success: true, deleted: allDrawings.length };
    }),
});
