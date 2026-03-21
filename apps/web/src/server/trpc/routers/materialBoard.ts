import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  materialBoards, projects, rooms, eq, and,
} from '@openlintel/db';

// Fallback color palettes used only for initial board creation (before AI generation)
const CATEGORY_SWATCHES: Record<string, string[]> = {
  flooring: ['#8B7355', '#C4A882', '#D2B48C', '#A0522D'],
  wall_finish: ['#F5F5DC', '#FFFDD0', '#FFF8E7', '#E8E4C9'],
  countertop: ['#808080', '#A9A9A9', '#2F4F4F', '#D3D3D3'],
  backsplash: ['#4682B4', '#5F9EA0', '#B0C4DE', '#87CEEB'],
  cabinetry: ['#DEB887', '#D2691E', '#8B4513', '#F5DEB3'],
  hardware: ['#C0C0C0', '#FFD700', '#CD7F32', '#B87333'],
  fabric: ['#800020', '#4B0082', '#2E8B57', '#DAA520'],
  paint: ['#87CEEB', '#98FB98', '#FFDAB9', '#E6E6FA'],
  tile: ['#FFFFFF', '#F0F0F0', '#D4E6F1', '#FADBD8'],
  stone: ['#696969', '#A9A9A9', '#BDB76B', '#556B2F'],
  wood: ['#DEB887', '#D2691E', '#8B4513', '#A0522D'],
  metal: ['#C0C0C0', '#71797E', '#B87333', '#FFD700'],
};

