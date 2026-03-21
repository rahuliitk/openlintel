import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  insuranceCertificates, eq, and, lt,
} from '@openlintel/db';

export const insuranceRouter = router({
  // ── List certificates ───────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Insurance certs don't have userId directly, so we list by entity
      const conditions: any[] = [];
      if (input?.entityType) conditions.push(eq(insuranceCertificates.entityType, input.entityType));
      if (input?.entityId) conditions.push(eq(insuranceCertificates.entityId, input.entityId));
      return ctx.db.query.insuranceCertificates.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
    }),

  // ── Get by ID ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cert = await ctx.db.query.insuranceCertificates.findFirst({
        where: eq(insuranceCertificates.id, input.id),
      });
      if (!cert) throw new Error('Insurance certificate not found');
      return cert;
    }),

  // ── Create certificate ──────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      entityType: z.enum(['contractor', 'vendor', 'project']),
      entityId: z.string(),
      insuranceType: z.string().min(1),
      carrier: z.string().optional(),
      policyNumber: z.string().optional(),
      coverageAmount: z.number().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      certificateKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [cert] = await ctx.db.insert(insuranceCertificates).values({
        entityType: input.entityType,
        entityId: input.entityId,
        insuranceType: input.insuranceType,
        carrier: input.carrier ?? null,
        policyNumber: input.policyNumber ?? null,
        coverageAmount: input.coverageAmount ?? null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        certificateKey: input.certificateKey ?? null,
      }).returning();
      return cert;
    }),

  // ── Update certificate ──────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      insuranceType: z.string().optional(),
      carrier: z.string().optional(),
      policyNumber: z.string().optional(),
      coverageAmount: z.number().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      certificateKey: z.string().optional(),
      status: z.enum(['active', 'expired', 'cancelled']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cert = await ctx.db.query.insuranceCertificates.findFirst({
        where: eq(insuranceCertificates.id, input.id),
      });
      if (!cert) throw new Error('Insurance certificate not found');
      const { id, startDate, endDate, ...rest } = input;
      const updates: any = { ...rest };
      if (startDate) updates.startDate = new Date(startDate);
      if (endDate) updates.endDate = new Date(endDate);
      const [updated] = await ctx.db.update(insuranceCertificates).set(updates).where(eq(insuranceCertificates.id, id)).returning();
      return updated;
    }),

  // ── Delete certificate ──────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cert = await ctx.db.query.insuranceCertificates.findFirst({
        where: eq(insuranceCertificates.id, input.id),
      });
      if (!cert) throw new Error('Insurance certificate not found');
      await ctx.db.delete(insuranceCertificates).where(eq(insuranceCertificates.id, input.id));
      return { success: true };
    }),

  // ── Expiration alerts ───────────────────────────────────
  getExpirationAlerts: protectedProcedure
    .input(z.object({
      daysAhead: z.number().default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const daysAhead = input?.daysAhead ?? 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      const certs = await ctx.db.query.insuranceCertificates.findMany({
        where: and(
          eq(insuranceCertificates.status, 'active'),
          lt(insuranceCertificates.endDate, cutoffDate),
        ),
        orderBy: (c, { asc }) => [asc(c.endDate)],
      });
      return certs.map((cert) => ({
        ...cert,
        daysUntilExpiration: Math.ceil((cert.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        isExpired: cert.endDate.getTime() < Date.now(),
      }));
    }),

  // ── List certificates for a project (frontend-compatible) ──
  listCertificates: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const certs = await ctx.db.query.insuranceCertificates.findMany({
        where: eq(insuranceCertificates.entityId, input.projectId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      });
      return certs.map((cert) => ({
        ...cert,
        partyName: cert.entityType ?? 'Unknown',
        partyRole: cert.entityType ?? null,
        expirationDate: cert.endDate.toISOString(),
      }));
    }),

  // ── Create certificate (frontend-compatible) ──────────
  createCertificate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      partyName: z.string().min(1),
      partyRole: z.string().optional(),
      insuranceType: z.string().min(1),
      carrier: z.string().optional(),
      policyNumber: z.string().optional(),
      coverageAmount: z.number().optional(),
      effectiveDate: z.string().optional(),
      expirationDate: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const [cert] = await ctx.db.insert(insuranceCertificates).values({
        entityType: 'project',
        entityId: input.projectId,
        insuranceType: input.insuranceType,
        carrier: input.carrier ?? null,
        policyNumber: input.policyNumber ?? null,
        coverageAmount: input.coverageAmount ?? null,
        startDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
        endDate: new Date(input.expirationDate),
        certificateKey: null,
      }).returning();
      return {
        ...cert,
        partyName: input.partyName,
        partyRole: input.partyRole ?? null,
        expirationDate: input.expirationDate,
      };
    }),

  // ── Delete certificate (frontend-compatible alias) ─────
  deleteCertificate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cert = await ctx.db.query.insuranceCertificates.findFirst({
        where: eq(insuranceCertificates.id, input.id),
      });
      if (!cert) throw new Error('Insurance certificate not found');
      await ctx.db.delete(insuranceCertificates).where(eq(insuranceCertificates.id, input.id));
      return { success: true };
    }),
});
