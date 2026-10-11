# RHEON AI — Data Model & Deterministic Rules Specification

**Document Version:** 1.0.0 (Phase 0 Blueprint)  
**Database:** SQLite (SQLAlchemy ORM) for MVP  
**Schema Validation:** Pydantic v2  

---

## 1. Entity-Relationship Overview

```
+───────────────────+       1:N       +──────────────────────+
|     Hospital      |─────────────────|   EmergencyRequest   |
+───────────────────+                 +──────────────────────+
          │                                      │
          │ 1:N                                  │ 1:N
          ▼                                      ▼
+───────────────────+                 +──────────────────────+
|  BloodInventory   |                 |    AllocationPlan    |
+───────────────────+                 +──────────────────────+
          ▲                                      │
          │ 1:N                                  │ 1:N
+───────────────────+                            ▼
|     BloodBank     |                 +──────────────────────+
+───────────────────+                 |    AllocationItem    |
          │                           +──────────────────────+
          │ 1:N                                  │
          ▼                                      │ References
+───────────────────+                            │
|   TransferRoute   |◄───────────────────────────┘
+───────────────────+
          
+───────────────────+                 +──────────────────────+
|  SyntheticDonor   |                 |   SimulationEvent    |
+───────────────────+                 +──────────────────────+
```

---

## 2. Relational Database Schema (SQLAlchemy Models)

### 2.1 Facilities: `hospitals` & `blood_banks`

