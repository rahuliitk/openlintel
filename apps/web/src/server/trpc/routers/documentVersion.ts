import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  documentVersions, projects, eq, and,
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

      return ctx.db.query.documentVersions.findMany({
        where: and(...conditions),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),

  // ── Create a new revision ──────────────────────────────
  createRevision: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      documentType: z.string().min(1),
      documentNumber: z.string().min(1),
      revision: z.string().min(1),
      title: z.string().min(1),
      fileKey: z.string().min(1),
      previousVersionId: z.string().optional(),
      changesDescription: z.string().optional(),
      distributionList: z.array(z.string()).optional(),
      issuedDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // If there is a previous version, mark it as superseded
      if (input.previousVersionId) {
        await ctx.db.update(documentVersions).set({
          status: 'superseded',
        }).where(eq(documentVersions.id, input.previousVersionId));
      }

      const [version] = await ctx.db.insert(documentVersions).values({
        projectId: input.projectId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        revision: input.revision,
        title: input.title,
        fileKey: input.fileKey,
        previousVersionId: input.previousVersionId ?? null,
        changesDescription: input.changesDescription ?? null,
        distributionList: input.distributionList ?? null,
        issuedDate: input.issuedDate ?? new Date(),
        status: 'current',
      }).returning();
      return version;
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

      const versions = await ctx.db.query.documentVersions.findMany({
        where: and(
          eq(documentVersions.projectId, input.projectId),
          eq(documentVersions.documentNumber, input.documentNumber),
        ),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
      return versions;
    }),

  // ── Compare two versions ───────────────────────────────
  compareVersions: protectedProcedure
    .input(z.object({
      versionAId: z.string(),
      versionBId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const versionA = await ctx.db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, input.versionAId),
        with: { project: true },
      });
      if (!versionA) throw new Error('Version A not found');
      if ((versionA.project as any).userId !== ctx.userId) throw new Error('Access denied');

      const versionB = await ctx.db.query.documentVersions.findFirst({
        where: eq(documentVersions.id, input.versionBId),
        with: { project: true },
      });
      if (!versionB) throw new Error('Version B not found');
      if ((versionB.project as any).userId !== ctx.userId) throw new Error('Access denied');

      return {
        versionA: {
          id: versionA.id,
          revision: versionA.revision,
          title: versionA.title,
          fileKey: versionA.fileKey,
          changesDescription: versionA.changesDescription,
          issuedDate: versionA.issuedDate,
          status: versionA.status,
        },
        versionB: {
          id: versionB.id,
          revision: versionB.revision,
          title: versionB.title,
          fileKey: versionB.fileKey,
          changesDescription: versionB.changesDescription,
          issuedDate: versionB.issuedDate,
          status: versionB.status,
        },
        isSameDocument: versionA.documentNumber === versionB.documentNumber,
        revisionDifference: {
          from: versionA.revision,
          to: versionB.revision,
          changesInB: versionB.changesDescription,
        },
      };
    }),
});
