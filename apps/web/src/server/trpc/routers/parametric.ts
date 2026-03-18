import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  parametricRules, designTemplates, parametricHistory,
  projects, rooms, eq, and, desc,
} from '@openlintel/db';

/* ── Helper: build expression from user-friendly fields ──── */
function buildExpression(ruleType: string, value: number, unit?: string) {
  switch (ruleType) {
    case 'min_area':
      return { operator: 'gte', param: 'area', value, unit: unit ?? 'sqft' };
    case 'max_area':
      return { operator: 'lte', param: 'area', value, unit: unit ?? 'sqft' };
    case 'min_width':
      return { operator: 'gte', param: 'width', value, unit: unit ?? 'ft' };
    case 'min_length':
      return { operator: 'gte', param: 'length', value, unit: unit ?? 'ft' };
    case 'min_height':
      return { operator: 'gte', param: 'height', value, unit: unit ?? 'ft' };
    case 'max_height':
      return { operator: 'lte', param: 'height', value, unit: unit ?? 'ft' };
    case 'aspect_ratio':
      return { operator: 'lte', param: 'aspect_ratio', value, unit: 'ratio' };
    case 'window_ratio':
      return { operator: 'gte', param: 'window_wall_ratio', value, unit: '%' };
    default:
      return { operator: 'gte', param: ruleType, value };
  }
}

/* ── Helper: map friendly ruleType → DB ruleType ─────────── */
function mapRuleType(rt: string): string {
  if (rt.includes('area')) return 'area_constraint';
  if (rt.includes('ratio')) return 'ratio_constraint';
  if (rt.includes('height') || rt.includes('width') || rt.includes('length')) return 'dimension_constraint';
  return 'dimension_constraint';
}

/* ── Helper: evaluate a single rule against a room ───────── */
function evaluateRule(
  rule: { expression: unknown; targetType: string; targetId: string | null },
  room: { id: string; type: string; lengthMm: number | null; widthMm: number | null; heightMm: number | null },
): boolean | null {
  const expr = rule.expression as { operator?: string; param?: string; value?: number };
  if (!expr?.operator || !expr?.param || expr?.value == null) return null;

  let actual: number | null = null;
  switch (expr.param) {
    case 'area': {
      if (room.lengthMm != null && room.widthMm != null) {
        // Convert mm² → sqft (1 sqft = 92903 mm²)
        actual = (room.lengthMm * room.widthMm) / 92903;
      }
      break;
    }
    case 'width': {
      if (room.widthMm != null) actual = room.widthMm / 304.8; // mm → ft
      break;
    }
    case 'length': {
      if (room.lengthMm != null) actual = room.lengthMm / 304.8;
      break;
    }
    case 'height': {
      if (room.heightMm != null) actual = room.heightMm / 304.8;
      break;
    }
    case 'aspect_ratio': {
      if (room.lengthMm != null && room.widthMm != null && room.widthMm > 0) {
        const l = Math.max(room.lengthMm, room.widthMm);
        const w = Math.min(room.lengthMm, room.widthMm);
        actual = l / w;
      }
      break;
    }
    default:
      return null;
  }

  if (actual == null) return null;

  switch (expr.operator) {
    case 'gte': return actual >= expr.value;
    case 'lte': return actual <= expr.value;
    case 'eq': return Math.abs(actual - expr.value) < 0.01;
    default: return null;
  }
}

