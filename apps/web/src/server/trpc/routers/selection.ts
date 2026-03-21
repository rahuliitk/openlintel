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

  // ── List selections (frontend-compatible flat list) ───
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const rows = await ctx.db.query.selections.findMany({
        where: eq(selections.projectId, input.projectId),
        with: { category: true },
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
      return rows.map((row) => ({
        ...row,
        itemName: row.productName ?? 'Untitled',
        category: (row.category as any)?.name ?? 'general',
        allowanceBudget: (row.category as any)?.allowanceBudget ?? null,
        dueDate: (row.category as any)?.dueDate ?? null,
        supplier: null,
      }));
    }),

  // ── Create a selection item (frontend-compatible) ─────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      category: z.string().min(1),
      itemName: z.string().min(1),
      allowanceBudget: z.number().optional(),
      actualCost: z.number().optional(),
      dueDate: z.date().optional(),
      supplier: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Find or create a category for this selection
      let category = await ctx.db.query.selectionCategories.findFirst({
        where: and(
          eq(selectionCategories.projectId, input.projectId),
          eq(selectionCategories.name, input.category),
        ),
      });
      if (!category) {
        const [newCat] = await ctx.db.insert(selectionCategories).values({
          projectId: input.projectId,
          name: input.category,
          allowanceBudget: input.allowanceBudget ?? null,
          dueDate: input.dueDate ?? null,
          sortOrder: 0,
        }).returning();
        category = newCat;
      }

      const overUnder = (input.actualCost != null && input.allowanceBudget != null)
        ? input.actualCost - input.allowanceBudget
        : null;

      const [selection] = await ctx.db.insert(selections).values({
        projectId: input.projectId,
        categoryId: category.id,
        productName: input.itemName,
        actualCost: input.actualCost ?? null,
        overUnder,
        notes: input.notes ?? null,
        status: 'pending',
      }).returning();
      return {
        ...selection,
        itemName: input.itemName,
        category: input.category,
        allowanceBudget: input.allowanceBudget ?? null,
        supplier: input.supplier ?? null,
        dueDate: input.dueDate ?? null,
      };
    }),

  // ── Sign off a selection ──────────────────────────────
  signOff: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selection = await ctx.db.query.selections.findFirst({
        where: eq(selections.id, input.id),
        with: { project: true },
      });
      if (!selection) throw new Error('Selection not found');
      if ((selection.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const [updated] = await ctx.db.update(selections).set({
        status: 'approved',
        updatedAt: new Date(),
      }).where(eq(selections.id, input.id)).returning();
      return updated;
    }),

  // ── Delete a selection ────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const selection = await ctx.db.query.selections.findFirst({
        where: eq(selections.id, input.id),
        with: { project: true },
      });
      if (!selection) throw new Error('Selection not found');
      if ((selection.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(selections).where(eq(selections.id, input.id));
      return { success: true };
    }),
});
