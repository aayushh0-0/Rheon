export type BloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';

export type ComponentType = 'RBC' | 'PRBC' | 'FFP' | 'PLATELETS' | 'CRYO';

export type UrgencyLevel =
  | 'ROUTINE'
  | 'URGENT'
  | 'CRITICAL'
  | 'CRITICAL_IMMEDIATE'
  | 'URGENT_SURGICAL'
  | 'ELEVATED_STABILIZATION';

export type TransportMode =
  | 'AMBULANCE_SIREN'
  | 'AMBULANCE_ROUTINE'
  | 'REFRIGERATED_VAN'
  | 'MOTORCYCLE_COURIER'
  | 'STANDARD_COURIER'
  | 'DRONE';

export type RequestStatus =
  | 'PENDING'
  | 'PLANNED'
  | 'DISPATCHED'
  | 'FULFILLED'
  | 'CANCELLED';

export type NavItem =
  | 'command-center'
  | 'emergency-requests'
  | 'inventory-reserves'
  | 'route-dispatch'
  | 'drone-telemetry'
  | 'candidate-matcher'
  | 'safety-audit'
  | 'simulation-studio'
  | 'facility-registry'
  | 'donors-standby';

export interface BloodRequestCreate {
  hospital_id: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_requested: number;
  urgency: UrgencyLevel;
  max_eta_minutes: number;
  clinical_notes?: string;
  status?: RequestStatus;
  required_by?: string;
}

export interface EmergencyRequest {
  id: string;
  hospital_id: string;
  hospital_name: string;
  location_zone: string;
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_requested: number;
  units_allocated: number;
  urgency: UrgencyLevel;
  transport_mode: TransportMode;
  target_eta_mins: number;
  actual_eta_mins: number;
  status: RequestStatus;
  safety_checks_verified: number; // e.g. 6 of 6
  created_at: string;
  source_facility: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  subtext: string;
  category: 'rose' | 'lime' | 'mint' | 'lavender';
  sparkline: number[];
}

export interface InventorySummary {
  blood_group: BloodGroup;
  component_type: ComponentType;
  total_available_units: number;
  total_safety_reserve: number;
  total_usable_units: number;
  status: string;
  facility_count: number;
}

export interface InventoryGroupDistribution {
  group: BloodGroup;
  units: number;
  percentage: number;
  color: string;
  usableUnits: number;
}

export interface DemandDayData {
  day: string;
  shortDay: string;
  requests: number;
  units: number;
  isCurrent: boolean;
  routedPct: number;
}

export interface SafetyCheckResult {
  compatibility: boolean;
  quantity_conservation: boolean;
  safety_reserve_protection: boolean;
  source_status: boolean;
  logistics_validity: boolean;
  mathematical_consistency: boolean;
}
