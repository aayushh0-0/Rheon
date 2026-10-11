# RHEON AI — Multi-Agent System Specification

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Framework:** LangGraph + Anthropic Claude API (Sonnet 3.5 / Haiku 3.5)  
**Protocol:** Coordinator-Centric Multi-Agent Architecture with Deterministic Tool Binding  

---

## 1. Multi-Agent Topology

RHEON AI deploys a **Coordinator-Centric Multi-Agent Architecture**. The **Coordinator Agent** acts as the central executive, maintaining the global emergency context, delegating specialized analytical queries to domain agents, aggregating evidence, and directing the LangGraph state machine.

```
                               ┌─────────────────────────┐
                               │    COORDINATOR AGENT    │
                               │  (Orchestration Engine) │
                               └────────────┬────────────┘
                                            │
        ┌───────────────────┬───────────────┼───────────────┬───────────────────┐
        ▼                   ▼               ▼               ▼                   ▼
┌───────────────┐   ┌───────────────┐ ┌───────────┐ ┌───────────────┐   ┌───────────────┐
│INVENTORY AGENT│   │ DEMAND AGENT  │ │ MATCHING  │ │LOGISTICS AGENT│   │  DONOR AGENT  │
│(Stock & Usable│   │(Burn Rate &   │ │   AGENT   │ │ (ETA, Routes, │   │(Synthetic Pool│
│ Reserves)     │   │ Surge Risk)   │ │(Allocation│ │  Traffic)     │   │ Standby List) │
└───────┬───────┘   └───────┬───────┘ └─────┬─────┘ └───────┬───────┘   └───────┬───────┘
        │                   │               │               │                   │
        └───────────────────┴───────────────┼───────────────┴───────────────────┘
                                            ▼
                               ┌─────────────────────────┐
                               │  EXPLAINABILITY AGENT   │
                               │  (Rationale & Tradeoffs)│
                               └─────────────────────────┘
```

---

## 2. Comprehensive Agent Specifications

---

### 2.1 Coordinator Agent

- **Role & Objective:** Central command orchestrator. Interprets incoming emergency requests, plans agent execution sequence, synthesizes final multi-source allocation plans, detects runtime disruptions, and triggers re-planning.
- **Input Context:** `EmergencyRequest`, active network state, disruption alerts.
- **Deterministic Tools Invoked:**
  - `tool_get_compatible_blood_groups(recipient_group, component_type)`
  - `tool_validate_final_plan(plan_object)`
  - `tool_compute_plan_diff(old_plan, new_plan)`
- **Output Schema:**
  ```json
  {
    "plan_id": "string (uuid)",
    "request_id": "string",
    "status": "PROPOSED | REVISED | REJECTED",
    "allocations": [
      {
        "source_facility_id": "string",
        "source_name": "string",
        "donor_blood_group": "string",
        "units": 0,
        "transport_mode": "AMBULANCE_SIREN | STANDARD_COURIER | DRONE",
        "estimated_eta_minutes": 0
      }
    ],
    "total_units_allocated": 0,
    "unmet_units": 0,
    "donor_standby_required": false,
    "confidence_score": 0.0
  }
  ```
- **System Prompt Guidelines:**
  - Strict objective tone. Never hallucinate units.
  - Coordinate subagents to minimize aggregate patient ETA while preserving regional safety reserves.
  - When disruptions occur, calculate optimal delta replacements without disturbing unrelated safe routes.

---

### 2.2 Inventory Agent

- **Role & Objective:** Analyzes physical inventory across all regional facilities. Computes usable stock vs. reserved stock vs. safety reserve thresholds. Flags immediate shortage risks.
- **Input Context:** Target blood group, component type, candidate facility IDs.
- **Deterministic Tools Invoked:**
  - `tool_get_facility_inventory(facility_id)`
  - `tool_calculate_usable_stock(facility_id, blood_group, component_type)`
  - `tool_get_network_stock_summary(blood_groups, component_type)`
- **Output Schema:**
  ```json
  {
    "analyzed_facilities_count": 0,
    "usable_inventory_by_facility": {
      "facility_id": {
        "facility_name": "string",
        "blood_group": "string",
        "total_on_hand": 0,
        "committed_reserved": 0,
        "mandatory_safety_reserve": 0,
        "usable_units": 0,
        "shortage_status": "OPTIMAL | CAUTION | SEVERE_DEFICIT"
      }
    },
    "total_network_usable_units": 0,
    "critical_shortage_flag": false
  }
  ```
