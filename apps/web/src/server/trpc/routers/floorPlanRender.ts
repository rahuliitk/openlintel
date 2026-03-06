import { z } from 'zod';
import { projects, jobs, uploads, rooms, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Floor Plan Render Router
// Handles: room rendering, furniture editing, localized editing, walkthrough
// ---------------------------------------------------------------------------

export const floorPlanRenderRouter = router({
  // Generate a photorealistic top-down render of the full apartment from the floor plan
  generateFullApartmentRender: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        floorPlanUploadId: z.string(),
        stylePrompt: z.string(),
        roomDescriptions: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            lengthMm: z.number().optional(),
            widthMm: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const upload = await ctx.db.query.uploads.findFirst({
        where: and(eq(uploads.id, input.floorPlanUploadId), eq(uploads.userId, ctx.userId)),
      });
      if (!upload) throw new Error('Upload not found');

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'full_apartment_render',
          status: 'pending',
          inputJson: input,
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        // Build room layout description
        const roomList = input.roomDescriptions
          .map((r) => {
            const dims = r.lengthMm && r.widthMm
              ? ` (${(r.lengthMm / 1000).toFixed(1)}m x ${(r.widthMm / 1000).toFixed(1)}m)`
              : '';
            return `- ${r.name} (${r.type.replace(/_/g, ' ')})${dims}`;
          })
          .join('\n');

        const prompt = `Analyze the provided floor plan and generate a photorealistic top-down (true 90° orthographic) rendering of the entire apartment, strictly preserving the exact dimensions, proportions, walls, doors, windows, and furniture placement.

Do not modify layout, scale, structure, or orientation.

The apartment contains the following rooms:
${roomList}

${input.stylePrompt}

Architectural visualization style, ultra-realistic materials, physically accurate lighting, no perspective distortion, no added or removed structural elements. The image must be a true bird's-eye view looking straight down at the fully furnished apartment with the roof removed.`;

        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
        });

        await ctx.db.update(jobs).set({ progress: 80 }).where(eq(jobs.id, job.id));

        const imageUrl = response.data[0]?.url ?? null;

        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              imageUrl,
              renderType: 'full_apartment',
              roomCount: input.roomDescriptions.length,
              prompt,
              revisedPrompt: response.data[0]?.revised_prompt,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // Generate a photorealistic render for a selected room from the floor plan
  generateRoomRender: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        roomId: z.string(),
        floorPlanUploadId: z.string(),
        cameraPosition: z.object({ x: z.number(), y: z.number() }),
        cameraDirection: z.object({ x: z.number(), y: z.number() }),
        style: z.string().default('modern'),
        additionalPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.projectId, input.projectId)),
      });
      if (!room) throw new Error('Room not found');

      // Create job
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'room_render',
          status: 'pending',
          inputJson: {
            ...input,
            roomName: room.name,
            roomType: room.type,
            roomDimensions: {
              lengthMm: room.lengthMm,
              widthMm: room.widthMm,
              heightMm: room.heightMm,
            },
          },
          projectId: input.projectId,
          roomId: input.roomId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const lengthM = (room.lengthMm ?? 4000) / 1000;
        const widthM = (room.widthMm ?? 3500) / 1000;
        const heightM = (room.heightMm ?? 2700) / 1000;
        const roomType = room.type.replace(/_/g, ' ');

        const prompt = `A photorealistic interior photograph of a ${roomType}, ${input.style} design style. Room dimensions: ${lengthM}m x ${widthM}m, ceiling height ${heightM}m. The camera is placed inside the room looking from one corner towards the opposite wall. Show realistic walls, flooring, ceiling, windows, doors, and fully furnished interior with appropriate furniture for a ${roomType}. Professional architectural photography with natural lighting, high detail, 8K quality.${input.additionalPrompt ? ' ' + input.additionalPrompt : ''}`;

        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        });

        await ctx.db.update(jobs).set({ progress: 80 }).where(eq(jobs.id, job.id));

        const imageUrl = response.data[0]?.url ?? null;

        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              imageUrl,
              roomId: input.roomId,
              roomName: room.name,
              cameraPosition: input.cameraPosition,
              cameraDirection: input.cameraDirection,
              prompt,
              revisedPrompt: response.data[0]?.revised_prompt,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // Furniture editing: replace furniture in a rendered image
  editFurniture: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        roomId: z.string(),
        sourceImageUrl: z.string(),
        referenceDescription: z.string(),
        editRegion: z.string(), // description of area to change
        additionalPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'furniture_edit',
          status: 'pending',
          inputJson: input,
          projectId: input.projectId,
          roomId: input.roomId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const prompt = `Take this interior room photo and replace the ${input.editRegion} with ${input.referenceDescription}. Keep the same room layout, lighting, shadows, perspective, and spatial geometry. The result should look like a professional interior photograph with the new furniture seamlessly integrated.${input.additionalPrompt ? ' ' + input.additionalPrompt : ''}`;

        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        });

        await ctx.db.update(jobs).set({ progress: 80 }).where(eq(jobs.id, job.id));

        const imageUrl = response.data[0]?.url ?? null;

        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              imageUrl,
              editType: 'furniture',
              editRegion: input.editRegion,
              referenceDescription: input.referenceDescription,
              prompt,
              revisedPrompt: response.data[0]?.revised_prompt,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // Localized editing: edit specific areas (wall color, flooring, decor)
  editLocalized: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        roomId: z.string(),
        sourceImageUrl: z.string(),
        editType: z.enum(['wall_color', 'flooring', 'furniture', 'decor', 'lighting', 'custom']),
        editDescription: z.string(),
        highlightArea: z.string(), // description of highlighted area
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'localized_edit',
          status: 'pending',
          inputJson: input,
          projectId: input.projectId,
          roomId: input.roomId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const editTypeLabel = input.editType.replace(/_/g, ' ');
        const prompt = `Interior room photograph. Modify only the ${editTypeLabel} in the ${input.highlightArea} area: ${input.editDescription}. Keep everything else exactly the same - same room layout, same perspective, same lighting conditions, same spatial proportions. Photorealistic result, professional interior photography quality.`;

        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        });

        const imageUrl = response.data[0]?.url ?? null;

        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              imageUrl,
              editType: input.editType,
              editDescription: input.editDescription,
              highlightArea: input.highlightArea,
              prompt,
              revisedPrompt: response.data[0]?.revised_prompt,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // Generate walkthrough video between two room renders
  generateWalkthrough: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        startRoomId: z.string(),
        endRoomId: z.string(),
        startImageUrl: z.string(),
        endImageUrl: z.string(),
        transitionStyle: z.enum(['smooth', 'cinematic', 'architectural']).default('smooth'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const startRoom = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.startRoomId),
      });
      const endRoom = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.endRoomId),
      });

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'walkthrough_video',
          status: 'pending',
          inputJson: {
            ...input,
            startRoomName: startRoom?.name,
            endRoomName: endRoom?.name,
          },
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        // Generate intermediate transition frames using DALL-E
        const transitionPrompt = `A photorealistic interior walkthrough transition view, showing a hallway or corridor connecting two rooms in a modern home. The perspective is from a person walking through the space. Professional architectural photography, natural lighting, seamless spatial transition. ${input.transitionStyle} camera movement style.`;

        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const transitionResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: transitionPrompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        });

        const transitionImageUrl = transitionResponse.data[0]?.url ?? null;

        await ctx.db.update(jobs).set({ progress: 70 }).where(eq(jobs.id, job.id));

        // In production, these frames would be stitched into a video.
        // For now, return the frames as a sequence.
        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              frames: [
                { imageUrl: input.startImageUrl, label: `Start: ${startRoom?.name ?? 'Room'}` },
                { imageUrl: transitionImageUrl, label: 'Transition' },
                { imageUrl: input.endImageUrl, label: `End: ${endRoom?.name ?? 'Room'}` },
              ],
              startRoom: startRoom?.name,
              endRoom: endRoom?.name,
              transitionStyle: input.transitionStyle,
              note: 'Walkthrough frames generated. Video stitching available in production.',
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // Edit or explore a rendered floor plan using a free-form prompt
  editWithPrompt: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sourceImageUrl: z.string(),
        prompt: z.string(),
        floorPlanUploadId: z.string().optional(),
        size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: 'floor_plan_edit',
          status: 'pending',
          inputJson: input,
          projectId: input.projectId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        await ctx.db.update(jobs).set({ progress: 30 }).where(eq(jobs.id, job.id));

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: input.prompt,
          n: 1,
          size: input.size,
          quality: 'hd',
        });

        const firstResult = response.data?.[0];
        const imageUrl = firstResult?.url ?? null;

        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              imageUrl,
              prompt: input.prompt,
              revisedPrompt: firstResult?.revised_prompt,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();

        return updatedJob;
      } catch (err) {
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        return failedJob;
      }
    }),

  // List all renders for a project
  listRenders: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const renderJobs = await ctx.db.query.jobs.findMany({
        where: and(
          eq(jobs.projectId, input.projectId),
          eq(jobs.userId, ctx.userId),
        ),
        orderBy: (j, { desc }) => [desc(j.createdAt)],
      });

      return renderJobs.filter(
        (j) =>
          j.type === 'room_render' ||
          j.type === 'full_apartment_render' ||
          j.type === 'floor_plan_edit' ||
          j.type === 'furniture_edit' ||
          j.type === 'localized_edit' ||
          j.type === 'walkthrough_video',
      );
    }),

  // Get job status
  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),
});
