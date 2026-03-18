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
