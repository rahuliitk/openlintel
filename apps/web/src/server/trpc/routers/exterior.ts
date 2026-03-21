import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  exteriorDesigns, projects, jobs, uploads, eq, and,
} from '@openlintel/db';
import { saveFile, generateStorageKey } from '@/lib/storage';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildExteriorPrompt(design: {
  elevationType: string | null;
  roofStyle: string | null;
  facadeMaterial: string | null;
  description: string | null;
  landscapeNotes: string | null;
}): string {
  const elevation = (design.elevationType ?? 'front').replace(/_/g, ' ');
  const roof = (design.roofStyle ?? 'gable').replace(/_/g, ' ');
  const material = (design.facadeMaterial ?? 'brick').replace(/_/g, ' ');

  return `Create a photorealistic architectural exterior render of a residential home, viewed from the ${elevation} elevation.

ARCHITECTURAL SPECIFICATIONS:
- Roof style: ${roof} roof with realistic shingles, flashing, and gutter details
- Primary facade material: ${material} with authentic texture, weathering, and joint patterns
- Windows: energy-efficient double-pane windows with visible frames, mullions, and subtle reflections of the sky and surroundings
- Front door: high-quality entry door with hardware details appropriate to the architectural style

PHOTOREALISM REQUIREMENTS:
- Shot as if captured by a professional architectural photographer using a full-frame DSLR with a 24mm tilt-shift lens
- Golden hour lighting with warm, directional sunlight casting long, natural shadows across the facade
- Physically accurate materials: light falloff on surfaces, subsurface scattering on translucent materials, correct specular highlights on glass and metal
- Atmospheric depth: subtle haze in the distance, realistic sky with soft clouds
- Ground-level perspective at eye height (~5.5 ft), slightly off-center for a dynamic composition

LANDSCAPE & SURROUNDINGS:
- Professionally landscaped front yard with manicured lawn, defined garden beds with seasonal plantings, mature shade trees, and ornamental shrubs
- Paved driveway and walkway with realistic material (concrete, pavers, or flagstone) including subtle cracks and weathering
- Exterior lighting fixtures (wall sconces, path lights) that appear functional
${design.landscapeNotes ? `- Additional landscape details: ${design.landscapeNotes}` : ''}

${design.description ? `ADDITIONAL DESIGN NOTES: ${design.description}` : ''}

STYLE: Ultra-photorealistic architectural visualization, indistinguishable from a real photograph. NO cartoon, illustration, sketch, or CGI look. The image should look like it belongs in Architectural Digest or Dwell magazine.`;
}

