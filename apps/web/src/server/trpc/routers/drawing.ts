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
          status: 'running',
          inputJson: {
            designVariantId: input.designVariantId,
            drawingTypes: input.drawingTypes,
          },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
          startedAt: new Date(),
          progress: 5,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Run drawing generation in background — return job immediately
      const db = ctx.db;
      const designVariantId = input.designVariantId;
      const drawingTypes = input.drawingTypes;
      const drawVariant = variant;

      void (async () => {
        try {
          const lengthMm = drawVariant.room.lengthMm ?? 4000;
          const widthMm = drawVariant.room.widthMm ?? 3500;
          const heightMm = drawVariant.room.heightMm ?? 2700;
          const areaSqm = Math.round((lengthMm * widthMm) / 1e6 * 100) / 100;

          const specSummary = drawVariant.specJson
            ? `\nDesign spec: ${JSON.stringify(drawVariant.specJson).slice(0, 500)}`
            : '';

          const prompt = `You are an architectural drafter. Generate drawing specs for a ${drawVariant.room.type.replace(/_/g, ' ')} room.

Room: ${lengthMm / 1000}m x ${widthMm / 1000}m x ${heightMm / 1000}m (${areaSqm}sqm)
Style: ${drawVariant.style}, Budget: ${drawVariant.budgetTier}${specSummary}

Drawing types: ${drawingTypes.join(', ')}

Return compact JSON: {"drawings":[{"drawingType":"floor_plan","drawingNumber":"DWG-001","scale":"1:50","paperSize":"A2","title":"Floor Plan","description":"...","keyElements":["Walls","Doors"],"notes":["..."],"layers":["Walls","Doors"],"revision":"R0"}]}

For each type: appropriate scale (1:50 plans, 1:25 elevations), paper size, short description, key elements, and notes.`;

          await db
            .update(jobs)
            .set({ progress: 20 })
            .where(eq(jobs.id, job.id));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Output only valid compact JSON. Keep descriptions concise.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 16384,
            response_format: { type: 'json_object' },
          });

          await db
            .update(jobs)
            .set({ progress: 50 })
            .where(eq(jobs.id, job.id));

          const finishReason = completion.choices[0]?.finish_reason;
          const responseText = completion.choices[0]?.message?.content ?? '';
          console.log('[Drawing] OpenAI response length:', responseText.length, 'finish_reason:', finishReason);

          if (finishReason === 'length') {
            throw new Error('Drawing response was truncated by token limit');
          }

          if (!responseText.trim()) {
            throw new Error(`OpenAI returned empty response (finish_reason: ${finishReason})`);
          }

          let drawingData: { drawings: Array<Record<string, unknown>> };
          try {
            drawingData = JSON.parse(responseText);
          } catch {
            const cleaned = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              drawingData = JSON.parse(jsonMatch[0]);
            } else {
              console.error('[Drawing] Failed to parse response:', responseText.slice(0, 500));
              throw new Error('Failed to parse AI drawing response as JSON');
            }
          }

          const drawingRecords = [];
          for (let i = 0; i < drawingData.drawings.length; i++) {
            const drawing = drawingData.drawings[i]!;
            const drawingType = (drawing.drawingType as string) || drawingTypes[i] || 'floor_plan';

            const drawingMetadata = {
              ...drawing,
              titleBlock: {
                projectName: drawVariant.room.project.name,
                drawingTitle: (drawing.title as string) || `${drawingType.replace(/_/g, ' ')} - ${drawVariant.name}`,
                drawingNumber: drawing.drawingNumber as string,
                scale: drawing.scale as string,
                roomType: drawVariant.room.type.replace(/_/g, ' '),
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
                type: drawVariant.room.type,
                name: drawVariant.room.name ?? drawVariant.name,
              },
              drawVariant.specJson as Record<string, unknown> | null,
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

            const [record] = await db
              .insert(drawingResults)
              .values({
                designVariantId,
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
            await db
              .update(jobs)
              .set({ progress })
              .where(eq(jobs.id, job.id));
          }

          // Mark job as completed
          await db
            .update(jobs)
            .set({
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputJson: {
                designVariantId,
                drawingCount: drawingRecords.length,
                drawingTypes,
                drawingIds: drawingRecords.map((r) => r.id),
              },
            })
            .where(eq(jobs.id, job.id));

          console.log('[Drawing] Generation completed successfully, count:', drawingRecords.length);
        } catch (error) {
          console.error('[Drawing Generation Error]', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during drawing generation';
          await db
            .update(jobs)
            .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
            .where(eq(jobs.id, job.id));
        }
      })();

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
