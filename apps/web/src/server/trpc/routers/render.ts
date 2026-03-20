import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  renderJobs, projects, rooms, eq, and,
} from '@openlintel/db';

export const renderRouter = router({
  // ── List render jobs for a project ────────────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(renderJobs.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(renderJobs.roomId, input.roomId));

      return ctx.db.query.renderJobs.findMany({
        where: and(...conditions),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
      });
    }),

  // ── Create and generate a render ───────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      renderType: z.string().min(1),
      roomId: z.string().optional(),
      timeOfDay: z.string().optional(),
      quality: z.string().optional(),
      resolution: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Fetch room name for prompt context
      let roomContext = '';
      if (input.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, input.roomId),
        });
        if (room) {
          roomContext = `${room.name} (${room.type})`;
        }
      }

      // Create the render record as "rendering"
      const [render] = await ctx.db.insert(renderJobs).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        name: input.name,
        description: input.description ?? null,
        renderType: input.renderType,
        quality: input.quality ?? 'standard',
        resolution: input.resolution,
        timeOfDay: input.timeOfDay ?? null,
        status: 'rendering',
      }).returning();

      // Generate image via OpenAI DALL-E in background (non-blocking)
      generateRenderImage(
        render.id,
        ctx.db,
        {
          name: input.name,
          projectName: project.name,
          roomContext,
          renderType: input.renderType,
          timeOfDay: input.timeOfDay ?? 'afternoon',
          quality: input.quality ?? 'standard',
          resolution: input.resolution,
          description: input.description,
        },
      ).catch(() => {/* errors handled inside */});

      return render;
    }),

  // ── Retry a failed render ──────────────────────────────────
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const render = await ctx.db.query.renderJobs.findFirst({
        where: eq(renderJobs.id, input.id),
        with: { project: true },
      });
      if (!render) throw new Error('Render not found');
      if ((render.project as any).userId !== ctx.userId) throw new Error('Access denied');
      if (render.status !== 'failed') throw new Error('Only failed renders can be retried');

      // Reset to rendering
      await ctx.db.update(renderJobs).set({ status: 'rendering', outputUrl: null })
        .where(eq(renderJobs.id, input.id));

      let roomContext = '';
      if (render.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, render.roomId),
        });
        if (room) roomContext = `${room.name} (${room.type})`;
      }

      generateRenderImage(
        render.id,
        ctx.db,
        {
          name: render.name ?? 'Untitled',
          projectName: (render.project as any).name,
          roomContext,
          renderType: render.renderType,
          timeOfDay: render.timeOfDay ?? 'afternoon',
          quality: render.quality ?? 'standard',
          resolution: render.resolution,
          description: render.description,
        },
      ).catch(() => {});

      return { success: true };
    }),

  // ── Delete a render job ───────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const render = await ctx.db.query.renderJobs.findFirst({
        where: eq(renderJobs.id, input.id),
        with: { project: true },
      });
      if (!render) throw new Error('Render job not found');
      if ((render.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(renderJobs).where(eq(renderJobs.id, input.id));
      return { success: true };
    }),
});

