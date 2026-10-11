# RHEON AI — Demo Scenario & Walkthrough

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Purpose:** End-to-end walkthrough of a realistic emergency scenario demonstrating all core RHEON capabilities.  

---

## 1. Scenario Context — "The Friday Night Trauma"

**Date/Time (Simulated):** Friday, October 4, 2026 — 21:47 UTC  
**Location:** Metro Region — ~40 km radius metropolitan area  
**Network State:** All 4 hospitals and 3 blood banks online. Regional inventory at seasonal low.

### 1.1 Active Network Facilities

| Facility | Type | Trauma Level | Location |
|---|---|---|---|
| Metro Trauma Center | Hospital | Level 1 | Downtown (28.6139°N, 77.2090°E) |
| Mercy General Hospital | Hospital | Level 2 | North District (28.6508°N, 77.2167°E) |
| St. Jude Community Hospital | Hospital | Level 3 | East District (28.6280°N, 77.2500°E) |
| West Valley Memorial Hospital | Hospital | Level 2 | West District (28.5921°N, 77.1750°E) |
| Central Regional Blood Center | Blood Bank | Hub | Central (28.6200°N, 77.2200°E) |
| North Star Blood Hub | Blood Bank | Secondary | North (28.6600°N, 77.2300°E) |
| South Valley Blood Reserve | Blood Bank | Depot | South (28.5700°N, 77.2100°E) |

### 1.2 Starting Inventory Snapshot (O+ PRBC Only)

| Facility | Total On-Hand | Reserved | Safety Reserve | Usable |
|---|---|---|---|---|
| Central Blood Center | 24 | 4 | 6 | **14** |
| North Star Hub | 12 | 2 | 4 | **6** |
| South Valley Reserve | 8 | 1 | 3 | **4** |
| Metro Trauma Center (Internal) | 6 | 2 | 3 | **1** |
| Mercy General (Internal) | 4 | 1 | 2 | **1** |

**Total Network Usable O+ PRBC:** 26 units  

---

## 2. Phase A — Initial Emergency Request

### Trigger Event
A multi-vehicle highway collision results in 3 critical patients arriving at **Metro Trauma Center**. The trauma team initiates a massive transfusion protocol.

### Emergency Request Submitted

```json
{
  "hospital_id": "hosp-metro-trauma",
  "blood_group": "O+",
  "component_type": "PRBC",
  "units_requested": 10,
  "urgency_level": "CRITICAL_IMMEDIATE",
  "max_eta_minutes": 30,
  "clinical_notes": "MVC MTP x3. Estimated blood loss >3L per patient."
}
```

---

## 3. Phase B — Multi-Agent Plan Generation

### Step 1: Coordinator Agent Activates
- Receives the emergency request.
- Calls deterministic tool: `get_compatible_blood_groups("O+", "PRBC")` → Returns `["O+", "O-"]`.
- Determines required agent sequence: Inventory → Demand → Matching → Logistics → Validator → Explainability.

### Step 2: Inventory Agent
- Scans all 5 facilities for compatible O+ and O- PRBC stock.
- Calls: `calculate_usable_stock(facility_id, "O+", "PRBC")` for each facility.
- **Output:** Total usable across network: O+ = 26 units, O- = 8 units. Sufficient institutional stock exists.

### Step 3: Demand Agent
- Checks historical burn rates for Friday nights (elevated trauma volume).
- Calls: `calculate_stockout_risk("bb-central", "O+", 6)` → Risk after deducting 6 units: **MEDIUM** (projected 18h supply remaining).
- Calls: `calculate_stockout_risk("bb-north", "O+", 4)` → Risk after deducting 4 units: **HIGH** (projected 9h supply remaining).
- **Recommendation:** Limit North Star Hub contribution to preserve weekend coverage.

### Step 4: Matching Agent
- Evaluates all candidates against multi-criteria weights: proximity (35%), available units (25%), facility depletion risk (25%), ETA feasibility (15%).
- **Multi-source allocation:**

| Source | Group | Units | Match Score |
|---|---|---|---|
| Central Blood Center | O+ | 6 | 0.94 |
| North Star Hub | O+ | 3 | 0.78 |
| Mercy General Reserve | O- | 1 | 0.71 |

### Step 5: Logistics Agent
- Calls: `calculate_distance_and_eta("bb-central", "hosp-metro-trauma", "AMBULANCE_SIREN")` → 8.2 km, **14 min**.
- Calls: `calculate_distance_and_eta("bb-north", "hosp-metro-trauma", "STANDARD_COURIER")` → 17.8 km, **28 min**.
- Calls: `calculate_distance_and_eta("hosp-mercy", "hosp-metro-trauma", "AMBULANCE_SIREN")` → 12.1 km, **18 min**.
- All routes: `FEASIBLE` (within 30-minute window).

### Step 6: Validator Node (Deterministic)
- ✅ Conservation of quantity: 6 + 3 + 1 = 10 ✓
- ✅ Blood compatibility: O+ ↔ O+ ✓, O- ↔ O+ ✓
- ✅ Safety reserves: Central (14 - 6 = 8 ≥ 6 ✓), North Star (6 - 3 = 3 < 4 ✗) — **FLAGGED.**

### Step 7: Re-Routing (Validator Feedback Loop)
- Validator rejects: North Star Hub would breach safety reserve by 1 unit.
- Coordinator reduces North Star allocation from 3 → 2, adds South Valley Reserve for 1 unit.
- **Revised allocation:**

