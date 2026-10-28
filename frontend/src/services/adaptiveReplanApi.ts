/**
 * Frontend-only adaptive re-planning engine for RHEON demo.
 * localStorage persistence · no backend · no LLM claims.
 * Label: Frontend Simulation / demonstration inventory.
 */

const STORAGE_KEY = 'rheon_fe_adaptive_replan_v1';
const TEST_MODE_DELAY_MS = 150_000; // ~2.5 minutes

export type BloodGroup = 'O-' | 'O+' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type ComponentType = 'RBC' | 'PLATELETS' | 'FFP' | 'CRYO';
export type Urgency = 'ROUTINE' | 'URGENT' | 'CRITICAL';
export type PlanStatus = 'ACTIVE' | 'DISRUPTED' | 'SUPERSEDED' | 'FAILED' | 'BLOCKED' | 'ESCALATED';
export type RequestStatus = 'PENDING' | 'PLANNED' | 'DISRUPTED' | 'REPLANNED' | 'BLOCKED' | 'ESCALATED';

export interface DemoHospitalInventory {
  id: string;
  name: string;
  city: string;
  /** Demonstration inventory only */
  stock: Partial<Record<BloodGroup, number>>;
  eta_minutes: number;
  transport_mode: string;
}

export interface SafetyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface LocalPlan {
  plan_id: string;
  request_id: string;
  version: number;
  hospital_id: string;
  hospital_name: string;
  blood_group: BloodGroup;
  component: ComponentType;
  units_requested: number;
  units_allocated: number;
  available_at_selection: number;
  eta_minutes: number;
  transport_mode: string;
  status: PlanStatus;
  disruption_reason?: string;
  validation: { passed: boolean; checks: SafetyCheck[] };
  created_at: string;
  replanning_reason?: string;
}

export interface AgentStep {
  agent: string;
  responsibility: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  summary: string;
  kind: 'Frontend Simulation';
}

export interface TimelineEntry {
  id: string;
  label: string;
  at: string;
  detail?: string;
  kind: 'APP' | 'TEST_MODE' | 'Frontend Simulation';
  tone?: 'ok' | 'warn' | 'error' | 'info';
}

export interface LocalBloodRequest {
  id: string;
  patient_ref: string;
  blood_group: BloodGroup;
  component: ComponentType;
  units_requested: number;
  urgency: Urgency;
  hospital_id: string;
  hospital_name: string;
  status: RequestStatus;
  created_at: string;
  original_plan: LocalPlan | null;
  revised_plan: LocalPlan | null;
  agent_trace: AgentStep[];
  timeline: TimelineEntry[];
  /** hospital_id -> units reserved by this request */
  reservation: { hospital_id: string; units: number } | null;
  disruption_fired: boolean;
  test_timer_started_at?: string;
}

export interface AdaptiveStore {
  requests: LocalBloodRequest[];
  /** hospital_id -> units reserved across active requests */
  reservations: Record<string, number>;
}

/** Clearly labelled demonstration inventory (not live hospital data) */
export const DEMO_INVENTORY: DemoHospitalInventory[] = [
  {
    id: 'bb-rotary',
    name: 'Rotary Blood Bank, Tughlakabad',
    city: 'Delhi',
    stock: { 'O-': 5, 'O+': 8, 'A+': 6, 'A-': 2, 'B+': 4, 'B-': 2, 'AB+': 2, 'AB-': 1 },
    eta_minutes: 18,
    transport_mode: 'DRONE',
  },
  {
    id: 'bb-lion',
    name: 'Lion Blood Bank, East of Kailash',
    city: 'Delhi',
    stock: { 'O-': 3, 'O+': 7, 'A+': 5, 'A-': 1, 'B+': 3, 'B-': 1, 'AB+': 1, 'AB-': 1 },
    eta_minutes: 28,
    transport_mode: 'PRIORITY_GROUND',
  },
  {
    id: 'bb-aiims',
    name: 'AIIMS Blood Bank (Internal)',
    city: 'Delhi',
    stock: { 'O-': 4, 'O+': 10, 'A+': 6, 'A-': 2, 'B+': 5, 'B-': 2, 'AB+': 2, 'AB-': 1 },
    eta_minutes: 12,
    transport_mode: 'STANDARD_COURIER',
  },
  {
    id: 'bb-redcross',
    name: 'Indian Red Cross Society, Delhi',
    city: 'Delhi',
    stock: { 'O-': 2, 'O+': 6, 'A+': 4, 'A-': 1, 'B+': 3, 'B-': 1, 'AB+': 1, 'AB-': 0 },
    eta_minutes: 35,
    transport_mode: 'PRIORITY_GROUND',
  },
  {
    id: 'bb-medanta',
    name: 'Medanta Blood Centre, Gurugram',
    city: 'Gurugram',
    stock: { 'O-': 3, 'O+': 5, 'A+': 4, 'A-': 1, 'B+': 2, 'B-': 1, 'AB+': 1, 'AB-': 1 },
    eta_minutes: 42,
    transport_mode: 'REFRIGERATED_VAN',
  },
];

