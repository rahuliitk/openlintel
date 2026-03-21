"""
Structural BOM generator -- converts FloorPlanData geometry into a
construction Bill of Materials.

Unlike the existing BOM agent (which operates on design variant spec_json),
this module calculates materials directly from structural geometry:
- Wall quantities -> bricks, cement, sand, plaster, paint
- Room areas -> flooring, false ceiling
- Openings -> door/window frames, hardware, glass
- Perimeters -> skirting, electrical conduit, wiring

Uses the existing material database (material_db.py) for pricing and
waste factors, and the existing calculator (calculator.py) for quantity
refinement.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog

from src.agents.material_db import get_price_for_tier, get_waste_factor
from src.models.bom import (
    BOMCategorySummary,
    BOMResult,
    BOMStatus,
    BOMSummary,
)

from openlintel_shared.schemas.bom import BOMItem, MaterialCategory
from openlintel_shared.schemas.design import BudgetTier

logger = structlog.get_logger(__name__)

# Conversion constants
MM_TO_FT = 1 / 304.8
MM2_TO_SQFT = 1 / (304.8 * 304.8)


class StructuralBOMGenerator:
    """Generate a construction BOM from floor plan geometry.

    Parameters
    ----------
    budget_tier:
        Pricing tier for material cost lookup.
    currency:
        ISO 4217 currency code.
    wall_height_mm:
        Default wall height if not specified in geometry.
    """

    def __init__(
        self,
        *,
        budget_tier: str = "mid_range",
        currency: str = "INR",
        wall_height_mm: float = 2700.0,
    ) -> None:
        self._budget_tier = BudgetTier(budget_tier)
        self._currency = currency
        self._wall_height_mm = wall_height_mm

    def generate(
        self,
        *,
        floor_plan_data: dict[str, Any],
        project_id: str = "",
        room_id: str = "",
        bom_id: str | None = None,
    ) -> BOMResult:
        """Generate a structural BOM from floor plan geometry.

        Parameters
        ----------
        floor_plan_data:
            Dict with ``walls``, ``rooms``, ``openings``, ``dimensions`` keys.
            This is the output_json from a floor plan digitization job.
        project_id:
            Project ID to tag the BOM result.
        room_id:
            Room ID (or "all" for whole-floor BOM).
        bom_id:
            Explicit BOM ID. Auto-generated if not provided.

        Returns
        -------
        BOMResult
            Complete BOM with items, summary, and pricing.
        """
        if bom_id is None:
            bom_id = str(uuid.uuid4())

        now = datetime.now(tz=timezone.utc)
        items: list[BOMItem] = []

        walls = floor_plan_data.get("walls", [])
        rooms = floor_plan_data.get("rooms", [])
        openings = floor_plan_data.get("openings", [])

        logger.info(
            "structural_bom_start",
            bom_id=bom_id,
            walls=len(walls),
            rooms=len(rooms),
            openings=len(openings),
        )

        # -- Wall-derived materials --------------------------------------------
        total_wall_area_sqft = 0.0
        total_wall_length_rft = 0.0

        for wall in walls:
            wall_height = wall.get("height_mm", self._wall_height_mm)
            wall_length = wall.get("length_mm", 0)

            if wall_length <= 0:
                # Calculate from start/end
                start = wall.get("start", {})
                end = wall.get("end", {})
                dx = end.get("x", 0) - start.get("x", 0)
                dy = end.get("y", 0) - start.get("y", 0)
                wall_length = (dx**2 + dy**2) ** 0.5

            wall_area_sqft = (wall_length * wall_height) * MM2_TO_SQFT
            wall_length_rft = wall_length * MM_TO_FT

            total_wall_area_sqft += wall_area_sqft
            total_wall_length_rft += wall_length_rft

        if total_wall_area_sqft > 0:
            items.extend(self._wall_materials(
                total_wall_area_sqft,
                total_wall_length_rft,
                room_id,
            ))

        # -- Room-derived materials (flooring, ceiling, electrical) ------------
        total_floor_area_sqft = 0.0

        for room in rooms:
            room_area_sqmm = room.get("areaSqMm", 0)
            room_type = room.get("type", "other")
            r_id = room.get("id", room_id)

            if room_area_sqmm <= 0:
                # Estimate from polygon vertices
                vertices = room.get("polygon", [])
                if len(vertices) >= 3:
                    room_area_sqmm = self._shoelace_area(vertices)

            room_area_sqft = room_area_sqmm * MM2_TO_SQFT
            total_floor_area_sqft += room_area_sqft

            items.extend(self._room_materials(
                room_area_sqft,
                room_type,
                r_id,
            ))

        # -- Opening-derived materials (doors, windows, hardware) --------------
        for opening in openings:
            items.extend(self._opening_materials(opening, room_id))

        # -- Electrical rough-in (based on total floor area) -------------------
        if total_floor_area_sqft > 0:
            items.extend(self._electrical_materials(
                total_floor_area_sqft,
                total_wall_length_rft,
                room_id,
            ))

        # -- Build summary -----------------------------------------------------
        total_cost = sum(item.estimated_cost or 0.0 for item in items)
        category_breakdown = self._build_category_breakdown(items, total_cost)

        summary = BOMSummary(
            total_items=len(items),
            total_cost=round(total_cost, 2),
            currency=self._currency,
            category_breakdown=category_breakdown,
        )

        logger.info(
            "structural_bom_complete",
            bom_id=bom_id,
            items=len(items),
            total_cost=total_cost,
        )

        return BOMResult(
            id=bom_id,
            project_id=project_id,
            room_id=room_id or "all",
            design_variant_id="structural",
            status=BOMStatus.COMPLETE,
            items=items,
            summary=summary,
            created_at=now,
            completed_at=now,
        )

    # -- Material generators ---------------------------------------------------

    def _wall_materials(
        self,
        wall_area_sqft: float,
        wall_length_rft: float,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate wall-related BOM items."""
        items: list[BOMItem] = []

        # Painting (wall putty + primer + emulsion)
        for key, name, spec in [
            ("putty", "Wall Putty", "2 coats birla/JK wall putty"),
            ("primer", "Wall Primer", "1 coat interior primer"),
            ("paint", "Interior Emulsion Paint", "2 coats premium emulsion"),
        ]:
            unit_price = get_price_for_tier(key, self._budget_tier) or 0.0
            waste = get_waste_factor(key)
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.PAINTING,
                name=name,
                specification=spec,
                quantity=round(wall_area_sqft, 1),
                unit="sqft",
                unitPrice=unit_price,
                currency=self._currency,
                wasteFactor=waste,
            ))

        return items

    def _room_materials(
        self,
        floor_area_sqft: float,
        room_type: str,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate room-specific BOM items (flooring, ceiling)."""
        items: list[BOMItem] = []

        if floor_area_sqft <= 0:
            return items

        # Flooring
        tile_key = "vitrified_tiles_600x600"
        unit_price = get_price_for_tier(tile_key, self._budget_tier) or 0.0
        waste = get_waste_factor(tile_key, "straight")
        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.FLOORING,
            name="Vitrified Tiles 600x600mm",
            specification="Glossy vitrified floor tile, straight lay",
            quantity=round(floor_area_sqft, 1),
            unit="sqft",
            unitPrice=unit_price,
            currency=self._currency,
            wasteFactor=waste,
        ))

        # False ceiling for living/bedroom/dining
        if room_type in ("living_room", "bedroom", "dining", "study"):
            ceiling_area = floor_area_sqft * 0.6
            fc_price = get_price_for_tier("gypsum_board_12mm", self._budget_tier) or 0.0
            fc_waste = get_waste_factor("gypsum_board_12mm")
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.FALSE_CEILING,
                name="Gypsum Board False Ceiling",
                specification="12.5mm gypsum board with GI framework",
                quantity=round(ceiling_area, 1),
                unit="sqft",
                unitPrice=fc_price,
                currency=self._currency,
                wasteFactor=fc_waste,
            ))

        # Plumbing for wet areas
        if room_type in ("bathroom", "kitchen", "utility"):
            perimeter_rft = math.sqrt(floor_area_sqft) * 4 * 0.3048  # approximate
            pipe_price = get_price_for_tier("cpvc_pipe_15mm", self._budget_tier) or 0.0
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.PLUMBING,
                name="CPVC Pipe 15mm",
                specification="Hot and cold water supply",
                quantity=round(perimeter_rft * 1.5, 1),
                unit="rft",
                unitPrice=pipe_price,
                currency=self._currency,
                wasteFactor=0.05,
            ))

        return items

    def _opening_materials(
        self,
        opening: dict[str, Any],
        room_id: str,
    ) -> list[BOMItem]:
        """Generate door/window BOM items."""
        items: list[BOMItem] = []
        opening_type = opening.get("type", "single_door")
        is_door = "door" in opening_type.lower()
        width_mm = opening.get("width_mm", 900 if is_door else 1200)

        if is_door:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.CARPENTRY,
                name="Flush Door with Frame",
                specification=f"{int(width_mm)}mm flush door, sal wood frame",
                quantity=1,
                unit="nos",
                unitPrice=get_price_for_tier("flush_door_frame", self._budget_tier) or 8500.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.HARDWARE,
                name="Door Hardware Set",
                specification="Mortice lock + 3 hinges + tower bolt + door stopper",
                quantity=1,
                unit="set",
                unitPrice=get_price_for_tier("door_hardware_set", self._budget_tier) or 2500.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))
        else:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.GLASS_ALUMINUM,
                name="Aluminium Sliding Window",
                specification=f"{int(width_mm)}mm aluminium section with 5mm glass",
                quantity=1,
                unit="nos",
                unitPrice=get_price_for_tier("aluminium_window", self._budget_tier) or 650.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))

        return items

    def _electrical_materials(
        self,
        floor_area_sqft: float,
        perimeter_rft: float,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate electrical rough-in materials."""
        items: list[BOMItem] = []

        # Wiring
        for key, name, spec, multiplier in [
            ("wire", "Copper Wire 1.5mm", "FR grade, lighting circuits", 3),
            ("wire", "Copper Wire 2.5mm", "FR grade, power sockets", 2),
        ]:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.ELECTRICAL,
                name=name,
                specification=spec,
                quantity=round(perimeter_rft * multiplier, 1),
                unit="rft",
                unitPrice=get_price_for_tier(key, self._budget_tier) or 0.0,
                currency=self._currency,
                wasteFactor=get_waste_factor(key),
            ))

        # Switches & lights (proportional to floor area)
        switch_count = max(2, round(floor_area_sqft / 50))
        light_count = max(2, round(floor_area_sqft / 30))

        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.ELECTRICAL,
            name="Modular Switch Plate",
            specification="6-module switch plate",
            quantity=switch_count,
            unit="nos",
            unitPrice=get_price_for_tier("switch_plate", self._budget_tier) or 0.0,
            currency=self._currency,
            wasteFactor=0.0,
        ))

        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.ELECTRICAL,
            name="LED Downlight 12W",
            specification="Recessed LED downlight, 4000K neutral white",
            quantity=light_count,
            unit="nos",
            unitPrice=get_price_for_tier("light_fixture", self._budget_tier) or 0.0,
            currency=self._currency,
            wasteFactor=0.0,
        ))

        return items

    # -- Helpers ---------------------------------------------------------------

    @staticmethod
    def _shoelace_area(vertices: list[dict[str, float]]) -> float:
        """Compute polygon area using the Shoelace formula (sq mm)."""
        n = len(vertices)
        if n < 3:
            return 0.0
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += vertices[i]["x"] * vertices[j]["y"]
            area -= vertices[j]["x"] * vertices[i]["y"]
        return abs(area) / 2.0

    @staticmethod
    def _build_category_breakdown(
        items: list[BOMItem],
        total_cost: float,
    ) -> list[BOMCategorySummary]:
        """Build per-category cost breakdown."""
        cat_totals: dict[MaterialCategory, tuple[int, float]] = {}
        for item in items:
            count, subtotal = cat_totals.get(item.category, (0, 0.0))
            cost = item.estimated_cost or 0.0
            cat_totals[item.category] = (count + 1, subtotal + cost)

        breakdown: list[BOMCategorySummary] = []
        for cat, (count, subtotal) in sorted(cat_totals.items(), key=lambda x: -x[1][1]):
            pct = (subtotal / total_cost * 100) if total_cost > 0 else 0.0
            breakdown.append(BOMCategorySummary(
                category=cat,
                item_count=count,
                subtotal=round(subtotal, 2),
                percentage_of_total=round(pct, 1),
            ))
        return breakdown