| Source | Group | Units | ETA |
|---|---|---|---|
| Central Blood Center | O+ | 6 | 14 min |
| North Star Hub | O+ | 2 | 28 min |
| South Valley Reserve | O+ | 1 | 25 min |
| Mercy General Reserve | O- | 1 | 18 min |

- ✅ Re-validation passes all invariants.

### Step 8: Explainability Agent
> **Decision Summary:** 10 O+ PRBC units allocated from 4 sources to Metro Trauma Center for critical MVC mass transfusion. Central Blood Center provides the majority (6 units) due to proximity and surplus capacity. North Star Hub contributes 2 units (reduced from 3 to preserve weekend safety reserves after Demand Agent flagged elevated Friday night depletion risk). South Valley Reserve and Mercy General fill the remaining gap. All deliveries feasible within the 30-minute window.

---

## 4. Phase C — Disruption & Adaptive Re-Planning

### Disruption Event (T + 8 minutes)

At 21:55, the regional power grid reports a failure affecting the **Central Regional Blood Center**. Cold-chain integrity cannot be confirmed.

```json
{
  "event_type": "FACILITY_OFFLINE",
  "target_entity_id": "bb-central",
  "event_payload": {
    "reason": "Power grid failure — cold chain integrity unverifiable",
    "estimated_restoration": "Unknown"
  }
}
```

### Re-Planning Execution

1. **Impact Detection:** Coordinator identifies 6 units from Central Blood Center are now invalidated ($0$ of the original $6$ units are in transit yet).
2. **Lock Unaffected Routes:** North Star (2 units), South Valley (1 unit), and Mercy General (1 unit) are locked — their allocations remain valid.
3. **Generate Replacement Deficit:** Need $6$ replacement units from remaining online sources.
4. **Targeted Re-Matching:**

| New Source | Group | Units | ETA | Note |
|---|---|---|---|---|
| South Valley Reserve | O+ | 3 (additional) | 25 min | Expanded from 1→4 total |
| West Valley Memorial (Internal) | O+ | 2 | 22 min | Releasing 2 from internal surplus |
| Donor Standby Pool | O+ | 1 | ~40 min | Emergency donor alert activated |

5. **Validator Pass:** Conservation = 2 + 4 + 1 + 2 + 1(donor) = 10 ✓. All safety reserves protected ✓.
6. **Donor Agent Activated:** Identifies 3 synthetic O+ donors within 15 km of Metro Trauma Center. Top candidate: DONOR-R47, 4.2 km away, estimated arrival 12 min to lab for on-site draw and crossmatch.

### Plan Diff Summary

| Metric | Original Plan (v1) | Revised Plan (v2) | Delta |
|---|---|---|---|
| Sources | 4 facilities | 4 facilities + 1 donor | +1 source |
| Max ETA | 28 min | 40 min | +12 min ⚠ |
| Institutional Units | 10 | 9 | -1 unit |
| Donor Standby Units | 0 | 1 | +1 unit |
| Confidence Score | 0.94 | 0.79 | -0.15 |

---

## 5. Phase D — What-If Simulation (Operator-Initiated)

After stabilizing the immediate response, the EOC operator launches a hypothetical:

> **"What if North Star Hub also goes offline while demand doubles at Metro Trauma?"**

### Simulation Results

| Metric | Current State | Post-Scenario |
|---|---|---|
| Network O+ PRBC Usable | 12 units remaining | 4 units |
| Regional Stress Index | 58% | **91% CRITICAL** |
| Fulfillment Capability | 10-unit request covered | Max 4 units from institutions |
| Donor Standby Required | 0–1 candidates | **6+ candidates** (partial coverage) |
| Recommended Action | Monitor | **Pre-position South Valley reserve. Alert 10 donors to standby.** |

---

## 6. Timeline of Agent Activity (User-Visible)

```
21:47:00  ──── REQUEST RECEIVED ── 10 O+ PRBC for Metro Trauma ────────────
21:47:01  [Coordinator]     Started orchestration
21:47:02  [Inventory Agent] tool: get_network_stock_summary → 34 usable units
21:47:03  [Demand Agent]    tool: get_burn_rate → Friday night +22% surge
21:47:04  [Matching Agent]  tool: score_candidates → 4-source split proposed
21:47:05  [Logistics Agent] tool: calculate_eta → All routes feasible (max 28m)
21:47:06  [Validator]       FAIL: North Star safety reserve breach
21:47:07  [Coordinator]     Loop → Reducing North Star 3→2, adding South Valley
21:47:07  [Validator]       PASS: All invariants satisfied
21:47:08  [Explainability]  Rationale generated: 4-source, 10/10 units, max ETA 28m
21:47:08  ──── PLAN v1 GENERATED ── Confidence: 0.94 ──────────────────────

21:55:00  ──── DISRUPTION ── Central Blood Center OFFLINE (power failure) ──
21:55:01  [Coordinator]     Re-plan triggered. Locking 4 unaffected allocations.
21:55:02  [Matching Agent]  Deficit: 6 units. Re-scoring remaining sources.
21:55:03  [Logistics Agent] New routes: South Valley +3, West Valley +2
21:55:04  [Donor Agent]     Activated. 3 O+ donors within 15 km identified.
21:55:05  [Validator]       PASS: Revised allocations valid.
21:55:06  [Explainability]  "Central Blood Center replaced by South Valley,
                             West Valley, and 1 standby donor."
21:55:06  ──── PLAN v2 GENERATED ── Confidence: 0.79 ── ETA +12 min ───────
```