// ── Background image generation ─────────────────────────────────
async function generateRenderImage(
  renderId: string,
  db: any,
  opts: {
    name: string;
    projectName: string;
    roomContext: string;
    renderType: string;
    timeOfDay: string;
    quality: string;
    resolution: string;
    description?: string | null;
  },
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const qualityMap: Record<string, string> = {
      preview: 'simple sketch-like',
      standard: 'photorealistic',
      high: 'highly detailed photorealistic',
      ultra: 'ultra-photorealistic ray-traced cinematic',
    };
    const qualityDesc = qualityMap[opts.quality] || 'photorealistic';

    const timeMap: Record<string, string> = {
      morning: 'soft warm morning sunlight streaming through windows',
      afternoon: 'bright natural afternoon daylight',
      sunset: 'warm golden hour sunset light with long shadows',
      night: 'cozy evening interior lighting with warm lamps',
    };
    const lightingDesc = timeMap[opts.timeOfDay] || 'natural daylight';

    const roomPart = opts.roomContext ? `of a ${opts.roomContext}` : 'of a modern home interior';
    const descPart = opts.description ? ` The scene shows: ${opts.description}.` : '';
    const dalleQuality = opts.quality === 'ultra' || opts.quality === 'high' ? 'hd' : 'standard';

    if (opts.renderType === 'panorama_360') {
      // ── 360 Panorama: generate equirectangular panoramic image ──
      const prompt = `${qualityDesc} seamless 360-degree equirectangular panorama ${roomPart} in the "${opts.projectName}" home. ${lightingDesc}. The image is a full 360 panoramic view showing the entire room in a single continuous image, shot with an ultra-wide-angle fisheye lens. Every wall, the ceiling and floor are visible. Professional architectural photography, high-end residential design, realistic materials and textures.${descPart}`;

      const imageUrl = await callDalle(apiKey, prompt, '1792x1024', dalleQuality);

      await db.update(renderJobs).set({
        outputUrl: imageUrl,
        status: 'completed',
      }).where(eq(renderJobs.id, renderId));

    } else if (opts.renderType === 'video_walkthrough') {
      // ── Video Walkthrough: generate multiple frames from different angles ──
      const angles = [
        { view: 'entrance doorway looking into the room', angle: 'entry' },
        { view: 'center of the room looking toward the main feature wall', angle: 'center' },
        { view: 'opposite corner showing the full depth of the room', angle: 'far' },
        { view: 'close-up detail of key design elements and materials', angle: 'detail' },
      ];

      const frameUrls: string[] = [];
      for (const a of angles) {
        const prompt = `${qualityDesc} cinematic interior photograph ${roomPart} in the "${opts.projectName}" home, shot from the ${a.view}. ${lightingDesc}. Professional architectural photography, cinematic composition, high-end residential design, realistic materials and textures. Consistent design style across all shots.${descPart}`;

        const url = await callDalle(apiKey, prompt, '1792x1024', dalleQuality);
        frameUrls.push(url);

        // Update progress as frames complete
        await db.update(renderJobs).set({
          cameraPosition: { frames: frameUrls, totalFrames: angles.length },
        }).where(eq(renderJobs.id, renderId));
      }

      await db.update(renderJobs).set({
        outputUrl: frameUrls[0],
        cameraPosition: { frames: frameUrls, totalFrames: angles.length },
        status: 'completed',
      }).where(eq(renderJobs.id, renderId));

    } else if (opts.renderType === 'before_after') {
      // ── Before & After: generate two images (dated vs modern) ──
      const beforePrompt = `${qualityDesc} interior photograph ${roomPart} BEFORE renovation. Old, dated, worn interior with outdated finishes, old carpet or worn flooring, outdated fixtures, dull walls. ${lightingDesc}. Same camera angle and room layout.${descPart}`;

      const afterPrompt = `${qualityDesc} interior photograph ${roomPart} AFTER a complete modern renovation in the "${opts.projectName}" home. Brand new modern finishes, fresh paint, new flooring, updated fixtures, contemporary furniture. ${lightingDesc}. Same camera angle and room layout as before. Professional architectural photography, high-end residential design.${descPart}`;

      const beforeUrl = await callDalle(apiKey, beforePrompt, '1792x1024', dalleQuality);
      const afterUrl = await callDalle(apiKey, afterPrompt, '1792x1024', dalleQuality);

      await db.update(renderJobs).set({
        outputUrl: afterUrl,
        cameraPosition: { beforeUrl, afterUrl },
        status: 'completed',
      }).where(eq(renderJobs.id, renderId));

    } else {
      // ── Still Image: single high-quality render ──
      const prompt = `${qualityDesc} interior photograph ${roomPart} in the "${opts.projectName}" home. ${lightingDesc}. Professional architectural photography, high-end residential design, clean modern aesthetic, realistic materials and textures.${descPart}`;

      const imageUrl = await callDalle(apiKey, prompt, '1792x1024', dalleQuality);

      await db.update(renderJobs).set({
        outputUrl: imageUrl,
        status: 'completed',
      }).where(eq(renderJobs.id, renderId));
    }
  } catch (err: any) {
    await db.update(renderJobs).set({
      status: 'failed',
    }).where(eq(renderJobs.id, renderId));
  }
}

async function callDalle(apiKey: string, prompt: string, size: string, quality: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'url',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Image API error: ${errText}`);
  }

  const data = await res.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('No image URL returned from OpenAI');
  return url;
}
