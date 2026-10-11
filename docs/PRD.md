# RHEON AI — Product Requirements Document (PRD)

**Project:** RHEON AI  
**Tagline:** Predict. Orchestrate. Respond.  
**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Status:** Approved Architecture Draft  

---

## 1. Executive Summary & Vision

Emergency blood allocation is a high-stakes, time-critical logistical challenge. Traditional blood bank management systems operate as static lookup databases—showing where blood units exist without accounting for real-time traffic disruptions, facility-level safety reserves, upcoming demand surges, multi-facility sourcing splits, or dynamic emergency re-routing.

**RHEON AI** is an agentic AI-powered emergency blood supply intelligence and coordination platform. Its core objective is not merely answering *"Where is blood available?"*, but autonomously solving:

> **"What is the optimal, feasible response plan right now, and how must we adapt instantly when conditions change?"**

RHEON combines **strict deterministic computation** (medical blood compatibility, mathematical reserve thresholds, inventory accounting, routing feasibility) with a **collaborative multi-agent reasoning system** (LangGraph + Claude API) to generate, validate, explain, and dynamically re-plan emergency blood distribution in real time.

---

## 2. Target Personas & Use Cases

| Persona | Role & Context | Primary Need | How RHEON Delivers |
|---|---|---|---|
| **Emergency Operations Coordinator (EOC)** | Regional dispatch lead managing trauma incidents and hospital requests. | Rapid, multi-source allocation plan during critical shortages. | One-click emergency request synthesis, optimal source splitting, instant ETA projections. |
| **Hospital Blood Bank Logistics Director** | Manages local inventory, patient transfusions, and regional reserves. | Preventing stock-outs while preserving critical internal safety buffers. | Predictive demand alerts, reserve threshold protection, automated transfer notifications. |
| **Regional Health Network Commander** | Oversees regional disaster preparedness and surge response. | Proactive stress-testing and contingency intelligence. | "What-If" simulation sandbox to model facility outages, supply chain failures, and mass-casualty surges. |

---

## 3. Core Value Propositions & USPs

### 3.1 Adaptive Emergency Re-Planning (Primary USP)
In high-stress emergency environments, initial plans frequently fail: a primary blood bank goes offline due to power failure, courier routes encounter unexpected blockages, or a patient's clinical urgency escalates. RHEON continuously listens to network event streams and autonomously recalculates response plans—providing delta diffs and rationale explaining why the plan was revised.

### 3.2 What-If / Contingency Intelligence
Operators can inject hypothetical disruptions into the network (e.g., *"What if Central Blood Bank loses refrigeration?"*, *"What if highway route 101 closes?"*, *"What if St. Jude's demand doubles in 2 hours?"*). The system models second-order impacts across the entire network and outputs proactive contingency plans.

### 3.3 Strict Deterministic Safety with Explainable AI
RHEON strictly isolates safety-critical rules (ABO/Rh compatibility, reserve mathematics, hard constraint validation) in deterministic algorithms, while utilizing LLM agents for orchestration, multi-variable tradeoff reasoning, and human-interpretable natural language rationales.

---

## 4. Functional Requirements

### FR-1: Emergency Blood Request Ingestion
- **FR-1.1:** Support multi-component emergency requests:
  - Requesting Facility (Hospital ID, Department, Geo-coordinates)
  - Blood Component Type (Packed Red Blood Cells - PRBC, Fresh Frozen Plasma - FFP, Platelets - PLT, Cryoprecipitate - CRYO)
  - Blood Group & Rh Factor (A+, A-, B+, B-, AB+, AB-, O+, O-)
  - Quantity (Units requested)
  - Urgency Level:
    - `CRITICAL_IMMEDIATE` (< 30 min window, life-threatening trauma)
    - `URGENT_SURGICAL` (< 90 min window, scheduled or active surgical bleed)
    - `ELEVATED_STABILIZATION` (< 4 hour window, ICU stabilization/oncology)
  - Clinical Constraints (e.g., CMV negative, irradiated, pediatric requirements).
- **FR-1.2:** Validate request schema and assign a unique tracking UUID with microsecond timestamp.

### FR-2: Deterministic Safety & Computation Engine
- **FR-2.1:** **Blood Compatibility Matrix:** Strictly enforce verified ABO/Rh compatibility rules for red cells, plasma, and platelets (e.g., O- as universal PRBC donor, AB+ as universal PRBC recipient, AB- as universal plasma donor).
- **FR-2.2:** **Reserve Threshold Protection:** Enforce hard and soft safety reserves ($R_{safe}$) for every supplying facility to prevent secondary stock-outs at donor institutions:
  $$\text{Usable Stock} = \max(0, \text{Total Unreserved Inventory} - \text{Safety Reserve Threshold})$$
- **FR-2.3:** **Logistics & Distance Matrix:** Compute geographical distance (Haversine + road network routing approximation) and dynamic travel time based on transport mode (Standard Courier, Emergency Siren Dispatch, Drone/Helicopter).

