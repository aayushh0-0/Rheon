# RHEON AI — User Interface Specification

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Framework:** React 18 + Vite + TypeScript + Tailwind CSS  
**Data Visualization:** Recharts  
**Mapping:** React-Leaflet  

---

## 1. Visual Identity & Design Language

### 1.1 Design Foundation

RHEON's interface is not a generic hospital dashboard. It is an **emergency intelligence command center** designed for high-stakes decision-making under time pressure.

**Design Philosophy:**
- **Clarity under stress:** Every pixel serves situational awareness or action. Zero decorative ornamentation.
- **Dark-dominant professional palette:** Reduces eye strain during extended emergency coordination sessions.
- **Blood-red accent signaling:** The signature color used exclusively for urgency states, critical alerts, and primary actions.
- **Density with hierarchy:** Information-dense layouts using spatial hierarchy (card weight, font scale, color temperature) to guide the eye.

### 1.2 Color Tokens

```css
:root {
  /* Foundation */
  --rheon-bg-primary: #0F1117;        /* Deep charcoal-black canvas */
  --rheon-bg-secondary: #1A1D27;      /* Elevated card surface */
  --rheon-bg-tertiary: #23273A;       /* Nested panels / hover states */
  
  /* Accent — Blood & Emergency */
  --rheon-red-primary: #DC2626;       /* Primary CTA / Critical state */
  --rheon-red-glow: #EF444466;        /* Subtle pulsing glow for active emergencies */
  --rheon-red-muted: #7F1D1D;         /* Background tint for severity badges */
  
  /* Text Hierarchy */
  --rheon-text-primary: #F1F5F9;      /* Headings and primary data */
  --rheon-text-secondary: #94A3B8;    /* Labels and supporting text */
  --rheon-text-muted: #64748B;        /* Metadata and timestamps */
  
  /* Functional States */
  --rheon-status-success: #22C55E;    /* Allocation confirmed / Route clear */
  --rheon-status-warning: #F59E0B;    /* Caution / Moderate risk */
  --rheon-status-info: #3B82F6;       /* Informational / In-progress */
  --rheon-status-critical: #DC2626;   /* Shortage / Route blocked / Overdue */
  
  /* Borders & Dividers */
  --rheon-border-subtle: #2D3348;     /* Card edges */
  --rheon-border-active: #DC262680;   /* Active emergency selection outline */
}
```

### 1.3 Typography

| Scale | Size | Weight | Use |
|---|---|---|---|
| `display-xl` | 32px | 700 (Bold) | Primary dashboard metric (e.g., total units available) |
| `heading-lg` | 24px | 600 (Semibold) | Section headings |
| `heading-md` | 18px | 600 | Card titles |
| `body` | 14px | 400 (Regular) | Standard body text |
| `caption` | 12px | 400 | Timestamps, metadata, secondary labels |
| `mono-data` | 13px (JetBrains Mono or Fira Code) | 400 | Numeric data, IDs, blood groups |

**Primary Font:** Inter  
**Monospace Data Font:** JetBrains Mono

---

## 2. Page & Layout Architecture

RHEON is a **single-page application (SPA)** with a persistent shell (sidebar + header) and a dynamic central workspace.

### 2.1 Application Shell

```
+─────────────────────────────────────────────────────────────────────────+────+
│ [RHEON Logo]  Emergency Command Center          UTC: 2026-10-04 12:43   │ 🔴 │
│               ▲ 2 Active Emergencies  │  Network: ONLINE  │  Agents: 7/7│    │
+───────┬───────────────────────────────────────────────────────────────────────+
│    S  │                                                                      │
│    I  │                    [ DYNAMIC VIEWPORT ]                              │
│    D  │                                                                      │
│    E  │  Page content changes based on sidebar navigation selection:         │
│    B  │                                                                      │
│    A  │    📊 Command Center (Default / Primary)                            │
│    R  │    🩸 Request Center (Incoming emergency triage queue)               │
│       │    📦 Inventory Hub (Regional stock overview + drill-down)           │
│   N   │    🧪 Simulation Center (What-If sandbox + event injection)         │
│   A   │    📜 Audit Trail (Agent execution logs + decision history)         │
│   V   │                                                                      │
└───────┴──────────────────────────────────────────────────────────────────────+
```

