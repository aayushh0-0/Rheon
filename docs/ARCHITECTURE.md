# RHEON AI — System Architecture Blueprint

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**System Classification:** Hybrid Deterministic-Agentic Distributed Architecture  
**Target Runtime:** Python FastAPI + LangGraph / React + Vite + TypeScript  

---

## 1. Architectural Overview & Philosophy

RHEON AI is built upon a fundamental architectural axiom:

```
+-------------------------------------------------------------------------+
|                         THE CARDINAL RULE                               |
|                                                                         |
|  Probabilistic LLMs reason, plan, synthesize, and explain.              |
|  Deterministic algorithms calculate, filter, validate, and enforce.     |
+-------------------------------------------------------------------------+
```

Safety-critical domains like emergency medical logistics cannot tolerate probabilistic hallucination in mathematical calculations, compatibility rules, or constraint boundaries. RHEON resolves this by sandwiching the **Multi-Agent Reasoning Core** between **Strict Deterministic Input Validators** and **Deterministic Output Guardrails**.

```
                        +------------------------------------+
                        |      Emergency Request / Event     |
                        +------------------------------------+
                                          │
                                          ▼
                        +------------------------------------+
                        |  1. Deterministic Pre-Filtering    |
                        |     - ABO/Rh Compatibility Engine  |
                        |     - Reserve Threshold Calculator |
                        |     - Geospatial Distance Matrix   |
                        +------------------------------------+
                                          │
                             (Sanitized Candidates)
                                          │
                                          ▼
                        +------------------------------------+
                        |  2. Multi-Agent Reasoning Layer    |
                        |     (LangGraph + Claude API)       |
                        |     - Coordinator Agent            |
                        |     - Inventory & Demand Agents    |
                        |     - Matching & Logistics Agents  |
                        |     - Donor & Explainability Agents|
                        +------------------------------------+
                                          │
                                 (Draft Plan)
                                          │
                                          ▼
                        +------------------------------------+
                        |  3. Deterministic Guardrails       |
                        |     - Unit Count & Sum Checks      |
                        |     - Safety Reserve Invariant     |
                        |     - Feasibility & Time-Window    |
                        +------------------------------------+
                                          │
                                          ▼
                        +------------------------------------+
                        | Verified Response Plan & Rationale |
                        +------------------------------------+
```

---

## 2. High-Level System Topology

```
+─────────────────────────────────────────────────────────────────────────────+
|                        RHEON FRONTEND COMMAND CENTER                        |
|   (React 18 + Vite + TypeScript + Tailwind CSS + Recharts + React-Leaflet)  |
|                                                                             |
|  +─────────────────────+  +──────────────────────+  +────────────────────+  |
|  |  Emergency Triage   |  | Agent Execution Flow |  |  Geospatial Map    |  |
|  |  & Plan Diff View   |  | Live Graph & Stream  |  |  & Transit Routes  |  |
|  +─────────────────────+  +──────────────────────+  +────────────────────+  |
|  +───────────────────────────────────────────────────────────────────────+  |
|  | Simulation Center / What-If Sandbox (Disruption & Contingency)        |  |
|  +───────────────────────────────────────────────────────────────────────+  |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ HTTP REST & WebSocket/SSE Stream
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                         RHEON FASTAPI BACKEND CORE                          |
|                                                                             |
|  +───────────────────────────────────────────────────────────────────────+  |
|  | API Router: /api/requests, /api/plans, /api/simulate, /api/events, /ws |  |
|  +───────────────────────────────────────────────────────────────────────+  |
|                                      │                                      |
|  +───────────────────────────────────┼───────────────────────────────────+  |
|  │ DETERMINISTIC ENGINE SERVICES     │ MULTI-AGENT ORCHESTRATION ENGINE  │  |
|  │                                   │                                   │  |
|  │ • BloodCompatibilityEngine        │ • LangGraph StateGraph Executor   │  |
|  │ • InventoryReserveCalculator      │ • Coordinator Agent (Claude 3.5/  │  |
|  │ • RoutingAndETAService            │   Sonnet 3.5 / Haiku 3.5)         │  |
|  │ • ConstraintValidationService     │ • Subagents (Inv, Dem, Match, etc)│  |
|  │ • Re-Planning Diff Engine         │ • Structured Pydantic Tool Calls  │  |
|  +───────────────────────────────────┴───────────────────────────────────+  |
|                                      │                                      |
|  +───────────────────────────────────▼───────────────────────────────────+  |
|  │ DATA & STORAGE LAYER (SQLAlchemy + SQLite / In-Memory State)          │  |
|  │ • Hospitals, Blood Banks, Inventory Batches, Routes, Donors, Logs    │  |
|  +───────────────────────────────────────────────────────────────────────+  |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. LangGraph Multi-Agent State Machine

The orchestration workflow is modeled as a stateful, directed computational graph using **LangGraph**.

### 3.1 State Graph Topology

```
                         [START]
                            │
                            ▼
                  ┌──────────────────┐
                  │ coordinator_node │ ◄────────────┐ (Re-plan loop)
                  └─────────┬────────┘              │
                            │                       │
                 (Conditional Routing)              │
                            │                       │
            ┌───────────────┼───────────────┐       │
            ▼               ▼               ▼       │
     ┌──────────────┐┌──────────────┐┌────────────┐ │
     │inventory_node││ demand_node  ││logistics_nd│ │
     └──────┬───────┘└──────┬───────┘└─────┬──────┘ │
            │               │              │        │
            └───────────────┼──────────────┘        │
                            ▼                       │
                   ┌──────────────────┐             │
                   │  matching_node   │             │
                   └────────┬─────────┘             │
                            ▼                       │
                   ┌──────────────────┐             │
             ┌────►│   (Sufficient?)  │────┐        │
             │     └──────────────────┘    │        │
           (Yes)                         (No)       │
             │                             │        │
             │                     ┌───────▼──────┐ │
             │                     │  donor_node  │ │
             │                     └───────┬──────┘ │
             │                             │        │
             └──────────────┬──────────────┘        │
                            ▼                       │
                  ┌──────────────────┐              │
                  │  validator_node  │              │
                  └─────────┬────────┘              │
                            │                       │
                   (Invariant Check)                │
                     ├─── Fail ─────────────────────┘
                     └─── Pass
                            │
                            ▼
                  ┌──────────────────┐
                  │explainability_node│
                  └─────────┬────────┘
                            │
                            ▼
                         [END]
