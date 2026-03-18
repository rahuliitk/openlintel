import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import {
  siteAnalyses, projects, eq, and,
} from '@openlintel/db';

export const siteAnalysisRouter = router({
  // ── Get site analysis for a project ───────────────────────
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      return ctx.db.query.siteAnalyses.findFirst({
        where: eq(siteAnalyses.projectId, input.projectId),
      });
    }),

  // ── Save (upsert) site analysis ───────────────────────────
  save: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      projectId: z.string(),
      topoData: z.object({
        elevationPoints: z.array(z.object({
          x: z.number(), y: z.number(), elevation: z.number(),
        })).optional(),
        contourInterval: z.number().optional(),
        slopePercent: z.number().optional(),
        slopeDirection: z.string().optional(),
      }).optional(),
      setbacks: z.object({
        frontMm: z.number().optional(),
        rearMm: z.number().optional(),
        leftMm: z.number().optional(),
        rightMm: z.number().optional(),
        code: z.string().optional(),
      }).optional(),
      solarData: z.object({
        annualSunHours: z.number().optional(),
        bestOrientation: z.string().optional(),
        shadingFactors: z.array(z.record(z.unknown())).optional(),
      }).optional(),
      gradeData: z.object({
        existingGrade: z.number().optional(),
        proposedGrade: z.number().optional(),
        cutVolumeCuM: z.number().optional(),
        fillVolumeCuM: z.number().optional(),
      }).optional(),
      drainagePlan: z.object({
        swaleLocations: z.array(z.record(z.unknown())).optional(),
        drainPoints: z.array(z.record(z.unknown())).optional(),
        percolationRate: z.number().optional(),
      }).optional(),
      soilType: z.string().optional(),
      floodZone: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      if (input.id) {
        const existing = await ctx.db.query.siteAnalyses.findFirst({
          where: eq(siteAnalyses.id, input.id),
          with: { project: true },
        });
        if (!existing) throw new Error('Site analysis not found');
        if ((existing.project as any).userId !== ctx.userId) throw new Error('Access denied');

        const [updated] = await ctx.db.update(siteAnalyses).set({
          topoData: input.topoData ?? existing.topoData,
          setbacks: input.setbacks ?? existing.setbacks,
          solarData: input.solarData ?? existing.solarData,
          gradeData: input.gradeData ?? existing.gradeData,
          drainagePlan: input.drainagePlan ?? existing.drainagePlan,
          soilType: input.soilType ?? existing.soilType,
          floodZone: input.floodZone ?? existing.floodZone,
          latitude: input.latitude ?? existing.latitude,
          longitude: input.longitude ?? existing.longitude,
          updatedAt: new Date(),
        }).where(eq(siteAnalyses.id, input.id)).returning();
        return updated;
      }

      const [analysis] = await ctx.db.insert(siteAnalyses).values({
        projectId: input.projectId,
        topoData: input.topoData ?? null,
        setbacks: input.setbacks ?? null,
        solarData: input.solarData ?? null,
        gradeData: input.gradeData ?? null,
        drainagePlan: input.drainagePlan ?? null,
        soilType: input.soilType ?? null,
        floodZone: input.floodZone ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      }).returning();
      return analysis;
    }),

  // ── Calculate sun path for the site ───────────────────────
  calculateSunPath: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const site = await ctx.db.query.siteAnalyses.findFirst({
        where: eq(siteAnalyses.projectId, input.projectId),
      });
      if (!site) throw new Error('No site analysis found. Save site data with latitude/longitude first.');

      const lat = site.latitude ?? 28.6;  // Default to New Delhi
      const lng = site.longitude ?? 77.2;

      // Calculate solar angles for key dates (solstices + equinox)
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;

      const calculateSolarNoon = (dayOfYear: number) => {
        const declination = 23.45 * Math.sin(toRad((360 / 365) * (dayOfYear - 81)));
        const maxAltitude = 90 - lat + declination;
        return { declination: Math.round(declination * 10) / 10, maxAltitude: Math.round(maxAltitude * 10) / 10 };
      };

      const summerSolstice = calculateSolarNoon(172);  // June 21
      const winterSolstice = calculateSolarNoon(356);   // Dec 22
      const equinox = calculateSolarNoon(80);            // March 21

      // Estimate annual sun hours (simplified model based on latitude)
      const annualSunHours = Math.round(2000 + (90 - Math.abs(lat)) * 15);

      // Best orientation for solar gain
      const bestOrientation = lat >= 0 ? 'south' : 'north';

      const solarData = {
        latitude: lat,
        longitude: lng,
        annualSunHours,
        bestOrientation,
        summerSolstice: {
          date: 'June 21',
          maxAltitude: summerSolstice.maxAltitude,
          declination: summerSolstice.declination,
          sunriseAzimuth: Math.round(90 - summerSolstice.declination),
          sunsetAzimuth: Math.round(270 + summerSolstice.declination),
        },
        winterSolstice: {
          date: 'December 22',
          maxAltitude: winterSolstice.maxAltitude,
          declination: winterSolstice.declination,
          sunriseAzimuth: Math.round(90 + Math.abs(winterSolstice.declination)),
          sunsetAzimuth: Math.round(270 - Math.abs(winterSolstice.declination)),
        },
        equinox: {
          date: 'March 21',
          maxAltitude: equinox.maxAltitude,
          declination: equinox.declination,
          sunriseAzimuth: 90,
          sunsetAzimuth: 270,
        },
        recommendations: [
          `Maximize ${bestOrientation}-facing windows for passive solar gain`,
          `Summer max sun angle: ${summerSolstice.maxAltitude}° — use overhangs for shade`,
          `Winter max sun angle: ${winterSolstice.maxAltitude}° — ensure no obstructions`,
          annualSunHours > 2500 ? 'Excellent solar energy potential for PV panels' : 'Moderate solar energy potential',
        ],
      };

      // Persist the solar data
      await ctx.db.update(siteAnalyses).set({
        solarData,
        updatedAt: new Date(),
      }).where(eq(siteAnalyses.id, site.id));

      return solarData;
    }),

  // ── Calculate grade / earthwork ───────────────────────────
  calculateGrade: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
      });
      if (!project) throw new Error('Project not found');

      const site = await ctx.db.query.siteAnalyses.findFirst({
        where: eq(siteAnalyses.projectId, input.projectId),
      });
      if (!site) throw new Error('No site analysis found. Save site data first.');

      const topo = site.topoData as {
        elevationPoints?: Array<{ x: number; y: number; elevation: number }>;
        slopePercent?: number;
      } | null;

      if (!topo?.elevationPoints || topo.elevationPoints.length < 2) {
        return {
          success: false,
          message: 'At least 2 elevation points are needed for grade calculation',
        };
      }

      const points = topo.elevationPoints;
      const elevations = points.map((p) => p.elevation);
      const maxElevation = Math.max(...elevations);
      const minElevation = Math.min(...elevations);
      const elevationDifference = maxElevation - minElevation;

      // Calculate average existing grade
      const avgElevation = elevations.reduce((s, e) => s + e, 0) / elevations.length;

      // Calculate bounding box distance for slope
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const diagonalDistance = Math.sqrt(
        (Math.max(...xs) - Math.min(...xs)) ** 2 +
        (Math.max(...ys) - Math.min(...ys)) ** 2,
      );

      const slopePercent = diagonalDistance > 0 ? (elevationDifference / diagonalDistance) * 100 : 0;

      // Estimate cut/fill volumes (simplified prismatic method)
      const proposedGrade = avgElevation; // level to average
      let cutVolume = 0;
      let fillVolume = 0;
      const cellArea = 1; // 1 sqm per point (simplified)

      for (const point of points) {
        const diff = point.elevation - proposedGrade;
        if (diff > 0) cutVolume += diff * cellArea;
        else fillVolume += Math.abs(diff) * cellArea;
      }

      const gradeData = {
        existingGrade: Math.round(avgElevation * 100) / 100,
        proposedGrade: Math.round(proposedGrade * 100) / 100,
        maxElevation: Math.round(maxElevation * 100) / 100,
        minElevation: Math.round(minElevation * 100) / 100,
        elevationDifference: Math.round(elevationDifference * 100) / 100,
        slopePercent: Math.round(slopePercent * 10) / 10,
        cutVolumeCuM: Math.round(cutVolume * 100) / 100,
        fillVolumeCuM: Math.round(fillVolume * 100) / 100,
        netEarthwork: Math.round((cutVolume - fillVolume) * 100) / 100,
        isBalanced: Math.abs(cutVolume - fillVolume) < cutVolume * 0.1,
        pointCount: points.length,
      };

      // Persist the grade data
      await ctx.db.update(siteAnalyses).set({
        gradeData,
        topoData: { ...topo, slopePercent: gradeData.slopePercent },
        updatedAt: new Date(),
      }).where(eq(siteAnalyses.id, site.id));

      return { success: true, ...gradeData };
    }),
});