export const exteriorRouter = router({
  // ── List exterior designs for a project ───────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.exteriorDesigns.findMany({
        where: eq(exteriorDesigns.projectId, input.projectId),
        orderBy: (e, { desc }) => [desc(e.createdAt)],
      });
    }),

  // ── Create an exterior design ─────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      elevationType: z.string().min(1),
      roofStyle: z.string().optional(),
      facadeMaterial: z.string().optional(),
      description: z.string().optional(),
      landscapeNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [design] = await ctx.db.insert(exteriorDesigns).values({
        projectId: input.projectId,
        designType: input.elevationType,
        elevationType: input.elevationType,
        roofStyle: input.roofStyle ?? null,
        facadeMaterial: input.facadeMaterial ?? null,
        description: input.description ?? null,
        landscapeNotes: input.landscapeNotes ?? null,
        status: 'draft',
      }).returning();
      return design;
    }),

  // ── Generate an exterior render for an existing design ────
  generate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.exteriorDesigns.findFirst({
        where: eq(exteriorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Exterior design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Create a job for the generation task
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'exterior_generation',
        status: 'pending',
        inputJson: {
          designId: design.id,
          projectId: design.projectId,
          elevationType: design.elevationType,
          roofStyle: design.roofStyle,
          facadeMaterial: design.facadeMaterial,
          description: design.description,
          landscapeNotes: design.landscapeNotes,
        },
        projectId: design.projectId,
      }).returning();
      if (!job) throw new Error('Failed to create job');

      // Update design status and link to job
      const [updated] = await ctx.db.update(exteriorDesigns).set({
        status: 'generating',
        jobId: job.id,
      }).where(eq(exteriorDesigns.id, input.id)).returning();

      await ctx.db.update(jobs).set({
        status: 'running',
        startedAt: new Date(),
        progress: 10,
      }).where(eq(jobs.id, job.id));

      // Generate image with OpenAI in the background
      (async () => {
        try {
          const prompt = buildExteriorPrompt(design);

          await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

          const result = await openai.images.generate({
            model: 'gpt-image-1',
            prompt,
            size: '1536x1024',
            quality: 'high',
            n: 1,
          });

          const imageData = result.data?.[0];
          if (!imageData?.b64_json) throw new Error('No image data returned from OpenAI');

          await ctx.db.update(jobs).set({ progress: 70 }).where(eq(jobs.id, job.id));

          // Save generated image to storage
          const imgBuffer = Buffer.from(imageData.b64_json, 'base64');
          const storageKey = generateStorageKey(`exterior_${design.elevationType}.png`);
          await saveFile(imgBuffer, storageKey, 'image/png');

          // Create upload record
          const [savedUpload] = await ctx.db.insert(uploads).values({
            userId: ctx.userId,
            projectId: design.projectId,
            filename: `exterior_${design.elevationType}_render.png`,
            mimeType: 'image/png',
            sizeBytes: imgBuffer.length,
            storageKey,
            category: 'render',
          }).returning();

          const renderUrl = `/api/uploads/${encodeURIComponent(storageKey)}`;

          // Update design with the real render URL
          await ctx.db.update(exteriorDesigns).set({
            status: 'completed',
            renderUrl,
          }).where(eq(exteriorDesigns.id, input.id));

          await ctx.db.update(jobs).set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              renderUrl,
              uploadId: savedUpload?.id,
              storageKey,
            },
          }).where(eq(jobs.id, job.id));
        } catch (err) {
          console.error('[Exterior Generation Error]', err);
          const errorMessage = err instanceof Error ? err.message : 'Image generation failed';

          await ctx.db.update(exteriorDesigns).set({
            status: 'draft',
          }).where(eq(exteriorDesigns.id, input.id));

          await ctx.db.update(jobs).set({
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
          }).where(eq(jobs.id, job.id));
        }
      })();

      return { job, design: updated };
    }),

  // ── Update an exterior design ─────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      elevationType: z.string().optional(),
      roofStyle: z.string().optional(),
      facadeMaterial: z.string().optional(),
      description: z.string().optional(),
      landscapeNotes: z.string().optional(),
      status: z.enum(['draft', 'generating', 'completed', 'approved', 'rejected']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.exteriorDesigns.findFirst({
        where: eq(exteriorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Exterior design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...updates } = input;
      const setValues: Record<string, unknown> = {};
      if (updates.elevationType !== undefined) {
        setValues.elevationType = updates.elevationType;
        setValues.designType = updates.elevationType;
      }
      if (updates.roofStyle !== undefined) setValues.roofStyle = updates.roofStyle;
      if (updates.facadeMaterial !== undefined) setValues.facadeMaterial = updates.facadeMaterial;
      if (updates.description !== undefined) setValues.description = updates.description;
      if (updates.landscapeNotes !== undefined) setValues.landscapeNotes = updates.landscapeNotes;
      if (updates.status !== undefined) setValues.status = updates.status;

      const [updated] = await ctx.db.update(exteriorDesigns)
        .set(setValues)
        .where(eq(exteriorDesigns.id, id))
        .returning();
      return updated;
    }),

  // ── Get exterior design by id ─────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const design = await ctx.db.query.exteriorDesigns.findFirst({
        where: eq(exteriorDesigns.id, input.id),
        with: { project: true, job: true },
      });
      if (!design) throw new Error('Exterior design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return design;
    }),

  // ── Delete an exterior design ─────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const design = await ctx.db.query.exteriorDesigns.findFirst({
        where: eq(exteriorDesigns.id, input.id),
        with: { project: true },
      });
      if (!design) throw new Error('Exterior design not found');
      if ((design.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(exteriorDesigns).where(eq(exteriorDesigns.id, input.id));
      return { success: true };
    }),
});
