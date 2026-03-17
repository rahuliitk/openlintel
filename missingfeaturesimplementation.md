# OpenLintel — Missing Features: Detailed Implementation Guide

*Step-by-step implementation blueprint aligned with the existing OpenLintel architecture*
*Perspective: Award-winning Architect, Home Builder & Interior Designer*

---

## Architecture Reference (How Every New Feature Should Be Built)

Before implementing any feature below, every new module follows this pattern:

| Layer | Technology | Pattern |
|-------|-----------|---------|
| **Database** | Drizzle ORM + PostgreSQL | Add tables in `packages/db/src/schema/app.ts`, relations in `relations.ts`, run `drizzle-kit generate` |
| **tRPC Router** | tRPC + Zod | Create `apps/web/src/server/trpc/routers/<feature>.ts`, register in `index.ts` |
| **Python Service** (if AI/compute) | FastAPI + LangGraph | Create `services/<name>/`, with `main.py`, `src/agents/`, `src/routers/`, `src/models/` |
| **Frontend Page** | Next.js 14 App Router | Create `apps/web/src/app/(dashboard)/project/[id]/<feature>/page.tsx` |
| **Frontend Components** | React + Shadcn/UI + Tailwind | Create `apps/web/src/components/<feature>/` |
| **Docker** | docker-compose.yml | Add service entry with port, environment, healthcheck |

**Naming Conventions:**
- SQL tables: `snake_case` (e.g., `structural_analyses`)
- TypeScript: `camelCase` variables, `PascalCase` types, `camelCase` router names
- Python: `snake_case` functions/files, `PascalCase` classes
- File paths: `kebab-case` directories, `camelCase.ts` routers, `snake_case.py` Python files

---

## TABLE OF CONTENTS