const AGENTS = {
  coordinator: 'Emergency Coordinator Agent',
  inventory: 'Inventory Agent',
  demand: 'Demand Agent',
  matching: 'Matching Agent',
  logistics: 'Logistics Agent',
  explainability: 'Explainability Agent',
};

function now() {
  return new Date().toISOString();
}

function loadStore(): AdaptiveStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdaptiveStore;
      if (parsed && Array.isArray(parsed.requests)) {
        return {
          requests: parsed.requests,
          reservations: parsed.reservations || {},
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { requests: [], reservations: {} };
}

function saveStore(store: AdaptiveStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getStore(): AdaptiveStore {
  return loadStore();
}

export function listRequests(): LocalBloodRequest[] {
  return loadStore().requests.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getRequest(id: string): LocalBloodRequest | undefined {
  return loadStore().requests.find((r) => r.id === id);
}

/** Unreserved stock at hospital for group (demo inventory − reservations) */
export function availableUnits(hospitalId: string, group: BloodGroup, store?: AdaptiveStore): number {
  const s = store || loadStore();
  const hosp = DEMO_INVENTORY.find((h) => h.id === hospitalId);
  if (!hosp) return 0;
  const total = hosp.stock[group] ?? 0;
  const reserved = s.reservations[`${hospitalId}::${group}`] || 0;
  return Math.max(0, total - reserved);
}

export function getReservationsForHospital(hospitalId: string): Array<{ request_id: string; group: BloodGroup; units: number }> {
  const s = loadStore();
  const out: Array<{ request_id: string; group: BloodGroup; units: number }> = [];
  for (const r of s.requests) {
    if (r.reservation?.hospital_id === hospitalId && r.reservation.units > 0) {
      out.push({ request_id: r.id, group: r.blood_group, units: r.reservation.units });
    }
  }
  return out;
}

function setReservation(store: AdaptiveStore, hospitalId: string, group: BloodGroup, delta: number) {
  const key = `${hospitalId}::${group}`;
  store.reservations[key] = Math.max(0, (store.reservations[key] || 0) + delta);
}

function validateAllocation(
  hospitalId: string,
  group: BloodGroup,
  component: ComponentType,
  need: number,
  store: AdaptiveStore,
  ignoreReservationForRequest?: string
): { passed: boolean; checks: SafetyCheck[]; available: number } {
  // Temporarily free this request's own reservation when re-checking
  const temp = { ...store, reservations: { ...store.reservations } };
  if (ignoreReservationForRequest) {
    const req = store.requests.find((r) => r.id === ignoreReservationForRequest);
    if (req?.reservation) {
      setReservation(temp, req.reservation.hospital_id, req.blood_group, -req.reservation.units);
    }
  }

  const available = availableUnits(hospitalId, group, temp);
  const hosp = DEMO_INVENTORY.find((h) => h.id === hospitalId);

  const checks: SafetyCheck[] = [
    {
      name: 'COMPATIBLE_GROUP',
      passed: !!hosp && (hosp.stock[group] !== undefined),
      detail: `Demonstration stock entry for ${group} at ${hosp?.name || hospitalId}`,
    },
    {
      name: 'COMPONENT_SUPPORTED',
      passed: component === 'RBC' || component === 'FFP' || component === 'PLATELETS' || component === 'CRYO',
      detail: `Component ${component}`,
    },
    {
      name: 'UNRESERVED_QUANTITY',
      passed: available >= need,
      detail: `${available} unreserved demo units available vs ${need} requested`,
    },
    {
      name: 'ETA_WITHIN_SLA',
      passed: (hosp?.eta_minutes ?? 99) <= 45,
      detail: `ETA ${hosp?.eta_minutes ?? '—'} min (SLA 45)`,
    },
    {
      name: 'HUMAN_BB_VERIFICATION',
      passed: true,
      detail: 'Frontend simulation never authorizes transfusion — blood-bank verification required',
    },
  ];

  return { passed: checks.every((c) => c.passed), checks, available };
}

function tl(label: string, kind: TimelineEntry['kind'], detail?: string, tone?: TimelineEntry['tone']): TimelineEntry {
  return {
    id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    label,
    at: now(),
    kind,
    detail,
    tone,
  };
}

export function createBloodRequest(input: {
  patient_ref: string;
  blood_group: BloodGroup;
  component: ComponentType;
  units_requested: number;
  urgency: Urgency;
  hospital_id: string;
}): { ok: true; request: LocalBloodRequest } | { ok: false; error: string } {
  const store = loadStore();
  const hosp = DEMO_INVENTORY.find((h) => h.id === input.hospital_id);
  if (!hosp) return { ok: false, error: 'Unknown demonstration hospital / blood bank.' };

  const need = Math.max(1, Number(input.units_requested) || 1);
  const group = input.blood_group;
  const validation = validateAllocation(input.hospital_id, group, input.component, need, store);
  if (!validation.passed) {
    return {
      ok: false,
      error: `Cannot create original plan: ${validation.checks
        .filter((c) => !c.passed)
        .map((c) => c.detail)
        .join('; ')}`,
    };
  }

  const id = `REQ-FE-${Date.now().toString().slice(-8)}`;
  const planId = `PLAN-${id}-v1`;

  setReservation(store, input.hospital_id, group, need);

  const plan: LocalPlan = {
    plan_id: planId,
    request_id: id,
    version: 1,
    hospital_id: hosp.id,
    hospital_name: hosp.name,
    blood_group: group,
    component: input.component,
    units_requested: need,
    units_allocated: need,
    available_at_selection: validation.available,
    eta_minutes: hosp.eta_minutes,
    transport_mode: hosp.transport_mode,
    status: 'ACTIVE',
    validation: { passed: true, checks: validation.checks },
    created_at: now(),
  };

  const request: LocalBloodRequest = {
    id,
    patient_ref: input.patient_ref || id,
    blood_group: group,
    component: input.component,
    units_requested: need,
    urgency: input.urgency,
    hospital_id: hosp.id,
    hospital_name: hosp.name,
    status: 'PLANNED',
    created_at: now(),
    original_plan: plan,
    revised_plan: null,
    reservation: { hospital_id: hosp.id, units: need },
    disruption_fired: false,
    agent_trace: [
      {
        agent: AGENTS.demand,
        responsibility: 'Interpret urgency and quantity',
        status: 'SUCCESS',
        summary: `${input.urgency} · ${need}u ${group} ${input.component}`,
        kind: 'Frontend Simulation',
      },
      {
        agent: AGENTS.inventory,
        responsibility: 'Check demonstration unreserved stock',
        status: 'SUCCESS',
        summary: `${validation.available} unreserved units at ${hosp.name}`,
        kind: 'Frontend Simulation',
      },
      {
        agent: AGENTS.matching,
        responsibility: 'Select initial source',
        status: 'SUCCESS',
        summary: `Selected ${hosp.name}`,
        kind: 'Frontend Simulation',
      },
      {
        agent: AGENTS.coordinator,
        responsibility: 'Activate original plan after safety checks',
        status: 'SUCCESS',
        summary: `Plan ${planId} ACTIVE · reservation held`,
        kind: 'Frontend Simulation',
      },
    ],
    timeline: [
      tl('Request created', 'APP', `${id} · ${group} ${need}u · ${input.urgency}`, 'ok'),
      tl('Original plan created', 'Frontend Simulation', `${planId} @ ${hosp.name}`, 'ok'),
    ],
  };

  store.requests.unshift(request);
  saveStore(store);
  return { ok: true, request };
}

export function triggerDisruption(requestId: string, source: 'TEST_MODE' | 'MANUAL'): LocalBloodRequest | null {
  const store = loadStore();
  const idx = store.requests.findIndex((r) => r.id === requestId);
  if (idx < 0) return null;
  const req = store.requests[idx];
  if (req.disruption_fired) return req; // idempotent
  if (!req.original_plan || req.original_plan.status === 'SUPERSEDED') return req;

  req.disruption_fired = true;
  req.status = 'DISRUPTED';
  req.original_plan = {
    ...req.original_plan,
    status: 'DISRUPTED',
    disruption_reason:
      'The selected hospital no longer has sufficient unreserved stock to fulfil this request. (Frontend simulation — demonstration inventory only.)',
  };
  // Release reservation on disrupted source so other requests can compete fairly after disruption
  if (req.reservation) {
    setReservation(store, req.reservation.hospital_id, req.blood_group, -req.reservation.units);
    req.reservation = null;
  }
  req.timeline = [
    ...req.timeline,
    tl(
      'Supply disruption detected',
      source === 'TEST_MODE' ? 'TEST_MODE' : 'APP',
      req.original_plan.disruption_reason,
      'warn'
    ),
  ];
  store.requests[idx] = req;
  saveStore(store);
  return req;
}

export type ReplanOptions = {
  /** Force no alternative (demo edge) */
  forceNoAlternative?: boolean;
  /** Force validation failure */
  forceValidationFail?: boolean;
};

export function runAdaptiveReplan(
  requestId: string,
  opts: ReplanOptions = {}
): LocalBloodRequest | null {
  const store = loadStore();
  const idx = store.requests.findIndex((r) => r.id === requestId);
  if (idx < 0) return null;
  let req = store.requests[idx];

  if (!req.original_plan) return req;
  if (req.revised_plan?.status === 'ACTIVE') return req; // already replanned

  // Ensure disrupted
  if (req.original_plan.status === 'ACTIVE') {
    const d = triggerDisruption(requestId, 'MANUAL');
    if (d) {
      const s2 = loadStore();
      const i2 = s2.requests.findIndex((r) => r.id === requestId);
      req = s2.requests[i2];
      Object.assign(store, s2);
    }
  }

  const need = req.units_requested;
  const group = req.blood_group;
  const originalId = req.original_plan.hospital_id;

  const agent_trace: AgentStep[] = [
    ...req.agent_trace,
    {
      agent: AGENTS.coordinator,
      responsibility: 'Selective re-planning after disruption',
      status: 'SUCCESS',
      summary: 'Invalidate original source; re-run matching & logistics (frontend simulation)',
      kind: 'Frontend Simulation',
    },
    {
      agent: AGENTS.inventory,
      responsibility: 'Recheck unreserved demonstration stock',
      status: 'SUCCESS',
      summary: 'Exclude units reserved by other local requests',
      kind: 'Frontend Simulation',
    },
  ];

  type Cand = { hosp: DemoHospitalInventory; available: number; score: number; validation: ReturnType<typeof validateAllocation> };
  const candidates: Cand[] = [];

  for (const hosp of DEMO_INVENTORY) {
    if (hosp.id === originalId) continue;
    const validation = validateAllocation(hosp.id, group, req.component, need, store);
    const available = validation.available;
    const urgencyBoost = req.urgency === 'CRITICAL' ? 5 : req.urgency === 'URGENT' ? 2 : 0;
    const score = (validation.passed ? 100 : 0) + available * 3 + urgencyBoost - hosp.eta_minutes / 5;
    candidates.push({ hosp, available, score, validation });
  }

  candidates.sort((a, b) => b.score - a.score);

  agent_trace.push({
    agent: AGENTS.matching,
    responsibility: 'Rank alternative sources',
    status: 'SUCCESS',
    summary: `${candidates.length} alternatives ranked (frontend simulation)`,
    kind: 'Frontend Simulation',
  });

  req.timeline = [
    ...req.timeline,
    tl('Alternatives evaluated', 'Frontend Simulation', candidates.map((c) => `${c.hosp.name}: ${c.available}u`).join(' · '), 'info'),
  ];

  let best = candidates.find((c) => c.validation.passed);
  if (opts.forceNoAlternative) best = undefined;

  if (!best) {
    agent_trace.push({
      agent: AGENTS.explainability,
      responsibility: 'Explain escalation',
      status: 'SUCCESS',
      summary: 'No safe alternative with sufficient unreserved compatible stock',
      kind: 'Frontend Simulation',
    });
    req.status = 'ESCALATED';
    req.agent_trace = agent_trace;
    req.timeline = [
      ...req.timeline,
      tl('Safety validation', 'Frontend Simulation', 'No candidate to validate', 'error'),
      tl('Revised plan escalated', 'Frontend Simulation', 'BLOCKED/ESCALATED — no feasible alternative', 'error'),
    ];
    req.revised_plan = null;
    store.requests[idx] = req;
    saveStore(store);
    return req;
  }

  agent_trace.push({
    agent: AGENTS.logistics,
    responsibility: 'ETA and transport for alternative',
    status: 'SUCCESS',
    summary: `${best.hosp.transport_mode} · ${best.hosp.eta_minutes} min`,
    kind: 'Frontend Simulation',
  });

  let validation = best.validation;
  if (opts.forceValidationFail) {
    validation = {
      ...validation,
      passed: false,
      checks: validation.checks.map((c) =>
        c.name === 'UNRESERVED_QUANTITY'
          ? { ...c, passed: false, detail: 'Forced validation failure (test)' }
          : c
      ),
    };
  }

  req.timeline = [
    ...req.timeline,
    tl(
      'Safety validation',
      'Frontend Simulation',
      validation.passed ? 'All deterministic checks passed' : 'Validation failed — activation blocked',
      validation.passed ? 'ok' : 'error'
    ),
  ];

  if (!validation.passed) {
    agent_trace.push({
      agent: AGENTS.coordinator,
      responsibility: 'Refuse unsafe activation',
      status: 'FAILED',
      summary: 'Deterministic safety gate blocked revised plan',
      kind: 'Frontend Simulation',
    });
    req.status = 'BLOCKED';
    req.agent_trace = agent_trace;
    req.revised_plan = {
      plan_id: `PLAN-${req.id}-v2-REJECTED`,
      request_id: req.id,
      version: 2,
      hospital_id: best.hosp.id,
      hospital_name: best.hosp.name,
      blood_group: group,
      component: req.component,
      units_requested: need,
      units_allocated: 0,
      available_at_selection: best.available,
      eta_minutes: best.hosp.eta_minutes,
      transport_mode: best.hosp.transport_mode,
      status: 'FAILED',
      validation,
      created_at: now(),
      replanning_reason: 'Candidate failed safety validation',
    };
    req.timeline = [
      ...req.timeline,
      tl('Revised plan blocked', 'Frontend Simulation', 'Validation failure prevents activation', 'error'),
    ];
    store.requests[idx] = req;
    saveStore(store);
    return req;
  }

  // Activate revised plan + reserve new source
  setReservation(store, best.hosp.id, group, need);
  const revised: LocalPlan = {
    plan_id: `PLAN-${req.id}-v2`,
    request_id: req.id,
    version: 2,
    hospital_id: best.hosp.id,
    hospital_name: best.hosp.name,
    blood_group: group,
    component: req.component,
    units_requested: need,
    units_allocated: need,
    available_at_selection: best.available,
    eta_minutes: best.hosp.eta_minutes,
    transport_mode: best.hosp.transport_mode,
    status: 'ACTIVE',
    validation,
    created_at: now(),
    replanning_reason: `Original source disrupted; switched to ${best.hosp.name} (frontend simulation)`,
  };

  if (req.original_plan) {
    req.original_plan = { ...req.original_plan, status: 'SUPERSEDED' };
  }
  req.revised_plan = revised;
  req.reservation = { hospital_id: best.hosp.id, units: need };
  req.status = 'REPLANNED';
  agent_trace.push({
    agent: AGENTS.explainability,
    responsibility: 'Decision rationale',
    status: 'SUCCESS',
    summary: revised.replanning_reason!,
    kind: 'Frontend Simulation',
  });
  agent_trace.push({
    agent: AGENTS.coordinator,
    responsibility: 'Activate Plan B',
    status: 'SUCCESS',
    summary: `${revised.plan_id} ACTIVE`,
    kind: 'Frontend Simulation',
  });
  req.agent_trace = agent_trace;
  req.timeline = [
    ...req.timeline,
    tl('Revised plan activated', 'Frontend Simulation', `${revised.plan_id} @ ${best.hosp.name}`, 'ok'),
  ];

  store.requests[idx] = req;
  saveStore(store);
  return req;
}

export function resetAllScenarios(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function markTestTimerStarted(requestId: string): void {
  const store = loadStore();
  const r = store.requests.find((x) => x.id === requestId);
  if (!r || r.disruption_fired) return;
  if (r.test_timer_started_at) return;
  r.test_timer_started_at = now();
  saveStore(store);
}

export { TEST_MODE_DELAY_MS };
