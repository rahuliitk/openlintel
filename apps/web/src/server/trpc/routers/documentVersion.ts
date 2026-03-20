import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  documentVersions, projects, eq, and, desc, sql,
} from '@openlintel/db';

export const documentVersionRouter = router({
  // ── List document versions by project ──────────────────
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      documentType: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const conditions = [eq(documentVersions.projectId, input.projectId)];
      if (input.documentType) conditions.push(eq(documentVersions.documentType, input.documentType));
      if (input.status) conditions.push(eq(documentVersions.status, input.status));

      const rows = await ctx.db.query.documentVersions.findMany({
        where: and(...conditions),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });

      // Compute revision counts per documentNumber
      const revCounts: Record<string, number> = {};
      for (const row of rows) {
        const key = row.documentNumber || row.id;
        revCounts[key] = (revCounts[key] || 0) + 1;
      }

      // Map DB field names to what the frontend expects
      return rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        docType: row.documentType,
        docNumber: row.documentNumber,
        revision: row.revision,
        status: row.status,
        description: row.changesDescription,
        distributedTo: row.distributionList,
        fileKey: row.fileKey,
        previousVersionId: row.previousVersionId,
        issuedDate: row.issuedDate,
        createdAt: row.createdAt,
        updatedAt: row.issuedDate || row.createdAt,
        revisionCount: revCounts[row.documentNumber || row.id] || 1,
      }));
    }),

  // ── Create a new document ──────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1),
      docType: z.string().min(1),
      docNumber: z.string().optional(),
      revision: z.string().default('A'),
      description: z.string().optional(),
      distributedTo: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [doc] = await ctx.db.insert(documentVersions).values({
        projectId: input.projectId,
        title: input.title,
        documentType: input.docType,
        documentNumber: input.docNumber || null,
        revision: input.revision,
        changesDescription: input.description || null,
        distributionList: input.distributedTo || null,
        status: 'current',
        issuedDate: new Date(),
      }).returning();

      return doc;
    }),

  // ── Create a new revision of an existing document ──────
  createRevision: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the current document
      const current = await ctx.db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, input.id),
        with: { project: true },
      });
      if (!current) throw new Error('Document not found');
      if ((current.project as any).userId !== ctx.userId) throw new Error('Access denied');

      // Auto-increment revision: A→B, B→C, ..., Z→AA, etc.
      const nextRevision = incrementRevision(current.revision);

      // Mark current as superseded
      await ctx.db.update(documentVersions).set({
        status: 'superseded',
      }).where(eq(documentVersions.id, current.id));

      // Create new revision
      const [newVersion] = await ctx.db.insert(documentVersions).values({
        projectId: current.projectId,
        title: current.title,
        documentType: current.documentType,
        documentNumber: current.documentNumber,
        revision: nextRevision,
        previousVersionId: current.id,
        changesDescription: null,
        distributionList: current.distributionList,
        status: 'current',
        issuedDate: new Date(),
      }).returning();

      return newVersion;
    }),

  // ── Delete a document version ──────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, input.id),
        with: { project: true },
      });
      if (!doc) throw new Error('Document not found');
      if ((doc.project as any).userId !== ctx.userId) throw new Error('Access denied');

      await ctx.db.delete(documentVersions).where(eq(documentVersions.id, input.id));
      return { success: true };
    }),

  // ── Get version history for a document number ──────────
  getHistory: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      documentNumber: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.documentVersions.findMany({
        where: and(
          eq(documentVersions.projectId, input.projectId),
          eq(documentVersions.documentNumber, input.documentNumber),
        ),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),
});

function incrementRevision(rev: string): string {
  if (!rev) return 'A';
  // Handle single letter: A→B, ..., Z→AA
  if (/^[A-Z]$/.test(rev)) {
    return rev === 'Z' ? 'AA' : String.fromCharCode(rev.charCodeAt(0) + 1);
  }
  // Handle numeric: 1→2, 01→02
  if (/^\d+$/.test(rev)) {
    return String(parseInt(rev, 10) + 1);
  }
  // Handle multi-letter or mixed: append .1 or increment last char
  const last = rev[rev.length - 1];
  if (/[A-Z]/.test(last) && last !== 'Z') {
    return rev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
  }
  return rev + '.1';
}