---

## 3. Core Screens & Component Specifications

---

### 3.1 Command Center (Primary Dashboard)

The default viewport displaying real-time operational intelligence.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⚠ ACTIVE: 10 O+ PRBC for Metro Trauma Center — CRITICAL_IMMEDIATE [00:24:31]  │
│   Phase: Matching → Logistics                     Confidence: 87%    🔴 LIVE   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────┐  ┌────────────────────────────────┐
│                                            │  │ AGENT EXECUTION TIMELINE       │
│          NETWORK LOGISTICS MAP             │  │                                │
│                                            │  │ ● Coordinator ──── 0.0s       │
│    [Leaflet map with:                      │  │ ● Inventory ────── 0.8s       │
│     - Hospital markers (blue)              │  │   └ tool: calc_usable_stock   │
│     - Blood bank markers (red)             │  │ ● Demand ──────── 1.2s       │
│     - Animated dispatch vectors            │  │   └ tool: get_burn_rate      │
│     - Color-coded route status             │  │ ○ Matching ─────── ...        │
│     - Pulsing origin/destination]          │  │ ○ Logistics ────── ...        │
│                                            │  │ ○ Validator ────── ...        │
│                                            │  │ ○ Explainability ─ ...        │
└────────────────────────────────────────────┘  └────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│ RESPONSE PLAN — ALLOCATION MATRIX                         v1 │ Plan Diff ▾     │
│                                                                                  │
│ ┌──────────────────┬────────┬───────┬───────────┬──────┬──────┬───────────────┐  │
│ │ Source Facility   │ Group  │ Units │ Transport │ Dist │ ETA  │ Status        │  │
│ ├──────────────────┼────────┼───────┼───────────┼──────┼──────┼───────────────┤  │
│ │ Central Blood Ctr│  O+    │  6    │ Siren Amb │ 8 km │ 14m  │ ✅ Dispatched │  │
│ │ North Star Hub   │  O+    │  3    │ Std Courr │ 18km │ 28m  │ 🔄 Preparing │  │
│ │ Mercy Hosp Rsv   │  O-    │  1    │ Siren Amb │ 12km │ 18m  │ 🔄 Preparing │  │
│ └──────────────────┴────────┴───────┴───────────┴──────┴──────┴───────────────┘  │
│                                                                                  │
│ EXPLAINABILITY AI:                                                               │
│ "Central Blood Center selected as primary source due to proximity and available  │
│  surplus. O- compatible unit from Mercy used to fill remaining gap. North Star   │
│  deprioritized for 3 units due to higher depletion risk (12h P80 stock-out)."    │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────┐
│ 🩸 REGIONAL INVENTORY │  │ 📈 DEMAND CURVE       │  │ 🧑‍⚕️ DONOR STANDBY          │
│                        │  │                        │  │                            │
│  [Donut Chart]         │  │  [Line Chart]          │  │  3 candidates matched     │
│  PRBC: 142 units       │  │  ▄▅▆▇▇█              │  │  Avg ETA: 35 min          │
│  FFP:   89 units       │  │  Projected 24h demand  │  │  Nearest: 4.2 km         │
│  PLT:   34 units       │  │  ↑ 18% above baseline  │  │                            │
└──────────────────────┘  └──────────────────────┘  └────────────────────────────┘
```

---

### 3.2 Agent Execution Timeline Component

A vertical timeline rendering each LangGraph node as a card with real-time streaming.

**Card States:**
- `PENDING` — Outlined, gray, unfilled.
- `RUNNING` — Pulsing blue border, animated spinner.
- `COMPLETE` — Solid fill, green checkmark, duration badge.
- `ERROR` — Red border, error message preview.

**Expandable Details per Node:**
- Tool invocations (name + input parameters + output preview).
- Token count.
- Duration in milliseconds.

---

### 3.3 Re-Planning Diff View

When the Coordinator triggers re-planning, a modal or inline split-diff panel appears:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚡ RE-PLAN EVENT: FACILITY_OFFLINE — Central Blood Center               │
│                                                                          │
│  ORIGINAL PLAN (v1)              │  REVISED PLAN (v2)                    │
│  ───────────────                 │  ────────────────                     │
│  Central Blood Ctr → 6 units    │  ██ REMOVED ██ (Facility offline)    │
│  North Star Hub → 3 units       │  North Star Hub → 3 units (no change)│
│  Mercy Hosp Rsv → 1 unit        │  Mercy Hosp Rsv → 1 unit (no change)│
│                                  │  + Metro Blood Hub → 4 units (NEW)  │
│                                  │  + South Valley → 2 units (NEW)     │
│                                  │                                      │
│  Total: 10/10 units              │  Total: 10/10 units                  │
│  Max ETA: 28 min                 │  Max ETA: 36 min (+8 min)           │
│                                  │                                      │
│  RATIONALE: Replaced offline Central Blood Center allocation with two   │
│  alternate sources within acceptable ETA margin.                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Simulation Center (What-If Sandbox)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🧪 SIMULATION CENTER — What-If Contingency Intelligence                 │
│                                                                          │
│  ┌────────────────────────────────────────┐                              │
│  │ INJECT EVENT                           │                              │
│  │ ┌─────────────┐ ┌──────────────────┐   │                              │
│  │ │ Event Type ▼│ │ Target Facility ▼│   │                              │
│  │ └─────────────┘ └──────────────────┘   │                              │
│  │                                        │                              │
│  │ Options:                               │                              │
│  │  ◉ Facility Goes Offline               │                              │
│  │  ○ Route Blocked (N→S corridor)        │                              │
│  │  ○ Demand Surge (+200% for 6h)         │                              │
│  │  ○ Inventory Falls Below Reserve       │                              │
│  │                                        │                              │
│  │ [ Run Simulation ▶ ]                   │                              │
│  └────────────────────────────────────────┘                              │
│                                                                          │
│  RESULTS (Comparative):                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                            │
│  │ CURRENT NETWORK    │  │ POST-DISRUPTION   │                            │
│  │ Stress: 34%        │  │ Stress: 72% ⚠     │                            │
│  │ Coverage: 98%      │  │ Coverage: 81% ↓    │                            │
│  │ Avg ETA: 22 min    │  │ Avg ETA: 38 min ↑  │                            │
│  └───────────────────┘  └───────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Interactive Map Specification (React-Leaflet)

### 4.1 Map Features

| Feature | Visual Representation |
|---|---|
| **Hospital** | Blue pulse marker with name tooltip |
| **Blood Bank (Online)** | Red circle marker |
| **Blood Bank (Offline)** | Gray circle with strike-through slash |
| **Active Dispatch Route** | Animated dashed polyline (green/yellow/red based on ETA status) |
| **Blocked Route** | Red ✕ overlay on route segment |
| **Donor Candidate** | Small teal diamond marker |
| **Requesting Hospital (Active Emergency)** | Pulsing red bullseye |

### 4.2 Interactivity

- Click facility → Side info panel (name, stock summary, active transfers).
- Hover route → Tooltip with distance, transport mode, ETA.
- Events injected via Simulation Center animate onto the map (facility goes gray, route turns red).

---

## 5. Responsive & Accessibility Notes

- **Primary Target:** Desktop ($\ge 1280\text{px}$). This is a coordination workstation tool.
- **Minimum Viable Width:** $1024\text{px}$ (collapsed sidebar).
- **Keyboard Navigation:** All interactive elements reachable via `Tab` / `Enter` / `Esc`.
- **Color-Blind Safety:** Every state indicator has both a color AND an icon/text label (never color-only).
- **ARIA Labels:** All map markers, chart elements, and status badges carry descriptive ARIA labels.