### FR-3: Multi-Agent Orchestration & Intelligence
- **FR-3.1:** **Coordinator Agent:** Supervises the end-to-end plan generation lifecycle, delegates sub-tasks to specialized agents, aggregates findings, and synthesizes the finalized Response Plan.
- **FR-3.2:** **Inventory Agent:** Scans all connected regional blood banks and hospital reserves; calculates usable vs. locked stock; flags acute shortage alerts.
- **FR-3.3:** **Demand Agent:** Analyzes temporal burn rates, historical baseline consumption, and predicted surge vectors to assess regional depletion risk.
- **FR-3.4:** **Matching Agent:** Evaluates all candidate sources against compatibility, available quantities, geographic proximity, and transport limits; constructs multi-source fulfillment split options.
- **FR-3.5:** **Logistics Agent:** Validates transit viability, assesses simulated traffic conditions, evaluates priority transport lanes, and computes realistic ETA bounds (p50 / p90).
- **FR-3.6:** **Donor Agent:** Queries synthetic registered emergency donor database when institutional inventory is insufficient; filters candidates by geographic proximity and availability; flags candidates for standby alert. *(Explicitly disclaims clinical eligibility verification).*
- **FR-3.7:** **Explainability Agent:** Synthesizes deterministic data and agent tradeoffs into an operator-facing rationale, highlighting why specific facilities were selected, which alternatives were rejected, and what risks remain.

### FR-4: Dynamic Re-Planning Engine
- **FR-4.1:** Ingest runtime disruption events:
  - `FACILITY_OFFLINE` (Blood bank unavailable or power loss)
  - `ROUTE_BLOCKED` (Traffic gridlock, road closure, weather alert)
  - `INVENTORY_SPOILED_OR_DEPLETED` (Unexpected internal emergency at source facility)
  - `URGENCY_ESCALATION` (Patient status deteriorating, tightening ETA window)
- **FR-4.2:** Diff the active plan against current constraints, identify invalidated allocations, trigger targeted agent re-execution, and output a revised plan with a clear delta summary.

### FR-5: Simulation & What-If Sandbox
- **FR-5.1:** Allow operators to inject synthetic scenario parameters into the active network topology.
- **FR-5.2:** Compute side-by-side comparative metrics:
  - Initial Plan vs. Contingency Plan
  - Network-wide Reserve Depletion Index
  - Total Transit Time & ETA Delta
  - Cost / Risk Score Comparison.

### FR-6: Command Center User Interface
- **FR-6.1:** **Emergency Dashboard:** High-contrast dark-mode command center displaying active requests, key operational metrics (Total Units Available, Critical Shortages, Active Transfers, Network Stress Index).
- **FR-6.2:** **Agent Execution Flow & Timeline:** Visual node graph and timeline displaying real-time agent thoughts, tool invocations, and confidence levels.
- **FR-6.3:** **Geospatial Intelligence Map:** Interactive Leaflet map displaying hospital nodes, blood bank hubs, animated dispatch vectors, and dynamic route status.
- **FR-6.4:** **Re-Planning Diff Panel:** Side-by-side visual diff showing original allocation vs. revised allocation with highlighted route changes and text explanations.

---

## 5. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Target Metric |
|---|---|---|---|
| **NFR-1** | **Performance** | Deterministic engine response time (filtering, compatibility, reserve calculation). | $\le 100\text{ ms}$ |
| **NFR-2** | **Performance** | End-to-end multi-agent plan generation latency. | $\le 5.0\text{ s}$ |
| **NFR-3** | **Performance** | Re-planning turnaround time upon event injection. | $\le 3.5\text{ s}$ |
| **NFR-4** | **Safety & Invariants** | Zero compatibility errors (No incompatible blood group ever suggested by deterministic engine). | $100\%$ mathematical safety |
| **NFR-5** | **Safety & Invariants** | Zero safety reserve breaches without explicit operator override flag. | $100\%$ constraint compliance |
| **NFR-6** | **Reliability** | Real-time state synchronization over WebSockets / SSE. | Sub-second latency ($\le 200\text{ ms}$) |
| **NFR-7** | **Data Isolation** | Complete containment to synthetic data; no real PII/PHI ingested. | $100\%$ synthetic compliance |
| **NFR-8** | **Auditability** | Every agent decision, tool execution, and prompt/response pair must be logged with timestamp. | Full structured audit trail |

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

1. **Fulfillment Feasibility Rate:** $>98\%$ of generated plans must be physically and medically executable under simulated network constraints.
2. **Re-planning Speed:** Time from disruption event detection to revised plan generation $< 4$ seconds.
3. **Reserve Preservation Score:** Percentage of regional blood banks retaining $\ge 85\%$ of mandatory safety reserve after emergency dispatch.
4. **Explainability Comprehension:** $100\%$ of generated plans include structured evidence (source facility, unit counts, distance, ETA, and decision justification).
