# RHEON AI — MVP Scope & Implementation Roadmap

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Target MVP Delivery:** Phase 1 → Phase 3 (see roadmap below)  

---

## 1. MVP Feature Matrix — In / Out / Post-MVP

| # | Feature | MVP Status | Notes |
|---|---|---|---|
| 1 | Emergency blood request ingestion | ✅ IN | Full Pydantic schema validation |
| 2 | Synthetic hospitals (4) | ✅ IN | Geocoded, tiered |
| 3 | Synthetic blood banks (3) | ✅ IN | Online/offline toggle |
| 4 | Synthetic blood inventory | ✅ IN | Multi-group, multi-component, realistic volumes |
| 5 | Synthetic donor pool (50) | ✅ IN | Anonymous, geocoded, blood group distributed |
| 6 | Blood compatibility engine (PRBC + FFP) | ✅ IN | Deterministic matrix lookup |
| 7 | Platelet & Cryo compatibility | ⏳ POST-MVP | Simpler rules, lower priority |
| 8 | Inventory analysis + usable stock calculation | ✅ IN | Per-facility, per-group |
| 9 | Safety reserve enforcement | ✅ IN | Hard invariant in validator |
| 10 | Shortage detection | ✅ IN | Network-wide and per-facility |
| 11 | Demand prediction / burn rate estimation | ✅ IN | Synthetic heuristic (not ML) |
| 12 | Stock-out risk scoring | ✅ IN | Per-facility, per-group |
| 13 | Source matching (multi-criteria) | ✅ IN | Distance, stock, depletion risk, ETA |
| 14 | Multi-source split allocation | ✅ IN | Core differentiator |
| 15 | Logistics / ETA estimation | ✅ IN | Haversine + transport mode multipliers |
| 16 | Real road routing API | ❌ OUT | Use synthetic distance factors |
| 17 | Multi-agent orchestration (LangGraph) | ✅ IN | Core — 7 agent nodes + conditional edges |
| 18 | Coordinator-directed tool calling | ✅ IN | Structured Pydantic tool schemas |
| 19 | Agent execution timeline (WS stream) | ✅ IN | Real-time node-by-node rendering |
| 20 | Explainable AI recommendation | ✅ IN | Natural language rationale per plan |
| 21 | Dynamic re-planning on disruption events | ✅ IN | Primary USP |
| 22 | Plan diff visualization | ✅ IN | Side-by-side original vs. revised |
| 23 | Event simulation (inject disruptions) | ✅ IN | Facility offline, route blocked, demand surge |
| 24 | What-if analysis (contingency mode) | ✅ IN | Comparative metrics before/after |
| 25 | Interactive command center dashboard | ✅ IN | Dark-mode, real-time, agent-aware |
| 26 | Network logistics map (Leaflet) | ✅ IN | Facilities, routes, dispatch animations |
| 27 | Regional inventory charts (Recharts) | ✅ IN | Donut + burn rate line charts |
| 28 | Audit trail / decision log | ✅ IN | Structured JSON logs per agent step |
| 29 | User authentication | ❌ OUT | MVP is single-operator mode |
| 30 | Real hospital / blood bank integration | ❌ OUT | MVP uses synthetic data only |
| 31 | Notification system (SMS, email) | ❌ OUT | Post-MVP integration |
| 32 | Mobile responsive UI | ❌ OUT | Desktop coordination workstation only |
| 33 | Multi-language support (i18n) | ❌ OUT | English-only for MVP |
| 34 | Historical analytics dashboard | ⏳ POST-MVP | Depends on accumulated audit data |

---

## 2. Implementation Phase Roadmap

### Phase 1 — Foundation & Deterministic Engine
**Goal:** Establish the project skeleton, database, seed data, and all deterministic computation services. No LLM integration yet.

