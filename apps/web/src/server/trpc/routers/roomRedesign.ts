import { z } from 'zod';
import { rooms, uploads, designVariants, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import { getFile, saveFile, generateStorageKey } from '@/lib/storage';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VARIATION_STRATEGIES = [
  {
    label: 'Clean & Minimal',
    focus: 'minimal furniture with clean lines, open space, and uncluttered layout',
  },
  {
    label: 'Rich & Furnished',
    focus: 'richer furniture arrangement with decorative accessories, artwork, and layered textiles',
  },
  {
    label: 'Color Accent',
    focus: 'bold accent colors within the palette, statement furniture pieces, and patterned textiles',
  },
  {
    label: 'Warm Atmosphere',
    focus: 'warm and cozy lighting, soft textures, ambient mood, and inviting atmosphere',
  },
  {
    label: 'Textured & Natural',
    focus: 'varied material textures, natural elements, organic shapes, and tactile surfaces',
  },
];

function buildRedesignPrompt(
  analysis: string,
  preferences: {
    roomType: string;
    designStyle: string;
    colorPalette: string;
    furnitureDensity: string;
    materialPreference: string;
    lightingMood: string;
    budgetLevel: string;
  },
  variationFocus: string,
): string {
  return `Restyle the interior of this room as a professionally designed ${preferences.roomType.replace(/_/g, ' ')}.

ABSOLUTE CONSTRAINTS — STRICTLY FOLLOW:
- DO NOT remove, delete, or hide ANY object, furniture, or item visible in the original photo.
- Keep ALL existing furniture in their exact same positions and placement. Do not move, resize, or relocate any piece.
- Keep ALL existing walls, floor shape, ceiling, and room dimensions exactly as they are.
- Keep ALL existing windows in their exact positions, sizes, and frames.
- Keep ALL existing doors in their exact positions, sizes, and frames.
- Keep the exact same camera angle and perspective as the original photo.
- Preserve any built-in architectural features (columns, alcoves, beams, arches, moldings).
- Preserve the basic layout and spatial arrangement of all objects in the room.

WHAT YOU CAN CHANGE (while keeping everything in place):
- Restyle existing furniture (change material, color, texture — but keep same shape and position).
- Change wall paint, wallpaper, or wall finishes.
- Change flooring finish or add rugs.
- Change or add lighting fixtures and ambient lighting.
- Add small decorative accents (cushions, artwork, plants) WITHOUT removing existing items.
- Change curtains, blinds, or soft furnishings style.

Room Analysis: ${analysis}

Design Direction:
- Style: ${preferences.designStyle}
- Color palette: ${preferences.colorPalette}
- Furniture density: ${preferences.furnitureDensity}
- Materials: ${preferences.materialPreference}
- Lighting: ${preferences.lightingMood}
- Budget feel: ${preferences.budgetLevel}

Variation focus: ${variationFocus}

The result must look like a professional interior design photograph — photorealistic, properly lit, with natural shadows and reflections. Every object from the original photo must still be present in the same position. The room structure and object placement must be identical to the original photo.`;
}

export const roomRedesignRouter = router({
  /** Analyze a room photo using GPT-4o vision */
  analyzeRoom: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      const imageBuffer = await getFile(upload.storageKey);
      if (!imageBuffer) throw new Error('Image file not found in storage');

      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${upload.mimeType};base64,${base64}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this room photo for an interior redesign project. Describe in detail:
1. Room structure: wall positions, floor area shape, ceiling type
2. Windows: number, size, placement
3. Doors: number, placement
4. Existing furniture and their positions
5. Camera angle and perspective
6. Current lighting direction and quality
7. Floor type and wall finishes
8. Room dimensions estimate (small/medium/large)

Be specific and concise. This analysis will guide AI image generation to preserve room structure during redesign.`,
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return {
        analysis: response.choices[0]?.message?.content ?? 'Unable to analyze room',
      };
    }),

  /** Generate multiple redesigned room images */
  generateRedesigns: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        uploadId: z.string(),
        designVariantId: z.string().optional(),
        roomType: z.string(),
        designStyle: z.string(),
        colorPalette: z.string(),
        furnitureDensity: z.string(),
        materialPreference: z.string(),
        lightingMood: z.string(),
        budgetLevel: z.string(),
        numVariations: z.number().min(1).max(5).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify room ownership
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      // Get source image
      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.uploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      const imageBuffer = await getFile(upload.storageKey);
      if (!imageBuffer) throw new Error('Image file not found in storage');

      // Create job record
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'room_redesign',
          status: 'running',
          startedAt: new Date(),
          progress: 5,
          inputJson: {
            uploadId: input.uploadId,
            roomType: input.roomType,
            designStyle: input.designStyle,
            colorPalette: input.colorPalette,
            furnitureDensity: input.furnitureDensity,
            materialPreference: input.materialPreference,
            lightingMood: input.lightingMood,
            budgetLevel: input.budgetLevel,
            numVariations: input.numVariations,
          },
          projectId: room.project.id,
          roomId: input.roomId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      try {
        // Step 1: Analyze room with vision
        await ctx.db.update(jobs).set({ progress: 10 }).where(eq(jobs.id, job.id));

        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:${upload.mimeType};base64,${base64}`;

        const analysisResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Describe this room\'s physical structure concisely: walls, floor, ceiling, windows, doors, camera angle, and dimensions estimate. Focus on geometry that must be preserved during redesign.',
                },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.2,
        });

        const roomAnalysis = analysisResponse.choices[0]?.message?.content ?? '';
        await ctx.db.update(jobs).set({ progress: 20 }).where(eq(jobs.id, job.id));

        // Step 2: Generate redesigned images in parallel
        const strategies = VARIATION_STRATEGIES.slice(0, input.numVariations);
        const imageFile = await toFile(imageBuffer, upload.filename, {
          type: upload.mimeType,
        });

        const preferences = {
          roomType: input.roomType,
          designStyle: input.designStyle,
          colorPalette: input.colorPalette,
          furnitureDensity: input.furnitureDensity,
          materialPreference: input.materialPreference,
          lightingMood: input.lightingMood,
          budgetLevel: input.budgetLevel,
        };

        const generationPromises = strategies.map(async (strategy, index) => {
          const prompt = buildRedesignPrompt(roomAnalysis, preferences, strategy.focus);

          try {
            const result = await openai.images.edit({
              model: 'gpt-image-1',
              image: imageFile,
              prompt,
              size: '1024x1024',
            });

            const imageData = result.data?.[0];
            if (!imageData?.b64_json) throw new Error('No image data returned');

            // Save generated image to storage
            const imgBuffer = Buffer.from(imageData.b64_json, 'base64');
            const storageKey = generateStorageKey(`redesign_${index + 1}.png`);
            await saveFile(imgBuffer, storageKey, 'image/png');

            // Create upload record
            const [savedUpload] = await ctx.db
              .insert(uploads)
              .values({
                userId: ctx.userId,
                projectId: room.project.id,
                roomId: input.roomId,
                filename: `${input.designStyle}_redesign_${index + 1}.png`,
                mimeType: 'image/png',
                sizeBytes: imgBuffer.length,
                storageKey,
                category: 'redesign',
              })
              .returning();

            // Update progress
            const progressPct = 20 + Math.round(((index + 1) / strategies.length) * 70);
            await ctx.db.update(jobs).set({ progress: progressPct }).where(eq(jobs.id, job.id));

            return {
              uploadId: savedUpload!.id,
              storageKey,
              label: strategy.label,
              prompt,
            };
          } catch (err) {
            console.error(`[Redesign] Variation ${index + 1} failed:`, err);
            return null;
          }
        });

        const results = await Promise.all(generationPromises);
        const successfulResults = results.filter(Boolean);

        if (successfulResults.length === 0) {
          throw new Error('All image generation attempts failed');
        }

        // Step 3: Update existing design variant or create new one
        const newRenderUrls = successfulResults.map(
          (r) => `/api/uploads/${encodeURIComponent(r!.storageKey)}`,
        );
        const newMetadata = {
          type: 'room_redesign',
          roomAnalysis,
          preferences,
          variations: successfulResults.map((r) => ({
            label: r!.label,
            uploadId: r!.uploadId,
          })),
        };
        const newConstraints = [
          `Color: ${input.colorPalette}`,
          `Furniture: ${input.furnitureDensity}`,
          `Materials: ${input.materialPreference}`,
          `Lighting: ${input.lightingMood}`,
        ];

        let variantId: string;

        if (input.designVariantId) {
          // Update the existing design variant with generated images
          const [updated] = await ctx.db
            .update(designVariants)
            .set({
              sourceUploadId: input.uploadId,
              renderUrls: newRenderUrls,
              metadata: newMetadata,
              constraints: newConstraints,
              jobId: job.id,
            })
            .where(eq(designVariants.id, input.designVariantId))
            .returning();
          variantId = updated?.id ?? input.designVariantId;
        } else {
          // Create a new design variant
          const [variant] = await ctx.db
            .insert(designVariants)
            .values({
              roomId: input.roomId,
              name: `${input.designStyle.charAt(0).toUpperCase() + input.designStyle.slice(1)} Redesign`,
              style: input.designStyle,
              budgetTier: input.budgetLevel,
              sourceUploadId: input.uploadId,
              renderUrls: newRenderUrls,
              metadata: newMetadata,
              constraints: newConstraints,
              jobId: job.id,
            })
            .returning();
          variantId = variant!.id;
        }

        // Update job as completed
        await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            designVariantId: variantId,
            outputJson: {
              designVariantId: variantId,
              variationCount: successfulResults.length,
              analysis: roomAnalysis,
            },
          })
          .where(eq(jobs.id, job.id));

        return {
          jobId: job.id,
          designVariantId: variantId,
          variationCount: successfulResults.length,
        };
      } catch (error) {
        console.error('[Room Redesign Error]', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during room redesign';
        await ctx.db
          .update(jobs)
          .set({ status: 'failed', error: errorMessage, completedAt: new Date() })
          .where(eq(jobs.id, job.id));
        throw new Error(errorMessage);
      }
    }),

  /** Get a redesign job status and results */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');

      let variant = null;
      if (job.designVariantId) {
        variant = await ctx.db.query.designVariants.findFirst({
          where: eq(designVariants.id, job.designVariantId),
        });
      }

      return { job, variant };
    }),

  /** List all redesign results for a room */
  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { project: true },
      });
      if (!room || room.project.userId !== ctx.userId) throw new Error('Room not found');

      const variants = await ctx.db.query.designVariants.findMany({
        where: eq(designVariants.roomId, input.roomId),
        orderBy: (dv, { desc }) => [desc(dv.createdAt)],
      });

      // Filter to only redesign variants (have metadata.type === 'room_redesign')
      return variants.filter(
        (v) => v.metadata && typeof v.metadata === 'object' && (v.metadata as any).type === 'room_redesign',
      );
    }),
});
