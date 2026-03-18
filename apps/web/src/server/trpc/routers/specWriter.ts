import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  specifications, projects, bomResults, eq, and,
} from '@openlintel/db';

export const specWriterRouter = router({
  // ── List specifications ─────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      return ctx.db.query.specifications.findMany({
        where: eq(specifications.projectId, input.projectId),
        orderBy: (s, { asc }) => [asc(s.division), asc(s.section)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const spec = await ctx.db.query.specifications.findFirst({
        where: eq(specifications.id, input.id),
        with: { project: true },
      });
      if (!spec) throw new Error('Specification not found');
      if ((spec.project as any).userId !== ctx.userId) throw new Error('Access denied');
      return spec;
    }),

  // ── Create specification ────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      division: z.string().min(1),
      section: z.string().min(1),
      title: z.string().min(1),
      content: z.string().min(1),
      productReferences: z.any().optional(),
      format: z.enum(['prescriptive', 'performance', 'proprietary']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');
      const [spec] = await ctx.db.insert(specifications).values({
        projectId: input.projectId,
        division: input.division,
        section: input.section,
        title: input.title,
        content: input.content,
        productReferences: input.productReferences ?? null,
        format: input.format ?? 'prescriptive',
      }).returning();
      return spec;
    }),

  // ── Update specification ────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      division: z.string().optional(),
      section: z.string().optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      productReferences: z.any().optional(),
      format: z.enum(['prescriptive', 'performance', 'proprietary']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const spec = await ctx.db.query.specifications.findFirst({
        where: eq(specifications.id, input.id),
        with: { project: true },
      });
      if (!spec) throw new Error('Specification not found');
      if ((spec.project as any).userId !== ctx.userId) throw new Error('Access denied');
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(specifications).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(specifications.id, id)).returning();
      return updated;
    }),

  // ── Delete specification ────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const spec = await ctx.db.query.specifications.findFirst({
        where: eq(specifications.id, input.id),
        with: { project: true },
      });
      if (!spec) throw new Error('Specification not found');
      if ((spec.project as any).userId !== ctx.userId) throw new Error('Access denied');
      await ctx.db.delete(specifications).where(eq(specifications.id, input.id));
      return { success: true };
    }),

  // ── Generate specifications from BOM ────────────────────
  generateFromBom: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      bomResultId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const bom = await ctx.db.query.bomResults.findFirst({
        where: eq(bomResults.id, input.bomResultId),
      });
      if (!bom) throw new Error('BOM result not found');

      // Group BOM items by category and generate spec sections
      const items = (bom.items as any[]) ?? [];
      const byCategory: Record<string, any[]> = {};
      items.forEach((item) => {
        const cat = item.category || 'General';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(item);
      });

      // CSI division mapping
      const divisionMap: Record<string, string> = {
        'Flooring': '09',
        'Paint & Finishes': '09',
        'Furniture': '12',
        'Fixtures': '22',
        'Hardware': '08',
        'Electrical': '26',
        'Plumbing': '22',
      };

      const specs = [];
      let sectionCounter = 1;

      for (const [category, catItems] of Object.entries(byCategory)) {
        const division = divisionMap[category] || '01';
        const section = `${division} ${String(sectionCounter).padStart(2, '0')} 00`;
        const content = catItems.map((item: any) =>
          `- ${item.name}: ${item.specification || 'Per approved submittals'} (Qty: ${item.quantity} ${item.unit})`
        ).join('\n');

        const [spec] = await ctx.db.insert(specifications).values({
          projectId: input.projectId,
          division,
          section,
          title: category,
          content: `PART 1 - GENERAL\n1.1 SCOPE\nProvide all ${category.toLowerCase()} as specified herein.\n\nPART 2 - PRODUCTS\n2.1 MATERIALS\n${content}\n\nPART 3 - EXECUTION\n3.1 INSTALLATION\nInstall per manufacturer's instructions and applicable codes.`,
          productReferences: catItems.map((item: any) => ({
            name: item.name,
            specification: item.specification,
          })),
          format: 'prescriptive',
        }).returning();
        specs.push(spec);
        sectionCounter++;
      }

      return { generated: specs.length, specifications: specs };
    }),
});
