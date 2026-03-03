import { z } from 'zod';
import { drawingResults, designVariants, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Inline drawing generation helpers
// ---------------------------------------------------------------------------

const DRAWING_TYPE_CONFIG: Record<
  string,
  { scale: string; titlePrefix: string; description: string }
> = {
  floor_plan: {
    scale: '1:50',
    titlePrefix: 'Floor Plan',
    description: 'Architectural floor plan showing walls, doors, windows, and dimensions',
  },
  furnished_plan: {
    scale: '1:50',
    titlePrefix: 'Furnished Plan',
    description: 'Floor plan with furniture layout, clearance zones, and annotations',
  },
  elevation: {
    scale: '1:25',
    titlePrefix: 'Elevation',
    description: 'Interior wall elevation showing cabinetry, finishes, and vertical dimensions',
  },
  electrical_layout: {
    scale: '1:50',
    titlePrefix: 'Electrical Layout',
    description: 'Electrical plan showing switch points, socket outlets, light positions, and circuit routing',
  },
  rcp: {
    scale: '1:50',
    titlePrefix: 'Reflected Ceiling Plan',
    description: 'Ceiling plan showing light fixtures, AC diffusers, false ceiling edges, and levels',
  },
  flooring: {
    scale: '1:50',
    titlePrefix: 'Flooring Layout',
    description: 'Flooring pattern layout with tile/plank orientation, borders, and threshold details',
  },
  section: {
    scale: '1:25',
    titlePrefix: 'Section',
    description: 'Cross-section showing construction detail, material layers, and internal heights',
  },
  plumbing: {
    scale: '1:50',
    titlePrefix: 'Plumbing Layout',
    description: 'Plumbing plan showing water supply lines, drainage, and fixture connections',
  },
};

function generateDrawingMetadata(
  drawingType: string,
  drawingIndex: number,
  roomType: string,
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  projectName: string,
  variantName: string,
) {
  const config = DRAWING_TYPE_CONFIG[drawingType] ?? {
    scale: '1:50',
    titlePrefix: drawingType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `${drawingType} drawing`,
  };

  const drawingNumber = `DWG-${String(drawingIndex + 1).padStart(3, '0')}`;

  return {
    scale: config.scale,
    metadata: {
      drawingType,
      drawingNumber,
      scale: config.scale,
      description: config.description,
      dimensions: {
        lengthMm,
        widthMm,
        heightMm,
        areaSqm: Math.round((lengthMm * widthMm) / 1e6 * 100) / 100,
      },
      titleBlock: {
        projectName,
        drawingTitle: `${config.titlePrefix} - ${variantName}`,
        drawingNumber,
        scale: config.scale,
        roomType: roomType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        date: new Date().toISOString().split('T')[0],
        revision: 'R0',
        drawnBy: 'OpenLintel (auto-generated)',
        checkedBy: 'Pending review',
      },
      sheets: 1,
      paperSize: config.scale === '1:25' ? 'A3' : 'A2',
      generatedAt: new Date().toISOString(),
    },
  };
}

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

      // --- Inline drawing generation (replaces external microservice call) ---

      // Mark job as running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 5 })
        .where(eq(jobs.id, job.id));

      // Generate a drawing result for each requested drawing type
      const drawingRecords = [];
      for (let i = 0; i < input.drawingTypes.length; i++) {
        const drawingType = input.drawingTypes[i]!;
        const { metadata } = generateDrawingMetadata(
          drawingType,
          i,
          variant.room.type,
          variant.room.lengthMm ?? 0,
          variant.room.widthMm ?? 0,
          variant.room.heightMm ?? 2700,
          variant.room.project.name,
          variant.name,
        );

        const [record] = await ctx.db
          .insert(drawingResults)
          .values({
            designVariantId: input.designVariantId,
            jobId: job.id,
            drawingType,
            metadata,
            // Storage keys are null — no actual file generated, just metadata
            dxfStorageKey: null,
            pdfStorageKey: null,
            svgStorageKey: null,
            ifcStorageKey: null,
          })
          .returning();
        if (!record) throw new Error('Failed to create drawing record');

        drawingRecords.push(record);

        // Update progress proportionally
        const progress = Math.round(((i + 1) / input.drawingTypes.length) * 90) + 5;
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
});