```

### 3.2 State Schema (`RheonAgentState`)

```python
from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel

class RheonAgentState(TypedDict):
    # Context & Request Input
    request_id: str
    hospital_id: str
    blood_group: str
    component_type: str
    units_requested: int
    urgency_level: str
    max_eta_minutes: int
    
    # Deterministic Engine Outputs (Ground Truth Cache)
    compatible_groups: List[str]
    candidate_sources: List[Dict[str, Any]]
    network_inventory_snapshot: Dict[str, Any]
    distance_matrix: Dict[str, float]
    
    # Agent Reasoning Channels
    inventory_assessment: Optional[Dict[str, Any]]
    demand_forecast: Optional[Dict[str, Any]]
    logistics_evaluation: Optional[Dict[str, Any]]
    matching_proposal: Optional[Dict[str, Any]]
    donor_standby_list: Optional[List[Dict[str, Any]]]
    
    # Final Plan & Verification
    draft_plan: Optional[Dict[str, Any]]
    validation_result: Optional[Dict[str, Any]]
    explanation: Optional[Dict[str, Any]]
    
    # Graph Control & Execution Trace
    iteration_count: int
    active_disruptions: List[Dict[str, Any]]
    execution_timeline: List[Dict[str, Any]]
```

---

## 4. Backend Service Architecture

### 4.1 Layer Breakdown

1. **API / Transport Layer (`app/api/`)**
   - REST Endpoints for requests, inventory queries, simulation triggers.
   - WebSocket handler (`/ws/events`, `/ws/agent-stream`) streaming partial thoughts, tool executions, and state deltas to the frontend.

2. **Deterministic Engine Layer (`app/engine/`)**
   - `BloodCompatibilityEngine`: Pre-computed lookups for ABO/Rh red cell, plasma, platelet compatibility.
   - `ReserveCalculator`: Computes dynamic safety reserves based on 7-day facility moving averages and trauma center tier.
   - `RoutingEngine`: Implements Haversine distance, road tortuosity factors, emergency siren speed multipliers, and ETA calculations.
   - `PlanValidator`: Pure function executing hard invariant assertions on proposed allocations.

3. **Multi-Agent Orchestrator Layer (`app/agents/`)**
   - LangGraph nodes and conditional edges.
   - Structured tool definitions (invoking `app/engine/` methods via Pydantic schemas).
   - Claude API client integration with caching and temperature controls ($T=0.0$ for deterministic tool routing, $T=0.2$ for explanation synthesis).

4. **Data Access & Storage Layer (`app/db/`)**
   - SQLAlchemy models backed by SQLite (for rapid, zero-friction local execution).
   - Seed data generators for realistic synthetic hospitals, regional blood banks, couriers, and donor pools.

---

## 5. Frontend Architecture & Component Hierarchy

### 5.1 Component Tree

```
App
├── Header (Network Status, Live UTC Clock, Emergency Threat Level, Alert Ticker)
├── MainWorkspace (Grid Layout)
│   ├── LeftSidebar (Navigation: Command Center, Active Requests, Inventory Hub, What-If Sandbox)
│   ├── CenterStage
│   │   ├── ActiveEmergencyBanner (Urgent Case Metadata & Countdown)
│   │   ├── MapAndTimelineSplitView
│   │   │   ├── NetworkLogisticsMap (Leaflet: Hospitals, Blood Banks, Animated Couriers)
│   │   │   └── AgentExecutionTimeline (Live LangGraph Node Stream & Tool Invocations)
│   │   └── ResponsePlanMatrix
│   │       ├── AllocationBreakdownTable (Source, Blood Group, Units, Route, ETA)
│   │       ├── ExplainabilityCard (AI Rationale, Tradeoffs, Supporting Evidence)
│   │       └── PlanDiffViewer (Original Plan vs. Adaptive Re-plan Comparison)
│   └── RightTelemetryPanel
│       ├── RegionalInventoryDonut (PRBC, FFP, Platelet Distribution)
│       ├── DemandBurnRateChart (Recharts Predictive Depletion Curve)
│       └── EmergencyDonorStandbyList (Synthetic Volunteer Candidate Queue)
└── SimulationDrawer (Bottom Floating Dock: Event Injection & Scenario Playback)
```

### 5.2 Real-Time Data Flow Hook

```typescript
// hooks/useAgentStream.ts
export function useAgentStream(requestId: string) {
  // 1. Connects to WebSocket /ws/requests/{requestId}/stream
  // 2. Receives typed events:
  //    - "NODE_START": { node: "inventory_agent", timestamp: ... }
  //    - "TOOL_CALL": { tool: "calculate_usable_stock", params: ... }
  //    - "TOOL_RESULT": { result: ... }
  //    - "NODE_COMPLETE": { node: "inventory_agent", output: ... }
  //    - "PLAN_GENERATED": { plan: ResponsePlan }
  //    - "REPLAN_TRIGGERED": { disruption: DisruptionEvent, delta: PlanDiff }
  // 3. Updates reactive state driving the timeline and map visualizers.
}
```

---

## 6. Safety Guardrails & Deterministic Invariants

Before any allocation plan is returned or displayed, it **MUST pass 100% of the following deterministic assertions**:

```python
def validate_plan_invariants(plan: ResponsePlan, request: EmergencyRequest, db_snapshot: InventorySnapshot) -> ValidationResult:
    # Invariant 1: Conservation of Quantity
    total_allocated = sum(item.units for item in plan.allocations)
    if total_allocated != request.units_requested:
        if not plan.donor_standby_activated and total_allocated < request.units_requested:
            return ValidationResult(is_valid=False, error="Allocated units mismatch requested units without donor standby.")
            
    # Invariant 2: Strict Blood Compatibility
    for alloc in plan.allocations:
        if not BloodCompatibilityEngine.is_compatible(
            donor_group=alloc.donor_blood_group,
            recipient_group=request.blood_group,
            component_type=request.component_type
        ):
            return ValidationResult(is_valid=False, error=f"FATAL: Incompatible group {alloc.donor_blood_group} for {request.blood_group}")

    # Invariant 3: Facility Safety Reserve Protection
    for alloc in plan.allocations:
        facility = db_snapshot.get_facility(alloc.source_facility_id)
        current_stock = facility.get_stock(alloc.donor_blood_group, request.component_type)
        reserve_threshold = facility.get_reserve_threshold(alloc.donor_blood_group, request.component_type)
        if (current_stock - alloc.units) < reserve_threshold:
            return ValidationResult(is_valid=False, error=f"Safety reserve breached at {facility.name}")

    # Invariant 4: Maximum Feasible ETA Window
    for alloc in plan.allocations:
        if alloc.estimated_eta_minutes > request.max_acceptable_eta_minutes:
            return ValidationResult(is_valid=False, error=f"ETA {alloc.estimated_eta_minutes}m exceeds maximum window {request.max_acceptable_eta_minutes}m")

    return ValidationResult(is_valid=True)
```

---

## 7. Error Handling & Fallback Strategy

1. **LLM Timeout / Service Disruption:**
   - If the Claude API fails or exceeds 8 seconds, the system activates the **Deterministic Greedy Fallback Solver** (pure Python heuristic based on distance + compatible stock) and flags the output as `GENERATED_BY_DETERMINISTIC_FALLBACK`.
2. **Invalid Tool Call by Agent:**
   - LangGraph captures malformed tool inputs, returns a formatted error string into the state channel, and prompts the agent node to self-correct (up to 2 iterations).
3. **Catastrophic Shortage (Total Regional Deficit):**
   - If total compatible institutional units < requested units, the system allocates 100% of safe institutional units and immediately triggers the `DonorAgent` to activate the synthetic emergency donor standby list.
