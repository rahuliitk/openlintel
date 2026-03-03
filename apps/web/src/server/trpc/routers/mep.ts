import { z } from 'zod';
import { mepCalculations, designVariants, rooms, projects, jobs, eq, and } from '@openlintel/db';
import { router, protectedProcedure } from '../init';

// ---------------------------------------------------------------------------
// Electrical calculation (NEC 2020)
// ---------------------------------------------------------------------------

function calculateElectrical(
  roomType: string,
  areaSqFt: number,
  lengthMm: number,
  widthMm: number,
) {
  // General lighting load — NEC 220.12: 3 VA per sq ft
  const generalLightingVA = areaSqFt * 3;

  // Small appliance circuits — NEC 210.11(C)(1)
  const smallApplianceCircuits = roomType === 'kitchen' ? 2 : 1;
  const smallApplianceVA = smallApplianceCircuits * 1500;

  // Dedicated appliance loads by room
  let dedicatedLoadVA = 0;
  const dedicatedCircuits: { name: string; loadVA: number; breakerA: number; wireGauge: string }[] = [];

  if (roomType === 'kitchen') {
    dedicatedCircuits.push(
      { name: 'Refrigerator', loadVA: 800, breakerA: 20, wireGauge: '12 AWG' },
      { name: 'Dishwasher', loadVA: 1500, breakerA: 20, wireGauge: '12 AWG' },
      { name: 'Microwave', loadVA: 1500, breakerA: 20, wireGauge: '12 AWG' },
      { name: 'Garbage Disposal', loadVA: 900, breakerA: 20, wireGauge: '12 AWG' },
    );
    dedicatedLoadVA = dedicatedCircuits.reduce((s, c) => s + c.loadVA, 0);
  } else if (roomType === 'bathroom') {
    dedicatedCircuits.push(
      { name: 'Exhaust Fan', loadVA: 120, breakerA: 15, wireGauge: '14 AWG' },
      { name: 'GFCI Outlet', loadVA: 1500, breakerA: 20, wireGauge: '12 AWG' },
    );
    dedicatedLoadVA = dedicatedCircuits.reduce((s, c) => s + c.loadVA, 0);
  } else if (roomType === 'bedroom' || roomType === 'living_room') {
    dedicatedCircuits.push(
      { name: 'AC / Split Unit', loadVA: 1800, breakerA: 20, wireGauge: '12 AWG' },
    );
    dedicatedLoadVA = dedicatedCircuits.reduce((s, c) => s + c.loadVA, 0);
  }

  const totalLoadVA = generalLightingVA + smallApplianceVA + dedicatedLoadVA;

  // Circuit breaker sizing
  const breakerAmps = totalLoadVA / 240 > 15 ? 20 : 15;
  const wireGauge = breakerAmps === 20 ? '12 AWG' : '14 AWG';

  // Outlet count — NEC 210.52: general rule ≈ 1 outlet per 12 sq ft
  let outletCount = Math.max(Math.ceil(areaSqFt / 12), 2);
  if (roomType === 'kitchen') outletCount += 4; // countertop GFCI outlets
  if (roomType === 'bathroom') outletCount += 1; // GFCI

  // Panel schedule
  const panelSchedule = [
    { circuit: 'General Lighting', loadVA: generalLightingVA, breakerA: 15, wireGauge: '14 AWG' },
    ...Array.from({ length: smallApplianceCircuits }, (_, i) => ({
      circuit: `Small Appliance #${i + 1}`,
      loadVA: 1500,
      breakerA: 20,
      wireGauge: '12 AWG',
    })),
    ...dedicatedCircuits.map((c) => ({
      circuit: c.name,
      loadVA: c.loadVA,
      breakerA: c.breakerA,
      wireGauge: c.wireGauge,
    })),
  ];

  return {
    totalLoadVA,
    generalLightingVA,
    smallApplianceVA,
    dedicatedLoadVA,
    recommendedBreakerA: breakerAmps,
    mainWireGauge: wireGauge,
    outletCount,
    panelSchedule,
    standardsCited: ['NEC 210.11', 'NEC 220.12', 'NEC 210.52'],
  };
}

// ---------------------------------------------------------------------------
// Plumbing calculation (IPC 2021)
// ---------------------------------------------------------------------------

