from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.services.inventory.engine import InventoryReserveEngine
from app.models.inventory import InventoryBatch
from app.models.facility import Hospital, BloodBank


class CalculateUsableStockTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_calculate_usable_stock",
            description="Calculates usable stock enforcing UsableStock = max(0, Available - SafetyReserve).",
            category="inventory",
            parameters_schema={
                "type": "object",
                "properties": {
                    "available_units": {
                        "type": "integer",
                        "description": "Gross units currently physically present.",
                    },
                    "safety_reserve_units": {
                        "type": "integer",
                        "description": "Protected safety reserve units required to remain untouched.",
                    },
                },
                "required": ["available_units", "safety_reserve_units"],
            },
        )

    def execute(self, available_units: int, safety_reserve_units: int) -> int:
        return InventoryReserveEngine.calculate_usable_stock(available_units, safety_reserve_units)


class ValidateAllocationTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_validate_allocation",
            description="Validates if requested units can be safely allocated without breaching safety reserves.",
            category="inventory",
            parameters_schema={
                "type": "object",
                "properties": {
                    "available_units": {
                        "type": "integer",
                        "description": "Total available units at facility.",
                    },
                    "safety_reserve_units": {
                        "type": "integer",
                        "description": "Required safety buffer.",
                    },
                    "requested_units": {
                        "type": "integer",
                        "description": "Units requested for allocation.",
                    },
                },
                "required": ["available_units", "safety_reserve_units", "requested_units"],
            },
        )

    def execute(
        self, available_units: int, safety_reserve_units: int, requested_units: int
    ) -> Dict[str, Any]:
        valid, allowable, reason = InventoryReserveEngine.validate_allocation(
            available_units, safety_reserve_units, requested_units
        )
        return {
            "is_valid": valid,
            "allowable_units": allowable,
            "reason": reason,
        }


class GetFacilityInventoryTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_get_facility_inventory",
            description="Queries current inventory batches and usable stock for a specified facility.",
            category="inventory",
            parameters_schema={
                "type": "object",
                "properties": {
                    "facility_id": {
                        "type": "string",
                        "description": "Unique identifier of the hospital or blood bank.",
                    },
                    "facility_type": {
                        "type": "string",
                        "enum": ["BLOOD_BANK", "HOSPITAL"],
                        "description": "Facility type (default 'BLOOD_BANK').",
                    },
                },
                "required": ["facility_id"],
            },
        )

    def execute(
        self,
        db: Session,
        facility_id: str,
        facility_type: str = "BLOOD_BANK",
    ) -> List[Dict[str, Any]]:
        query = db.query(InventoryBatch)
        if facility_type.upper() == "HOSPITAL":
            query = query.filter(InventoryBatch.hospital_id == facility_id)
        else:
            query = query.filter(InventoryBatch.blood_bank_id == facility_id)

        batches = query.all()
        results = []
        for b in batches:
            usable = InventoryReserveEngine.calculate_usable_stock(
                b.available_units, b.safety_reserve_units
            )
            results.append({
                "id": b.id,
                "blood_group": b.blood_group,
                "component_type": b.component_type,
                "available_units": b.available_units,
                "reserved_units": b.reserved_units,
                "safety_reserve_units": b.safety_reserve_units,
                "usable_units": usable,
                "status": b.status,
            })
        return results


class GetNetworkStockSummaryTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_get_network_stock_summary",
            description="Aggregates regional inventory totals, protected reserve buffer, and net usable units.",
            category="inventory",
            parameters_schema={
                "type": "object",
                "properties": {
                    "blood_groups": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of blood groups to filter by (e.g., ['O-', 'O+']).",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                },
                "required": [],
            },
        )

    def execute(
        self,
        db: Session,
        blood_groups: Optional[List[str]] = None,
        component_type: str = "RBC",
    ) -> Dict[str, Any]:
        query = db.query(InventoryBatch).filter(InventoryBatch.component_type == component_type)
        if blood_groups:
            query = query.filter(InventoryBatch.blood_group.in_(blood_groups))

        batches = query.all()
        total_available = sum(b.available_units for b in batches)
        total_reserved = sum(b.reserved_units for b in batches)
        total_safety_reserve = sum(b.safety_reserve_units for b in batches)
        total_usable = sum(
            InventoryReserveEngine.calculate_usable_stock(b.available_units, b.safety_reserve_units)
            for b in batches
        )

        return {
            "component_type": component_type,
            "total_available_units": total_available,
            "total_reserved_units": total_reserved,
            "total_safety_reserve_units": total_safety_reserve,
            "total_usable_units": total_usable,
            "batches_count": len(batches),
        }