- **Invariant:** Must never report usable units that would drop a facility's stock below its mandatory safety reserve.

---

### 2.3 Demand Agent

- **Role & Objective:** Forecasts near-term consumption curves, trauma surge risks, and impending stock-out probabilities across facilities over 6-hour, 12-hour, and 24-hour windows.
- **Input Context:** Historical burn rate, current emergency volume, facility trauma level.
- **Deterministic Tools Invoked:**
  - `tool_get_historical_burn_rate(facility_id, blood_group, window_hours)`
  - `tool_calculate_stockout_risk(facility_id, blood_group, units_to_deduct)`
- **Output Schema:**
  ```json
  {
    "facility_demand_forecasts": {
      "facility_id": {
        "hourly_burn_rate": 0.0,
        "projected_24h_demand": 0,
        "depletion_risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
        "hours_until_stockout_post_transfer": 0.0,
        "recommendation": "SAFE_TO_TRANSFER | RESTRICT_TRANSFER | PRESERVE_RESERVE"
      }
    },
    "regional_surge_detected": false
  }
  ```

---

### 2.4 Matching Agent

- **Role & Objective:** Multi-criteria optimization agent. Finds the optimal combination of compatible blood sources balancing: proximity (distance), available units, facility strain score, and urgency window.
- **Input Context:** Usable inventory map, demand forecasts, distance matrix, request specs.
- **Deterministic Tools Invoked:**
  - `tool_evaluate_source_feasibility(candidate_sources, requested_units)`
  - `tool_score_matching_candidates(candidate_list, weights_profile)`
- **Output Schema:**
  ```json
  {
    "recommended_sourcing_strategy": "SINGLE_SOURCE | MULTI_SOURCE_SPLIT | DONOR_BACKUP",
    "selected_sources": [
      {
        "source_facility_id": "string",
        "donor_blood_group": "string",
        "allocated_units": 0,
        "match_score": 0.0,
        "priority_rank": 1
      }
    ],
    "fulfillment_percentage": 100.0,
    "selection_rationale_points": ["string"]
  }
  ```

---

### 2.5 Logistics Agent

- **Role & Objective:** Calculates transport feasibility, simulated travel durations, route bottlenecks, and estimated time of arrival (ETA) per dispatch segment.
- **Input Context:** Origin geo-coordinates, destination hospital coordinates, transport mode, traffic scenario.
- **Deterministic Tools Invoked:**
  - `tool_calculate_distance_and_eta(origin_id, destination_id, transport_mode)`
  - `tool_check_route_disruptions(origin_id, destination_id)`
- **Output Schema:**
  ```json
  {
    "dispatch_routes": [
      {
        "source_facility_id": "string",
        "destination_hospital_id": "string",
        "distance_km": 0.0,
        "base_duration_minutes": 0,
        "traffic_delay_minutes": 0,
        "final_eta_minutes": 0,
        "transport_mode": "AMBULANCE_SIREN | STANDARD_COURIER | DRONE",
        "route_status": "CLEAR | CONGESTED | REROUTED",
        "feasibility": "FEASIBLE | EXCEEDS_WINDOW | BLOCKED"
      }
    ],
    "max_dispatch_eta": 0,
    "all_routes_feasible": true
  }
  ```

---

### 2.6 Donor Agent

- **Role & Objective:** Standby emergency donor coordination. When institutional blood banks face severe deficits, this agent queries the synthetic registered emergency donor pool and returns ranked candidates for standby contact.
- **CRITICAL SAFETY BOUNDARY:** The Donor Agent **must never** assume, claim, or calculate medical eligibility. Candidates are strictly listed as *"Registered Standby Candidates for Formal Clinical Triage"*.
- **Input Context:** Unmet unit count, compatible blood group, requesting hospital location.
- **Deterministic Tools Invoked:**
  - `tool_query_synthetic_donor_pool(blood_group, max_radius_km, required_count)`