function calculatePlumbing(roomType: string) {
  // Fixture units by room type
  const fixtures: { name: string; fixtureUnits: number; minDrainSize: string }[] = [];

  if (roomType === 'bathroom') {
    fixtures.push(
      { name: 'Water Closet (toilet)', fixtureUnits: 4, minDrainSize: '3"' },
      { name: 'Lavatory (sink)', fixtureUnits: 1, minDrainSize: '1-1/4"' },
      { name: 'Shower / Bathtub', fixtureUnits: 2, minDrainSize: '2"' },
    );
  } else if (roomType === 'kitchen') {
    fixtures.push(
      { name: 'Kitchen Sink', fixtureUnits: 2, minDrainSize: '1-1/2"' },
      { name: 'Dishwasher', fixtureUnits: 2, minDrainSize: '1-1/2"' },
    );
  } else {
    // Utility / wet-bar stub
    fixtures.push(
      { name: 'Utility Sink', fixtureUnits: 2, minDrainSize: '1-1/2"' },
    );
  }

  const totalFixtureUnits = fixtures.reduce((s, f) => s + f.fixtureUnits, 0);

  // Supply pipe sizing — IPC Table 604.3
  let supplyPipeSize: string;
  if (totalFixtureUnits <= 5) supplyPipeSize = '1/2"';
  else if (totalFixtureUnits <= 10) supplyPipeSize = '3/4"';
  else if (totalFixtureUnits <= 30) supplyPipeSize = '1"';
  else supplyPipeSize = '1-1/4"';

  // Drainage pipe sizing — IPC Table 709.1
  let drainMainSize: string;
  if (totalFixtureUnits <= 6) drainMainSize = '2"';
  else if (totalFixtureUnits <= 12) drainMainSize = '3"';
  else drainMainSize = '4"';

  // Vent sizing
  const ventSize = totalFixtureUnits <= 4 ? '1-1/2"' : '2"';

  return {
    fixtures,
    totalFixtureUnits,
    supplyPipeSize,
    drainMainSize,
    ventSize,
    hotWaterPipeSize: supplyPipeSize,
    coldWaterPipeSize: supplyPipeSize,
    drainSlope: '1/4" per foot',
    standardsCited: ['IPC Table 604.3', 'IPC Table 709.1', 'IPC 904.1'],
  };
}

// ---------------------------------------------------------------------------
// HVAC calculation (ASHRAE)
// ---------------------------------------------------------------------------