- [A. Design & Visualization](#a-design--visualization)
  - [A1. Parametric Design Engine](#a1-parametric-design-engine)
  - [A2. 2D Floor Plan Editor](#a2-2d-floor-plan-editor-interactive)
  - [A3. Exterior Design & Facade Generator](#a3-exterior-design--facade-generator)
  - [A4. Kitchen & Bath Specific Design Module](#a4-kitchen--bath-specific-design-module)
  - [A5. Lighting Design Simulator](#a5-lighting-design-simulator)
  - [A6. Material & Finish Board Generator](#a6-material--finish-board-generator)
  - [A7. Photorealistic Rendering Engine](#a7-photorealistic-rendering-engine)
- [B. Structural & Engineering](#b-structural--engineering)
  - [B1. Structural Analysis Module](#b1-structural-analysis-module)
  - [B2. Site Analysis & Grading](#b2-site-analysis--grading)
  - [B3. Energy Modeling & Passive Design](#b3-energy-modeling--passive-design)
  - [B4. Acoustic Design](#b4-acoustic-design)
- [C. Project Management & Field](#c-project-management--field)
  - [C1. RFI Management](#c1-rfi-request-for-information-management)
  - [C2. Submittal Management](#c2-submittal-management)
  - [C3. Daily/Weekly Progress Reporting](#c3-dailyweekly-progress-reporting)
  - [C4. Safety & OSHA Compliance](#c4-safety--osha-compliance)
  - [C5. Permit & Inspection Tracking](#c5-permit--inspection-tracking)
  - [C6. Document Version Control](#c6-document-version-control)
- [D. Client Experience](#d-client-experience)
  - [D1. Client Portal](#d1-client-portal)
  - [D2. Selection & Allowance Management](#d2-selection--allowance-management)
  - [D3. Client Mood Board & Inspiration Collection](#d3-client-mood-board--inspiration-collection)
  - [D4. Walk-Through Annotation Tool](#d4-walk-through-annotation-tool)
- [E. Business Operations](#e-business-operations)
  - [E1. Proposal & Contract Generator](#e1-proposal--contract-generator)
  - [E2. CRM & Lead Management](#e2-crm--lead-management)
  - [E3. Time Tracking & Billing](#e3-time-tracking--billing)
  - [E4. Insurance & Liability Management](#e4-insurance--liability-management)
  - [E5. Multi-Office / Team Management](#e5-multi-office--team-management)
- [F. Advanced Technology](#f-advanced-technology)
  - [F1. AI Space Planning](#f1-ai-space-planning)
  - [F2. Generative Facade Design](#f2-generative-facade-design)
  - [F3. AI Code Compliance Pre-Check](#f3-ai-code-compliance-pre-check)
  - [F4. Voice-Controlled Design](#f4-voice-controlled-design)
  - [F5. Drone Integration](#f5-drone-integration)
  - [F6. LiDAR Scan Import](#f6-lidar-scan-import)
  - [F7. Smart Home Pre-Wiring Planner](#f7-smart-home-pre-wiring-planner)
- [G. Specialized Design Areas](#g-specialized-design-areas)
  - [G1. Closet & Storage Design Module](#g1-closet--storage-design-module)
  - [G2. Home Theater / Media Room Designer](#g2-home-theater--media-room-designer)
  - [G3. Outdoor Living Designer](#g3-outdoor-living-designer)
  - [G4. Aging-in-Place / Universal Design Module](#g4-aging-in-place--universal-design-module)
  - [G5. Multi-Unit / ADU Planning](#g5-multi-unit--adu-planning)
- [H. Reporting & Documentation](#h-reporting--documentation)
  - [H1. Professional Drawing Set Templates](#h1-professional-drawing-set-templates)
  - [H2. Specification Writer](#h2-specification-writer)
  - [H3. Photo Documentation Report Generator](#h3-photo-documentation-report-generator)
  - [H4. As-Built Documentation](#h4-as-built-documentation)
- [I. Integrations](#i-integrations)
  - [I1. CAD/BIM Software Integration](#i1-cadbim-software-integration)
  - [I2. Accounting & ERP Integration](#i2-accounting--erp-integration)
  - [I3. Communication Integrations](#i3-communication-integrations)
  - [I4. Real Estate & MLS Integration](#i4-real-estate--mls-integration)
  - [I5. Government & Permit Systems](#i5-government--permit-systems)
- [J. Marketplace Enhancements](#j-marketplace-enhancements)
  - [J1. Design Template Marketplace](#j1-design-template-marketplace)
  - [J2. Professional Services Marketplace](#j2-professional-services-marketplace)
  - [J3. Material Sample Box Service](#j3-material-sample-box-service)
- [K. Accessibility & Compliance Depth](#k-accessibility--compliance-depth)
  - [K1. ADA / Universal Design Compliance Engine](#k1-ada--universal-design-compliance-engine)
  - [K2. Energy Code Compliance](#k2-energy-code-compliance)
  - [K3. Historic Preservation Compliance](#k3-historic-preservation-compliance)
- [L. Data & Intelligence](#l-data--intelligence)
  - [L1. Market-Rate Benchmarking](#l1-market-rate-benchmarking)
  - [L2. Post-Occupancy Evaluation](#l2-post-occupancy-evaluation)
  - [L3. AI Design Learning](#l3-ai-design-learning)

---

## A. DESIGN & VISUALIZATION

---

### A1. Parametric Design Engine

**Purpose:** Enable architects to define rooms, walls, and roofs with parametric constraints that auto-update when any dimension changes — the way Grasshopper or Dynamo work, but natively in OpenLintel.

**Priority:** HIGH — This is foundational for professional architects who need constraint-driven design.

#### Step 1: Database Schema

**File:** `packages/db/src/schema/app.ts`

Add the following tables:

```typescript
// Parametric constraint rules that govern design relationships
export const parametricRules = pgTable('parametric_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),                          // e.g., "Master bedroom min area"
  ruleType: text('rule_type').notNull(),                 // dimension_constraint | area_constraint | ratio_constraint | dependency | code_min
  targetType: text('target_type').notNull(),             // room | wall | opening | roof
  targetId: text('target_id'),                           // specific entity, null = all of targetType
  expression: text('expression').notNull(),              // JSON expression: {"op":">=","field":"area_sqft","value":120}
  priority: integer('priority').default(0),              // higher = evaluated first
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Parametric design templates (ranch, colonial, townhouse, etc.)
export const designTemplates = pgTable('design_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),                          // "Ranch 3BR/2BA"
  homeType: text('home_type').notNull(),                 // ranch | colonial | split_level | townhouse | villa | cape_cod | craftsman | modern
  description: text('description'),
  thumbnailKey: text('thumbnail_key'),                   // S3 key for preview image
  roomDefinitions: jsonb('room_definitions').notNull(),  // [{type:"bedroom", minArea:120, constraints:[...]}, ...]
  defaultRules: jsonb('default_rules').notNull(),        // [{ruleType:"dimension_constraint", expression:{...}}, ...]
  metadata: jsonb('metadata'),                           // sqft range, stories, style notes
  isPublic: boolean('is_public').default(false).notNull(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Tracks constraint propagation history for undo/redo
export const parametricHistory = pgTable('parametric_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),                      // dimension_change | rule_applied | auto_adjust
  beforeState: jsonb('before_state').notNull(),          // snapshot of affected entities before change
  afterState: jsonb('after_state').notNull(),            // snapshot after change
  triggeredBy: text('triggered_by'),                     // userId or "system" for auto-propagation
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

**File:** `packages/db/src/schema/relations.ts`

```typescript
export const parametricRulesRelations = relations(parametricRules, ({ one }) => ({
  project: one(projects, { fields: [parametricRules.projectId], references: [projects.id] }),
}));

export const designTemplatesRelations = relations(designTemplates, ({ one }) => ({
  author: one(users, { fields: [designTemplates.authorId], references: [users.id] }),
}));
```

#### Step 2: tRPC Router

**File:** `apps/web/src/server/trpc/routers/parametric.ts`

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { parametricRules, designTemplates, parametricHistory, rooms } from '@openlintel/db';
import { eq, and } from 'drizzle-orm';

const ruleExpressionSchema = z.object({
  op: z.enum(['>=', '<=', '==', '!=', 'between', 'ratio']),
  field: z.string(),
  value: z.union([z.number(), z.array(z.number())]),
  relatedField: z.string().optional(),  // for ratio constraints
});

export const parametricRouter = router({
  // --- Rules CRUD ---
  listRules: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.parametricRules.findMany({
        where: eq(parametricRules.projectId, input.projectId),
        orderBy: (r, { desc }) => [desc(r.priority)],
      });
    }),

  createRule: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(200),
      ruleType: z.enum(['dimension_constraint', 'area_constraint', 'ratio_constraint', 'dependency', 'code_min']),
      targetType: z.enum(['room', 'wall', 'opening', 'roof']),
      targetId: z.string().optional(),
      expression: ruleExpressionSchema,
      priority: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const [rule] = await ctx.db.insert(parametricRules).values({
        projectId: input.projectId,
        name: input.name,
        ruleType: input.ruleType,
        targetType: input.targetType,
        targetId: input.targetId,
        expression: JSON.stringify(input.expression),
        priority: input.priority,
      }).returning();
      return rule;
    }),

  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(parametricRules).where(eq(parametricRules.id, input.ruleId));
    }),

  // --- Constraint Propagation ---
  propagateChange: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      changedRoomId: z.string(),
      changedField: z.string(),       // e.g., "lengthMm"
      newValue: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch all active rules for project
      const rules = await ctx.db.query.parametricRules.findMany({
        where: and(
          eq(parametricRules.projectId, input.projectId),
          eq(parametricRules.isActive, true),
        ),
        orderBy: (r, { desc }) => [desc(r.priority)],
      });

      // 2. Fetch all rooms in project
      const projectRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });

      // 3. Snapshot before state
      const beforeState = projectRooms.map(r => ({ id: r.id, lengthMm: r.lengthMm, widthMm: r.widthMm, heightMm: r.heightMm }));

      // 4. Apply the direct change
      await ctx.db.update(rooms)
        .set({ [input.changedField]: input.newValue, updatedAt: new Date() })
        .where(eq(rooms.id, input.changedRoomId));

      // 5. Evaluate constraint propagation (simplified — full implementation uses a solver)
      const adjustments: Array<{ roomId: string; field: string; value: number }> = [];
      for (const rule of rules) {
        const expr = typeof rule.expression === 'string' ? JSON.parse(rule.expression) : rule.expression;
        // Evaluate each rule against the changed room and adjacent rooms
        // If violated, compute the minimal adjustment to satisfy the constraint
        // Add to adjustments array
      }

      // 6. Apply cascading adjustments
      for (const adj of adjustments) {
        await ctx.db.update(rooms)
          .set({ [adj.field]: adj.value, updatedAt: new Date() })
          .where(eq(rooms.id, adj.roomId));
      }

      // 7. Snapshot after state and record history
      const updatedRooms = await ctx.db.query.rooms.findMany({
        where: eq(rooms.projectId, input.projectId),
      });
      const afterState = updatedRooms.map(r => ({ id: r.id, lengthMm: r.lengthMm, widthMm: r.widthMm, heightMm: r.heightMm }));

      await ctx.db.insert(parametricHistory).values({
        projectId: input.projectId,
        action: 'dimension_change',
        beforeState,
        afterState,
        triggeredBy: ctx.userId,
      });

      return { adjustments, afterState };
    }),

  // --- Templates ---
  listTemplates: protectedProcedure
    .input(z.object({
      homeType: z.enum(['ranch', 'colonial', 'split_level', 'townhouse', 'villa', 'cape_cod', 'craftsman', 'modern']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.designTemplates.findMany({
        where: input.homeType ? eq(designTemplates.homeType, input.homeType) : undefined,
        orderBy: (t, { asc }) => [asc(t.name)],
      });
    }),

  applyTemplate: protectedProcedure
    .input(z.object({ projectId: z.string(), templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.query.designTemplates.findFirst({
        where: eq(designTemplates.id, input.templateId),
      });
      if (!template) throw new Error('Template not found');

      // 1. Create rooms from template definitions
      const roomDefs = template.roomDefinitions as Array<{ type: string; name: string; lengthMm: number; widthMm: number; heightMm: number }>;
      for (const roomDef of roomDefs) {
        await ctx.db.insert(rooms).values({
          projectId: input.projectId,
          name: roomDef.name,
          type: roomDef.type,
          lengthMm: roomDef.lengthMm,
          widthMm: roomDef.widthMm,
          heightMm: roomDef.heightMm ?? 2700,
        });
      }

      // 2. Create rules from template defaults
      const defaultRules = template.defaultRules as Array<{ name: string; ruleType: string; targetType: string; expression: object }>;
      for (const ruleDef of defaultRules) {
        await ctx.db.insert(parametricRules).values({
          projectId: input.projectId,
          name: ruleDef.name,
          ruleType: ruleDef.ruleType,
          targetType: ruleDef.targetType,
          expression: JSON.stringify(ruleDef.expression),
        });
      }

      return { roomsCreated: roomDefs.length, rulesCreated: defaultRules.length };
    }),

  // --- History / Undo ---
  getHistory: protectedProcedure
    .input(z.object({ projectId: z.string(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.parametricHistory.findMany({
        where: eq(parametricHistory.projectId, input.projectId),
        orderBy: (h, { desc }) => [desc(h.createdAt)],
        limit: input.limit,
      });
    }),

  undoLastChange: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lastHistory = await ctx.db.query.parametricHistory.findFirst({
        where: eq(parametricHistory.projectId, input.projectId),
        orderBy: (h, { desc }) => [desc(h.createdAt)],
      });
      if (!lastHistory) throw new Error('Nothing to undo');

      // Restore beforeState
      const beforeState = lastHistory.beforeState as Array<{ id: string; lengthMm: number; widthMm: number; heightMm: number }>;
      for (const snapshot of beforeState) {
        await ctx.db.update(rooms)
          .set({ lengthMm: snapshot.lengthMm, widthMm: snapshot.widthMm, heightMm: snapshot.heightMm })
          .where(eq(rooms.id, snapshot.id));
      }

      // Delete the history entry
      await ctx.db.delete(parametricHistory).where(eq(parametricHistory.id, lastHistory.id));

      return { restored: beforeState.length };
    }),
});
```

**Register in:** `apps/web/src/server/trpc/routers/index.ts`

```typescript
import { parametricRouter } from './parametric';
// Add to appRouter:
parametric: parametricRouter,
```

#### Step 3: Constraint Solver Service (Python)

For complex constraint propagation (more than simple if/then), create a dedicated solver service.

**Directory structure:**
```
services/parametric-solver/
├── main.py
├── Dockerfile
├── pyproject.toml
├── requirements.txt       # includes: google-or-tools, pydantic, fastapi
└── src/
    ├── __init__.py
    ├── routers/
    │   └── solve.py
    ├── models/
    │   ├── constraints.py
    │   └── room_graph.py
    └── services/
        ├── constraint_evaluator.py
        └── propagation_engine.py
```

**File:** `services/parametric-solver/src/services/propagation_engine.py`

```python
"""
Constraint propagation engine using OR-Tools CP-SAT solver.

Given a set of rooms with dimensions and a set of constraints,
computes the minimal set of adjustments needed when one dimension changes.
"""

from ortools.sat.python import cp_model
from pydantic import BaseModel


class RoomDimension(BaseModel):
    room_id: str
    length_mm: int
    width_mm: int
    height_mm: int = 2700


class Constraint(BaseModel):
    rule_type: str          # dimension_constraint | area_constraint | ratio_constraint | dependency
    target_type: str        # room | wall | opening
    target_id: str | None
    expression: dict        # {"op":">=","field":"area_sqft","value":120}
    priority: int = 0


class PropagationResult(BaseModel):
    adjustments: list[dict]     # [{room_id, field, old_value, new_value}]
    violations: list[dict]      # constraints that could not be satisfied
    iterations: int


def propagate_constraints(
    rooms: list[RoomDimension],
    constraints: list[Constraint],
    changed_room_id: str,
    changed_field: str,
    new_value: int,
) -> PropagationResult:
    """
    Run constraint propagation using CP-SAT solver.

    Strategy:
    1. Fix the changed dimension as a constant.
    2. For each room, create integer variables for length_mm and width_mm.
    3. Add all constraints to the model.
    4. Minimize total deviation from original dimensions (least-surprise principle).
    5. Return the set of adjustments.
    """
    model = cp_model.CpModel()

    # Create variables for each room dimension
    room_vars = {}
    for room in rooms:
        # Allow dimensions to vary within +/- 30% of original
        l_min = int(room.length_mm * 0.7)
        l_max = int(room.length_mm * 1.3)
        w_min = int(room.width_mm * 0.7)
        w_max = int(room.width_mm * 1.3)

        if room.room_id == changed_room_id:
            # Fix the changed field
            if changed_field == 'lengthMm':
                room_vars[room.room_id] = {
                    'length': model.NewIntVar(new_value, new_value, f'{room.room_id}_l'),
                    'width': model.NewIntVar(w_min, w_max, f'{room.room_id}_w'),
                }
            elif changed_field == 'widthMm':
                room_vars[room.room_id] = {
                    'length': model.NewIntVar(l_min, l_max, f'{room.room_id}_l'),
                    'width': model.NewIntVar(new_value, new_value, f'{room.room_id}_w'),
                }
        else:
            room_vars[room.room_id] = {
                'length': model.NewIntVar(l_min, l_max, f'{room.room_id}_l'),
                'width': model.NewIntVar(w_min, w_max, f'{room.room_id}_w'),
            }

    # Add constraints to model
    violations = []
    for constraint in sorted(constraints, key=lambda c: -c.priority):
        expr = constraint.expression
        target = constraint.target_id

        if target and target in room_vars:
            vars_ = room_vars[target]
            if constraint.rule_type == 'area_constraint':
                # area = length * width (in mm^2), convert to sqft
                # area_sqft = (length_mm * width_mm) / 92903.04
                # For CP-SAT, we work in mm^2 and convert the threshold
                threshold_mm2 = int(expr['value'] * 92903.04)
                if expr['op'] == '>=':
                    # length * width >= threshold (linearize via auxiliary)
                    # CP-SAT supports multiplication via NewIntVar and AddMultiplicationEquality
                    area = model.NewIntVar(0, 10**12, f'{target}_area')
                    model.AddMultiplicationEquality(area, vars_['length'], vars_['width'])
                    model.Add(area >= threshold_mm2)

    # Objective: minimize total deviation from original dimensions
    deviations = []
    for room in rooms:
        if room.room_id in room_vars:
            vars_ = room_vars[room.room_id]
            # |new_length - original_length| + |new_width - original_width|
            dl = model.NewIntVar(0, 10**6, f'{room.room_id}_dl')
            dw = model.NewIntVar(0, 10**6, f'{room.room_id}_dw')
            model.AddAbsEquality(dl, vars_['length'] - room.length_mm)
            model.AddAbsEquality(dw, vars_['width'] - room.width_mm)
            deviations.extend([dl, dw])

    model.Minimize(sum(deviations))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.Solve(model)

    adjustments = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for room in rooms:
            if room.room_id in room_vars:
                new_l = solver.Value(room_vars[room.room_id]['length'])
                new_w = solver.Value(room_vars[room.room_id]['width'])
                if new_l != room.length_mm:
                    adjustments.append({
                        'room_id': room.room_id,
                        'field': 'lengthMm',
                        'old_value': room.length_mm,
                        'new_value': new_l,
                    })
                if new_w != room.width_mm:
                    adjustments.append({
                        'room_id': room.room_id,
                        'field': 'widthMm',
                        'old_value': room.width_mm,
                        'new_value': new_w,
                    })

    return PropagationResult(
        adjustments=adjustments,
        violations=violations,
        iterations=solver.NumBranches() if status != cp_model.MODEL_INVALID else 0,
    )
```

#### Step 4: Frontend Page

**File:** `apps/web/src/app/(dashboard)/project/[id]/parametric/page.tsx`

```typescript
'use client';

import { use, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
         Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
         Badge, Card, CardContent, CardHeader, CardTitle, toast } from '@openlintel/ui';
import { Plus, Undo2, Settings2, LayoutTemplate } from 'lucide-react';
import { RuleEditor } from '@/components/parametric/rule-editor';
import { ConstraintVisualizer } from '@/components/parametric/constraint-visualizer';
import { TemplateGallery } from '@/components/parametric/template-gallery';

export default function ParametricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const utils = trpc.useUtils();

  const { data: rules = [] } = trpc.parametric.listRules.useQuery({ projectId });
  const { data: project } = trpc.project.byId.useQuery({ id: projectId });

  const createRule = trpc.parametric.createRule.useMutation({
    onSuccess: () => {
      utils.parametric.listRules.invalidate({ projectId });
      toast({ title: 'Constraint rule added' });
    },
  });

  const propagateChange = trpc.parametric.propagateChange.useMutation({
    onSuccess: (result) => {
      utils.project.byId.invalidate({ id: projectId });
      toast({ title: `${result.adjustments.length} rooms adjusted` });
    },
  });

  const undoLast = trpc.parametric.undoLastChange.useMutation({
    onSuccess: (result) => {
      utils.project.byId.invalidate({ id: projectId });
      toast({ title: `Restored ${result.restored} rooms` });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parametric Design</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => undoLast.mutate({ projectId })}>
            <Undo2 className="mr-1 h-4 w-4" /> Undo
          </Button>
          <TemplateGallery projectId={projectId} />
          <RuleEditor projectId={projectId} onSave={(rule) => createRule.mutate(rule)} />
        </div>
      </div>

      {/* Active constraints visualization */}
      <ConstraintVisualizer
        rooms={project?.rooms ?? []}
        rules={rules}
        onDimensionChange={(roomId, field, value) =>
          propagateChange.mutate({ projectId, changedRoomId: roomId, changedField: field, newValue: value })
        }
      />

      {/* Rules list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Active Constraints ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between border-b py-3">
              <div>
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-muted-foreground">
                  {rule.ruleType} on {rule.targetType}
                </p>
              </div>
              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                Priority {rule.priority}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Step 5: Docker

**File:** Add to `docker-compose.yml`

```yaml
  parametric-solver:
    build:
      context: .
      dockerfile: services/parametric-solver/Dockerfile
    container_name: openlintel-parametric-solver
    ports: ['8009:8009']
    environment:
      DATABASE_URL: postgresql+asyncpg://openlintel:openlintel_dev@postgres:5432/openlintel
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
```

#### Step 6: Migration

```bash
cd packages/db
npx drizzle-kit generate --name add-parametric-tables
npx drizzle-kit push
```

---

### A2. 2D Floor Plan Editor (Interactive)

**Purpose:** A full canvas-based 2D editing tool where architects can draw walls, place doors/windows, and design rooms interactively — complementing the existing AI-based floor plan digitization.

**Priority:** CRITICAL — Every architect needs to draw or modify floor plans manually.

#### Step 1: Database Schema

**File:** `packages/db/src/schema/app.ts`

```typescript
// Stores the full 2D floor plan canvas state per project floor
export const floorPlanCanvases = pgTable('floor_plan_canvases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  floorNumber: integer('floor_number').notNull().default(0),
  name: text('name').notNull(),                         // "Ground Floor", "First Floor"
  canvasState: jsonb('canvas_state').notNull(),          // Full Fabric.js / Konva state
  gridSize: integer('grid_size').default(100),           // snap grid in mm
  scale: real('scale').default(1.0),                     // pixels per mm
  layers: jsonb('layers'),                               // [{id, name, visible, locked, color}]
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Individual wall segments with structural properties
export const wallSegments = pgTable('wall_segments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  canvasId: text('canvas_id').notNull().references(() => floorPlanCanvases.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  startX: real('start_x').notNull(),                    // mm from origin
  startY: real('start_y').notNull(),
  endX: real('end_x').notNull(),
  endY: real('end_y').notNull(),
  thickness: real('thickness').notNull().default(150),   // wall thickness in mm
  wallType: text('wall_type').notNull().default('interior'), // interior | exterior | partition | load_bearing
  materialType: text('material_type'),                   // brick | concrete | drywall | wood_frame
  layer: text('layer').default('structural'),
  metadata: jsonb('metadata'),                           // insulation, fire rating, etc.
});

// Openings (doors, windows) placed on wall segments
export const openings = pgTable('openings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wallSegmentId: text('wall_segment_id').notNull().references(() => wallSegments.id, { onDelete: 'cascade' }),
  openingType: text('opening_type').notNull(),           // door | window | archway | pass_through
  subType: text('sub_type'),                             // slider | casement | bi_fold | pocket | french | double_hung | awning | fixed | single | double | barn | pivot
  offsetFromStart: real('offset_from_start').notNull(),  // mm from wall segment start point
  width: real('width').notNull(),                        // opening width in mm
  height: real('height').notNull(),                      // opening height in mm
  sillHeight: real('sill_height').default(0),            // height above floor (windows typically 900mm)
  swingDirection: text('swing_direction'),                // left | right | both | sliding | up
  swingAngle: real('swing_angle').default(90),           // degrees
  layer: text('layer').default('structural'),
  metadata: jsonb('metadata'),                           // glass type, frame material, U-value
});

// Staircase definitions
export const staircases = pgTable('staircases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  canvasId: text('canvas_id').notNull().references(() => floorPlanCanvases.id, { onDelete: 'cascade' }),
  stairType: text('stair_type').notNull(),               // straight | l_shaped | u_shaped | spiral | winder
  startX: real('start_x').notNull(),
  startY: real('start_y').notNull(),
  totalRise: real('total_rise').notNull(),               // floor-to-floor height in mm
  riserHeight: real('riser_height'),                     // auto-calculated if null
  treadDepth: real('tread_depth'),                       // auto-calculated if null
  width: real('width').notNull().default(900),           // staircase width in mm
  numRisers: integer('num_risers'),                      // auto-calculated
  direction: real('direction').default(0),               // rotation angle in degrees
  landingDepth: real('landing_depth'),                   // for L/U-shaped
  handrailSides: text('handrail_sides').default('both'), // left | right | both
  metadata: jsonb('metadata'),
});
```

#### Step 2: Choose Canvas Library

**Decision:** Use **Konva.js** (via `react-konva`) for the 2D canvas.

**Rationale:**
- Konva provides a performant, React-friendly 2D canvas with object model
- Better for architectural drawing than Fabric.js (layering, custom shapes, complex hit detection)
- Supports zoom, pan, snapping, and event handling natively
- The existing codebase uses React Three Fiber for 3D — Konva is the natural 2D companion

**Install:**
```bash
cd apps/web
npm install konva react-konva
```

#### Step 3: tRPC Router

**File:** `apps/web/src/server/trpc/routers/floorPlanEditor.ts`

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { floorPlanCanvases, wallSegments, openings, staircases } from '@openlintel/db';
import { eq, and } from 'drizzle-orm';

export const floorPlanEditorRouter = router({
  // --- Canvas ---
  getCanvas: protectedProcedure
    .input(z.object({ projectId: z.string(), floorNumber: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.floorPlanCanvases.findFirst({
        where: and(
          eq(floorPlanCanvases.projectId, input.projectId),
          eq(floorPlanCanvases.floorNumber, input.floorNumber),
        ),
      });
    }),

  saveCanvas: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      floorNumber: z.number().default(0),
      name: z.string(),
      canvasState: z.any(),
      gridSize: z.number().optional(),
      layers: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.floorPlanCanvases.findFirst({
        where: and(
          eq(floorPlanCanvases.projectId, input.projectId),
          eq(floorPlanCanvases.floorNumber, input.floorNumber),
        ),
      });
      if (existing) {
        await ctx.db.update(floorPlanCanvases)
          .set({
            canvasState: input.canvasState,
            gridSize: input.gridSize,
            layers: input.layers,
            updatedAt: new Date(),
          })
          .where(eq(floorPlanCanvases.id, existing.id));
        return existing;
      }
      const [canvas] = await ctx.db.insert(floorPlanCanvases).values({
        projectId: input.projectId,
        floorNumber: input.floorNumber,
        name: input.name,
        canvasState: input.canvasState,
        gridSize: input.gridSize ?? 100,
        layers: input.layers,
      }).returning();
      return canvas;
    }),

  // --- Wall Segments ---
  createWall: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      startX: z.number(), startY: z.number(),
      endX: z.number(), endY: z.number(),
      thickness: z.number().default(150),
      wallType: z.enum(['interior', 'exterior', 'partition', 'load_bearing']),
      materialType: z.string().optional(),
      layer: z.string().default('structural'),
    }))
    .mutation(async ({ ctx, input }) => {
      const [wall] = await ctx.db.insert(wallSegments).values(input).returning();
      return wall;
    }),

  listWalls: protectedProcedure
    .input(z.object({ canvasId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.wallSegments.findMany({
        where: eq(wallSegments.canvasId, input.canvasId),
      });
    }),

  updateWall: protectedProcedure
    .input(z.object({
      wallId: z.string(),
      startX: z.number().optional(), startY: z.number().optional(),
      endX: z.number().optional(), endY: z.number().optional(),
      thickness: z.number().optional(),
      wallType: z.enum(['interior', 'exterior', 'partition', 'load_bearing']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { wallId, ...data } = input;
      await ctx.db.update(wallSegments).set(data).where(eq(wallSegments.id, wallId));
    }),

  deleteWall: protectedProcedure
    .input(z.object({ wallId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(wallSegments).where(eq(wallSegments.id, input.wallId));
    }),

  // --- Openings ---
  createOpening: protectedProcedure
    .input(z.object({
      wallSegmentId: z.string(),
      openingType: z.enum(['door', 'window', 'archway', 'pass_through']),
      subType: z.string().optional(),
      offsetFromStart: z.number(),
      width: z.number(),
      height: z.number(),
      sillHeight: z.number().default(0),
      swingDirection: z.enum(['left', 'right', 'both', 'sliding', 'up']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [opening] = await ctx.db.insert(openings).values(input).returning();
      return opening;
    }),

  // --- Staircases ---
  createStaircase: protectedProcedure
    .input(z.object({
      canvasId: z.string(),
      stairType: z.enum(['straight', 'l_shaped', 'u_shaped', 'spiral', 'winder']),
      startX: z.number(), startY: z.number(),
      totalRise: z.number(),
      width: z.number().default(900),
      direction: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Auto-calculate riser/tread per IRC R311.7
      const maxRiserHeight = 196; // 7.75 inches = 196mm per IRC
      const minTreadDepth = 254;  // 10 inches = 254mm per IRC
      const numRisers = Math.ceil(input.totalRise / maxRiserHeight);
      const riserHeight = input.totalRise / numRisers;
      const treadDepth = Math.max(minTreadDepth, 635 - 2 * riserHeight); // 2R+T >= 635mm rule of thumb

      const [staircase] = await ctx.db.insert(staircases).values({
        ...input,
        riserHeight,
        treadDepth,
        numRisers,
      }).returning();
      return staircase;
    }),

  // --- Auto-calculate room areas ---
  calculateAreas: protectedProcedure
    .input(z.object({ canvasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const walls = await ctx.db.query.wallSegments.findMany({
        where: eq(wallSegments.canvasId, input.canvasId),
      });
      // Compute room polygons from wall segments using computational geometry
      // Return area and perimeter for each detected room
      // This uses the Shoelace formula for polygon area
      return computeRoomPolygons(walls);
    }),
});
```

#### Step 4: Core Canvas Component

**File:** `apps/web/src/components/floor-plan-editor/canvas.tsx`

This is the core 2D editing canvas. Key sub-components:

```
apps/web/src/components/floor-plan-editor/
├── canvas.tsx                 # Main Konva Stage with zoom/pan
├── wall-tool.tsx              # Wall drawing tool (click-click-click)
├── door-window-tool.tsx       # Place openings on walls
├── staircase-tool.tsx         # Staircase placement wizard
├── selection-tool.tsx         # Select, move, resize elements
├── dimension-overlay.tsx      # Auto-calculated dimension labels
├── grid-layer.tsx             # Snap grid background
├── layer-panel.tsx            # Layer visibility/lock controls
├── properties-panel.tsx       # Selected element properties
├── toolbar.tsx                # Tool selection sidebar
├── room-label.tsx             # Room name + area display
└── minimap.tsx                # Overview minimap for large plans
```

The main canvas should:
1. Use `<Stage>` and `<Layer>` from `react-konva`
2. Implement mouse-down/move/up handlers for wall drawing
3. Snap to grid (configurable grid size in mm)
4. Show dimension annotations in real-time
5. Calculate room areas using the Shoelace formula on detected polygons
6. Support layer toggling (show/hide structural vs. furniture vs. electrical)
7. Auto-save canvas state to DB every 5 seconds via debounced mutation
8. Integrate with Y.js for real-time collaborative editing (reuse existing collaboration service)

#### Step 5: Navigation

Add to project sidebar navigation:
**File:** Update `apps/web/src/components/project-sidebar.tsx` to include:

```typescript
{ href: `/project/${projectId}/floor-plan-editor`, label: 'Floor Plan Editor', icon: PenTool }
```

**File:** `apps/web/src/app/(dashboard)/project/[id]/floor-plan-editor/page.tsx`

Standard page that renders the canvas component with project data.

---

### A3. Exterior Design & Facade Generator

**Purpose:** Enable architects to design home exteriors — facades, rooflines, landscaping — with AI-generated options.

**Priority:** HIGH — Clients always ask "what will the outside look like?"

#### Step 1: Database Schema

```typescript
export const exteriorDesigns = pgTable('exterior_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  designType: text('design_type').notNull(),             // facade | roof | landscape | outdoor_living
  viewDirection: text('view_direction'),                 // front | rear | left | right | aerial | perspective
  roofStyle: text('roof_style'),                         // hip | gable | mansard | flat | butterfly | shed | gambrel | dutch_gable
  facadeMaterials: jsonb('facade_materials'),             // [{zone:"upper", material:"brick", color:"#8B4513"}, ...]
  landscapeElements: jsonb('landscape_elements'),        // [{type:"driveway", material:"concrete"}, {type:"tree", species:"oak", position:{x,y}}]
  outdoorSpaces: jsonb('outdoor_spaces'),                // [{type:"deck", area_sqft:200, material:"composite"}, ...]
  renderUrl: text('render_url'),                         // S3 key for AI-generated exterior render
  style: text('style'),                                  // matches design styles: modern, craftsman, colonial, etc.
  specJson: jsonb('spec_json'),                          // full specification for BOM integration
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: Extend Design Engine

Add a new LangGraph agent to the existing `services/design-engine/`:

**File:** `services/design-engine/src/agents/exterior_agent.py`

```python
class ExteriorState(TypedDict):
    messages: list
    project_context: dict       # rooms, floor plan, style preferences
    facade_spec: dict | None
    roof_spec: dict | None
    landscape_spec: dict | None
    outdoor_spec: dict | None
    render_prompt: str | None
    result: dict | None

class ExteriorDesignAgent(AgentBase):
    """Generates exterior design specifications and renders."""

    def build_graph(self) -> StateGraph:
        graph = StateGraph(ExteriorState)

        graph.add_node("analyze_context", self._analyze_context)        # Understand the home from floor plans
        graph.add_node("design_facade", self._design_facade)            # Generate facade material spec
        graph.add_node("design_roof", self._design_roof)                # Roof style + materials
        graph.add_node("design_landscape", self._design_landscape)      # Landscape layout
        graph.add_node("generate_render", self._generate_render)        # AI image generation

        graph.set_entry_point("analyze_context")
        graph.add_edge("analyze_context", "design_facade")
        graph.add_edge("design_facade", "design_roof")
        graph.add_edge("design_roof", "design_landscape")
        graph.add_edge("design_landscape", "generate_render")
        graph.add_edge("generate_render", END)

        return graph

    async def _analyze_context(self, state):
        """Use VLM to understand the home's character from floor plans and style quiz."""
        # Call LLM with floor plan image + style preferences
        # Extract: home footprint, story count, window placement, orientation
        pass

    async def _design_facade(self, state):
        """Generate facade material specification."""
        # LLM generates material zones (upper/lower/trim/accent)
        # References material catalog for real products
        # Considers climate, style, budget
        pass

    async def _design_roof(self, state):
        """Select roof style and materials."""
        # Based on climate (snow load → steeper pitch), style, budget
        # Calculate roof area for BOM integration
        pass

    async def _design_landscape(self, state):
        """Generate landscape layout."""
        # Driveway, walkways, plantings, lawn areas
        # Consider local climate for plant selection
        pass

    async def _generate_render(self, state):
        """Generate photorealistic exterior render via image generation API."""
        # Compose prompt from all specs
        # Call image generation (DALL-E 3 or Stable Diffusion)
        # Store result in MinIO
        pass
```

#### Step 3: tRPC Router

**File:** `apps/web/src/server/trpc/routers/exterior.ts`

Standard CRUD + job dispatch pattern (same as `bom.ts`):
- `exterior.generate` → create job → fire-and-forget to design-engine `/api/v1/exterior/job`
- `exterior.listByProject` → fetch all exterior designs
- `exterior.jobStatus` → poll job status

#### Step 4: Frontend Page

**File:** `apps/web/src/app/(dashboard)/project/[id]/exterior/page.tsx`

- View selector: front/rear/left/right/aerial
- Material palette picker for facade zones
- Roof style selector with 3D preview thumbnails
- Landscape element drag-and-drop
- AI generation trigger (same two-phase dialog pattern)
- Before/after comparison slider for renovations

---

### A4. Kitchen & Bath Specific Design Module

**Purpose:** Specialized room editors for the two most complex and expensive rooms in any home — with industry-standard layout rules built in.

**Priority:** CRITICAL — Kitchen and bathroom design drives 60%+ of renovation budgets.

#### Step 1: Database Schema

```typescript
export const cabinetLayouts = pgTable('cabinet_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  layoutType: text('layout_type').notNull(),             // L_shape | U_shape | galley | island | peninsula | single_wall
  cabinets: jsonb('cabinets').notNull(),                 // [{type:"base", width:600, position:{x,y}, handleStyle:"shaker"}, ...]
  countertops: jsonb('countertops'),                     // [{material:"quartz", color:"white", edgeProfile:"eased", segments:[...]}]
  appliances: jsonb('appliances'),                       // [{type:"refrigerator", brand:"", model:"", width:900, position:{x,y}}]
  backsplash: jsonb('backsplash'),                       // {material:"subway_tile", color:"white", pattern:"running_bond", height:450}
  workTriangleScore: real('work_triangle_score'),        // 0-100 efficiency score
  workTrianglePerimeter: real('work_triangle_perimeter'), // in mm (ideal: 3600-7900mm)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const bathroomLayouts = pgTable('bathroom_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  fixtures: jsonb('fixtures').notNull(),                 // [{type:"toilet", model:"", clearance:{front:530,side:380}, position:{x,y}}]
  showerEnclosure: jsonb('shower_enclosure'),            // {type:"walk_in"|"tub_shower"|"corner"|"alcove", width, depth, doorType}
  vanity: jsonb('vanity'),                               // {type:"single"|"double", width, countertopMaterial, sinkType}
  adaCompliant: boolean('ada_compliant').default(false),
  ventilation: jsonb('ventilation'),                     // {type:"exhaust_fan", cfm:50, ductRun:null}
  waterproofing: jsonb('waterproofing'),                 // {method:"sheet_membrane"|"liquid_membrane", wetZones:[...]}
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: Kitchen Design Logic (Python Service)

Extend `services/design-engine/` with kitchen-specific agents.

**File:** `services/design-engine/src/agents/kitchen_agent.py`

Key algorithms:
- **Work Triangle Calculator:** Measure distance between sink, stove, and fridge centroids. Ideal perimeter: 3600-7900mm (12-26 ft). No single leg < 1200mm or > 2700mm.
- **Cabinet Layout Optimizer:** Use OR-Tools to maximize storage while maintaining clearances (min 1050mm between parallel cabinet runs, 450mm counter space on each side of stove).
- **Appliance Clearance Validator:** Check manufacturer-specified clearances (e.g., 50mm gap beside refrigerator for door swing).
- **Backsplash Pattern Generator:** Generate tile layout patterns (running bond, herringbone, stacked, basketweave) accounting for outlets and switches.

**File:** `services/design-engine/src/services/work_triangle.py`

```python
import math
from pydantic import BaseModel

class Point(BaseModel):
    x: float  # mm
    y: float  # mm

class WorkTriangleResult(BaseModel):
    sink_to_stove: float
    stove_to_fridge: float
    fridge_to_sink: float
    perimeter: float
    score: float  # 0-100
    violations: list[str]

def calculate_work_triangle(
    sink_pos: Point,
    stove_pos: Point,
    fridge_pos: Point,
) -> WorkTriangleResult:
    """Calculate kitchen work triangle efficiency per NKBA guidelines."""

    def dist(a: Point, b: Point) -> float:
        return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)

    sink_stove = dist(sink_pos, stove_pos)
    stove_fridge = dist(stove_pos, fridge_pos)
    fridge_sink = dist(fridge_pos, sink_pos)
    perimeter = sink_stove + stove_fridge + fridge_sink

    violations = []
    score = 100.0

    # NKBA guideline: each leg 1200-2700mm
    for name, leg in [("sink-stove", sink_stove), ("stove-fridge", stove_fridge), ("fridge-sink", fridge_sink)]:
        if leg < 1200:
            violations.append(f"{name} leg too short: {leg:.0f}mm (min 1200mm)")
            score -= 20
        elif leg > 2700:
            violations.append(f"{name} leg too long: {leg:.0f}mm (max 2700mm)")
            score -= 10

    # NKBA guideline: total perimeter 3600-7900mm
    if perimeter < 3600:
        violations.append(f"Triangle perimeter too small: {perimeter:.0f}mm (min 3600mm)")
        score -= 15
    elif perimeter > 7900:
        violations.append(f"Triangle perimeter too large: {perimeter:.0f}mm (max 7900mm)")
        score -= 10

    return WorkTriangleResult(
        sink_to_stove=sink_stove,
        stove_to_fridge=stove_fridge,
        fridge_to_sink=fridge_sink,
        perimeter=perimeter,
        score=max(0, score),
        violations=violations,
    )
```

#### Step 3: Frontend Pages

**File:** `apps/web/src/app/(dashboard)/project/[id]/rooms/[roomId]/kitchen-designer/page.tsx`

Components:
- `cabinet-palette.tsx` — Drag-and-drop cabinet library (base 300/450/600/750/900mm, wall 300/450/600mm, tall 450/600mm)
- `appliance-palette.tsx` — Standard appliance sizes (fridge, range, dishwasher, microwave)
- `countertop-editor.tsx` — Edge profile selector, material picker
- `work-triangle-overlay.tsx` — Visual triangle with distance labels and score
- `backsplash-pattern-preview.tsx` — 2D tile pattern generator

**File:** `apps/web/src/app/(dashboard)/project/[id]/rooms/[roomId]/bathroom-designer/page.tsx`

Components:
- `fixture-palette.tsx` — Toilet, sink, tub, shower standard sizes
- `clearance-overlay.tsx` — Visualize ADA clearances (530mm in front of toilet, 380mm side, 760mm wheelchair turning radius)
- `shower-configurator.tsx` — Enclosure type, door style, dimensions
- `waterproofing-zones.tsx` — Highlight wet zone and splash zone per building code

---

### A5. Lighting Design Simulator

**Purpose:** Calculate lux levels, design artificial lighting layouts, and simulate natural daylight — essential for both aesthetic design and code compliance.

**Priority:** HIGH — Lighting is the single most impactful element of interior design.

#### Step 1: Database Schema

```typescript
export const lightingDesigns = pgTable('lighting_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  fixtures: jsonb('fixtures').notNull(),                 // [{type:"recessed", wattage:10, lumens:800, colorTemp:3000, position:{x,y,z}, aimAngle:0}]
  switchZones: jsonb('switch_zones'),                    // [{zoneId:"A", fixtures:["fix1","fix2"], switchLocation:{x,y}}]
  naturalLight: jsonb('natural_light'),                  // {windowOrientation:"south", latitude:40.7, glazingArea_sqft:24, uValue:0.3}
  luxCalculation: jsonb('lux_calculation'),              // {avgLux:350, minLux:200, maxLux:500, uniformityRatio:0.57, gridPoints:[...]}
  daylightFactor: real('daylight_factor'),               // percentage (2-5% is good)
  targetLux: integer('target_lux'),                      // IES recommended (kitchen:500, bedroom:150, bathroom:300, office:500)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: Lighting Calculation Service

**Add to existing MEP Calculator service:**

**File:** `services/mep-calculator/src/agents/lighting_agent.py`

```python
"""
Lighting calculation agent using the Lumen Method (zonal cavity method)
per IES Lighting Handbook and ASHRAE 90.1.
"""

import math
from pydantic import BaseModel


class LightFixture(BaseModel):
    type: str               # recessed | pendant | track | sconce | under_cabinet | chandelier
    lumens: float           # rated lumens
    color_temp_k: int       # 2700 (warm) to 6500 (daylight)
    beam_angle: float = 60  # degrees
    position_x: float       # mm from room origin
    position_y: float
    mounting_height: float  # mm from floor


class LuxGridPoint(BaseModel):
    x: float
    y: float
    lux: float


class LightingResult(BaseModel):
    avg_lux: float
    min_lux: float
    max_lux: float
    uniformity_ratio: float         # min/avg (should be > 0.6)
    target_lux: int
    meets_target: bool
    grid_points: list[LuxGridPoint]
    recommendations: list[str]
    standards_cited: list[str]


# IES recommended illuminance levels (lux)
IES_RECOMMENDED_LUX = {
    "bedroom": 150,
    "living_room": 300,
    "kitchen": 500,
    "bathroom": 300,
    "dining": 200,
    "home_office": 500,
    "hallway": 100,
    "staircase": 150,
    "laundry": 300,
    "garage": 200,
    "closet": 300,
}


def calculate_lux_grid(
    room_length_mm: float,
    room_width_mm: float,
    room_height_mm: float,
    fixtures: list[LightFixture],
    reflectances: dict | None = None,   # {ceiling: 0.7, wall: 0.5, floor: 0.2}
    grid_spacing_mm: float = 500,
) -> list[LuxGridPoint]:
    """
    Calculate illuminance at a grid of work-plane points (750mm above floor)
    using the inverse square cosine law for each fixture.

    For each grid point:
      E = Σ (I_fixture * cos(θ)) / d²
    where:
      I_fixture = lumens / (2π * (1 - cos(beam_angle/2)))  [candela, assuming Lambertian]
      θ = angle between fixture normal and point direction
      d = distance from fixture to point
    """
    work_plane_height = 750  # mm above floor
    refl = reflectances or {"ceiling": 0.7, "wall": 0.5, "floor": 0.2}

    # Room Cavity Ratio for indirect light estimate
    rcr = (5 * (room_height_mm - work_plane_height) * (room_length_mm + room_width_mm)) / \
          (room_length_mm * room_width_mm)

    # Coefficient of Utilization (CU) lookup — simplified
    cu = estimate_cu(rcr, refl)

    grid_points = []
    nx = max(2, int(room_length_mm / grid_spacing_mm))
    ny = max(2, int(room_width_mm / grid_spacing_mm))

    for ix in range(nx + 1):
        for iy in range(ny + 1):
            px = (ix / nx) * room_length_mm
            py = (iy / ny) * room_width_mm
            pz = work_plane_height

            total_lux = 0.0
            for fix in fixtures:
                dx = fix.position_x - px
                dy = fix.position_y - py
                dz = fix.mounting_height - pz
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)

                if dist < 1:
                    continue

                cos_theta = dz / dist  # angle from vertical

                # Intensity in candela (assuming symmetric distribution)
                half_beam = math.radians(fix.beam_angle / 2)
                solid_angle = 2 * math.pi * (1 - math.cos(half_beam))
                intensity_cd = fix.lumens / solid_angle

                # Check if point is within beam
                point_angle = math.acos(max(0, min(1, cos_theta)))
                if point_angle <= half_beam:
                    # Inverse square law with cosine correction
                    direct_lux = (intensity_cd * cos_theta) / ((dist / 1000) ** 2)
                    total_lux += direct_lux

            # Add indirect component (room cavity estimate)
            total_lumens = sum(f.lumens for f in fixtures)
            room_area_m2 = (room_length_mm * room_width_mm) / 1e6
            indirect_lux = (total_lumens * cu * 0.3) / room_area_m2  # 30% of CU is indirect

            grid_points.append(LuxGridPoint(x=px, y=py, lux=total_lux + indirect_lux))

    return grid_points


def estimate_cu(rcr: float, reflectances: dict) -> float:
    """Simplified CU estimation based on room cavity ratio."""
    # Real implementation would use IES CU tables per fixture type
    base_cu = 0.75
    if rcr > 5:
        base_cu -= 0.05 * (rcr - 5)
    return max(0.3, min(0.9, base_cu * reflectances.get("ceiling", 0.7)))
```

#### Step 3: Frontend

**File:** `apps/web/src/app/(dashboard)/project/[id]/rooms/[roomId]/lighting/page.tsx`

Components:
- `lux-heatmap.tsx` — Color-coded grid overlay on room plan (red=too bright, blue=too dark, green=ideal)
- `fixture-palette.tsx` — Drag recessed, pendant, track, sconce onto room plan
- `color-temp-slider.tsx` — Warm (2700K amber) to Cool (6500K blue-white) visualization
- `switch-zone-editor.tsx` — Group fixtures into switching zones, place switches on walls
- `daylight-simulator.tsx` — Sun position based on latitude/longitude + window orientation, animated time-of-day

---

### A6. Material & Finish Board Generator

**Purpose:** Auto-generate client-ready material boards showing all selected finishes.

**Priority:** MEDIUM — Essential for client presentations but not blocking construction.

#### Step 1: Database Schema

```typescript
export const materialBoards = pgTable('material_boards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  items: jsonb('items').notNull(),          // [{category:"flooring", productId:"", name:"White Oak", swatchUrl:"", specs:{...}}]
  layout: text('layout').default('grid'),   // grid | mood | comparison | linear
  brandingConfig: jsonb('branding_config'), // {firmLogo, firmName, projectName, headerColor}
  pdfKey: text('pdf_key'),                  // generated PDF stored in MinIO
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: Implementation

- **tRPC router:** `materialBoard.ts` — CRUD + PDF generation trigger
- **PDF generation:** Use `@react-pdf/renderer` on the server or extend the `services/media-service/` with a PDF rendering endpoint using ReportLab
- **Auto-generation:** When a design variant is selected, extract all materials from `specJson`, match to product catalogue images, and compose the board
- **Frontend:** Grid layout of material swatches with names, specs, and supplier info. Side-by-side comparison mode. Export as branded PDF.

---

### A7. Photorealistic Rendering Engine

**Purpose:** Generate ray-traced renders for client presentations — far beyond the AI-generated concept images.

**Priority:** HIGH — The #1 way to sell a design to a client.

#### Step 1: Architecture Decision

**Option A: Server-Side Rendering (Recommended)**
- Create a new `services/render-engine/` Python service
- Use **Blender** headless (bpy) for path-traced rendering
- Convert the 3D editor scene (React Three Fiber glTF) to Blender scene
- Submit render jobs that produce high-res images

**Option B: Cloud Rendering API**
- Integrate with a rendering API (Chaos Cloud, RenderMan, or Replicate)
- Send scene description, receive rendered image
- Lower infrastructure cost, higher per-render cost

#### Step 2: Database Schema

```typescript
export const renderJobs = pgTable('render_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  renderType: text('render_type').notNull(),    // still | panorama_360 | video_walkthrough
  resolution: text('resolution').notNull(),     // 1920x1080 | 3840x2160 | 4096x4096
  timeOfDay: text('time_of_day'),               // morning | afternoon | sunset | night
  season: text('season'),                       // spring | summer | autumn | winter
  cameraPosition: jsonb('camera_position'),     // {x, y, z, lookAt:{x,y,z}, fov:60}
  sceneKey: text('scene_key'),                  // S3 key for input glTF scene
  outputKey: text('output_key'),                // S3 key for rendered image/video
  samples: integer('samples').default(256),     // ray-trace sample count
  status: text('status').default('pending'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 3: Render Service

**Directory:** `services/render-engine/`

```python
# main.py — FastAPI app for render job processing
# Uses Blender's Python API (bpy) in headless mode

# Key workflow:
# 1. Receive glTF scene from MinIO
# 2. Import into Blender
# 3. Set up HDRI environment lighting based on time-of-day
# 4. Configure Cycles renderer with specified samples
# 5. Render to PNG/EXR
# 6. For 360° panoramas: set equirectangular camera
# 7. For video: create camera animation path, render frame sequence, encode with ffmpeg
# 8. Upload result to MinIO
# 9. Update job status
```

**Dockerfile** would need `blender` installed:
```dockerfile
FROM nytimes/blender:4.0-gpu-ubuntu22.04
# or CPU-only: FROM nytimes/blender:4.0-cpu-ubuntu22.04
```

#### Step 4: Frontend

- Camera position picker in 3D editor (save viewpoints)
- Time-of-day slider with preview thumbnails
- Render quality presets (draft=64 samples, standard=256, high=1024)
- Render queue with progress and estimated time
- Image gallery with before/after comparison slider
- 360° panorama viewer using `pannellum` or `react-pannellum`

---

## B. STRUCTURAL & ENGINEERING

---

### B1. Structural Analysis Module

**Purpose:** Calculate structural loads, size beams and headers, and verify foundation adequacy — critical for any renovation involving wall removal or addition.

**Priority:** HIGH — Wall removal is the most common renovation request.

#### Step 1: Database Schema

```typescript
export const structuralAnalyses = pgTable('structural_analyses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  analysisType: text('analysis_type').notNull(),          // beam_sizing | load_path | foundation | lateral
  inputParameters: jsonb('input_parameters').notNull(),   // {span_mm, tributary_width_mm, load_type, stories_above, roof_type, ...}
  result: jsonb('result').notNull(),                      // {beam_size, wood_species, deflection_ratio, demand_capacity_ratio, ...}
  standardsCited: jsonb('standards_cited'),               // ["IBC 2021 1607.1", "NDS 2018 3.3.1", ...]
  status: text('status').default('completed'),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: Structural Calculation Service

**Create:** `services/structural-calculator/`

```
services/structural-calculator/
├── main.py
├── Dockerfile
├── pyproject.toml
├── requirements.txt         # numpy, scipy, pydantic, fastapi
└── src/
    ├── agents/
    │   ├── beam_sizing_agent.py
    │   ├── load_path_agent.py
    │   └── foundation_agent.py
    ├── routers/
    │   └── structural.py
    ├── models/
    │   ├── loads.py
    │   ├── beams.py
    │   └── foundations.py
    ├── standards/
    │   ├── ibc_loads.py           # IBC Table 1607.1 floor live loads
    │   ├── nds_wood.py            # NDS reference design values for wood
    │   ├── aisc_steel.py          # AISC W-shape properties
    │   ├── aci_concrete.py        # ACI 318 concrete design
    │   └── asce7_loads.py         # ASCE 7 load combinations, seismic, wind
    └── services/
        ├── beam_calculator.py
        ├── load_path_analyzer.py
        └── foundation_designer.py
```

**File:** `services/structural-calculator/src/services/beam_calculator.py`

```python
"""
Beam sizing calculator per NDS (National Design Specification for Wood)
and AISC Steel Construction Manual.

Handles:
- Simply supported beams
- Continuous beams (2-3 spans)
- Cantilevers
- Point loads and distributed loads
"""

import math
from enum import Enum
from pydantic import BaseModel


class LoadType(str, Enum):
    DEAD = "dead"
    LIVE = "live"
    SNOW = "snow"
    WIND = "wind"


class BeamRequest(BaseModel):
    span_mm: float                      # clear span
    tributary_width_mm: float           # load width perpendicular to beam
    stories_above: int = 1              # number of stories this beam supports
    roof_above: bool = False            # true if beam supports roof
    floor_dead_load_psf: float = 15.0   # dead load per floor (psf)
    floor_live_load_psf: float = 40.0   # live load per floor (psf, IBC Table 1607.1)
    roof_dead_load_psf: float = 20.0
    roof_live_load_psf: float = 20.0
    snow_load_psf: float = 0.0         # ground snow load
    point_loads: list[dict] = []        # [{position_from_left_mm, load_lbs, type}]
    material: str = "wood"              # wood | steel | lvl
    wood_species: str = "douglas_fir"
    wood_grade: str = "no_2"
    max_deflection_ratio: float = 360   # L/360 for live load, L/240 for total


class BeamResult(BaseModel):
    recommended_size: str               # "2x12" or "W8x18" or "1.75x11.875 LVL"
    actual_depth_mm: float
    actual_width_mm: float
    bending_stress_psi: float
    allowable_bending_psi: float
    demand_capacity_ratio: float        # must be <= 1.0
    shear_stress_psi: float
    allowable_shear_psi: float
    max_deflection_mm: float
    allowable_deflection_mm: float
    deflection_ratio: float             # actual L/xxx
    total_load_plf: float               # pounds per linear foot
    reactions: dict                      # {left_lbs, right_lbs}
    load_combinations: list[dict]       # [{combo_name, total_load_plf}]
    standards_cited: list[str]


# NDS Reference Design Values (simplified subset)
NDS_WOOD_PROPERTIES = {
    ("douglas_fir", "no_2"): {
        "Fb": 900,   # bending psi
        "Fv": 180,   # shear psi
        "E": 1600000, # modulus of elasticity psi
        "Fc_perp": 625,
    },
    ("southern_pine", "no_2"): {
        "Fb": 1000,
        "Fv": 175,
        "E": 1600000,
        "Fc_perp": 565,
    },
    ("hem_fir", "no_2"): {
        "Fb": 850,
        "Fv": 150,
        "E": 1400000,
        "Fc_perp": 405,
    },
}

# Standard lumber sizes (actual dimensions in inches)
LUMBER_SIZES = [
    {"nominal": "2x6", "b": 1.5, "d": 5.5},
    {"nominal": "2x8", "b": 1.5, "d": 7.25},
    {"nominal": "2x10", "b": 1.5, "d": 9.25},
    {"nominal": "2x12", "b": 1.5, "d": 11.25},
    {"nominal": "3x12", "b": 2.5, "d": 11.25},
    {"nominal": "4x12", "b": 3.5, "d": 11.25},
    {"nominal": "6x12", "b": 5.5, "d": 11.25},
]


def size_beam(request: BeamRequest) -> BeamResult:
    """Size a beam per NDS or AISC based on material selection."""

    span_ft = request.span_mm / 304.8
    trib_ft = request.tributary_width_mm / 304.8

    # 1. Calculate loads (ASCE 7 load combinations)
    dead_load_plf = request.floor_dead_load_psf * trib_ft * request.stories_above
    live_load_plf = request.floor_live_load_psf * trib_ft * request.stories_above

    if request.roof_above:
        dead_load_plf += request.roof_dead_load_psf * trib_ft
        live_load_plf += max(request.roof_live_load_psf, request.snow_load_psf) * trib_ft

    # ASCE 7-22 Load combinations
    combos = [
        {"name": "1.2D + 1.6L", "total": 1.2 * dead_load_plf + 1.6 * live_load_plf},
        {"name": "1.4D", "total": 1.4 * dead_load_plf},
        {"name": "D + L", "total": dead_load_plf + live_load_plf},
    ]

    factored_load_plf = max(c["total"] for c in combos)
    service_load_plf = dead_load_plf + live_load_plf

    # 2. Calculate required section modulus and moment of inertia
    # Simply supported beam: M_max = w*L^2/8, V_max = w*L/2
    M_max = factored_load_plf * span_ft**2 / 8  # ft-lbs
    M_max_in_lbs = M_max * 12  # convert to in-lbs

    V_max = factored_load_plf * span_ft / 2  # lbs

    if request.material == "wood":
        props = NDS_WOOD_PROPERTIES.get((request.wood_species, request.wood_grade))
        if not props:
            raise ValueError(f"Unknown wood: {request.wood_species}/{request.wood_grade}")

        Fb = props["Fb"]
        Fv = props["Fv"]
        E = props["E"]

        # Required section modulus: S_req = M / Fb
        S_required = M_max_in_lbs / Fb  # in^3

        # Required moment of inertia for deflection: delta = 5*w*L^4 / (384*E*I)
        delta_allow_live = span_ft * 12 / request.max_deflection_ratio  # inches
        I_required_live = (5 * live_load_plf/12 * (span_ft * 12)**4) / (384 * E * delta_allow_live)

        # Find smallest lumber that works
        for size in LUMBER_SIZES:
            b, d = size["b"], size["d"]
            S = b * d**2 / 6
            I = b * d**3 / 12

            if S >= S_required and I >= I_required_live:
                # Check shear: fv = 3V/(2bd) <= Fv
                fv = (3 * V_max) / (2 * b * d)
                if fv <= Fv:
                    actual_deflection = (5 * service_load_plf/12 * (span_ft*12)**4) / (384 * E * I)

                    return BeamResult(
                        recommended_size=size["nominal"],
                        actual_depth_mm=d * 25.4,
                        actual_width_mm=b * 25.4,
                        bending_stress_psi=M_max_in_lbs / S,
                        allowable_bending_psi=Fb,
                        demand_capacity_ratio=(M_max_in_lbs / S) / Fb,
                        shear_stress_psi=fv,
                        allowable_shear_psi=Fv,
                        max_deflection_mm=actual_deflection * 25.4,
                        allowable_deflection_mm=delta_allow_live * 25.4,
                        deflection_ratio=span_ft * 12 / max(actual_deflection, 0.001),
                        total_load_plf=service_load_plf,
                        reactions={"left_lbs": service_load_plf * span_ft / 2, "right_lbs": service_load_plf * span_ft / 2},
                        load_combinations=combos,
                        standards_cited=["NDS 2018 3.3.1", "ASCE 7-22 2.3.1", "IBC 2021 1607.1"],
                    )

        raise ValueError("No standard lumber size sufficient — consider engineered lumber (LVL/PSL) or steel")
```

#### Step 3: tRPC Router, Frontend Page

Follow the standard pattern: `structural.ts` tRPC router, `/project/[id]/structural/page.tsx` page, fire-and-forget job to the structural-calculator service.

**Docker:** Port 8010

---

### B2. Site Analysis & Grading

**Purpose:** Import site surveys, plan grading/drainage, visualize setbacks, and analyze solar orientation.

#### Implementation Steps:

1. **Database:** `siteAnalyses` table with `projectId`, `topoData` (GeoJSON), `setbacks` (jsonb), `solarData`, `gradeData`, `drainagePlan`
2. **Data Import:** Accept GeoJSON, DXF (survey files), or CSV (elevation grid) uploads
3. **Sun Path Calculation:** Pure math based on latitude/longitude + date using the solar position algorithm (SPA) from NREL — no external service needed, implement in TypeScript
4. **Grade Calculation:** Compute slope percentages, identify low points for drainage, calculate cut/fill volumes using a grid-based method
5. **Frontend:** Topographic contour map overlay (using D3.js or Mapbox GL), setback lines as colored overlays, animated sun path diagram
6. **tRPC Router:** `siteAnalysis.ts` — CRUD + calculations

---

### B3. Energy Modeling & Passive Design

**Purpose:** Simulate energy consumption and optimize the building envelope.

#### Implementation Steps:

1. **Database:** `energyModels` table with `projectId`, `envelopeSpec` (wall/roof/window assembly details), `climateZone`, `simulationResult`, `hersScore`, `recommendations`
2. **Python Service:** `services/energy-calculator/` (port 8011)
   - Implement simplified ASHRAE 90.1 envelope compliance
   - Heating/cooling load calculation using degree-day method
   - Window-to-wall ratio analysis per orientation
   - R-value optimization using OR-Tools
   - Solar panel production estimate using PVWatts algorithm
3. **Climate Data:** Bundle TMY3 (Typical Meteorological Year) data for major cities, or fetch from NREL API
4. **HERS Score:** Implement the RESNET HERS Index calculation (ratio of designed home energy to reference home energy)
5. **Frontend:** Energy flow Sankey diagram, insulation comparison tables, solar panel placement on roof plan

---

### B4. Acoustic Design

**Purpose:** Calculate sound transmission between rooms and optimize acoustic treatment.

#### Implementation Steps:

1. **Database:** `acousticAnalyses` table with `projectId`, `roomPairs` (jsonb), `stcRatings`, `iicRatings`, `reverbTime`, `recommendations`
2. **Calculation Logic:** Add to `services/mep-calculator/` as a new agent
   - **STC Calculation:** Based on wall assembly (drywall layers, stud type, insulation, air gap) using mass-air-mass resonance model
   - **IIC Calculation:** Based on floor assembly (subfloor, underlayment, finish floor) using impact insulation tables
   - **Reverberation Time:** Sabine equation: RT60 = 0.161 * V / A (volume / total absorption)
3. **Material Database:** Absorption coefficients for common materials at 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz
4. **Frontend:** Room adjacency diagram, STC/IIC rating badges, reverberation time visualization, material recommendation cards

---

## C. PROJECT MANAGEMENT & FIELD

---

### C1. RFI (Request for Information) Management

**Purpose:** Track questions between contractors and architects with full audit trail.

#### Step 1: Database Schema

```typescript
export const rfis = pgTable('rfis', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  rfiNumber: serial('rfi_number'),                       // auto-increment per project
  subject: text('subject').notNull(),
  question: text('question').notNull(),
  response: text('response'),
  status: text('status').notNull().default('open'),      // open | pending_response | responded | closed
  priority: text('priority').default('normal'),          // low | normal | high | urgent
  askedBy: text('asked_by').notNull().references(() => users.id),
  assignedTo: text('assigned_to').references(() => users.id),
  relatedDrawingId: text('related_drawing_id').references(() => drawingResults.id, { onDelete: 'set null' }),
  relatedSpecSection: text('related_spec_section'),      // "09 30 00 Tiling"
  attachments: jsonb('attachments'),                     // [{key, filename, type}]
  dueDate: timestamp('due_date', { mode: 'date' }),
  respondedAt: timestamp('responded_at', { mode: 'date' }),
  respondedBy: text('responded_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
```

#### Step 2: tRPC Router

**File:** `apps/web/src/server/trpc/routers/rfi.ts`

- `rfi.create` — Create RFI with question, priority, due date, attachments
- `rfi.respond` — Architect responds to RFI
- `rfi.list` — Filter by status, priority, date range
- `rfi.byId` — Full RFI detail with response
- `rfi.close` — Close resolved RFI
- `rfi.escalate` — Escalate overdue RFI (auto-notify via notifications table)

#### Step 3: Frontend

**File:** `apps/web/src/app/(dashboard)/project/[id]/rfis/page.tsx`

- RFI log table with filtering (status, priority, date)
- Create RFI dialog with rich text editor, file attachments, drawing reference picker
- Response form for architect with markup annotation
- Overdue RFI highlighting (past due date + still open)
- Email notification trigger on new RFI and response

---

### C2. Submittal Management

**Purpose:** Track contractor material submittals for architect review and approval.

#### Implementation Steps:

1. **Database:** `submittals` table — `projectId`, `submittalNumber`, `specSection`, `description`, `submittedProductId` (link to catalogue), `specifiedProductId`, `status` (pending/approved/rejected/revise_resubmit), `reviewerNotes`, `stampType` (approved/approved_as_noted/rejected/revise), `pdfKey` (uploaded submittal PDF), `stampedPdfKey` (approved PDF with stamp)
2. **tRPC Router:** `submittal.ts` — CRUD + approval workflow
3. **PDF Stamping:** Server-side PDF manipulation using `pdf-lib` (TypeScript) to add approval stamp/watermark to submitted PDFs
4. **Frontend:** Submittal log table, side-by-side comparison (submitted vs. specified product from catalogue), approval dialog with stamp options, PDF viewer with stamp overlay

---

### C3. Daily/Weekly Progress Reporting

**Purpose:** Auto-generate progress reports from existing site logs, photos, and milestones.

#### Implementation Steps:

1. **Database:** `progressReports` table — `projectId`, `reportType` (daily/weekly/monthly), `periodStart`, `periodEnd`, `content` (jsonb: aggregated data), `pdfKey`, `emailedTo`
2. **tRPC Router:** `progressReport.ts`
   - `generate` — Aggregate site logs, milestone completions, photos, change orders for the period
   - `listByProject` — Fetch all reports
   - `emailToClient` — Send report via email integration
3. **Report Generator:** Use the existing LLM agents to summarize site log notes into a coherent narrative
4. **Photo Comparison:** For each room, find photos with similar camera angles across different dates using CLIP embeddings (already in the system via `productEmbeddings` pattern)
5. **Frontend:** Report viewer with before/after photo carousels, percentage completion progress bars per trade, Gantt chart excerpt showing period's progress

---

### C4. Safety & OSHA Compliance

#### Implementation Steps:

1. **Database:** `safetyChecklists` table (predefined per construction phase), `safetyIncidents` table (incident reports with photos, witnesses), `safetyTrainingRecords` table (worker certifications)
2. **Data Seeding:** Pre-populate OSHA checklist templates from `data/safety-checklists/` directory: fall protection, scaffolding, electrical, trenching, PPE, hazcom
3. **tRPC Router:** `safety.ts` — checklist completion, incident reporting, training records
4. **Frontend:** Checklist completion workflow, incident report form with photo upload, training matrix dashboard, violation risk dashboard

---

### C5. Permit & Inspection Tracking

#### Implementation Steps:

1. **Database:** `permits` table (`projectId`, `permitType`, `jurisdiction`, `applicationDate`, `approvalDate`, `permitNumber`, `status`, `documents`), `inspections` table (`permitId`, `inspectionType`, `scheduledDate`, `result`, `inspectorName`, `notes`, `photos`)
2. **Predefined Inspection Types:** Foundation, framing, rough electrical, rough plumbing, rough HVAC, insulation, drywall, final electrical, final plumbing, final building
3. **tRPC Router:** `permit.ts` — CRUD for permits and inspections
4. **Frontend:** Permit timeline, inspection checklist with pass/fail/correction-needed, inspector contact directory, document storage with upload

---

### C6. Document Version Control

#### Implementation Steps:

1. **Database:** `documentVersions` table (`projectId`, `documentType` (drawing/spec/contract/report), `documentNumber` (A-101, S-201, etc.), `revision` (A/B/C/1/2/3), `title`, `fileKey`, `previousVersionId` (self-reference), `status` (current/superseded), `changesDescription`, `distributionList` (jsonb), `issuedDate`)
2. **Diff Service:** For DXF files, use ezdxf to compare entity lists between revisions and generate a "clouded" comparison
3. **tRPC Router:** `documentVersion.ts` — create revision, list history, compare versions, distribute
4. **Frontend:** Version timeline, side-by-side diff viewer, clouded revision overlay on drawings, distribution tracking table

---

## D. CLIENT EXPERIENCE

---

### D1. Client Portal

**Purpose:** A simplified, branded interface for clients to view progress, approve designs, and make selections.

#### Step 1: New Role + Route Group

1. **Add `client` role** to the users table role enum (currently `user | admin`):

```typescript
// In auth.ts, extend role column
role: text('role').notNull().default('client'),  // user | admin | client
```

2. **Add tRPC middleware:**

```typescript
const enforceClientAccess = t.middleware(async ({ ctx, next }) => {
  // Clients can only see projects they're invited to
  // Check projectClients table for access
});
```

3. **Database:** `projectClients` table — `projectId`, `clientUserId`, `accessLevel` (view_only/can_approve/full), `invitedBy`, `invitedAt`

#### Step 2: Client Route Group

**Directory:** `apps/web/src/app/(client)/` — separate layout with simplified navigation

Pages:
- `/client/dashboard` — My projects overview
- `/client/project/[id]` — Project summary with progress photos
- `/client/project/[id]/designs` — Review and approve designs
- `/client/project/[id]/selections` — Make finish selections
- `/client/project/[id]/payments` — Payment milestone dashboard
- `/client/project/[id]/documents` — Access drawings, specs, contracts

#### Step 3: Frontend

Simplified UI: no technical tools, just viewing and decision-making. Large photos, clear approve/reject buttons, selection cards, payment status indicators.

---

### D2. Selection & Allowance Management

#### Implementation Steps:

1. **Database:** `selectionCategories` table (flooring, paint, lighting, plumbing fixtures, hardware, countertops, tile, appliances), `selections` table (`projectId`, `categoryId`, `selectedProductId`, `allowanceBudget`, `actualCost`, `overUnder`, `dueDate`, `status` (pending/selected/approved/ordered)), `showroomAppointments` table
2. **Allowance Tracking:** When actualCost > allowanceBudget, auto-generate a change order via the existing change order system
3. **tRPC Router:** `selection.ts` — CRUD + allowance tracking + change order integration
4. **Frontend:** Selection scheduler with due dates, product cards with pricing, allowance budget vs. actual bars, showroom appointment booking

---

### D3. Client Mood Board & Inspiration Collection

#### Implementation Steps:

1. **Database:** `inspirationPins` table (`projectId`, `userId`, `imageUrl`, `sourceUrl`, `note`, `tags`, `style`, `category`, `position`), `inspirationBoards` table (`projectId`, `name`, `layout`)
2. **AI "Find Similar":** Use existing CLIP embedding pipeline — when a client pins an inspiration image, generate CLIP embedding and find similar products in the catalogue using pgvector
3. **tRPC Router:** `inspiration.ts` — pin/unpin, search similar, organize boards
4. **Frontend:** Pinterest-style masonry grid, drag to rearrange, AI "Find Similar" button per pin, collaborative (both designer and client can pin)

---

### D4. Walk-Through Annotation Tool

#### Implementation Steps:

1. **Database:** `walkthroughAnnotations` table (`projectId`, `roomId`, `position3d` (jsonb: {x,y,z}), `annotationType` (text/voice/photo), `content`, `voiceRecordingKey`, `status` (open/acknowledged/resolved), `createdBy`, `resolvedBy`)
2. **3D Integration:** Extend existing `editor-3d/` components to support annotation placement mode — click on any surface to drop a pin
3. **Voice Recording:** Use Web Audio API to record voice notes, upload to MinIO via existing upload API
4. **tRPC Router:** `walkthroughAnnotation.ts` — CRUD + resolution workflow
5. **Frontend:** Annotation pins in 3D view, annotation list panel, resolution status, voice playback

---

## E. BUSINESS OPERATIONS

---

### E1. Proposal & Contract Generator

#### Implementation Steps:

1. **Database:** `proposals` table (`projectId`, `templateId`, `scopeOfWork`, `feeStructure` (jsonb: {type, amount, percentage, retainer}), `termsAndConditions`, `paymentSchedule` (jsonb), `status` (draft/sent/accepted/rejected), `signatureRequestId`, `signedAt`, `pdfKey`), `contractTemplates` table
2. **Auto-Generation:** LLM agent composes scope of work from project rooms, design selections, and BOM data
3. **E-Signature:** Integrate with DocuSign or HelloSign API for contract signing
4. **PDF Generation:** Use `@react-pdf/renderer` or `pdf-lib` to compose branded proposal PDFs
5. **tRPC Router:** `proposal.ts` — generate, send, track signature status
6. **Frontend:** Proposal builder with editable sections, template selector, send for signature button, signature status tracking

---

### E2. CRM & Lead Management

#### Implementation Steps:

1. **Database:** `leads` table (`firmId`, `name`, `email`, `phone`, `source` (website/referral/social/walk_in), `status` (new/contacted/qualified/proposal_sent/won/lost), `estimatedValue`, `notes`, `nextFollowUp`), `leadActivities` table (call logs, emails, meetings), `clientSurveys` table
2. **Pipeline Stages:** new → contacted → qualified → proposal_sent → negotiating → won/lost
3. **tRPC Router:** `crm.ts` — lead CRUD, pipeline management, activity logging, follow-up reminders
4. **Notification Integration:** Create reminder notifications for follow-ups via existing notifications system
5. **Frontend:** Kanban board for lead pipeline (drag between stages), lead detail page with activity timeline, follow-up calendar view

---

### E3. Time Tracking & Billing

#### Implementation Steps:

1. **Database:** `timeEntries` table (`userId`, `projectId`, `date`, `hours`, `description`, `billable`, `rate`, `approvedBy`, `status`), `timesheetPeriods` table (weekly aggregations)
2. **tRPC Router:** `timeTracking.ts` — log time, approve timesheets, generate billing
3. **Invoice Integration:** Generate invoices from approved time entries using the existing invoice system
4. **Frontend:** Timer widget (start/stop), weekly timesheet grid, utilization dashboard (hours billed / hours available), project profitability report

---

### E4. Insurance & Liability Management

#### Implementation Steps:

1. **Database:** `insuranceCertificates` table (`entityType` (firm/contractor/subcontractor), `entityId`, `insuranceType` (general_liability/professional_liability/workers_comp/auto), `carrier`, `policyNumber`, `coverageAmount`, `startDate`, `endDate`, `certificateKey` (PDF), `status` (active/expired/pending_renewal))
2. **tRPC Router:** `insurance.ts` — CRUD + expiration alerts
3. **Notification Integration:** Auto-create notifications 30/14/7 days before expiration
4. **Frontend:** Insurance matrix (rows=entities, columns=insurance types), expiration calendar, upload certificate, automated renewal reminders

---

### E5. Multi-Office / Team Management

#### Implementation Steps:

1. **Database:** `teams` table (`firmId`, `name`), `teamMembers` table (`teamId`, `userId`, `role` (principal/project_architect/designer/project_manager/field_superintendent/intern)), `projectAssignments` table (`projectId`, `userId`, `role`, `allocationPercent`, `startDate`, `endDate`)
2. **Workload Calculation:** Sum allocation percentages per user to show capacity
3. **tRPC Router:** `team.ts` — team CRUD, member assignment, workload queries
4. **Frontend:** Team directory, resource calendar (who's on what project), workload heatmap, project assignment matrix

---

## F. ADVANCED TECHNOLOGY

---

### F1. AI Space Planning

**Purpose:** Auto-generate optimal furniture layouts and room arrangements.

#### Implementation Steps:

1. **Extend Design Engine:** Add `space_planning_agent.py` to `services/design-engine/src/agents/`
2. **Algorithm:** Multi-step LangGraph agent:
   - **Node 1: Analyze Room** — Room dimensions, door/window positions, focal points
   - **Node 2: Traffic Flow** — Calculate circulation paths (min 900mm wide, 1200mm for accessibility)
   - **Node 3: Furniture Placement** — OR-Tools constraint solver for optimal placement considering: clearances, focal points, conversation groupings, natural light
   - **Node 4: Feng Shui / Vastu** (optional) — Apply cultural placement rules
   - **Node 5: Generate Variants** — Produce 3-5 layout options with pros/cons
3. **Database:** `spacePlans` table with `roomId`, `layoutVariant`, `furniturePlacements` (jsonb), `circulationScore`, `fengShuiScore`, `accessibilityScore`
4. **Frontend:** Side-by-side layout comparison, scores per layout, one-click apply to 3D editor

---

### F2. Generative Facade Design

#### Implementation Steps:

1. **Extend Design Engine:** Add `facade_agent.py`
2. **Input:** Home footprint, style preferences, climate zone, neighborhood photos (optional)
3. **LLM Agent:** Generate facade descriptions, then use image generation API to render
4. **Climate Optimization:** Factor in solar heat gain, prevailing wind, rain exposure per orientation
5. **Database/Frontend:** Reuse `exteriorDesigns` table from A3

---

### F3. AI Code Compliance Pre-Check

#### Implementation Steps:

1. **Extend existing compliance system** (`/project/[id]/compliance`)
2. **Add drawing upload analysis:** Accept DXF/PDF drawing → VLM extracts dimensions → run against building code database
3. **Natural language query:** Add a chat interface to the compliance page where architects can ask "What's the minimum hallway width in IRC?" and get an answer with code section reference
4. **Database:** `complianceQueries` table for query history
5. **Implementation:** Use RAG (Retrieval Augmented Generation) over the existing `data/building-codes/` database with pgvector embeddings

---

### F4. Voice-Controlled Design

#### Implementation Steps:

1. **Web Speech API Integration:** Use browser's `SpeechRecognition` API for voice input
2. **Command Parser:** LLM-based command parsing: "move the sofa 2 feet left" → `{ action: "move", object: "sofa", direction: "left", distance: 610 }` (converted to mm)
3. **3D Editor Integration:** Add voice mode to existing `editor-3d/` — listen for commands, translate to 3D operations
4. **Site Visit Mode:** Voice-to-text for site log entries and punch list items using `MediaRecorder` API
5. **Frontend:** Microphone button in 3D editor toolbar + site log form, voice waveform visualization, transcription preview before commit

---

### F5. Drone Integration

#### Implementation Steps:

1. **Image Import:** Accept drone photos tagged with GPS EXIF data
2. **Photogrammetry:** Extend `services/vision-engine/` to process drone images through COLMAP (already integrated for room reconstruction)
3. **Site Model:** Generate terrain mesh from drone imagery
4. **Progress Monitoring:** Compare aerial photos over time using image registration
5. **Database:** `droneCaptures` table with `projectId`, `captureDate`, `gpsData`, `imageKeys`, `pointCloudKey`, `terrainMeshKey`

---

### F6. LiDAR Scan Import

#### Implementation Steps:

1. **Point Cloud Import:** Accept `.ply`, `.las`, `.laz`, `.e57` files
2. **Processing Service:** Extend `services/vision-engine/` with Open3D or CloudCompare integration
   - Point cloud registration and cleanup
   - Floor/wall/ceiling plane detection using RANSAC
   - Room segmentation from planes
   - As-built floor plan generation from detected walls
3. **Clash Detection:** Compare LiDAR scan (existing conditions) against proposed design (3D editor model) to find conflicts
4. **Database:** `lidarScans` table with `projectId`, `rawPointCloudKey`, `processedPointCloudKey`, `extractedPlanKey`, `clashReport`
5. **Frontend:** 3D point cloud viewer using `potree` (web-based point cloud renderer), overlay proposed design, clash highlighting

---

### F7. Smart Home Pre-Wiring Planner

#### Implementation Steps:

1. **Database:** `smartHomePlans` table (`projectId`, `networkRackLocation`, `wifiAccessPoints` (jsonb), `smartDevices` (jsonb), `wiringRuns` (jsonb), `scenes` (jsonb))
2. **Device Library:** Pre-built database of smart devices: smart switches, thermostats, doorbells, cameras, speakers, voice assistants
3. **Wiring Calculator:** For each device, calculate cable run lengths (CAT6, speaker wire, HDMI, coax) from network rack to device location
4. **WiFi Coverage:** Simple signal propagation model considering wall materials and distances
5. **tRPC Router:** `smartHome.ts` — device placement, wiring calculation, scene design
6. **Frontend:** Device placement on floor plan, wiring run visualization, WiFi coverage heatmap, scene editor (e.g., "Movie Night" = dim living room lights, close motorized blinds, turn on projector)

---

## G. SPECIALIZED DESIGN AREAS

---

### G1. Closet & Storage Design Module

#### Implementation Steps:

1. **Database:** `closetLayouts` table (`roomId`, `layoutType`, `sections` (jsonb: [{type:"hanging_double", width:600}, {type:"shelving", width:450, shelves:5}, {type:"drawers", width:600, count:4}]), `accessories` (jsonb), `totalLinearFt`)
2. **Section Library:** Predefined closet sections: double hang, long hang, shelving stack, drawer stack, shoe rack, pull-out basket, island, jewelry drawer, belt/tie rack
3. **Optimizer:** Given room dimensions and user preferences, OR-Tools maximizes storage capacity while maintaining access clearances (min 600mm pull-out space, 900mm for walk-in aisles)
4. **Frontend:** Drag-and-drop section placement, 3D preview, elevation drawings for each wall

---

### G2. Home Theater / Media Room Designer

#### Implementation Steps:

1. **Database:** `theaterDesigns` table (`roomId`, `screenSpec`, `speakerLayout`, `seatingLayout`, `acousticTreatment`, `lightingZones`)
2. **Screen Calculator:** THX recommendation: viewing distance = 1.2x screen width for immersive, 1.6x for comfortable
3. **Speaker Placement:** Dolby Atmos specification for 5.1.2, 7.1.4, 9.1.6 configurations with angle calculations
4. **Acoustic Agent:** Calculate RT60, recommend absorption panels and bass traps placement
5. **Frontend:** Room setup wizard, speaker angle diagram, acoustic treatment wall elevation view

---

### G3. Outdoor Living Designer

#### Implementation Steps:

1. **Database:** `outdoorDesigns` table (`projectId`, `designType` (deck/patio/pool/outdoor_kitchen/landscape), `elements` (jsonb), `materials`, `gradeIntegration`)
2. **Deck Designer:** Standard joist spacing calculator (16" or 24" OC), post spacing, railing code compliance (36" height residential, 42" commercial), material estimator (composite vs. wood)
3. **Outdoor Kitchen:** Appliance placement (grill, sink, fridge, pizza oven), counter layout, utility connections
4. **Pool Designer:** Pool shape library, equipment pad sizing, safety fence requirements
5. **Landscape:** Plant database by climate zone, irrigation zone calculator, hardscape material estimator
6. **Frontend:** Outdoor plan editor (extension of 2D floor plan editor), material palette, plant selector by zone

---

### G4. Aging-in-Place / Universal Design Module

#### Implementation Steps:

1. **Database:** `universalDesignChecks` table (`projectId`, `roomId`, `checkResults` (jsonb), `complianceLevel` (basic/enhanced/full_ada), `recommendations`)
2. **Compliance Engine:** Check against ADA 2010 Standards, ANSI A117.1, and Fair Housing Act:
   - Door widths (min 815mm clear for ADA)
   - Wheelchair turning radius (1525mm diameter)
   - Grab bar locations in bathrooms
   - Counter heights (adjustable or dual-height)
   - Zero-threshold entries
   - Visual alarms for hearing impaired
3. **Future-Proofing:** Identify structural provisions for future accessibility (blocking for grab bars, conduit for elevator, reinforced ceiling for ceiling lifts)
4. **Frontend:** Room-by-room compliance checklist, wheelchair path visualization on floor plan, recommendations panel

---

### G5. Multi-Unit / ADU Planning

#### Implementation Steps:

1. **Database:** `multiUnitPlans` table (`projectId`, `unitCount`, `units` (jsonb: [{unitId, type, sqft, bedrooms, bathrooms, entrance, metered}]), `sharedSpaces`, `parkingSpaces`, `zoningCompliance`)
2. **Zoning Check:** Input zoning code requirements (FAR, lot coverage, setbacks, parking ratio), verify compliance
3. **ADU Templates:** Pre-built 400-1200 sqft ADU plans with standard configurations
4. **Utility Planning:** Separate vs. shared water/electric/gas meters, separate entrance requirements
5. **Frontend:** Unit editor, zoning compliance dashboard, parking layout planner, utility diagram

---

## H. REPORTING & DOCUMENTATION

---

### H1. Professional Drawing Set Templates

#### Implementation Steps:

1. **Database:** `drawingSetConfigs` table (`firmId`, `titleBlockTemplate`, `sheetNumberingScheme`, `symbolLegend`, `abbreviationKey`, `firmLogo`, `defaultScale`)
2. **Title Block Template:** DXF template with firm-specific placeholders: firm name, firm logo, project name, sheet number, revision, date, scale, drawn by, checked by
3. **Sheet Numbering:** AIA standard: A-series (architectural), S (structural), M (mechanical), E (electrical), P (plumbing), L (landscape)
4. **Extend Drawing Generator:** Modify `services/drawing-generator/` to apply title blocks and sheet numbering when generating drawing sets
5. **Auto-Generation:** Drawing index sheet (sheet A-001) auto-generated listing all sheets, symbol legend (sheet G-001) auto-generated from symbols used
6. **Frontend:** Drawing set configuration page, title block editor, sheet list manager

---

### H2. Specification Writer

#### Implementation Steps:

1. **Database:** `specifications` table (`projectId`, `division`, `section`, `title`, `content`, `productReferences` (jsonb), `format` (prescriptive/performance))
2. **CSI MasterFormat:** Pre-built division structure (Div 01-49), section templates for common residential specs
3. **LLM Agent:** Given BOM items and design selections, generate specification sections with proper CSI formatting
4. **Product Linking:** Each spec section references specific products from the catalogue
5. **Frontend:** Spec editor organized by division, auto-fill from BOM, product reference picker, PDF export with proper formatting

---

### H3. Photo Documentation Report Generator

#### Implementation Steps:

1. **Extend existing site logs system** — add report generation capability
2. **Photo Matching:** Use CLIP embeddings to find similar-angle photos across different dates for before/during/after comparisons
3. **Report Template:** Branded PDF with firm logo, project name, period, photos organized by room and date
4. **LLM Summarization:** Generate narrative descriptions from site log notes
5. **Frontend:** Report configuration dialog (select period, rooms, format), preview, export as PDF

---

### H4. As-Built Documentation

#### Implementation Steps:

1. **Database:** `asBuiltMarkups` table (`drawingResultId`, `markupData` (jsonb: SVG annotations), `deviations` (jsonb: [{location, planned_mm, actual_mm, delta}]), `markedUpPdfKey`)
2. **Markup Tool:** SVG-based drawing markup (clouds, arrows, text, dimension overrides) overlaid on generated DXF/PDF drawings
3. **Deviation Report:** Compare planned dimensions from design against as-built measurements
4. **BIM Update:** Generate updated IFC model with as-built dimensions
5. **Frontend:** Drawing viewer with markup tools, deviation table, BIM update trigger

---

## I. INTEGRATIONS

---

### I1. CAD/BIM Software Integration

#### Implementation Steps:

1. **Revit Plugin:** Create a C# Revit add-in that communicates with OpenLintel API:
   - Export: Revit model → IFC → upload to OpenLintel
   - Import: OpenLintel design → IFC → Revit import
   - Sync: Two-way parameter sync via webhook subscriptions
   - **Tech:** Revit API (C#), .NET, REST client
2. **SketchUp Plugin:** Ruby extension for SketchUp:
   - Export SketchUp model as glTF → upload
   - Import OpenLintel 3D scene as glTF
3. **AutoCAD Plugin:** AutoLISP/ObjectARX:
   - Export/import DXF files (already supported)
   - Add OpenLintel toolbar for one-click sync
4. **Blender Plugin:** Python add-on:
   - Import/export glTF scenes
   - Direct render trigger to OpenLintel render engine
5. **Distribution:** Package plugins for each platform's extension marketplace

---

### I2. Accounting & ERP Integration

#### Implementation Steps:

1. **QuickBooks Online:** Use QuickBooks API (OAuth 2.0):
   - Sync invoices: OpenLintel invoice → QBO invoice
   - Sync payments: QBO payment → OpenLintel payment status update
   - Sync vendors: OpenLintel vendor → QBO vendor
   - **tRPC Router:** `integrations/quickbooks.ts` — OAuth flow, sync triggers
2. **Xero:** Xero API (OAuth 2.0), same sync pattern
3. **Procore:** Procore API for construction management data exchange:
   - Sync RFIs, submittals, change orders
   - Sync daily logs
   - Bidirectional project status
4. **Database:** `integrationConfigs` table (`userId`, `provider`, `accessToken` (encrypted), `refreshToken` (encrypted), `syncStatus`, `lastSyncAt`)

---

### I3. Communication Integrations

#### Implementation Steps:

1. **Slack:** Slack API + Incoming Webhooks:
   - Send notifications to project Slack channels
   - `/openlintel status` slash command for project updates
2. **Email:** SendGrid or AWS SES:
   - Client-facing emails (progress reports, approval requests, payment reminders)
   - Transactional emails (RFI responses, submittal approvals)
3. **SMS:** Twilio API:
   - Critical milestone alerts
   - Payment due reminders
   - Inspection scheduling confirmations
4. **WhatsApp:** WhatsApp Business API (via Twilio):
   - Contractor communication in India market
   - Delivery status updates
   - Photo sharing for site progress
5. **Database:** `communicationPreferences` table (`userId`, `channel`, `enabled`, `config`)
6. **tRPC Router:** `communications.ts` — send message via preferred channel, manage preferences

---

### I4. Real Estate & MLS Integration

#### Implementation Steps:

1. **Comparable Pricing:** Integrate Zillow API (Zestimate) or ATTOM Data API for property values
2. **ROI Calculator:** Compare pre-renovation value vs. post-renovation estimated value
   - Input: current property value, renovation cost (from BOM + labor)
   - Output: estimated post-renovation value, ROI percentage
   - Use national renovation ROI data (kitchen remodel = 72% ROI, bathroom = 64%, etc.)
3. **Database:** `propertyValuations` table (`projectId`, `preRenovationValue`, `renovationCost`, `postRenovationEstimate`, `roi`, `comparables`)
4. **Frontend:** ROI dashboard, comparable properties map, value increase projection chart

---

### I5. Government & Permit Systems

#### Implementation Steps:

1. **Jurisdiction Database:** Build a database of permit requirements by city/county
2. **E-Submission:** For cities with electronic permit portals (e.g., ePlans), integrate where APIs exist
3. **Inspection Scheduling:** Where available, integrate with inspection scheduling APIs
4. **GIS/Zoning:** Import zoning data from city GIS portals (ArcGIS Open Data, municipal GeoJSON feeds)
5. **Database:** `jurisdictions` table, `permitRequirements` table
6. **Note:** Most government systems don't have public APIs — this feature will be jurisdiction-by-jurisdiction and may require manual data entry for many locations

---

## J. MARKETPLACE ENHANCEMENTS

---

### J1. Design Template Marketplace

#### Implementation Steps:

1. **Extend `designTemplates` table** with pricing fields: `priceUsd`, `saleCount`, `revenueSharePercent`
2. **Upload Workflow:** Designers upload templates with preview images, room definitions, rules, and pricing
3. **Review System:** Admin review before publishing (reuse existing approval workflow)
4. **Revenue Sharing:** Track sales, calculate revenue share (e.g., 70% to designer, 30% platform)
5. **Categories:** Room templates, whole-house plans, style packs, material palettes
6. **Frontend:** Template marketplace page with search, preview, purchase flow, designer dashboard with earnings

---

### J2. Professional Services Marketplace

#### Implementation Steps:

1. **Extend `contractors` table** to include professional types: structural engineer, landscape architect, interior stylist, photographer, inspector
2. **Booking System:** `serviceBookings` table (`professionalId`, `projectId`, `serviceType`, `scheduledDate`, `duration`, `status`, `amount`)
3. **Availability Calendar:** Professionals set availability, clients book time slots
4. **Frontend:** Professional directory with filters, profile pages, booking calendar, review system (reuse contractor review pattern)

---

### J3. Material Sample Box Service

#### Implementation Steps:

1. **Database:** `sampleRequests` table (`userId`, `projectId`, `products` (jsonb: product IDs), `shippingAddress`, `status` (requested/shipped/delivered/returned), `trackingNumber`)
2. **Vendor Integration:** Notify vendors when samples are requested (via webhook or email)
3. **Curated Boxes:** Auto-suggest sample boxes based on design selections (e.g., all flooring options for a project)
4. **Frontend:** "Request Sample" button on product catalogue cards, sample cart, shipping tracking, sample review and selection interface

---

## K. ACCESSIBILITY & COMPLIANCE DEPTH

---

### K1. ADA / Universal Design Compliance Engine

#### Implementation Steps:

1. **Standards Database:** Encode ADA 2010 Standards, ANSI A117.1, and Fair Housing Act rules in `data/accessibility-codes/`
2. **Compliance Checker:** Extend `services/mep-calculator/` or create dedicated compliance service
   - Room-by-room checks: door widths, clear floor spaces, turning radii, reach ranges, countertop heights
   - Route planning: verify accessible path from entrance to all rooms
   - Fixture clearances: toilet, lavatory, shower, bathtub per ADA 604-608
3. **Reporting:** Compliance report with pass/fail per check, remediation guidance
4. **Frontend:** Accessibility overlay on floor plan showing clearance zones, wheelchair paths, non-compliant areas highlighted in red

---

### K2. Energy Code Compliance

#### Implementation Steps:

1. **Standards Database:** IECC 2021 prescriptive requirements by climate zone, Title 24 (California)
2. **Envelope Checker:** Compare wall/roof/window assembly R-values and U-values against code requirements
3. **Trade-Off Calculator:** If one component doesn't meet prescriptive requirement, calculate if trade-offs satisfy the performance path (COMcheck equivalent)
4. **ENERGY STAR Pathway:** Checklist for ENERGY STAR Certified Homes requirements
5. **Extend:** Add to existing compliance page `/project/[id]/compliance`

---

### K3. Historic Preservation Compliance

#### Implementation Steps:

1. **Standards Database:** Secretary of the Interior's Standards for Rehabilitation (10 standards)
2. **LLM-Powered Analysis:** Upload photos of existing historic structure → VLM identifies character-defining features → check proposed design changes against preservation standards
3. **Material Compatibility:** Recommend compatible materials for historic structures (e.g., lime mortar instead of Portland cement for historic masonry)
4. **Tax Credit Assessment:** Checklist for federal and state historic tax credit eligibility
5. **Database:** `historicAssessments` table with assessment results and recommendations

---

## L. DATA & INTELLIGENCE

---

### L1. Market-Rate Benchmarking

#### Implementation Steps:

1. **Pricing APIs:** Integrate with material supplier APIs (Home Depot Pro, Ferguson, etc.) for real-time pricing where available
2. **Labor Rate Database:** Maintain regional labor rates by trade (electrician, plumber, carpenter, painter) — seed from BLS data, allow user updates
3. **Benchmarking Engine:** Calculate cost-per-sqft for the project and compare against similar projects by type, region, and quality tier
4. **Database:** `marketBenchmarks` table, `laborRates` table, `pricingSnapshots` table (historical pricing)
5. **Price Trend Analysis:** Track material prices over time, forecast using simple time-series analysis
6. **Frontend:** Benchmark comparison dashboard, price trend charts, regional cost map

---

### L2. Post-Occupancy Evaluation

#### Implementation Steps:

1. **Database:** `postOccupancySurveys` table (`projectId`, `surveyType` (6_month/1_year/3_year), `responses` (jsonb), `sentAt`, `completedAt`), `lessonsLearned` table
2. **Survey System:** Auto-generated surveys sent to clients at 6 months and 1 year post-handover
3. **Energy Comparison:** Compare actual energy bills against energy model predictions (from B3)
4. **IoT Integration:** Use existing digital twin IoT data to validate comfort predictions
5. **Lessons Learned:** LLM summarizes survey responses into actionable insights stored in firm's knowledge base
6. **Frontend:** Survey builder, response analytics, lessons learned library searchable by topic

---

### L3. AI Design Learning

#### Implementation Steps:

1. **Feedback Loop:** Track which design decisions clients approved, which they changed, and which they loved
2. **Database:** `designFeedback` table (`designVariantId`, `feedbackType` (approved/changed/loved/rejected), `notes`, `changeDetails`)
3. **Regional Preferences:** Aggregate feedback by region to model local preferences
4. **Model Fine-Tuning:** Use feedback data to create preference-weighted prompts for the design engine
5. **Budget Accuracy:** Compare predicted costs against actual spend to improve cost prediction models
6. **Frontend:** Design feedback collection UI (post-project), firm-wide insights dashboard, prediction accuracy metrics

---

## IMPLEMENTATION PRIORITIZATION & PHASING

### Phase 1: Foundation (Months 1-3)
*Features that unblock the most professional workflows*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| A2. 2D Floor Plan Editor | CRITICAL | Large | Unblocks manual design workflow |
| A4. Kitchen & Bath Module | CRITICAL | Large | Highest-value room types |
| C1. RFI Management | HIGH | Medium | Core project communication |
| C5. Permit & Inspection Tracking | HIGH | Medium | Every project needs this |
| D1. Client Portal | HIGH | Large | Client-facing requirement |
| H1. Drawing Set Templates | HIGH | Medium | Professional output quality |

### Phase 2: Core Professional (Months 4-6)
*Features that differentiate OpenLintel from generic tools*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| A1. Parametric Design Engine | HIGH | Large | Professional architect workflow |
| A5. Lighting Design Simulator | HIGH | Medium | Every room needs lighting |
| B1. Structural Analysis | HIGH | Large | Critical for renovations |
| C2. Submittal Management | HIGH | Medium | Standard construction workflow |
| C6. Document Version Control | HIGH | Medium | Drawing management essential |
| E1. Proposal & Contract Generator | HIGH | Medium | Business operations |

### Phase 3: Advanced Design (Months 7-9)
*Features that elevate design quality*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| A3. Exterior Design & Facade | HIGH | Medium | Complete home design |
| A7. Photorealistic Rendering | HIGH | Large | Client presentations |
| A6. Material Boards | MEDIUM | Small | Client communication |
| B3. Energy Modeling | MEDIUM | Large | Sustainability compliance |
| D2. Selection Management | MEDIUM | Medium | Client decision workflow |
| F1. AI Space Planning | MEDIUM | Medium | Design optimization |

### Phase 4: Field & Operations (Months 10-12)
*Features that support construction execution*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| C3. Progress Reporting | MEDIUM | Medium | Client communication |
| C4. Safety & OSHA | MEDIUM | Medium | Compliance requirement |
| E2. CRM | MEDIUM | Medium | Business growth |
| E3. Time Tracking | MEDIUM | Medium | Project profitability |
| I2. Accounting Integration | MEDIUM | Medium | Business operations |
| I3. Communication Integrations | MEDIUM | Medium | Team coordination |

### Phase 5: Advanced Technology (Months 13-18)
*Differentiating technology features*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| F4. Voice Control | LOW | Medium | Convenience |
| F5. Drone Integration | LOW | Large | Site monitoring |
| F6. LiDAR Scan Import | MEDIUM | Large | Renovation accuracy |
| F7. Smart Home Planner | LOW | Medium | New construction |
| B2. Site Analysis | MEDIUM | Large | Site-specific design |
| B4. Acoustic Design | LOW | Medium | Specialized rooms |

### Phase 6: Ecosystem & Intelligence (Months 19-24)
*Marketplace and learning features*

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| G1-G5. Specialized Modules | LOW | Medium each | Niche design areas |
| H2-H4. Documentation Tools | MEDIUM | Medium each | Professional output |
| I1. CAD/BIM Plugins | MEDIUM | Large | Ecosystem integration |
| J1-J3. Marketplace Enhancements | LOW | Medium each | Revenue diversification |
| K1-K3. Compliance Depth | MEDIUM | Medium each | Regulatory coverage |
| L1-L3. Intelligence Features | LOW | Large each | Long-term learning |

---

## CROSS-CUTTING IMPLEMENTATION NOTES

### For Every New Feature:

1. **Database Migration:** Run `drizzle-kit generate` + `drizzle-kit push` after schema changes
2. **Relations:** Add to `relations.ts` for every new table with foreign keys
3. **Router Registration:** Add every new tRPC router to `apps/web/src/server/trpc/routers/index.ts`
4. **Navigation:** Add to project sidebar in `apps/web/src/components/project-sidebar.tsx`
5. **Notifications:** Trigger notifications via existing `notifications` table for status changes
6. **Collaboration:** Consider Y.js integration for any real-time editing features
7. **Job Pattern:** For any AI/compute-heavy operation, use the fire-and-forget job pattern
8. **Testing:** Add Pydantic model validation tests for Python services, Zod schema tests for tRPC routers
9. **Docker:** Assign next available port (8009+) for new Python services
10. **Shared Library:** Add any new shared utilities to `packages/python-shared/` for Python or `packages/ui/` for TypeScript components

### Security Considerations:

- All new routes must use `protectedProcedure` (authenticated) or `adminProcedure`
- Client portal routes need additional authorization check (project access)
- File uploads must validate file types and sizes
- API keys for external integrations (QuickBooks, Slack, etc.) must use the existing AES-256-GCM encryption pattern
- Structural calculations must include disclaimers: "For preliminary estimation only. Final structural design must be stamped by a licensed Professional Engineer."

### Performance Considerations:

- Index new tables on `projectId` and `userId` columns (most common query filters)
- Use Redis caching for frequently accessed read-only data (building codes, material databases, labor rates)
- Limit canvas/3D state saves to debounced intervals (every 3-5 seconds)
- Use pagination for any list that could grow unbounded (RFIs, submittals, time entries)
- Consider read replicas for analytics/reporting queries that aggregate across many projects

---

*This implementation guide provides step-by-step instructions for building every missing feature identified in the OpenLintel Features Audit, following the exact architecture patterns already established in the codebase.*
