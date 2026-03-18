import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  integrationConfigs, communicationPreferences, eq, and,
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
    .input(z.object({
      provider: z.enum([
        'quickbooks', 'xero', 'google_drive', 'dropbox', 'onedrive',
        'slack', 'microsoft_teams', 'procore', 'buildertrend',
      ]),
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      config: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if integration already exists for this provider
      const existing = await ctx.db.query.integrationConfigs.findFirst({
        where: and(
          eq(integrationConfigs.userId, ctx.userId),
          eq(integrationConfigs.provider, input.provider),
        ),
      });

      if (existing) {
        // Update existing integration
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
