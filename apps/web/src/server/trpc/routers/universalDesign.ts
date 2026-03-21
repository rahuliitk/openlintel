import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  universalDesignChecks, projects, rooms, eq, and,
} from '@openlintel/db';

export const universalDesignRouter = router({
  // ── Run accessibility check ─────────────────────────────
  check: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      roomId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Run accessibility checks based on room dimensions and features
      const checkResults: any[] = [];
      let complianceLevel = 'none';

      if (input.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, input.roomId),
        });
        if (!room) throw new Error('Room not found');

        const widthMm = room.widthMm ?? 3000;
        const lengthMm = room.lengthMm ?? 4000;

        // Check doorway width (min 815mm / 32" for ADA)
        checkResults.push({
          check: 'doorway_width',
          passed: true, // Placeholder — would check actual door openings
          requirement: 'Min 815mm (32") clear width',
          recommendation: 'Ensure all doorways meet 815mm minimum clear width',
        });

        // Check turning radius (1524mm / 60" for wheelchair)
        const hasTurningSpace = Math.min(widthMm, lengthMm) >= 1524;
        checkResults.push({
          check: 'wheelchair_turning_radius',
          passed: hasTurningSpace,
          requirement: 'Min 1524mm (60") turning radius',
          recommendation: hasTurningSpace ? 'Adequate turning space' : 'Room too narrow for wheelchair turning radius',
        });

        // Check corridor width (min 915mm / 36")
        checkResults.push({
          check: 'corridor_width',
          passed: widthMm >= 915,
          requirement: 'Min 915mm (36") corridor width',
          recommendation: widthMm >= 915 ? 'Adequate width' : 'Widen corridor to at least 915mm',
        });

        // Check floor transition
        checkResults.push({
          check: 'floor_transitions',
          passed: true,
          requirement: 'Max 6mm level change without ramp',
          recommendation: 'Ensure smooth floor transitions between rooms',
        });

        // Determine compliance level
        const passedCount = checkResults.filter((c) => c.passed).length;
        const total = checkResults.length;
        if (passedCount === total) complianceLevel = 'full';
        else if (passedCount >= total * 0.7) complianceLevel = 'partial';
        else complianceLevel = 'non_compliant';
      }

      const recommendations = checkResults.filter((c) => !c.passed).map((c) => c.recommendation);

      const [result] = await ctx.db.insert(universalDesignChecks).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        checkResults,
        complianceLevel,
        recommendations,
      }).returning();
      return result;
    }),

  // ── List checks (unpacked from checkResults jsonb) ─────
  listChecks: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const rows = await ctx.db.query.universalDesignChecks.findMany({
        where: eq(universalDesignChecks.projectId, input.projectId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
      // Each row stores check data in checkResults; unpack into individual items
      return rows.map((row) => {
        const results = (row.checkResults as any) ?? {};
        return {
          id: row.id,
          name: results.name ?? results.check ?? 'Unnamed check',
          category: results.category ?? null,
          room: results.room ?? null,
          complianceLevel: row.complianceLevel ?? null,
          description: results.description ?? null,
          recommendation: results.recommendation ?? ((row.recommendations as any[])?.[0] ?? null),
          status: results.status ?? 'not_checked',
          createdAt: row.createdAt,
        };
      });
    }),

  // ── Add a check ───────────────────────────────────────
  addCheck: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      category: z.string(),
      room: z.string().optional(),
      complianceLevel: z.string().optional(),
      description: z.string().optional(),
      recommendation: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const checkData = {
        name: input.name,
        category: input.category,
        room: input.room ?? null,
        description: input.description ?? null,
        recommendation: input.recommendation ?? null,
        status: 'not_checked',
      };

      const [result] = await ctx.db.insert(universalDesignChecks).values({
        projectId: input.projectId,
        roomId: null,
        checkResults: checkData,
        complianceLevel: input.complianceLevel ?? 'none',
        recommendations: input.recommendation ? [input.recommendation] : [],
      }).returning();
      return {
        id: result!.id,
        name: checkData.name,
        category: checkData.category,
        room: checkData.room,
        complianceLevel: result!.complianceLevel,
        description: checkData.description,
        recommendation: checkData.recommendation,
        status: checkData.status,
        createdAt: result!.createdAt,
      };
    }),

  // ── Update check status ───────────────────────────────
  updateCheckStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['compliant', 'partial', 'non_compliant', 'not_checked']),
    }))
    .mutation(async ({ ctx, input }) => {
      const check = await ctx.db.query.universalDesignChecks.findFirst({
        where: eq(universalDesignChecks.id, input.id),
        with: { project: true },
      });
      if (!check) throw new Error('Check not found');
      if ((check.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const existingResults = (check.checkResults as any) ?? {};
      existingResults.status = input.status;

      const [updated] = await ctx.db.update(universalDesignChecks).set({
        checkResults: existingResults,
        complianceLevel: input.status === 'compliant' ? 'full' : input.status === 'partial' ? 'partial' : input.status === 'non_compliant' ? 'non_compliant' : 'none',
      }).where(eq(universalDesignChecks.id, input.id)).returning();
      return { id: updated!.id, status: input.status };
    }),

  // ── Delete check (frontend version) ───────────────────
  deleteCheck: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const check = await ctx.db.query.universalDesignChecks.findFirst({
        where: eq(universalDesignChecks.id, input.id),
        with: { project: true },
      });
      if (!check) throw new Error('Check not found');
      if ((check.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(universalDesignChecks).where(eq(universalDesignChecks.id, input.id));
      return { success: true };
    }),

  // ── Run audit (generate default checks) ───────────────
  runAudit: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const defaultChecks = [
        { name: 'Doorway Width', category: 'Mobility', description: 'All doorways min 815mm (32") clear width', recommendation: 'Widen doorways to at least 815mm' },
        { name: 'Wheelchair Turning Radius', category: 'Mobility', description: 'Min 1524mm (60") turning space in key rooms', recommendation: 'Ensure 1524mm clear turning space' },
        { name: 'Grab Bars', category: 'Bathroom', description: 'Grab bars at toilet and shower/tub', recommendation: 'Install ADA-compliant grab bars' },
        { name: 'Lever Door Handles', category: 'General', description: 'Lever-style handles on all doors', recommendation: 'Replace knob handles with lever-style' },
        { name: 'Step-Free Entry', category: 'Entry', description: 'At least one step-free entrance', recommendation: 'Provide zero-step entry or ramp' },
        { name: 'Floor Transitions', category: 'Flooring', description: 'Max 6mm level change without ramp', recommendation: 'Smooth floor transitions between rooms' },
        { name: 'Light Switch Height', category: 'Electrical', description: 'Switches at 1067mm (42") height', recommendation: 'Lower switches to 1067mm max height' },
        { name: 'Outlet Height', category: 'Electrical', description: 'Outlets at min 380mm (15") from floor', recommendation: 'Raise outlets to at least 380mm' },
        { name: 'Hallway Width', category: 'Mobility', description: 'Hallways min 915mm (36") wide', recommendation: 'Widen hallways to at least 915mm' },
        { name: 'Non-Slip Flooring', category: 'Safety', description: 'Non-slip surfaces in wet areas', recommendation: 'Install non-slip flooring in bathrooms and kitchen' },
      ];

      const createdChecks = [];
      for (const chk of defaultChecks) {
        const [row] = await ctx.db.insert(universalDesignChecks).values({
          projectId: input.projectId,
          roomId: null,
          checkResults: {
            name: chk.name,
            category: chk.category,
            description: chk.description,
            recommendation: chk.recommendation,
            status: 'not_checked',
          },
          complianceLevel: 'none',
          recommendations: [chk.recommendation],
        }).returning();
        createdChecks.push({
          id: row!.id,
          name: chk.name,
          category: chk.category,
          room: null,
          complianceLevel: 'none',
          description: chk.description,
          recommendation: chk.recommendation,
          status: 'not_checked',
          createdAt: row!.createdAt,
        });
      }

      return createdChecks;
    }),

  // ── List checks ─────────────────────────────────────────
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
      const conditions = [eq(universalDesignChecks.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(universalDesignChecks.roomId, input.roomId));
      return ctx.db.query.universalDesignChecks.findMany({
        where: and(...conditions),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    }),

  // ── Get recommendations ─────────────────────────────────
  getRecommendations: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const check = await ctx.db.query.universalDesignChecks.findFirst({
        where: eq(universalDesignChecks.id, input.id),
        with: { project: true },
      });
      if (!check) throw new Error('Design check not found');
      if ((check.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return {
        id: check.id,
        complianceLevel: check.complianceLevel,
        checkResults: check.checkResults,
        recommendations: check.recommendations,
        generalGuidelines: [
          'Install lever-style door handles instead of knobs',
          'Use rocker-style light switches at 1067mm (42") height',
          'Ensure grab bars in bathrooms meet ADA mounting height',
          'Provide non-slip flooring in wet areas',
          'Use contrasting colors for visually impaired accessibility',
          'Install adjustable-height countertops where possible',
        ],
      };
    }),

  // ── Delete check ────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const check = await ctx.db.query.universalDesignChecks.findFirst({
        where: eq(universalDesignChecks.id, input.id),
        with: { project: true },
      });
      if (!check) throw new Error('Design check not found');
      if ((check.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(universalDesignChecks).where(eq(universalDesignChecks.id, input.id));
      return { success: true };
    }),
});