export const parametricRouter = router({
  // ── List rules for a project ──────────────────────────────
  listRules: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.parametricRules.findMany({
        where: eq(parametricRules.projectId, input.projectId),
        orderBy: (r, { asc }) => [asc(r.priority), asc(r.createdAt)],
      });
    }),

  // ── Create a parametric rule ──────────────────────────────
  createRule: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      ruleType: z.string().min(1),
      value: z.number(),
      targetRoom: z.string().optional(),
      description: z.string().optional(),
      priority: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const expression = {
        ...buildExpression(input.ruleType, input.value),
        description: input.description,
        friendlyType: input.ruleType,
      };

      const [rule] = await ctx.db.insert(parametricRules).values({
        projectId: input.projectId,
        name: input.name,
        ruleType: mapRuleType(input.ruleType),
        targetType: input.targetRoom ? 'room' : 'all_rooms',
        targetId: null,
        expression: {
          ...expression,
          targetRoom: input.targetRoom || null,
        },
        priority: input.priority ?? 0,
        isActive: true,
      }).returning();

      // Record history
      await ctx.db.insert(parametricHistory).values({
        projectId: input.projectId,
        action: `create_rule:${input.name}`,
        beforeState: {},
        afterState: { ruleId: rule.id, name: input.name },
        triggeredBy: ctx.userId,
      });

      return rule;
    }),

  // ── Update a rule's active state ──────────────────────────
  toggleRule: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.query.parametricRules.findFirst({
        where: eq(parametricRules.id, input.id),
        with: { project: true },
      });
      if (!rule) throw new Error('Rule not found');
      if ((rule.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const [updated] = await ctx.db.update(parametricRules)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(parametricRules.id, input.id))
        .returning();
      return updated;
    }),

  // ── Delete a parametric rule ──────────────────────────────
  deleteRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.query.parametricRules.findFirst({
        where: eq(parametricRules.id, input.id),
        with: { project: true },
      });
      if (!rule) throw new Error('Rule not found');
      if ((rule.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(parametricRules).where(eq(parametricRules.id, input.id));

      // Record history
      await ctx.db.insert(parametricHistory).values({
        projectId: rule.projectId,
        action: `delete_rule:${rule.name}`,
        beforeState: { ruleId: rule.id, name: rule.name },
        afterState: {},
        triggeredBy: ctx.userId,
      });

      return { success: true };
    }),

  // ── Validate all rules against project rooms ──────────────
  validate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const allRules = await ctx.db.query.parametricRules.findMany({
        where: and(
          eq(parametricRules.projectId, input.projectId),
          eq(parametricRules.isActive, true),
        ),
        orderBy: (r, { asc }) => [asc(r.priority)],
      });

      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });

      let satisfied = 0;
      let violated = 0;
      let skipped = 0;
      const results: Array<{
        ruleId: string;
        ruleName: string;
        status: 'satisfied' | 'violated' | 'skipped';
        details: string;
      }> = [];

      for (const rule of allRules) {
        const expr = rule.expression as Record<string, unknown>;
        const targetRoomType = (expr.targetRoom as string) || null;

        // Get rooms this rule applies to
        const applicableRooms = targetRoomType
          ? projectRooms.filter((r) => r.type === targetRoomType || r.name.toLowerCase().includes(targetRoomType.toLowerCase()))
          : projectRooms;

        if (applicableRooms.length === 0) {
          skipped++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'skipped',
            details: targetRoomType ? `No rooms matching "${targetRoomType}"` : 'No rooms in project',
          });
          continue;
        }

        let allPassed = true;
        const failedRooms: string[] = [];

        for (const room of applicableRooms) {
          const passed = evaluateRule(rule, room);
          if (passed === false) {
            allPassed = false;
            failedRooms.push(room.name);
          }
        }

        if (allPassed) {
          satisfied++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'satisfied',
            details: `Passed for ${applicableRooms.length} room(s)`,
          });
        } else {
          violated++;
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'violated',
            details: `Failed in: ${failedRooms.join(', ')}`,
          });
        }
      }

      // Record in history
      await ctx.db.insert(parametricHistory).values({
        projectId: input.projectId,
        action: 'validate_all',
        beforeState: { totalRules: allRules.length },
        afterState: { satisfied, violated, skipped, results },
        triggeredBy: ctx.userId,
      });

      return { total: allRules.length, satisfied, violated, skipped, results };
    }),

  // ── List design templates ─────────────────────────────────
  listTemplates: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      homeType: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.homeType) conditions.push(eq(designTemplates.homeType, input.homeType));
      if (input.isPublic !== undefined) conditions.push(eq(designTemplates.isPublic, input.isPublic));

      return ctx.db.query.designTemplates.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
    }),

  // ── Apply a template to a project ─────────────────────────
  applyTemplate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      templateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const template = await ctx.db.query.designTemplates.findFirst({
        where: eq(designTemplates.id, input.templateId),
      });
      if (!template) throw new Error('Template not found');

      const roomDefs = template.roomDefinitions as Array<Record<string, unknown>>;
      const defaultRules = template.defaultRules as Array<Record<string, unknown>>;

      // Create rooms from the template definitions
      const createdRooms = [];
      for (const roomDef of roomDefs) {
        const [room] = await ctx.db.insert(rooms).values({
          projectId: input.projectId,
          name: (roomDef.name as string) || 'Room',
          type: (roomDef.type as string) || 'other',
          lengthMm: (roomDef.lengthMm as number) || null,
          widthMm: (roomDef.widthMm as number) || null,
          heightMm: (roomDef.heightMm as number) || 2700,
          floor: (roomDef.floor as number) || 0,
        }).returning();
        createdRooms.push(room);
      }

      // Create parametric rules from the template defaults
      const createdRules = [];
      for (const ruleDef of defaultRules) {
        const [rule] = await ctx.db.insert(parametricRules).values({
          projectId: input.projectId,
          name: (ruleDef.name as string) || 'Rule',
          ruleType: (ruleDef.ruleType as string) || 'dimension_constraint',
          targetType: (ruleDef.targetType as string) || 'room',
          targetId: (ruleDef.targetId as string) || null,
          expression: (ruleDef.expression as Record<string, unknown>) || {},
          priority: (ruleDef.priority as number) || 0,
          isActive: true,
        }).returning();
        createdRules.push(rule);
      }

      // Record in history
      await ctx.db.insert(parametricHistory).values({
        projectId: input.projectId,
        action: `apply_template:${template.name}`,
        beforeState: { templateId: input.templateId },
        afterState: {
          templateId: input.templateId,
          roomsCreated: createdRooms.length,
          rulesCreated: createdRules.length,
        },
        triggeredBy: ctx.userId,
      });

      return {
        templateName: template.name,
        roomsCreated: createdRooms.length,
        rulesCreated: createdRules.length,
      };
    }),

  // ── Get parametric history for a project ──────────────────
  getHistory: protectedProcedure
    .input(z.object({ projectId: z.string(), limit: z.number().int().min(1).max(100).optional() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.parametricHistory.findMany({
        where: eq(parametricHistory.projectId, input.projectId),
        orderBy: (h, { desc }) => [desc(h.createdAt)],
        limit: input.limit ?? 50,
      });
    }),
});