```sql
CREATE TABLE hospitals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(16) UNIQUE NOT NULL,
    trauma_level INTEGER NOT NULL, -- Level 1, 2, 3
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blood_banks (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(16) UNIQUE NOT NULL,
    is_regional_hub BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT TRUE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Inventory Batches: `blood_inventory`

```sql
CREATE TABLE blood_inventory (
    id VARCHAR(36) PRIMARY KEY,
    facility_type VARCHAR(16) NOT NULL, -- 'HOSPITAL' or 'BLOOD_BANK'
    facility_id VARCHAR(36) NOT NULL,
    blood_group VARCHAR(8) NOT NULL,     -- 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'
    component_type VARCHAR(16) NOT NULL, -- 'PRBC', 'FFP', 'PLATELETS', 'CRYO'
    total_units INTEGER NOT NULL DEFAULT 0,
    reserved_units INTEGER NOT NULL DEFAULT 0,
    safety_reserve_units INTEGER NOT NULL DEFAULT 0,
    expiration_date DATE NOT NULL,
    batch_number VARCHAR(32) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Emergency Requests & Allocation Plans

```sql
CREATE TABLE emergency_requests (
    id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL REFERENCES hospitals(id),
    blood_group VARCHAR(8) NOT NULL,
    component_type VARCHAR(16) NOT NULL,
    units_requested INTEGER NOT NULL,
    urgency_level VARCHAR(32) NOT NULL, -- 'CRITICAL_IMMEDIATE', 'URGENT_SURGICAL', 'ELEVATED_STABILIZATION'
    max_eta_minutes INTEGER NOT NULL,
    clinical_notes TEXT,
    status VARCHAR(32) DEFAULT 'PENDING', -- 'PENDING', 'PLANNED', 'DISPATCHED', 'FULFILLED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE allocation_plans (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL REFERENCES emergency_requests(id),
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL, -- 'ACTIVE', 'SUPERSEDED', 'CANCELLED'
    total_allocated_units INTEGER NOT NULL,
    unmet_units INTEGER NOT NULL DEFAULT 0,
    donor_standby_activated BOOLEAN DEFAULT FALSE,
    max_eta_minutes INTEGER NOT NULL,
    confidence_score REAL NOT NULL,
    ai_rationale TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE allocation_items (
    id VARCHAR(36) PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL REFERENCES allocation_plans(id),
    source_facility_type VARCHAR(16) NOT NULL,
    source_facility_id VARCHAR(36) NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    donor_blood_group VARCHAR(8) NOT NULL,
    units_allocated INTEGER NOT NULL,
    transport_mode VARCHAR(32) NOT NULL, -- 'AMBULANCE_SIREN', 'STANDARD_COURIER', 'DRONE'
    distance_km REAL NOT NULL,
    estimated_eta_minutes INTEGER NOT NULL,
    dispatch_status VARCHAR(32) DEFAULT 'PENDING'
);
```

### 2.4 Synthetic Donors & Simulation Events

```sql
CREATE TABLE synthetic_donors (
    id VARCHAR(36) PRIMARY KEY,
    anonymous_id VARCHAR(32) UNIQUE NOT NULL,
    blood_group VARCHAR(8) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    availability_status VARCHAR(32) NOT NULL, -- 'AVAILABLE_IMMEDIATE', 'STANDBY_ON_CALL', 'BUSY'
    last_donated_date DATE,
    contact_token VARCHAR(64) NOT NULL
);

CREATE TABLE simulation_events (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL, -- 'FACILITY_OFFLINE', 'ROUTE_BLOCKED', 'DEMAND_SURGE', 'INVENTORY_DEPLETION'
    target_entity_type VARCHAR(32) NOT NULL,
    target_entity_id VARCHAR(36) NOT NULL,
    event_payload JSON NOT NULL,
    triggered_replan BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36),
    agent_name VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    details JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Deterministic Compatibility Tables & Logic Rules

### 3.1 Red Blood Cells (PRBC) Compatibility Matrix

| Recipient Group | Compatible Donor Groups (In Order of Clinical Preference) |
|---|---|
| **O-** | O- (Strict match only) |
| **O+** | O+, O- |
| **A-** | A-, O- |
| **A+** | A+, A-, O+, O- |
| **B-** | B-, O- |
| **B+** | B+, B-, O+, O- |
| **AB-** | AB-, A-, B-, O- |
| **AB+** | AB+, AB-, A+, A-, B+, B-, O+, O- (Universal Recipient) |

### 3.2 Plasma (FFP) Compatibility Matrix

*Note: Plasma compatibility is the exact inverse of red cell compatibility.*

| Recipient Group | Compatible Donor Plasma Groups |
|---|---|
| **O** (O+, O-) | O, A, B, AB (Universal Recipient for Plasma) |
| **A** (A+, A-) | A, AB |
| **B** (B+, B-) | B, AB |
| **AB** (AB+, AB-) | AB (Strict match only; Universal Donor for Plasma) |

### 3.3 Usable Stock Formula

For facility $i$, blood group $g$, and component $c$:

$$\text{UsableStock}(i, g, c) = \max\left(0, \text{TotalOnHand}(i, g, c) - \text{ReservedUnits}(i, g, c) - \text{SafetyReserve}(i, g, c)\right)$$

### 3.4 Safety Reserve Calculation Formula

$$\text{SafetyReserve}(i, g, c) = \text{TraumaMultiplier}(i) \times \text{DailyBaselineBurn}(i, g, c) \times \text{ReserveBufferDays}$$

- **Trauma Multiplier:**
  - Level 1 Trauma Hospital: $1.5\times$
  - Level 2 Trauma Hospital: $1.2\times$
  - Level 3 Community Hospital: $1.0\times$
  - Regional Blood Bank Hub: $0.8\times$ (higher dispatch elasticity)
- **Reserve Buffer Days:** Minimum $2.0$ days of baseline burn.

---

## 4. Pydantic DTOs & API Contracts

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class BloodGroup(str, Enum):
    O_POS = "O+"
    O_NEG = "O-"
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"

class ComponentType(str, Enum):
    PRBC = "PRBC"
    FFP = "FFP"
    PLATELETS = "PLATELETS"
    CRYO = "CRYO"

class UrgencyLevel(str, Enum):
    CRITICAL_IMMEDIATE = "CRITICAL_IMMEDIATE"   # < 30 min
    URGENT_SURGICAL = "URGENT_SURGICAL"         # < 90 min
    ELEVATED_STABILIZATION = "ELEVATED_STABILIZATION" # < 4 hrs

class EmergencyRequestCreate(BaseModel):
    hospital_id: str
    blood_group: BloodGroup
    component_type: ComponentType
    units_requested: int = Field(gt=0, le=50)
    urgency_level: UrgencyLevel
    max_eta_minutes: int = Field(gt=5, le=360)
    clinical_notes: Optional[str] = None

class AllocationItemDTO(BaseModel):
    source_facility_id: str
    source_name: str
    donor_blood_group: BloodGroup
    units_allocated: int
    transport_mode: str
    distance_km: float
    estimated_eta_minutes: int

class ResponsePlanDTO(BaseModel):
    plan_id: str
    request_id: str
    version: int
    status: str
    total_allocated_units: int
    unmet_units: int
    donor_standby_activated: bool
    max_eta_minutes: int
    confidence_score: float
    allocations: List[AllocationItemDTO]
    ai_rationale: str
    created_at: datetime
```

---

## 5. Synthetic Data Seeding Strategy

For realistic, non-trivial emergency scenario simulations, the database will be seeded with a cohesive regional medical cluster (modeled after a major metropolitan network with a $40\text{ km}$ radius):

1. **Hospitals (4 Facilities):**
   - *Metro Trauma Center* (Level 1 Trauma Hospital - Downtown)
   - *Mercy General Hospital* (Level 2 Regional Hospital - North District)
   - *St. Jude Children's & Community Hospital* (Level 3 Hospital - East District)
   - *West Valley Memorial Hospital* (Level 2 Hospital - West District)
2. **Blood Banks (3 Hubs):**
   - *Central Regional Blood Center* (Primary high-capacity distribution hub)
   - *North Star Blood & Plasma Hub* (Secondary storage facility)
   - *South Valley Blood Reserve* (Automated regional cold-storage depot)
3. **Synthetic Donor Pool (50 Geocoded Anonymous Donors):**
   - Realistic population blood group distribution: $O+$ ($38\%$), $A+$ ($34\%$), $B+$ ($9\%$), $O-$ ($7\%$), $A-$ ($6\%$), $AB+$ ($3\%$), $B-$ ($2\%$), $AB-$ ($1\%$).