export const materialBoardRouter = router({
  // ── List material boards for a project ──────────────────────
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

      const conditions = [eq(materialBoards.projectId, input.projectId)];
      if (input.roomId) conditions.push(eq(materialBoards.roomId, input.roomId));

      return ctx.db.query.materialBoards.findMany({
        where: and(...conditions),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  // ── Create a material board ─────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      boardType: z.string().min(1),
      roomId: z.string().optional(),
      materialCategory: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const category = input.materialCategory ?? 'flooring';
      const swatches = CATEGORY_SWATCHES[category] ?? CATEGORY_SWATCHES.flooring;

      const [board] = await ctx.db.insert(materialBoards).values({
        projectId: input.projectId,
        roomId: input.roomId ?? null,
        name: input.name,
        boardType: input.boardType,
        materialCategory: category,
        description: input.description ?? null,
        status: 'draft',
        materialCount: 0,
        swatches,
        items: [],
        layout: 'grid',
      }).returning();
      return board;
    }),

  // ── Generate board content (AI-assisted material compilation) ──
  generate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Mark as generating
      await ctx.db.update(materialBoards).set({ status: 'generating' })
        .where(eq(materialBoards.id, input.id));

      const category = (board.materialCategory ?? 'flooring') as string;
      const boardType = (board.boardType ?? 'room') as string;
      const projectName = (board.project as any).name ?? 'Untitled Project';

      // Fetch room details if board is tied to a room
      let roomContext = '';
      if (board.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: eq(rooms.id, board.roomId),
        });
        if (room) {
          const areaSqFt = room.lengthMm && room.widthMm
            ? ((room.lengthMm / 1000) * (room.widthMm / 1000) * 10.764).toFixed(0)
            : null;
          roomContext = `\nRoom: "${room.name}" (type: ${room.type}${areaSqFt ? `, ~${areaSqFt} sq ft` : ''})`;
        }
      }

      const systemPrompt = `You are an expert interior designer and material specification consultant. You recommend real, commercially available materials from well-known brands. Your recommendations should be practical, aesthetically cohesive, and span a range of price points (budget, mid-range, premium).

Always respond with valid JSON matching this exact structure:
{
  "materials": [
    {
      "name": "Product name with specific model/SKU if applicable",
      "brand": "Real manufacturer/brand name",
      "finish": "Surface finish description",
      "color": "#hex color code that closely represents the material",
      "size": "Standard dimensions or coverage",
      "pricePerUnit": 0.00,
      "unit": "pricing unit (sq ft, gallon, piece, linear ft, yard, sheet, roll)",
      "category": "${category}",
      "notes": "Brief note on best use, pros, or design tip"
    }
  ]
}`;

      const userPrompt = `Generate a material board for the following:
- Project: "${projectName}"
- Board name: "${board.name}"
- Board type: ${boardType.replace(/_/g, ' ')}
- Material category: ${category.replace(/_/g, ' ')}${roomContext}${board.description ? `\n- Design brief: "${board.description}"` : ''}

Recommend 5-8 materials that:
1. Are real, currently available products from known brands (e.g., Daltile, MSI, Shaw, Benjamin Moore, Caesarstone, KraftMaid, Crypton, etc.)
2. Work well together aesthetically for the ${boardType.replace(/_/g, ' ')} board type
3. Include a mix of price points (at least one budget-friendly and one premium option)
4. Have accurate hex color codes that visually represent each material
5. Include realistic current market pricing in USD
${board.description ? `6. Align with the design brief: "${board.description}"` : ''}

Return ONLY the JSON object with the "materials" array.`;

      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is not configured in environment.');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 4096,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI API error: ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '{}';
        const result = JSON.parse(content) as Record<string, unknown>;

        const materials = Array.isArray(result.materials) ? result.materials : [];

        if (materials.length === 0) {
          throw new Error('AI returned no materials. Please try again.');
        }

        // Validate and sanitize each material item
        const generatedItems = materials.map((m: any) => ({
          name: String(m.name ?? 'Unknown'),
          brand: String(m.brand ?? 'Unknown'),
          finish: String(m.finish ?? ''),
          color: typeof m.color === 'string' && m.color.startsWith('#') ? m.color : '#808080',
          size: String(m.size ?? ''),
          pricePerUnit: typeof m.pricePerUnit === 'number' ? m.pricePerUnit : 0,
          unit: String(m.unit ?? 'unit'),
          category,
          quantity: 1,
          notes: String(m.notes ?? ''),
        }));

        const swatches = generatedItems.map((item: any) => item.color).filter(Boolean).slice(0, 6);

        const [updated] = await ctx.db.update(materialBoards).set({
          items: generatedItems,
          materialCount: generatedItems.length,
          swatches: swatches.length > 0 ? swatches : (board.swatches as string[]),
          status: 'ready',
        }).where(eq(materialBoards.id, input.id)).returning();

        return updated;
      } catch (err: any) {
        // Revert status back to draft on failure
        await ctx.db.update(materialBoards).set({ status: 'draft' })
          .where(eq(materialBoards.id, input.id));
        throw new Error(err.message ?? 'Failed to generate material board');
      }
    }),

  // ── Export board as PDF ─────────────────────────────────────
  export: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const pdfKey = `material-boards/${board.id}/board-${Date.now()}.pdf`;

      await ctx.db.update(materialBoards).set({ pdfKey }).where(eq(materialBoards.id, input.id));

      return {
        pdfKey,
        downloadUrl: `/api/uploads/${encodeURIComponent(pdfKey)}`,
        summary: {
          boardName: board.name,
          projectName: (board.project as any).name,
          itemCount: ((board.items as any[]) ?? []).length,
          generatedAt: new Date().toISOString(),
        },
      };
    }),

  // ── Share board (generate share token) ──────────────────────
  share: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const shareToken = (board.shareToken as string) ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      await ctx.db.update(materialBoards).set({
        shareToken,
        status: 'shared',
      }).where(eq(materialBoards.id, input.id));

      return {
        shareToken,
        shareUrl: `/shared/board/${shareToken}`,
      };
    }),

  // ── Delete a material board ─────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.materialBoards.findFirst({
        where: eq(materialBoards.id, input.id),
        with: { project: true },
      });
      if (!board) throw new Error('Material board not found');
      if ((board.project as any).userId !== ctx.userId) throw new Error('Access denied');

      if (board.pdfKey) {
        const { deleteFile } = await import('@/lib/storage');
        await deleteFile(board.pdfKey);
      }

      await ctx.db.delete(materialBoards).where(eq(materialBoards.id, input.id));
      return { success: true };
    }),
});

