import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  selectionCategories, selections, projects, eq, and,
} from '@openlintel/db';

export const selectionRouter = router({
  // ═══════════════════════════════════════════════════════
  // Selection Categories
  // ═══════════════════════════════════════════════════════

  // ── List categories ────────────────────────────────────
  listCategories: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.selectionCategories.findMany({
        where: eq(selectionCategories.projectId, input.projectId),
        with: { selections: true },
        orderBy: (c, { asc }) => [asc(c.sortOrder)],
      });
    }),

  // ── Create category ────────────────────────────────────
  createCategory: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      allowanceBudget: z.number().optional(),
      dueDate: z.date().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [category] = await ctx.db.insert(selectionCategories).values({
        projectId: input.projectId,
        name: input.name,
        allowanceBudget: input.allowanceBudget ?? null,
        dueDate: input.dueDate ?? null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      return category;
    }),

  // ═══════════════════════════════════════════════════════
  // Selections
  // ═══════════════════════════════════════════════════════

  // ── List selections ────────────────────────────────────
  listSelections: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      categoryId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(selections.projectId, input.projectId)];
      if (input.categoryId) conditions.push(eq(selections.categoryId, input.categoryId));
      if (input.status) conditions.push(eq(selections.status, input.status));

      return ctx.db.query.selections.findMany({
        where: and(...conditions),
        with: { category: true, room: true, product: true },
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  // ── Make a selection ───────────────────────────────────
  makeSelection: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      categoryId: z.string(),
      roomId: z.string().optional(),
      selectedProductId: z.string().optional(),
      productName: z.string().optional(),
      actualCost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Look up allowance budget for over/under calculation
      const category = await ctx.db.query.selectionCategories.findFirst({
        where: eq(selectionCategories.id, input.categoryId),
      });
      if (!category) throw new Error('Category not found');

      const overUnder = (input.actualCost != null && category.allowanceBudget != null)
        ? input.actualCost - category.allowanceBudget
        : null;

      const [selection] = await ctx.db.insert(selections).values({
        projectId: input.projectId,
        categoryId: input.categoryId,
        roomId: input.roomId ?? null,
        selectedProductId: input.selectedProductId ?? null,
        productName: input.productName ?? null,
        actualCost: input.actualCost ?? null,
        overUnder,
        notes: input.notes ?? null,
        status: 'pending',
      }).returning();
      return selection;
    }),

  // ── Approve a selection ────────────────────────────────
  approveSelection: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['approved', 'rejected', 'pending']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const selection = await ctx.db.query.selections.findFirst({
        where: eq(selections.id, input.id),
        with: { project: true },
      });
      if (!selection) throw new Error('Selection not found');
      if ((selection.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const updates: any = {
        status: input.status,
        updatedAt: new Date(),
      };
      if (input.notes !== undefined) updates.notes = input.notes;

      const [updated] = await ctx.db.update(selections).set(updates)
        .where(eq(selections.id, input.id)).returning();
      return updated;
    }),
});
