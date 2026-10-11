::: {align="center"}
# 🩸 RHEON AI

### Predict. Orchestrate. Respond.

**Agentic AI-powered blood supply intelligence and emergency
coordination.**

*From fragmented supply decisions to explainable, adaptive response
plans.*

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)
![AI](https://img.shields.io/badge/AI-Multi--Agent%20Orchestration-7C3AED)
![Data](https://img.shields.io/badge/Data-Synthetic%20Prototype-orange)
![Status](https://img.shields.io/badge/Status-In%20Development-orange)
:::

------------------------------------------------------------------------

## 📑 Table of Contents

-   [✨ Overview](#-overview)
-   [🎯 The Problem](#-the-problem)
-   [💡 The RHEON Approach](#-the-rheon-approach)
-   [🔄 How It Works](#-how-it-works)
-   [🧠 Multi-Agent Architecture](#-multi-agent-architecture)
-   [🚀 Key Capabilities](#-key-capabilities)
-   [🛡️ Safety and Validation](#️-safety-and-validation)
-   [🔁 Adaptive Re-Planning](#-adaptive-re-planning)
-   [🧰 Technology Stack](#-technology-stack)
-   [🏗️ Architecture](#️-architecture)
-   [📁 Project Structure](#-project-structure)
-   [⚙️ Getting Started](#️-getting-started)
-   [🧪 Testing and Demo](#-testing-and-demo)
-   [⚠️ Scope and Limitations](#️-scope-and-limitations)
-   [🗺️ Roadmap](#️-roadmap)
-   [📚 Documentation](#-documentation)
-   [🎯 Design Philosophy](#-design-philosophy)
-   [👨‍💻 Author](#-author)

------------------------------------------------------------------------

## ✨ Overview

In an emergency, finding a possible blood source is only the beginning.
Decision-makers must also consider compatibility, usable inventory,
safety reserves, urgency, transportation time, and sudden disruptions.

**RHEON AI** is an Agentic AI-powered decision-support prototype
designed to coordinate these factors into a unified emergency response
workflow. Instead of stopping at a list of available sources, RHEON is
designed to evaluate feasible options, coordinate specialized agents,
generate allocation plans, explain trade-offs, and re-plan when
conditions change.

``` text
Emergency Request
       │
       ▼
Multi-Agent Coordination
       │
       ▼
Feasibility Checks + Allocation Planning
       │
       ▼
Validated Response Plan
       │
       ▼
Disruption? ── Yes ──► Impact Analysis ──► Re-plan
       │
       No
       ▼
Explainable Decision Support
```

> **The mission:** move beyond locating supply toward intelligent,
> explainable, and adaptive emergency coordination.

------------------------------------------------------------------------

## 🎯 The Problem

Emergency blood coordination can involve multiple changing constraints:

1.  **Fragmented visibility** --- relevant supply information may be
    spread across facilities.
2.  **Time-sensitive decisions** --- urgency and transport time affect
    which source is practical.
3.  **Inventory uncertainty** --- recorded stock is not necessarily
    usable stock after reservations and safety reserves.
4.  **Changing conditions** --- a source may become unavailable or
    inventory may drop after a plan is generated.
5.  **Competing constraints** --- the nearest source may not have
    sufficient usable stock.
6.  **Limited explainability** --- a recommendation is harder to trust
    when its assumptions and trade-offs are hidden.

A useful coordination system must do more than generate a plausible
answer. It must check feasibility, explain uncertainty, and report
honestly when no valid solution exists.

------------------------------------------------------------------------

## 💡 The RHEON Approach

RHEON combines **agentic orchestration** with **deterministic
operational checks**.

-   **Specialized agents** examine inventory, demand, candidate sources,
    logistics, donor-pool options, and explanations.
-   **A Coordinator Agent** consolidates findings and manages the
    workflow.
-   **Deterministic services** calculate usable stock, configured
    compatibility, reserves, quantities, and timing constraints.
-   **Plan validation** checks candidate allocations before they can be
    treated as feasible.
-   **Adaptive re-planning** evaluates disruptions and attempts to find
    a valid alternative.
-   **Decision evidence** helps users understand what changed, why
    options were selected or rejected, and what trade-offs remain.

RHEON is designed to **support human decision-makers**, not replace
clinical judgment or authorized emergency procedures.

------------------------------------------------------------------------

## 🔄 How It Works

``` mermaid
flowchart TD
    A[Emergency Request] --> B[Coordinator Agent]
    B --> C[Inventory Agent]
    B --> D[Demand Agent]
    B --> E[Matching Agent]
    B --> F[Logistics Agent]
    B --> G[Donor Agent]
    C --> H[Deterministic Planning Services]
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I{Deterministic Validation}
    I -- Valid --> J[Candidate Allocation Plan]
    I -- Invalid --> K[Reject or Recalculate]
    J --> L[Explainability Agent]
    L --> M[Decision Support View]
    M --> N{Disruption?}
    N -- Yes --> O[Impact Assessment and Re-planning]
    O --> B
    N -- No --> P[Monitor Current Plan]
```

The precise execution path depends on the request, synthetic data, and
supported disruption scenario.

------------------------------------------------------------------------

## 🧠 Multi-Agent Architecture

  -----------------------------------------------------------------------
  Agent                               Responsibility
  ----------------------------------- -----------------------------------
  **Coordinator Agent**               Orchestrates agents and tools,
                                      consolidates findings, and manages
                                      re-planning.

  **Inventory Agent**                 Evaluates stock, reservations,
                                      usable quantities, and configured
                                      safety reserves.

  **Demand Agent**                    Analyzes available demand signals
                                      and estimates shortage risk.

  **Matching Agent**                  Identifies candidate sources that
                                      satisfy configured compatibility
                                      and supply constraints.

  **Logistics Agent**                 Evaluates ground-transport
                                      feasibility and estimated transfer
                                      times.

  **Donor Agent**                     Assesses the synthetic donor pool
                                      as a supplementary planning pathway
                                      where supported.

  **Explainability Agent**            Explains plan rationale,
                                      constraints, rejected options, and
                                      changes between plans.
  -----------------------------------------------------------------------

### The core engineering principle

``` text
AGENTS REASON.
TOOLS CALCULATE.
VALIDATORS ENFORCE.
HUMANS DECIDE.
```

Language models coordinate and interpret. Deterministic code handles
critical calculations and validates plans.

------------------------------------------------------------------------

## 🚀 Key Capabilities

  -----------------------------------------------------------------------
  Capability                          Purpose
  ----------------------------------- -----------------------------------
  🚨 **Emergency Request Workflow**   Represent an urgent request with
                                      component, blood group, quantity,
                                      and priority.

  🩸 **Inventory Intelligence**       Distinguish recorded stock from
                                      usable stock after reservations and
                                      configured reserves.

  🔎 **Candidate Source Matching**    Evaluate potential supply sources
                                      against defined constraints.

  🚚 **Logistics Feasibility**        Include ground-transport estimates
                                      in allocation decisions.

  🧠 **Multi-Agent Orchestration**    Coordinate specialized agents
                                      through a shared workflow.

  📉 **Shortage-Risk Analysis**       Identify potential supply pressure
                                      using available demand and
                                      inventory data.

  🔁 **Adaptive Re-Planning**         Reassess allocations when supported
                                      disruptions affect feasibility.

  🧾 **Plan History and Comparison**  Make plan versions and changes
                                      visible where integrated.

  🛡️ **Deterministic Validation**     Reject candidate plans that fail
                                      configured safety or feasibility
                                      rules.

  🧪 **What-If Simulation**           Explore synthetic disruptions
                                      without affecting real-world supply
                                      systems.
  -----------------------------------------------------------------------

> **Status note:** RHEON is an actively developed prototype. Feature
> availability depends on the current integration state. Verify the
> running implementation before presenting a capability as complete.

------------------------------------------------------------------------

## 🛡️ Safety and Validation

**An AI-generated recommendation is not automatically a valid plan.**

``` text
Agent Findings / Candidate Plan
             │
             ▼
     Deterministic Validator
             │
      ┌──────┴──────┐
      ▼             ▼
    Valid          Invalid
      │             │
      ▼             ▼
 Eligible for    Reject or
 Activation      Recalculate
```

Validation concerns include:

-   Configured blood-group and component compatibility rules.
-   Usable stock and quantity conservation.
-   Reservation and safety-reserve constraints.
-   Source and facility availability.
-   Ground-transport feasibility and estimated timing.
-   Consistency between allocations, totals, and plan status.
-   Preventing an invalid candidate from replacing the active plan.

These are software safeguards for a prototype, not clinical
certification. Real-world use would require qualified domain review,
validated medical rules, operational integration, security assessment,
and formal governance.

------------------------------------------------------------------------

## 🔁 Adaptive Re-Planning

A plan that was feasible moments ago may stop working after a source
becomes unavailable, inventory drops, or a route is delayed.

RHEON's adaptive workflow is designed to:

1.  Receive or detect a supported disruption event.
2.  Assess its impact on the current plan.
3.  Identify affected decisions and preserve unaffected findings where
    safe.
4.  Re-evaluate candidate sources and logistics.
5.  Generate and validate an alternative plan.
6.  Compare the revised plan with its predecessor.
7.  Activate the replacement only if required checks pass.
8.  Report when no feasible alternative exists.

``` text
PLAN A — ACTIVE
      │
      ▼
Source Becomes Unavailable
      │
      ▼
Impact Assessment
      │
      ▼
Candidate PLAN B
      │
      ▼
Deterministic Validation
      │
  ┌───┴─────────────┐
  ▼                 ▼
Valid             Invalid
  │                 │
  ▼                 ▼
Activate B       Keep A if viable;
Supersede A      otherwise report
                 no feasible plan
```

The goal is controlled adaptation with a traceable history---not silent
replacement with an unverified AI output.

------------------------------------------------------------------------

## 🧰 Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Role
  ----------------------- ----------------------- -----------------------
  **Frontend**            React, Vite, TypeScript Web application and
                                                  command center

  **Styling**             Tailwind CSS            Interface styling

  **Visualizations**      Recharts, Lucide        Charts and icons

  **Backend API**         Python, FastAPI         API endpoints and
                                                  application services

  **Validation**          Pydantic                Typed request and
                                                  response validation

  **Persistence**         SQLAlchemy, SQLite      Relational models and
                                                  prototype storage

  **Agent Orchestration** LangGraph               Multi-agent workflow
                                                  coordination

  **LLM Integration**     Anthropic Claude API    Agent reasoning and
                          with configured         coordination support
                          fallback                

  **Operational Logic**   Deterministic Python    Inventory, matching,
                          services                logistics, planning,
                                                  and validation

  **Verification**        Python tests and        Regression and
                          frontend build/type     integration checks
                          checks                  
  -----------------------------------------------------------------------

Refer to the repository's dependency and configuration files for exact
versions and environment-variable names.

------------------------------------------------------------------------

## 🏗️ Architecture

RHEON separates reasoning, operational calculations, persistence, and
presentation.

``` text
┌──────────────────────────────────────────────┐
│ FRONTEND — React + TypeScript                 │
│ Command Center · Requests · Plans · Simulation│
└─────────────────────┬────────────────────────┘
                      │ HTTP API
                      ▼
┌──────────────────────────────────────────────┐
│ BACKEND — FastAPI + Pydantic                  │
│ Request Processing · Application Services     │
└─────────────────────┬────────────────────────┘
                      ▼
┌──────────────────────────────────────────────┐
│ AGENT ORCHESTRATION — LangGraph               │
│ Coordinator · Specialized Agents              │
└─────────────────────┬────────────────────────┘
                      │ Tool Calls
                      ▼
┌──────────────────────────────────────────────┐
│ DETERMINISTIC INTELLIGENCE                    │
│ Inventory · Matching · Logistics · Validation │
│ Planning · Disruption Impact · Plan Comparison│
└─────────────────────┬────────────────────────┘
                      ▼
┌──────────────────────────────────────────────┐
│ PERSISTENCE — SQLAlchemy + SQLite             │
│ Synthetic Prototype Data                      │
└──────────────────────────────────────────────┘
```

### Architectural boundaries

-   The frontend presents data and captures user actions.
-   The backend owns request processing and operational state.
-   Agents coordinate through defined tools and workflows.
-   Deterministic services perform critical calculations and enforce
    configured constraints.
-   Persistence records state required by implemented request and plan
    workflows.

------------------------------------------------------------------------

## 📁 Project Structure

The project is organized around the frontend, backend, and product
documentation. Folder names may evolve; the repository itself is the
source of truth.

``` text
Rheon/
├── frontend/
│   └── src/
│       ├── components/       # Reusable interface components
│       ├── pages/            # Command center and subsystem views
│       ├── services/         # API client and frontend services
│       └── types/            # TypeScript types
│
├── backend/
│   └── app/
│       ├── api/              # Versioned endpoints and routers
│       ├── agents/           # Specialized agents
│       ├── orchestration/    # Coordinator and LangGraph workflow
│       ├── services/         # Deterministic operational services
│       ├── schemas/          # Pydantic schemas and enums
│       ├── models/           # Persistence models
│       └── tools/            # Tool definitions and dispatch
│
├── docs/
│   ├── MVP_SCOPE.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   ├── DATA_MODEL.md
│   ├── UI_SPEC.md
│   └── DEMO_SCENARIO.md
│
└── README.md
```

------------------------------------------------------------------------

## ⚙️ Getting Started

### Prerequisites

-   Python version supported by the backend dependency configuration.
-   Node.js and npm versions supported by the frontend project.
-   Git.
-   An Anthropic API key if live Claude-backed reasoning is enabled. A
    mock/offline fallback may be available when no key is configured.

### 1. Clone the Repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd Rheon
```

Replace `<YOUR_REPOSITORY_URL>` with the actual repository URL and use
its actual root-directory name.

### 2. Set Up the Backend

``` bash
cd backend
python -m venv .venv
```

Activate the environment:

``` powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

``` bash
# macOS / Linux
source .venv/bin/activate
```

Install dependencies using the dependency file that exists in the
repository. If `requirements.txt` is present:

``` bash
pip install -r requirements.txt
```

Configure environment variables using the names expected by the backend
configuration. **Never commit API keys or `.env` files.**

Start the application using the configured entry point. If it exposes
`app.main:app`, the command is typically:

``` bash
uvicorn app.main:app --reload
```

If enabled, FastAPI documentation is commonly available at
`http://127.0.0.1:8000/docs`.

### 3. Set Up the Frontend

Open a second terminal:

``` bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

### 4. Verify the Build

Run the commands defined by the repository's scripts. Typical checks
are:

``` bash
# From the backend directory
pytest

# From the frontend directory
npm run build
```

If a separate typecheck script exists, run it as well. Treat a check as
successful only after it completes successfully in your environment.

------------------------------------------------------------------------

## 🧪 Testing and Demo

RHEON's critical workflow should be verified across normal and failure
scenarios.

  -----------------------------------------------------------------------
  Scenario                            Expected behavior
  ----------------------------------- -----------------------------------
  Feasible emergency request          A candidate plan is generated and
                                      validated.

  Insufficient usable stock           The system accounts for configured
                                      reserves and rejects infeasible
                                      allocations.

  Source becomes unavailable          Impact is assessed and an
                                      alternative is attempted.

  Inventory drops                     Affected allocations are
                                      re-evaluated.

  Route delay or blockage             Logistics assumptions are
                                      reconsidered where supported.

  Invalid alternative plan            It is not activated as a valid
                                      replacement.

  No feasible alternative             The system reports failure
                                      explicitly.

  Browser refresh                     Persisted request and plan data
                                      remain consistent where
                                      implemented.

  Backend unavailable                 The UI shows an error rather than
                                      fabricated live data.
  -----------------------------------------------------------------------

### Suggested exhibition scenario

1.  Create a synthetic emergency request with a configured blood
    component, group, quantity, and urgency.
2.  Generate **Plan A** using synthetic inventory and logistics data.
3.  Inspect selected sources, allocations, and estimated transfer times.
4.  Simulate a supported disruption, such as a source becoming
    unavailable.
5.  Observe the adaptive re-planning workflow.
6.  Review Plan B, validation results, source changes, ETA differences,
    and plan history.
7.  Test a scenario in which no feasible alternative exists.

This demonstrates both successful coordination and honest failure
handling.

------------------------------------------------------------------------

## ⚠️ Scope and Limitations

RHEON is a **prototype and decision-support demonstration**, not a
production clinical or blood-bank management system.

-   It uses synthetic data and is not connected to live blood-bank
    inventories, hospitals, donor registries, or emergency services.
-   Forecasts and travel-time estimates depend on data quality and
    configured assumptions.
-   Compatibility and operational rules require qualified domain review
    before real-world use.
-   A technically valid allocation is not a substitute for clinical
    verification or authorized release procedures.
-   Synthetic donor-pool data does not confirm donor eligibility or
    availability.
-   The platform does not autonomously dispatch vehicles, contact
    donors, or guarantee delivery.
-   Describe streaming, simulation, and other UI capabilities as
    available only when verified in the current build.

**Do not use this prototype to make or execute real patient-care
decisions.**

------------------------------------------------------------------------

## 🔮 Future Roadmap

Potential extensions after core integration and demo verification:

-   **Alternative Plan Arena** --- compare feasible plans across ETA,
    reserve preservation, and resilience.
-   **Predictive Shortage Radar** --- show forecasted supply pressure
    with transparent assumptions.
-   **Blood Supply Digital Twin** --- explore network-level what-if
    scenarios using synthetic data.
-   **Decision Evidence Trail** --- inspect inputs, tool results,
    constraints, and rejected alternatives.
-   **Human-in-the-Loop Approval** --- let an authorized coordinator
    review recommendations before approval.
-   **Network Resilience Metrics** --- measure and explain robustness
    using clearly defined formulas.
-   **Live Event Updates** --- add push-based updates if supported and
    genuinely needed.
-   **Governance and Security** --- role-based authorization, audit
    controls, and formal domain validation before real-world
    integration.

------------------------------------------------------------------------

## 🗺️ Development Roadmap

-   [x] **Phase 0 --- Product Blueprint:** scope, architecture, data
    model, and demo scenario.
-   [x] **Phase 1A --- Core Foundation:** project scaffolding.
-   [x] **Phase 1B --- Deterministic Intelligence:** foundational
    operational calculations and constraints.
-   [x] **Phase 1.5 --- Frontend Foundation:** initial command-center
    interface.
-   [x] **Phase 2A--2D --- Agentic Infrastructure:** tools, specialized
    agents, and orchestration.
-   [x] **Phase 2E --- Adaptive Re-Planning:** reported as implemented;
    verify against the current repository and test suite.
-   [ ] **Phase 3 --- Frontend Command Center Integration:** connect UI
    workflows to real backend responses and persisted plan data.
-   [ ] **Phase 4 --- End-to-End Verification & Demo Hardening:** test
    complete scenarios, failure paths, consistency, and presentation
    readiness.

> Roadmap checkboxes summarize reported development history, not an
> independent audit. Confirm current code and test results before
> presenting any phase as verified.

------------------------------------------------------------------------

## 📚 Documentation

  Document                  Purpose
  ------------------------- -------------------------------------------------
  `README.md`               Overview, architecture, setup, and limitations.
  `docs/MVP_SCOPE.md`       Prototype boundaries and MVP goals.
  `docs/PRD.md`             Product requirements and workflows.
  `docs/ARCHITECTURE.md`    System components and boundaries.
  `docs/AGENTS.md`          Agent responsibilities and orchestration.
  `docs/DATA_MODEL.md`      Data entities and relationships.
  `docs/UI_SPEC.md`         Frontend views and interactions.
  `docs/DEMO_SCENARIO.md`   Demonstration flow and expected outcomes.

------------------------------------------------------------------------

## 🎯 Design Philosophy

> *"In an emergency, a confident answer is not enough. The plan must be
> feasible, explainable, and adaptable."*

RHEON is built around four principles:

-   **Reason intelligently.** Coordinate specialized agents around a
    shared operational goal.
-   **Calculate deterministically.** Keep critical arithmetic and
    feasibility checks outside free-form model output.
-   **Adapt transparently.** Reassess plans when conditions change and
    explain the trade-offs.
-   **Fail honestly.** Report when no feasible plan exists instead of
    inventing success.

The goal is not to make AI appear autonomous. It is to make complex
coordination more understandable, responsive, and accountable.

------------------------------------------------------------------------

## 👨‍💻 Author

**Ayush Rawat**\
*B.Tech --- Computer Science & Engineering, Artificial Intelligence &
Machine Learning*

**Areas of Focus** - Agentic AI and LLM orchestration - Applied AI and
decision-support systems - Full-stack engineering - Deterministic
validation and system architecture

------------------------------------------------------------------------

::: {align="center"}
### 🩸 RHEON AI

**Predict. Orchestrate. Respond.**

*Helping decision-makers coordinate a smarter response when every minute
matters.*
:::
#   R h e o n  
 