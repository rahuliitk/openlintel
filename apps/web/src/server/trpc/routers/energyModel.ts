import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  energyModels, projects, jobs, eq, and,
} from '@openlintel/db';

export const energyModelRouter = router({
  // ── Get energy model for a project ────────────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.energyModels.findFirst({
        where: eq(energyModels.projectId, input.projectId),
      });
    }),

  // ── Create an energy model ────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      envelopeSpec: z.object({
        wallRValue: z.number().optional(),
        roofRValue: z.number().optional(),
        floorRValue: z.number().optional(),
        windowUValue: z.number().optional(),
        windowShgc: z.number().optional(),
        airChangesPerHour: z.number().optional(),
        insulationType: z.string().optional(),
        wallAssembly: z.string().optional(),
        roofAssembly: z.string().optional(),
        glazingType: z.string().optional(),
        glazingPercent: z.number().optional(),
      }).optional(),
      climateZone: z.string().optional(),
      solarPanelSpec: z.object({
        systemSizeKw: z.number().optional(),
        panelCount: z.number().optional(),
        panelWattage: z.number().optional(),
        orientation: z.string().optional(),
        tiltAngle: z.number().optional(),
        annualProductionKwh: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const [model] = await ctx.db.insert(energyModels).values({
        projectId: input.projectId,
        envelopeSpec: input.envelopeSpec ?? null,
        climateZone: input.climateZone ?? null,
        solarPanelSpec: input.solarPanelSpec ?? null,
      }).returning();
      return model;
    }),

  // ── Simulate energy performance (creates a job) ───────────
  simulate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const model = await ctx.db.query.energyModels.findFirst({
        where: eq(energyModels.projectId, input.projectId),
      });
      if (!model) throw new Error('No energy model found. Create one first.');

      // Create a simulation job
      const [job] = await ctx.db.insert(jobs).values({
        userId: ctx.userId,
        type: 'energy_simulation',
        status: 'pending',
        inputJson: {
          projectId: input.projectId,
          energyModelId: model.id,
          envelopeSpec: model.envelopeSpec,
          climateZone: model.climateZone,
        },
        projectId: input.projectId,
      }).returning();
      if (!job) throw new Error('Failed to create job');

      await ctx.db.update(jobs).set({
        status: 'running',
        startedAt: new Date(),
        progress: 10,
      }).where(eq(jobs.id, job.id));

      // Perform a simplified energy simulation synchronously
      const envelope = (model.envelopeSpec as Record<string, number>) ?? {};
      const solar = (model.solarPanelSpec as Record<string, number>) ?? {};

      // Get total conditioned area from project rooms
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq((await import('@openlintel/db')).rooms.projectId, input.projectId),
      });
      const totalAreaSqm = projectRooms.reduce((sum, r) => {
        return sum + ((r.lengthMm ?? 0) * (r.widthMm ?? 0)) / 1_000_000;
      }, 0) || 150; // default 150 sqm

      // Heating/cooling load estimation (simplified degree-day method)
      const wallR = envelope.wallRValue ?? 3.5;
      const roofR = envelope.roofRValue ?? 6.0;
      const windowU = envelope.windowUValue ?? 1.8;
      const ach = envelope.airChangesPerHour ?? 0.5;
      const glazingPercent = envelope.glazingPercent ?? 15;

      // Approximate UA value (heat loss coefficient)
      const wallArea = Math.sqrt(totalAreaSqm) * 4 * 2.7; // perimeter * height
      const windowArea = wallArea * (glazingPercent / 100);
      const opaqueWallArea = wallArea - windowArea;
      const roofArea = totalAreaSqm;

      const uaWalls = opaqueWallArea / wallR;
      const uaRoof = roofArea / roofR;
      const uaWindows = windowArea * windowU;
      const volume = totalAreaSqm * 2.7;
      const uaInfiltration = 0.34 * ach * volume;
      const totalUA = uaWalls + uaRoof + uaWindows + uaInfiltration;

      // Annual energy (simplified, 3000 HDD + 1500 CDD climate)
      const hdd = model.climateZone === 'hot' ? 500 : model.climateZone === 'cold' ? 5000 : 3000;
      const cdd = model.climateZone === 'hot' ? 3000 : model.climateZone === 'cold' ? 500 : 1500;

      const heatingKwh = Math.round((totalUA * hdd * 24) / 1000);
      const coolingKwh = Math.round((totalUA * cdd * 24) / 1000 / 3); // COP ~3 for AC
      const lightingKwh = Math.round(totalAreaSqm * 10); // 10 kWh/sqm/year
      const appliancesKwh = Math.round(totalAreaSqm * 20); // 20 kWh/sqm/year
      const hotWaterKwh = Math.round(totalAreaSqm * 15); // 15 kWh/sqm/year
      const totalKwh = heatingKwh + coolingKwh + lightingKwh + appliancesKwh + hotWaterKwh;

      // Solar offset
      const solarProductionKwh = solar.annualProductionKwh ?? (solar.systemSizeKw ? solar.systemSizeKw * 1400 : 0);
      const netKwh = Math.max(0, totalKwh - solarProductionKwh);

      // HERS-like score (100 = reference home, 0 = net-zero)
      const referenceKwh = totalAreaSqm * 80; // typical reference home
      const hersScore = Math.round((netKwh / referenceKwh) * 100);

      const simulationResult = {
        totalAreaSqm: Math.round(totalAreaSqm * 100) / 100,
        annualEnergyKwh: totalKwh,
        breakdown: {
          heatingKwh,
          coolingKwh,
          lightingKwh,
          appliancesKwh,
          hotWaterKwh,
        },
        solarProductionKwh: Math.round(solarProductionKwh),
        netEnergyKwh: netKwh,
        energyPerSqm: Math.round((totalKwh / totalAreaSqm) * 10) / 10,
        heatLossCoefficient: Math.round(totalUA * 10) / 10,
        heatLossBreakdown: {
          walls: Math.round(uaWalls * 10) / 10,
          roof: Math.round(uaRoof * 10) / 10,
          windows: Math.round(uaWindows * 10) / 10,
          infiltration: Math.round(uaInfiltration * 10) / 10,
        },
      };

      const recommendations = [];
      if (wallR < 4) recommendations.push('Increase wall insulation to R-4+ for better thermal performance');
      if (windowU > 1.5) recommendations.push('Upgrade to low-E double/triple glazing (U < 1.5)');
      if (ach > 0.6) recommendations.push('Improve air sealing to reduce infiltration losses');
      if (!solar.systemSizeKw) recommendations.push('Consider solar PV to offset energy consumption');
      if (hersScore > 80) recommendations.push('Current design exceeds reference home energy use significantly');

      // Update the model with simulation results
      await ctx.db.update(energyModels).set({
        simulationResult,
        hersScore,
        recommendations,
        jobId: job.id,
      }).where(eq(energyModels.id, model.id));

      // Complete the job
      await ctx.db.update(jobs).set({
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        outputJson: { energyModelId: model.id, hersScore, totalKwh: totalKwh, netKwh },
      }).where(eq(jobs.id, job.id));

      return {
        job,
        simulationResult,
        hersScore,
        recommendations,
      };
    }),
});
