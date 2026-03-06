import { z } from 'zod';
import { designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const designVariantRouter = router({
  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      return ctx.db.query.designVariants.findMany({
        where: eq(designVariants.roomId, input.roomId),
        orderBy: (dv, { desc }) => [desc(dv.createdAt)],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: { rooms: { with: { designVariants: true } } },
      });
      if (!project) throw new Error('Project not found');

      return project.rooms.flatMap((room) =>
        room.designVariants.map((variant) => ({
          ...variant,
          roomName: room.name,
          roomId: room.id,
          roomType: room.type,
        })),
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        name: z.string().min(1).max(200),
        style: z.string().min(1),
        budgetTier: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      const [variant] = await ctx.db.insert(designVariants).values(input).returning();
      if (!variant) throw new Error('Failed to create design variant');
      return variant;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        style: z.string().optional(),
        budgetTier: z.string().optional(),
        renderUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, id),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      const [updated] = await ctx.db
        .update(designVariants)
        .set(data)
        .where(eq(designVariants.id, id))
        .returning();
      if (!updated) throw new Error('Failed to update design variant');
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.id),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      await ctx.db.delete(designVariants).where(eq(designVariants.id, input.id));
      return { success: true };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        designVariantId: z.string(),
        style: z.string().min(1),
        budgetTier: z.string().min(1),
        constraints: z.array(z.string()).optional(),
        additionalPrompt: z.string().optional(),
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

      // Update variant with generation parameters
      await ctx.db
        .update(designVariants)
        .set({
          style: input.style,
          budgetTier: input.budgetTier,
          constraints: input.constraints ?? [],
        })
        .where(eq(designVariants.id, input.designVariantId));

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'design_generation',
          status: 'pending',
          inputJson: {
            designVariantId: input.designVariantId,
            style: input.style,
            budgetTier: input.budgetTier,
            constraints: input.constraints,
            additionalPrompt: input.additionalPrompt,
          },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Update variant with job reference
      await ctx.db
        .update(designVariants)
        .set({ jobId: job.id })
        .where(eq(designVariants.id, input.designVariantId));

      // Run design generation in background — return job immediately
      const db = ctx.db;
      const designVariantId = input.designVariantId;
      const genVariant = variant;
      const genInput = input;

      void (async () => {
        try {
          await db
            .update(jobs)
            .set({ status: 'running', startedAt: new Date(), progress: 10 })
            .where(eq(jobs.id, job.id));

          const lengthMm = genVariant.room.lengthMm ?? 4000;
          const widthMm = genVariant.room.widthMm ?? 3500;
          const heightMm = genVariant.room.heightMm ?? 2700;
          const lengthM = lengthMm / 1000;
          const widthM = widthMm / 1000;
          const areaSqm = Math.round(lengthM * widthM * 100) / 100;
          const constraints = genInput.constraints ?? [];

          const prompt = `Generate an interior design spec for a ${genVariant.room.type.replace(/_/g, ' ')} room.

Room: ${lengthM}m x ${widthM}m x ${heightMm / 1000}m (${areaSqm}sqm), Style: ${genInput.style}, Budget: ${genInput.budgetTier}
${constraints.length ? `Constraints: ${constraints.join('; ')}` : ''}
${genInput.additionalPrompt ? `Notes: ${genInput.additionalPrompt}` : ''}

Return compact JSON: {"roomType":"...","dimensions":{"lengthMm":${lengthMm},"widthMm":${widthMm},"heightMm":${heightMm},"areaSqm":${areaSqm}},"style":"${genInput.style}","budgetTier":"${genInput.budgetTier}","designConcept":"2-3 sentences","furniture":[{"name":"...","material":"...","dimensions":"WxDxH mm","position":"...","estimatedCost":0,"notes":"..."}],"colorPalette":[{"hex":"#HEX","name":"...","usage":"..."}],"materialSuggestions":[{"name":"...","application":"...","specification":"..."}],"layoutDescription":"...","lightingPlan":"...","flooringRecommendation":{"type":"...","specification":"...","pattern":"..."},"wallTreatment":"...","constraints":${JSON.stringify(constraints.length ? constraints : ['None specified'])},"estimatedTotalCost":{"min":0,"max":0,"currency":"USD"}}

Include 5-8 furniture items, 5-6 colors, 4-6 materials. Realistic costs.`;

          await db
            .update(jobs)
            .set({ progress: 30 })
            .where(eq(jobs.id, job.id));

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert interior designer. Output only valid compact JSON. Keep descriptions concise.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 16384,
            response_format: { type: 'json_object' },
          });

          await db
            .update(jobs)
            .set({ progress: 70 })
            .where(eq(jobs.id, job.id));

          const finishReason = completion.choices[0]?.finish_reason;
          const responseText = completion.choices[0]?.message?.content ?? '';
          console.log('[Design] OpenAI response length:', responseText.length, 'finish_reason:', finishReason);

          if (finishReason === 'length') {
            throw new Error('Design response was truncated by token limit');
          }

          if (!responseText.trim()) {
            throw new Error(`OpenAI returned empty response (finish_reason: ${finishReason})`);
          }

          let spec: Record<string, unknown>;
          try {
            spec = JSON.parse(responseText);
          } catch {
            const cleaned = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              spec = JSON.parse(jsonMatch[0]);
            } else {
              console.error('[Design] Failed to parse response:', responseText.slice(0, 500));
              throw new Error('Failed to parse AI response as JSON');
            }
          }

          await db
            .update(designVariants)
            .set({ specJson: spec, promptUsed: prompt })
            .where(eq(designVariants.id, designVariantId));

          await db
            .update(jobs)
            .set({
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              outputJson: {
                designVariantId,
                furnitureCount: Array.isArray(spec.furniture) ? spec.furniture.length : 0,
                colorCount: Array.isArray(spec.colorPalette) ? spec.colorPalette.length : 0,
                areaSqm,
                model: 'gpt-4o-mini',
              },
            })
            .where(eq(jobs.id, job.id));

          console.log('[Design] Generation completed successfully');
        } catch (error) {
          console.error('[Design Generation Error]', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during design generation';
          await db
            .update(jobs)
            .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
            .where(eq(jobs.id, job.id));
        }
      })();

      return job;
    }),
});