**Deliverables:**
1. **Project scaffolding:**
   - Backend: FastAPI project structure (`app/api/`, `app/engine/`, `app/db/`, `app/agents/`, `app/models/`).
   - Frontend: Vite + React + TypeScript project structure.
   - Shared configuration: environment variables, CORS, dev server proxy.
2. **Database & ORM:**
   - SQLAlchemy models for all entities (hospitals, blood banks, inventory, donors, requests, plans, events, audit logs).
   - SQLite database initialization and migration setup.
3. **Synthetic data seed script:**
   - 4 hospitals, 3 blood banks, ~50 donors, realistic multi-group inventory batches.
   - Geo-coordinates within a 40 km metro cluster.
4. **Deterministic engine services (100% test coverage):**
   - `BloodCompatibilityEngine` — PRBC and FFP matrix lookups.
   - `ReserveCalculator` — Usable stock computation with trauma-tier multipliers.
   - `RoutingEngine` — Haversine distance, transport mode speed profiles, ETA calculation.
   - `PlanValidator` — All 4 invariant assertions (quantity conservation, compatibility, reserve protection, ETA window).
5. **REST API endpoints:**
   - `POST /api/requests` — Create emergency request.
   - `GET /api/inventory/summary` — Network-wide stock overview.
   - `GET /api/facilities` — List hospitals and blood banks with coordinates.

**Exit Criteria:** All deterministic engines pass unit tests. Seed data loads correctly. API endpoints return valid JSON.

---

### Phase 2 — Multi-Agent Orchestration (LangGraph + Claude)
**Goal:** Implement the full 7-agent LangGraph state machine with Claude API tool calling. The system generates allocation plans end-to-end.

**Deliverables:**
1. **LangGraph state graph:**
   - `RheonAgentState` TypedDict.
   - Node functions: `coordinator_node`, `inventory_node`, `demand_node`, `matching_node`, `logistics_node`, `donor_node`, `validator_node`, `explainability_node`.
   - Conditional edges: Coordinator → parallel subagents → Matching → (sufficient? → Donor) → Validator → (pass? → Explain / fail? → Coordinator re-loop).
2. **Structured tool definitions:**
   - Each deterministic engine method exposed as a Pydantic-schema'd tool callable by agents.
3. **Claude API integration:**
   - Client wrapper with API key configuration.
   - System prompts per agent role.
   - Temperature $0.0$ for deterministic routing, $0.2$ for explanation synthesis.
4. **WebSocket streaming endpoint:**
   - `/ws/requests/{request_id}/stream` — Streams `NODE_START`, `TOOL_CALL`, `TOOL_RESULT`, `NODE_COMPLETE`, `PLAN_GENERATED` events.
5. **Dynamic re-planning engine:**
   - `POST /api/events` — Inject simulation events (FACILITY_OFFLINE, ROUTE_BLOCKED, etc.).
   - Re-planning diff calculation and revised plan generation.
6. **What-If simulation endpoint:**
   - `POST /api/simulate` — Run hypothetical disruption, return comparative metrics.

**Exit Criteria:** Full emergency request → multi-agent plan generation → validated allocation plan works end-to-end via API. Re-planning produces correct diffs on injected events.

---

### Phase 3 — Frontend Command Center
**Goal:** Build the complete React dashboard with real-time streaming, map visualization, and simulation sandbox.

**Deliverables:**
1. **Application shell:**
   - Sidebar navigation, header with network status, emergency alert ticker.
2. **Command Center dashboard:**
   - Active emergency banner with countdown timer.
   - Network logistics map (React-Leaflet) with facility markers, dispatch route animations, and event overlays.
   - Agent execution timeline with real-time WebSocket streaming.
   - Response plan allocation table.
   - Explainability card.
3. **Request Center page:**
   - Emergency request form with Pydantic-aligned validation.
   - Request queue with status tracking.
4. **Inventory Hub page:**
   - Regional inventory overview (Recharts donut + bar charts).
   - Facility drill-down with per-group stock levels.
