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

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const lengthMm = variant.room.lengthMm ?? 4000;
        const widthMm = variant.room.widthMm ?? 3500;
        const heightMm = variant.room.heightMm ?? 2700;
        const lengthM = lengthMm / 1000;
        const widthM = widthMm / 1000;
        const areaSqm = Math.round(lengthM * widthM * 100) / 100;
        const constraints = input.constraints ?? [];

        const prompt = `You are an expert interior designer. Generate a detailed interior design specification for a ${variant.room.type.replace(/_/g, ' ')} room.

Room Details:
- Dimensions: ${lengthM}m x ${widthM}m x ${heightMm / 1000}m (${areaSqm} sqm)
- Design Style: ${input.style}
- Budget Tier: ${input.budgetTier} (${input.budgetTier === 'economy' ? 'budget-friendly materials' : input.budgetTier === 'standard' ? 'mid-range quality materials' : input.budgetTier === 'premium' ? 'high-end materials and finishes' : 'luxury, bespoke materials and designer pieces'})
${constraints.length ? `- Constraints: ${constraints.join('; ')}` : ''}
${input.additionalPrompt ? `- Additional Instructions: ${input.additionalPrompt}` : ''}

Respond ONLY with a valid JSON object (no markdown, no code fences, no explanation) with this structure:
{
  "roomType": "${variant.room.type}",
  "dimensions": { "lengthMm": ${lengthMm}, "widthMm": ${widthMm}, "heightMm": ${heightMm}, "areaSqm": ${areaSqm} },
  "style": "${input.style}",
  "budgetTier": "${input.budgetTier}",
  "designConcept": "A 2-3 sentence description of the overall design concept and mood",
  "furniture": [
    {
      "name": "item name",
      "material": "primary material",
      "dimensions": "WxDxH in mm",
      "position": "where in the room",
      "estimatedCost": 0,
      "notes": "specific details about finish, brand tier, or features"
    }
  ],
  "colorPalette": [
    { "hex": "#HEXCODE", "name": "Color Name", "usage": "where this color is used" }
  ],
  "materialSuggestions": [
    { "name": "Material Name", "application": "where it's used", "specification": "size, finish" }
  ],
  "layoutDescription": "Detailed paragraph describing spatial arrangement and traffic flow",
  "lightingPlan": "Description of lighting layers",
  "flooringRecommendation": { "type": "flooring type", "specification": "details", "pattern": "layout pattern" },
  "wallTreatment": "Description of wall finishes",
  "constraints": ${JSON.stringify(constraints.length ? constraints : ['None specified'])},
  "estimatedTotalCost": { "min": 0, "max": 0, "currency": "USD" },
  "generatedAt": "${new Date().toISOString()}"
}

Include 5-8 furniture items, 5-6 colors, 4-6 material suggestions. Make cost estimates realistic.`;

        await ctx.db
          .update(jobs)
          .set({ progress: 30 })
          .where(eq(jobs.id, job.id));

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 3000,
        });

        await ctx.db
          .update(jobs)
          .set({ progress: 70 })
          .where(eq(jobs.id, job.id));

        const responseText = completion.choices[0]?.message?.content ?? '';
        const cleanedText = responseText.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

        let spec: Record<string, unknown>;
        try {
          spec = JSON.parse(cleanedText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            spec = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse AI response as JSON');
          }
        }

        await ctx.db
          .update(designVariants)
          .set({ specJson: spec, promptUsed: prompt })
          .where(eq(designVariants.id, input.designVariantId));

        await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              designVariantId: input.designVariantId,
              furnitureCount: Array.isArray(spec.furniture) ? spec.furniture.length : 0,
              colorCount: Array.isArray(spec.colorPalette) ? spec.colorPalette.length : 0,
              areaSqm,
              model: 'gpt-4o-mini',
            },
          })
          .where(eq(jobs.id, job.id));
      } catch (error) {
        console.error('[Design Generation Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during design generation';
        await ctx.db
          .update(jobs)
          .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
          .where(eq(jobs.id, job.id));
      }

      return job;
    }),
});