- **Output Schema:**
  ```json
  {
    "standby_activation_status": "ACTIVE_STANDBY | NOT_NEEDED",
    "candidates_identified_count": 0,
    "candidates": [
      {
        "donor_id": "string",
        "anonymous_identifier": "DONOR-XYZ",
        "blood_group": "string",
        "distance_km": 0.0,
        "estimated_arrival_minutes": 0,
        "availability_status": "AVAILABLE_IMMEDIATE | STANDBY_ON_CALL",
        "medical_disclaimer": "Clinical eligibility, screening, and crossmatch must be performed on-site by certified medical personnel."
      }
    ]
  }
  ```

---

### 2.7 Explainability Agent

- **Role & Objective:** Transforms structured mathematical data, agent trade-offs, and logistics constraints into clear, concise, evidence-based natural language explanations for human dispatchers.
- **Input Context:** Completed allocation plan, inventory assessments, demand forecasts, rejected alternatives.
- **Deterministic Tools Invoked:** None (synthesizes pre-validated data).
- **Output Schema:**
  ```json
  {
    "summary_headline": "string",
    "decision_factors": [
      {
        "factor_name": "Proximity vs. Reserve Preservation",
        "observation": "string",
        "impact_on_decision": "string"
      }
    ],
    "rejected_alternatives": [
      {
        "facility_name": "string",
        "reason_for_rejection": "string"
      }
    ],
    "risk_assessment": "string",
    "plain_text_explanation": "string"
  }
  ```

---

## 3. Dynamic Re-Planning Lifecycle & State Diffing

When an event is received (e.g., `FACILITY_OFFLINE`), RHEON follows a precise 5-step re-planning cycle:

```
[1. Ingest Event] ──► [2. Identify Impacted Allocations] ──► [3. Lock Valid Unaffected Routes]
                                                                        │
[5. Emit Plan Diff & Explanation] ◄── [4. Targeted Re-Matching on Deficit Only]
```

### 3.1 Plan Diff Structure (`PlanDiff`)

```json
{
  "diff_id": "diff-uuid-99",
  "trigger_event": {
    "event_type": "FACILITY_OFFLINE",
    "affected_facility_id": "bb-central-01",
    "timestamp": "2026-10-04T12:00:00Z"
  },
  "original_plan_id": "plan-uuid-01",
  "revised_plan_id": "plan-uuid-02",
  "modifications": {
    "removed_allocations": [
      { "facility_id": "bb-central-01", "units": 6, "reason": "Facility offline due to power grid failure" }
    ],
    "added_allocations": [
      { "facility_id": "bb-metro-03", "units": 4, "eta_delta": "+8 min" },
      { "facility_id": "hosp-mercy-02", "units": 2, "eta_delta": "+12 min" }
    ],
    "unchanged_allocations": [
      { "facility_id": "bb-north-02", "units": 4, "status": "IN_TRANSIT" }
    ]
  },
  "eta_impact_minutes": "+8 min",
  "rationale": "Replaced 6 units from Central Blood Bank with Metro Blood Hub (4 units) and Mercy Hospital reserve (2 units). North Hub delivery of 4 units was preserved to minimize transit disruption."
}
```

---

## 4. LangGraph Node Function Signatures

```python
async def coordinator_node(state: RheonAgentState) -> Dict[str, Any]:
    """Evaluates request, coordinates workflow, determines needed tools."""
    ...

async def inventory_node(state: RheonAgentState) -> Dict[str, Any]:
    """Queries inventory service, enforces safety reserves, updates usable_inventory."""
    ...

async def demand_node(state: RheonAgentState) -> Dict[str, Any]:
    """Calculates burn rates, estimates stock-out risk, updates demand_forecast."""
    ...

async def matching_node(state: RheonAgentState) -> Dict[str, Any]:
    """Solves multi-source allocation matching, creates draft_plan."""
    ...

async def logistics_node(state: RheonAgentState) -> Dict[str, Any]:
    """Evaluates routing, distance, speed profiles, and ETA feasibility."""
    ...

async def donor_node(state: RheonAgentState) -> Dict[str, Any]:
    """Invoked conditionally if institutional inventory < requested units."""
    ...

async def validator_node(state: RheonAgentState) -> Dict[str, Any]:
    """Executes deterministic safety invariant checks on draft_plan."""
    ...

async def explainability_node(state: RheonAgentState) -> Dict[str, Any]:
    """Generates human-interpretable rationale and evidence breakdown."""
    ...
```