5. **Simulation Center page:**
   - Event injection panel (facility offline, route blocked, demand surge).
   - What-if comparison display (current vs. disrupted metrics).
   - Re-planning diff view panel.
6. **Audit Trail page:**
   - Searchable, filterable log of all agent actions and tool calls.

**Exit Criteria:** Complete end-to-end demo flow: submit request → watch agents execute in real time → view plan on map → inject disruption → see re-plan diff → explore what-if scenario.

---

### Phase 4 (Post-MVP) — Polish, Extensions & Hardening
**Scope:**
- Add platelet and cryoprecipitate compatibility rules.
- Implement historical analytics and trend dashboards.
- Add operator notes and manual plan overrides.
- Performance optimization (caching, connection pooling, streaming compression).
- Mobile-responsive layout adaptation.
- Deployment pipeline (Docker, CI/CD).

---

## 3. Technology Stack Summary

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend Framework** | React | 18.x |
| **Frontend Tooling** | Vite | 5.x + TypeScript 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **Charts** | Recharts | 2.x |
| **Maps** | React-Leaflet + Leaflet | 4.x / 1.9.x |
| **Backend Framework** | FastAPI | 0.100+ |
| **Backend Language** | Python | 3.11+ |
| **Database** | SQLite | via SQLAlchemy 2.x |
| **Schema Validation** | Pydantic | 2.x |
| **Agent Orchestration** | LangGraph | Latest stable |
| **LLM Provider** | Anthropic Claude API | Sonnet 3.5 (primary), Haiku 3.5 (lightweight calls) |
| **Real-Time Streaming** | WebSockets (FastAPI) | Native + `websockets` library |
| **Package Manager (Frontend)** | npm or pnpm | |
| **Package Manager (Backend)** | pip + requirements.txt (or Poetry) | |

---

## 4. Risk Register

| # | Risk | Severity | Probability | Mitigation |
|---|---|---|---|---|
| R1 | **Claude API latency causes plan generation to exceed 5s target.** | High | Medium | Use Haiku for lightweight subagent calls. Cache deterministic results. Implement timeout + deterministic fallback solver. |
| R2 | **LLM hallucinates numeric values in allocation plans.** | Critical | Medium | Agent outputs are always validated by deterministic PlanValidator before surfacing. LLMs never perform arithmetic—only invoke tools. |
| R3 | **LangGraph state graph becomes complex with re-planning loops.** | Medium | Medium | Limit re-plan iterations to 3. Use clear conditional edge predicates. Extensive integration tests. |
| R4 | **WebSocket streaming reliability under sustained load.** | Medium | Low (MVP) | MVP is single-operator. Add heartbeat pings and reconnection logic. |
| R5 | **Synthetic data unrealism reduces demo credibility.** | Medium | Medium | Base seed data on realistic metropolitan blood supply statistics. Use plausible facility names and geo-coordinates. |
| R6 | **Scope creep in MVP—features escalate beyond defined boundary.** | High | High | Strict adherence to this MVP_SCOPE.md. Weekly scope review against this document. |
| R7 | **Blood compatibility errors in deterministic engine.** | Critical | Very Low | 100% unit test coverage of compatibility matrix. Medical reference validation. |

---

## 5. Definition of Done — MVP

The MVP is complete when:

1. An operator can submit an emergency blood request through the UI.
2. The multi-agent system generates a validated allocation plan within 5 seconds.
3. The agent execution timeline streams live in the dashboard.
4. The network map displays facilities, routes, and animated dispatch vectors.
5. An operator can inject a disruption event and observe the system re-plan automatically.
6. The re-planning diff is displayed with clear before/after comparison.
7. The what-if simulation sandbox produces comparative contingency analysis.
8. The explainability agent produces a readable natural language rationale for every plan.
9. All deterministic invariants (compatibility, reserves, ETA window, quantity conservation) are enforced without exception.
10. The full demo scenario (Section 2–5 of DEMO_SCENARIO.md) executes successfully end-to-end.