function calculateHVAC(
  roomType: string,
  areaSqFt: number,
  lengthMm: number,
  widthMm: number,
  heightMm: number,
) {
  // Cooling load — assume hot/tropical climate (25 BTU/sqft)
  const btuPerSqFt = roomType === 'kitchen' ? 30 : 25; // kitchen has more heat sources
  const coolingLoadBTU = areaSqFt * btuPerSqFt;
  const coolingTons = Math.round((coolingLoadBTU / 12000) * 100) / 100;

  // Equipment recommendation
  let equipmentType: string;
  if (coolingTons <= 1.5) equipmentType = 'Mini-split / Wall-mounted AC';
  else if (coolingTons <= 3) equipmentType = 'Cassette / Ceiling-mounted split';
  else if (coolingTons <= 5) equipmentType = 'Ducted split system';
  else equipmentType = 'Packaged / VRF system';

  // Duct sizing from room volume and air changes per hour (ACH)
  const volumeCuFt = (lengthMm / 304.8) * (widthMm / 304.8) * (heightMm / 304.8);
  const achRequired = roomType === 'kitchen' ? 15 : roomType === 'bathroom' ? 10 : 6;
  const cfmRequired = Math.round((volumeCuFt * achRequired) / 60);

  // Duct size from CFM (round duct equivalent)
  let ductDiameterInch: number;
  if (cfmRequired <= 100) ductDiameterInch = 6;
  else if (cfmRequired <= 200) ductDiameterInch = 8;
  else if (cfmRequired <= 400) ductDiameterInch = 10;
  else if (cfmRequired <= 700) ductDiameterInch = 12;
  else ductDiameterInch = 14;

  // Return air sizing
  const returnDuctDiameter = ductDiameterInch + 2;

  // Refrigerant piping
  const refrigerantPipe = coolingTons <= 2 ? '1/4" liquid, 3/8" suction' : '3/8" liquid, 5/8" suction';

  return {
    coolingLoadBTU,
    coolingTons,
    equipmentType,
    cfmRequired,
    achRequired,
    supplyDuctDiameterInch: ductDiameterInch,
    returnDuctDiameterInch: returnDuctDiameter,
    refrigerantPiping: refrigerantPipe,
    roomVolumeCuFt: Math.round(volumeCuFt),
    standardsCited: ['ASHRAE 90.1', 'ASHRAE 62.1', 'ASHRAE Handbook - Fundamentals'],
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const mepRouter = router({
  listByDesignVariant: protectedProcedure
    .input(z.object({ designVariantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      return ctx.db.query.mepCalculations.findMany({
        where: eq(mepCalculations.designVariantId, input.designVariantId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
        with: {
          rooms: {
            with: {
              designVariants: {
                with: { mepCalculations: true },
              },
            },
          },
        },
      });
      if (!project) throw new Error('Project not found');

      return project.rooms.flatMap((room) =>
        room.designVariants.flatMap((variant) =>
          variant.mepCalculations.map((calc) => ({
            ...calc,
            variantName: variant.name,
            roomName: room.name,
          })),
        ),
      );
    }),

  calculate: protectedProcedure
    .input(
      z.object({
        designVariantId: z.string(),
        calcType: z.enum(['electrical', 'plumbing', 'hvac']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.query.designVariants.findFirst({
        where: eq(designVariants.id, input.designVariantId),
        with: { room: { with: { project: true } } },
      });
      if (!variant || variant.room.project.userId !== ctx.userId) {
        throw new Error('Design variant not found');
      }

      // Create job in pending state
      const [job] = await ctx.db
        .insert(jobs)
        .values({
          userId: ctx.userId,
          type: `mep_${input.calcType}`,
          status: 'pending',
          inputJson: {
            designVariantId: input.designVariantId,
            calcType: input.calcType,
          },
          projectId: variant.room.project.id,
          roomId: variant.room.id,
          designVariantId: input.designVariantId,
        })
        .returning();
      if (!job) throw new Error('Failed to create job');

      // Mark running
      await ctx.db
        .update(jobs)
        .set({ status: 'running', startedAt: new Date(), progress: 10 })
        .where(eq(jobs.id, job.id));

      try {
        const roomType = variant.room.type ?? 'other';
        const lengthMm = variant.room.lengthMm ?? 3000;
        const widthMm = variant.room.widthMm ?? 3000;
        const heightMm = variant.room.heightMm ?? 2700;

        // Convert mm to sqft for calculations
        const areaSqFt = (lengthMm * widthMm) / (304.8 * 304.8);

        let calculationData: Record<string, unknown>;
        let standardsCited: string[];

        switch (input.calcType) {
          case 'electrical': {
            const result = calculateElectrical(roomType, areaSqFt, lengthMm, widthMm);
            standardsCited = result.standardsCited;
            calculationData = result;
            break;
          }
          case 'plumbing': {
            const result = calculatePlumbing(roomType);
            standardsCited = result.standardsCited;
            calculationData = result;
            break;
          }
          case 'hvac': {
            const result = calculateHVAC(roomType, areaSqFt, lengthMm, widthMm, heightMm);
            standardsCited = result.standardsCited;
            calculationData = result;
            break;
          }
        }

        // Persist MEP calculation
        const [mepCalc] = await ctx.db
          .insert(mepCalculations)
          .values({
            designVariantId: input.designVariantId,
            jobId: job.id,
            calcType: input.calcType,
            result: calculationData!,
            standardsCited: standardsCited!,
          })
          .returning();
        if (!mepCalc) throw new Error('Failed to create MEP calculation');

        // Mark completed
        const [updatedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            outputJson: {
              mepCalculationId: mepCalc.id,
              calcType: input.calcType,
              standardsCited: standardsCited!,
            },
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!updatedJob) throw new Error('Failed to update job');

        return updatedJob;
      } catch (err) {
        // Mark failed
        const [failedJob] = await ctx.db
          .update(jobs)
          .set({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
          .returning();
        if (!failedJob) throw new Error('Failed to update job');

        return failedJob;
      }
    }),

  jobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.userId)),
      });
      if (!job) throw new Error('Job not found');
      return job;
    }),
});
