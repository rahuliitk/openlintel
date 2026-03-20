import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  integrationConfigs, communicationPreferences, projects, eq, and,
} from '@openlintel/db';

export const integrationRouter = router({
  // ── Integration Configs ─────────────────────────────────

  listIntegrations: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.integrationConfigs.findMany({
        where: eq(integrationConfigs.userId, ctx.userId),
        orderBy: (c, { desc }) => [desc(c.updatedAt)],
      });
    }),

  getIntegration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.query.integrationConfigs.findFirst({
        where: and(eq(integrationConfigs.id, input.id), eq(integrationConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Integration not found');
      // Mask tokens for security
      return {
        ...config,
        accessToken: config.accessToken ? '***masked***' : null,
        refreshToken: config.refreshToken ? '***masked***' : null,
      };
    }),

  connect: protectedProcedure
    .input(z.union([
      // Original shape: provider-based connection
      z.object({
        provider: z.enum([
          'quickbooks', 'xero', 'google_drive', 'dropbox', 'onedrive',
          'slack', 'microsoft_teams', 'procore', 'buildertrend',
        ]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        config: z.any().optional(),
      }),
      // Project-scoped shape: used by integrations page
      z.object({
        projectId: z.string(),
        integrationId: z.string().min(1),
        apiKey: z.string().optional(),
        webhookUrl: z.string().optional(),
      }),
    ]))
    .mutation(async ({ ctx, input }) => {
      // Project-scoped connection (used by integrations page)
      if ('projectId' in input) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        });
        if (!project) throw new Error('Project not found');

        // Check if this integration is already connected for this project
        const allConfigs = await ctx.db.query.integrationConfigs.findMany({
          where: and(
            eq(integrationConfigs.userId, ctx.userId),
            eq(integrationConfigs.provider, input.integrationId),
          ),
        });
        const existingProjectConn = allConfigs.find((c) => {
          const cfg = (c.config as any) ?? {};
          return cfg.projectId === input.projectId;
        });

        if (existingProjectConn) {
          const updatedRows = await ctx.db.update(integrationConfigs).set({
            accessToken: input.apiKey ?? null,
            config: {
              projectId: input.projectId,
              integrationId: input.integrationId,
              webhookUrl: input.webhookUrl ?? null,
            },
            syncStatus: 'connected',
            updatedAt: new Date(),
          }).where(eq(integrationConfigs.id, existingProjectConn.id)).returning();
          const updated = updatedRows[0]!;
          return {
            id: updated.id,
            integrationId: input.integrationId,
            status: updated.syncStatus ?? 'connected',
            lastSyncAt: updated.lastSyncAt,
          };
        }

        const configRows = await ctx.db.insert(integrationConfigs).values({
          userId: ctx.userId,
          provider: input.integrationId,
          accessToken: input.apiKey ?? null,
          config: {
            projectId: input.projectId,
            integrationId: input.integrationId,
            webhookUrl: input.webhookUrl ?? null,
          },
          syncStatus: 'connected',
        }).returning();
        const config = configRows[0]!;
        return {
          id: config.id,
          integrationId: input.integrationId,
          status: config.syncStatus ?? 'connected',
          lastSyncAt: config.lastSyncAt,
        };
      }

      // Original provider-based connection
      const existing = await ctx.db.query.integrationConfigs.findFirst({
        where: and(
          eq(integrationConfigs.userId, ctx.userId),
          eq(integrationConfigs.provider, input.provider),
        ),
      });

      if (existing) {
        const [updated] = await ctx.db.update(integrationConfigs).set({
          accessToken: input.accessToken,
          refreshToken: input.refreshToken ?? null,
          config: input.config ?? null,
          syncStatus: 'connected',
          updatedAt: new Date(),
        }).where(eq(integrationConfigs.id, existing.id)).returning();
        return updated;
      }

      const [config] = await ctx.db.insert(integrationConfigs).values({
        userId: ctx.userId,
        provider: input.provider,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        config: input.config ?? null,
        syncStatus: 'connected',
      }).returning();
      return config;
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.query.integrationConfigs.findFirst({
        where: and(eq(integrationConfigs.id, input.id), eq(integrationConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Integration not found');
      await ctx.db.delete(integrationConfigs).where(eq(integrationConfigs.id, input.id));
      return { success: true };
    }),

  sync: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.query.integrationConfigs.findFirst({
        where: and(eq(integrationConfigs.id, input.id), eq(integrationConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Integration not found');
      // Mark as syncing — actual sync would be handled by a background service
      const [updated] = await ctx.db.update(integrationConfigs).set({
        syncStatus: 'syncing',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(integrationConfigs.id, input.id)).returning();
      return updated;
    }),

  // ══════════════════════════════════════════════════════════
  // Project-scoped integration connections (used by integrations page)
  // Stored in integrationConfigs with projectId in the config jsonb
  // ══════════════════════════════════════════════════════════

  // ── List project connections ──────────────────────────────
  listConnections: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      // Fetch all user integrations and filter by projectId in config
      const allConfigs = await ctx.db.query.integrationConfigs.findMany({
        where: eq(integrationConfigs.userId, ctx.userId),
        orderBy: (c, { desc }) => [desc(c.updatedAt)],
      });

      return allConfigs
        .filter((c) => {
          const cfg = (c.config as any) ?? {};
          return cfg.projectId === input.projectId;
        })
        .map((c) => {
          const cfg = (c.config as any) ?? {};
          return {
            id: c.id,
            integrationId: cfg.integrationId ?? c.provider,
            status: c.syncStatus ?? 'connected',
            lastSyncAt: c.lastSyncAt,
            createdAt: c.createdAt,
          };
        });
    }),

  // ── Sync now (project-scoped alias) ──────────────────────
  syncNow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.query.integrationConfigs.findFirst({
        where: and(eq(integrationConfigs.id, input.id), eq(integrationConfigs.userId, ctx.userId)),
      });
      if (!config) throw new Error('Integration not found');
      const updatedRows = await ctx.db.update(integrationConfigs).set({
        syncStatus: 'syncing',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(integrationConfigs.id, input.id)).returning();
      const updated = updatedRows[0]!;

      // Return in the shape the frontend expects after sync completes
      const cfg = (updated.config as any) ?? {};
      return {
        id: updated.id,
        integrationId: cfg.integrationId ?? updated.provider,
        status: 'connected' as const,
        lastSyncAt: updated.lastSyncAt,
      };
    }),

  // ── Communication Preferences ───────────────────────────

  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.communicationPreferences.findMany({
        where: eq(communicationPreferences.userId, ctx.userId),
        orderBy: (p, { asc }) => [asc(p.channel)],
      });
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      channel: z.enum(['email', 'sms', 'push', 'in_app', 'slack', 'whatsapp']),
      enabled: z.boolean(),
      config: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const existing = await ctx.db.query.communicationPreferences.findFirst({
          where: and(eq(communicationPreferences.id, input.id), eq(communicationPreferences.userId, ctx.userId)),
        });
        if (!existing) throw new Error('Preference not found');
        const [updated] = await ctx.db.update(communicationPreferences).set({
          enabled: input.enabled,
          config: input.config ?? null,
        }).where(eq(communicationPreferences.id, input.id)).returning();
        return updated;
      }

      // Check if preference for this channel already exists
      const existing = await ctx.db.query.communicationPreferences.findFirst({
        where: and(
          eq(communicationPreferences.userId, ctx.userId),
          eq(communicationPreferences.channel, input.channel),
        ),
      });

      if (existing) {
        const [updated] = await ctx.db.update(communicationPreferences).set({
          enabled: input.enabled,
          config: input.config ?? null,
        }).where(eq(communicationPreferences.id, existing.id)).returning();
        return updated;
      }

      const [pref] = await ctx.db.insert(communicationPreferences).values({
        userId: ctx.userId,
        channel: input.channel,
        enabled: input.enabled,
        config: input.config ?? null,
      }).returning();
      return pref;
    }),

  deletePreference: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pref = await ctx.db.query.communicationPreferences.findFirst({
        where: and(eq(communicationPreferences.id, input.id), eq(communicationPreferences.userId, ctx.userId)),
      });
      if (!pref) throw new Error('Preference not found');
      await ctx.db.delete(communicationPreferences).where(eq(communicationPreferences.id, input.id));
      return { success: true };
    }),
});
