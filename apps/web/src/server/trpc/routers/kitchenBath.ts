import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  kitchenBathLayouts, projects, eq, and,
} from '@openlintel/db';

export const kitchenBathRouter = router({
  // ── List kitchen/bath layouts for a project ─────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.kitchenBathLayouts.findMany({
        where: eq(kitchenBathLayouts.projectId, input.projectId),
        orderBy: (kb, { desc }) => [desc(kb.createdAt)],
      });
    }),

  // ── Create a kitchen/bath layout ────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomType: z.string().min(1),
      roomName: z.string().min(1),
      cabinetType: z.string().min(1),
      countertopMaterial: z.string().min(1),
      edgeProfile: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [layout] = await ctx.db.insert(kitchenBathLayouts).values({
        projectId: input.projectId,
        roomType: input.roomType,
        roomName: input.roomName,
        cabinetType: input.cabinetType,
        countertopMaterial: input.countertopMaterial,
        edgeProfile: input.edgeProfile,
        notes: input.notes ?? null,
        status: 'draft',
      }).returning();
      return layout;
    }),

  // ── Get a layout by id ──────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const layout = await ctx.db.query.kitchenBathLayouts.findFirst({
        where: eq(kitchenBathLayouts.id, input.id),
        with: { project: true },
      });
      if (!layout) throw new Error('Layout not found');
      if ((layout.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return layout;
    }),

  // ── Analyze work triangle (kitchen only) ────────────────────
  analyzeWorkTriangle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.query.kitchenBathLayouts.findFirst({
        where: eq(kitchenBathLayouts.id, input.id),
        with: { project: true },
      });
      if (!layout) throw new Error('Layout not found');
      if ((layout.project as any).userId !== ctx.userId) throw new Error('Access denied');

      if (layout.roomType !== 'kitchen' && layout.roomType !== 'wet_bar') {
        throw new Error('Work triangle analysis is only available for kitchens');
      }

      // Simulate work triangle analysis based on cabinet type and room config
      // In production this would use actual appliance positions from a floor plan
      const cabinetScores: Record<string, { baseScore: number; baseDist: number }> = {
        island: { baseScore: 88, baseDist: 21 },
        corner: { baseScore: 82, baseDist: 19 },
        base: { baseScore: 72, baseDist: 24 },
        wall: { baseScore: 65, baseDist: 27 },
        tall: { baseScore: 60, baseDist: 29 },
        pantry: { baseScore: 55, baseDist: 31 },
        vanity: { baseScore: 50, baseDist: 33 },
      };

      const config = cabinetScores[layout.cabinetType] || { baseScore: 70, baseDist: 23 };
      // Add some variance based on the layout id hash
      const hash = layout.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const variance = (hash % 15) - 7;
      const score = Math.min(100, Math.max(10, config.baseScore + variance));
      const totalDistance = Math.max(12, config.baseDist + (hash % 6) - 3);

      // Leg distances (sink-stove, stove-fridge, fridge-sink)
      const leg1 = +(totalDistance * 0.35 + (hash % 3) * 0.5).toFixed(1);
      const leg2 = +(totalDistance * 0.35 - (hash % 2) * 0.3).toFixed(1);
      const leg3 = +(totalDistance - leg1 - leg2).toFixed(1);

      // Update the layout
      const [updated] = await ctx.db.update(kitchenBathLayouts).set({
        workTriangleScore: score,
        workTriangleDistance: totalDistance,
        status: score >= 60 ? 'designing' : 'issues',
        updatedAt: new Date(),
      }).where(eq(kitchenBathLayouts.id, input.id)).returning();

      return {
        score,
        totalDistance: `${totalDistance}'`,
        legs: {
          sinkToStove: `${leg1}'`,
          stoveToFridge: `${leg2}'`,
          fridgeToSink: `${leg3}'`,
        },
        rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
        recommendations: [
          ...(score < 60 ? ['Consider repositioning appliances to reduce travel distance'] : []),
          ...(totalDistance > 26 ? ['Total path exceeds 26\' — NKBA recommends keeping it under 26\''] : []),
          ...(layout.cabinetType === 'island' ? ['Island layout provides the best triangle efficiency'] : []),
          ...(score >= 80 ? ['Your work triangle is well optimized'] : []),
        ],
      };
    }),

  // ── Validate layout (code compliance & best practices) ──────
  validate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.query.kitchenBathLayouts.findFirst({
        where: eq(kitchenBathLayouts.id, input.id),
        with: { project: true },
      });
      if (!layout) throw new Error('Layout not found');
      if ((layout.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const isKitchen = layout.roomType === 'kitchen' || layout.roomType === 'wet_bar' || layout.roomType === 'laundry';

      // Run validation checks based on room type
      const checks: Array<{ name: string; passed: boolean; message: string }> = [];

      if (isKitchen) {
        // Kitchen-specific checks
        checks.push({
          name: 'Countertop clearance',
          passed: layout.cabinetType !== 'tall',
          message: layout.cabinetType === 'tall'
            ? 'Tall cabinets may limit countertop workspace — ensure at least 36" of continuous counter'
            : 'Countertop workspace is adequate',
        });
        checks.push({
          name: 'Cabinet-to-island clearance',
          passed: layout.cabinetType === 'island' || layout.cabinetType === 'corner',
          message: layout.cabinetType === 'island' || layout.cabinetType === 'corner'
            ? 'Layout allows sufficient clearance for movement'
            : 'Ensure minimum 42" clearance between cabinets for one cook, 48" for two',
        });
        checks.push({
          name: 'Countertop material durability',
          passed: ['quartz', 'granite', 'stainless_steel', 'concrete'].includes(layout.countertopMaterial),
          message: ['quartz', 'granite', 'stainless_steel', 'concrete'].includes(layout.countertopMaterial)
            ? `${layout.countertopMaterial.replace(/_/g, ' ')} is highly durable for kitchen use`
            : `${layout.countertopMaterial.replace(/_/g, ' ')} may require extra care — consider sealing requirements`,
        });
        checks.push({
          name: 'Edge profile safety',
          passed: layout.edgeProfile !== 'square',
          message: layout.edgeProfile === 'square'
            ? 'Square edge profile has sharp corners — consider beveled or bullnose for households with children'
            : `${layout.edgeProfile} edge profile is a safe choice`,
        });
        checks.push({
          name: 'Ventilation requirements',
          passed: true,
          message: 'Ensure range hood is rated for minimum 100 CFM per linear foot of cooktop',
        });
        checks.push({
          name: 'GFCI outlets required',
          passed: true,
          message: 'All outlets within 6\' of a water source must be GFCI protected (NEC 210.8)',
        });
      } else {
        // Bathroom-specific checks
        checks.push({
          name: 'Vanity clearance',
          passed: layout.cabinetType === 'vanity' || layout.cabinetType === 'wall',
          message: layout.cabinetType === 'vanity' || layout.cabinetType === 'wall'
            ? 'Vanity cabinet type is appropriate for bathroom'
            : `${layout.cabinetType} cabinet type is unusual for bathroom — consider a vanity instead`,
        });
        checks.push({
          name: 'Moisture-resistant countertop',
          passed: ['quartz', 'granite', 'marble', 'concrete', 'soapstone'].includes(layout.countertopMaterial),
          message: ['quartz', 'granite', 'marble', 'concrete', 'soapstone'].includes(layout.countertopMaterial)
            ? `${layout.countertopMaterial.replace(/_/g, ' ')} is moisture-resistant and suitable for bathrooms`
            : `${layout.countertopMaterial.replace(/_/g, ' ')} may not hold up well in high-moisture environments`,
        });
        checks.push({
          name: 'Toilet clearance',
          passed: true,
          message: 'Ensure minimum 15" from toilet center to side wall and 21" of clear space in front (IRC R307.1)',
        });
        checks.push({
          name: 'Shower/tub waterproofing',
          passed: true,
          message: 'Verify waterproof membrane behind tiles extends minimum 6" above shower head height',
        });
        checks.push({
          name: 'GFCI protection',
          passed: true,
          message: 'All bathroom outlets must be GFCI protected (NEC 210.8)',
        });
        checks.push({
          name: 'Ventilation',
          passed: true,
          message: 'Exhaust fan must be minimum 50 CFM for bathrooms up to 100 sq ft (IRC M1507.4)',
        });
      }

      const passed = checks.filter((c) => c.passed).length;
      const failed = checks.filter((c) => !c.passed).length;

      // Update status based on validation
      const newStatus = failed === 0 ? 'validated' : 'issues';
      await ctx.db.update(kitchenBathLayouts).set({
        status: newStatus,
        validationResults: { checks, passed, failed, timestamp: new Date().toISOString() },
        updatedAt: new Date(),
      }).where(eq(kitchenBathLayouts.id, input.id));

      return { checks, passed, failed };
    }),

  // ── Update a layout ─────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      roomName: z.string().optional(),
      cabinetType: z.string().optional(),
      countertopMaterial: z.string().optional(),
      edgeProfile: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(['draft', 'designing', 'validated', 'issues']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.query.kitchenBathLayouts.findFirst({
        where: eq(kitchenBathLayouts.id, input.id),
        with: { project: true },
      });
      if (!layout) throw new Error('Layout not found');
      if ((layout.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const { id, ...updates } = input;
      const setValues: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.roomName !== undefined) setValues.roomName = updates.roomName;
      if (updates.cabinetType !== undefined) setValues.cabinetType = updates.cabinetType;
      if (updates.countertopMaterial !== undefined) setValues.countertopMaterial = updates.countertopMaterial;
      if (updates.edgeProfile !== undefined) setValues.edgeProfile = updates.edgeProfile;
      if (updates.notes !== undefined) setValues.notes = updates.notes;
      if (updates.status !== undefined) setValues.status = updates.status;

      const [updated] = await ctx.db.update(kitchenBathLayouts)
        .set(setValues)
        .where(eq(kitchenBathLayouts.id, id))
        .returning();
      return updated;
    }),

  // ── Delete a layout ─────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const layout = await ctx.db.query.kitchenBathLayouts.findFirst({
        where: eq(kitchenBathLayouts.id, input.id),
        with: { project: true },
      });
      if (!layout) throw new Error('Layout not found');
      if ((layout.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(kitchenBathLayouts).where(eq(kitchenBathLayouts.id, input.id));
      return { success: true };
    }),
});
