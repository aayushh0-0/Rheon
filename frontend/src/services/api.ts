import { EmergencyRequest, DemandDayData, MetricCardData, InventorySummary } from '../types';
import { apiClient } from './apiClient';

// Helper for mapping mock status/transport if needed or ensure mock data uses valid enums.
// The backend-compatible Enum values are:
// RequestStatus: PENDING, PLANNED, DISPATCHED, FULFILLED, CANCELLED
// TransportMode: AMBULANCE_SIREN, AMBULANCE_ROUTINE, REFRIGERATED_VAN, MOTORCYCLE_COURIER, STANDARD_COURIER, DRONE
// UrgencyLevel: ROUTINE, URGENT, CRITICAL, CRITICAL_IMMEDIATE, URGENT_SURGICAL, ELEVATED_STABILIZATION

// Initial synthetic mock data mirroring NCR blood network (AIIMS, Safdarjung, Max, Fortis, Apollo)
export const initialEmergencyRequests: EmergencyRequest[] = [
  {
    id: 'REQ-2026-0891',
    hospital_id: 'hosp-aiims-delhi',
    hospital_name: 'AIIMS New Delhi (Trauma Centre)',
    location_zone: 'South Delhi Zone',
    blood_group: 'O-',
    component_type: 'RBC',
    units_requested: 4,
    units_allocated: 4,
    urgency: 'CRITICAL',
    transport_mode: 'DRONE',
    target_eta_mins: 15,
    actual_eta_mins: 12,
    status: 'DISPATCHED', // FIX: IN_TRANSIT -> DISPATCHED
    safety_checks_verified: 6,
    created_at: '4 mins ago',
    source_facility: 'Rotary Blood Bank, Tughlakabad',
  },
  {
    id: 'REQ-2026-0892',
    hospital_id: 'hosp-safdarjung-delhi',
    hospital_name: 'Safdarjung Hospital Emergency Block',
    location_zone: 'South West Delhi',
    blood_group: 'A+',
    component_type: 'RBC',
    units_requested: 6,
    units_allocated: 6,
    urgency: 'CRITICAL',
    transport_mode: 'AMBULANCE_SIREN', // FIX: EMERGENCY_AMBULANCE -> AMBULANCE_SIREN
    target_eta_mins: 25,
    actual_eta_mins: 22,
    status: 'DISPATCHED',
    safety_checks_verified: 6,
    created_at: '11 mins ago',
    source_facility: 'Red Cross Regional Blood Bank',
  },
  {
    id: 'REQ-2026-0893',
    hospital_id: 'hosp-max-saket',
    hospital_name: 'Max Super Speciality Hospital, Saket',
    location_zone: 'South Delhi Zone',
    blood_group: 'B+',
    component_type: 'PLATELETS',
    units_requested: 3,
    units_allocated: 3,
    urgency: 'URGENT',
    transport_mode: 'REFRIGERATED_VAN', // FIX: AMBULANCE_COLD -> REFRIGERATED_VAN
    target_eta_mins: 35,
    actual_eta_mins: 29,
    status: 'DISPATCHED', // FIX: IN_TRANSIT -> DISPATCHED
    safety_checks_verified: 6,
    created_at: '18 mins ago',
    source_facility: 'Lion Blood Bank, East of Kailash',
  },
  {
    id: 'REQ-2026-0894',
    hospital_id: 'hosp-apollo-sarita',
    hospital_name: 'Indraprastha Apollo Hospitals, Sarita Vihar',
    location_zone: 'South East Delhi',
    blood_group: 'AB-',
    component_type: 'FFP',
    units_requested: 2,
    units_allocated: 2,
    urgency: 'URGENT', // FIX: HIGH -> URGENT
    transport_mode: 'STANDARD_COURIER',
    target_eta_mins: 40,
    actual_eta_mins: 34,
    status: 'PLANNED', // FIX: ALLOCATING -> PLANNED
    safety_checks_verified: 6,
    created_at: '25 mins ago',
    source_facility: 'Delhi State Blood Transfusion Council',
  },
  {
    id: 'REQ-2026-0895',
    hospital_id: 'hosp-fortis-escorts',
    hospital_name: 'Fortis Escorts Heart Institute, Okhla',
    location_zone: 'South East Delhi',
    blood_group: 'O+',
    component_type: 'RBC',
    units_requested: 5,
    units_allocated: 5,
    urgency: 'CRITICAL',
    transport_mode: 'DRONE',
    target_eta_mins: 20,
    actual_eta_mins: 16,
    status: 'FULFILLED', // FIX: DELIVERED -> FULFILLED
    safety_checks_verified: 6,
    created_at: '42 mins ago',
    source_facility: 'Rotary Blood Bank, Tughlakabad',
  },
  {
    id: 'REQ-2026-0896',
    hospital_id: 'hosp-medanta-gurgaon',
    hospital_name: 'Medanta The Medicity, Gurugram',
    location_zone: 'Gurgaon NCR Zone',
    blood_group: 'B-',
    component_type: 'CRYO',
    units_requested: 2,
    units_allocated: 2,
    urgency: 'URGENT',
    transport_mode: 'REFRIGERATED_VAN', // FIX: AMBULANCE_COLD -> REFRIGERATED_VAN
    target_eta_mins: 30,
    actual_eta_mins: 27,
    status: 'DISPATCHED',
    safety_checks_verified: 6,
    created_at: '55 mins ago',
    source_facility: 'Gurgaon Red Cross Society',
  },
];


export const initialMetrics: MetricCardData[] = [
  {
    id: 'critical-requests',
    title: 'Active Emergency Demands',
    value: '14',
    change: '+8.2%',
    isPositive: true,
    subtext: 'vs previous 24h cycle',
    category: 'rose',
    sparkline: [8, 9, 12, 11, 15, 13, 14],
  },
  {
    id: 'usable-stock',
    title: 'Usable Blood Units (Net)',
    value: '1,248',
    change: '+14.5%',
    isPositive: true,
    subtext: 'Above safety reserve floor',
    category: 'lime',
    sparkline: [1100, 1150, 1180, 1210, 1230, 1220, 1248],
  },
  {
    id: 'active-agents',
    title: 'Autonomous Logistics Dispatches',
    value: '28',
    change: '100%',
    isPositive: true,
    subtext: 'Active live GPS telemetry',
    category: 'mint',
    sparkline: [18, 20, 22, 25, 24, 27, 28],
  },
  {
    id: 'network-readiness',
    title: 'NCR Grid Resilience Score',
    value: '98.4%',
    change: '+2.1%',
    isPositive: true,
    subtext: '13/13 Hubs Synchronized',
    category: 'lavender',
    sparkline: [94.0, 95.2, 96.0, 97.1, 97.8, 98.0, 98.4],
  },
];


export const initialInventorySummary: InventorySummary[] = [
  { blood_group: 'O+', component_type: 'RBC', total_available_units: 312, total_safety_reserve: 40, total_usable_units: 272, status: 'HEALTHY', facility_count: 8 },
  { blood_group: 'O-', component_type: 'RBC', total_available_units: 98, total_safety_reserve: 30, total_usable_units: 68, status: 'CRITICAL', facility_count: 6 },
  { blood_group: 'A+', component_type: 'RBC', total_available_units: 245, total_safety_reserve: 35, total_usable_units: 210, status: 'HEALTHY', facility_count: 7 },
  { blood_group: 'A-', component_type: 'RBC', total_available_units: 72, total_safety_reserve: 20, total_usable_units: 52, status: 'LOW', facility_count: 5 },
  { blood_group: 'B+', component_type: 'RBC', total_available_units: 198, total_safety_reserve: 28, total_usable_units: 170, status: 'HEALTHY', facility_count: 7 },
  { blood_group: 'B-', component_type: 'RBC', total_available_units: 54, total_safety_reserve: 18, total_usable_units: 36, status: 'LOW', facility_count: 4 },
  { blood_group: 'AB+', component_type: 'RBC', total_available_units: 86, total_safety_reserve: 15, total_usable_units: 71, status: 'HEALTHY', facility_count: 5 },
  { blood_group: 'AB-', component_type: 'RBC', total_available_units: 41, total_safety_reserve: 12, total_usable_units: 29, status: 'CRITICAL', facility_count: 3 },
];

export const initialDemandTrends: DemandDayData[] = [
  { day: 'Monday', shortDay: 'Mon', requests: 18, units: 48, isCurrent: false, routedPct: 100 },
  { day: 'Tuesday', shortDay: 'Tue', requests: 22, units: 64, isCurrent: false, routedPct: 100 },
  { day: 'Wednesday', shortDay: 'Wed', requests: 29, units: 82, isCurrent: false, routedPct: 100 },
  { day: 'Thursday', shortDay: 'Thu', requests: 24, units: 70, isCurrent: false, routedPct: 100 },
  { day: 'Friday', shortDay: 'Fri', requests: 38, units: 105, isCurrent: true, routedPct: 100 },
  { day: 'Saturday', shortDay: 'Sat', requests: 31, units: 88, isCurrent: false, routedPct: 100 },
  { day: 'Sunday', shortDay: 'Sun', requests: 16, units: 42, isCurrent: false, routedPct: 100 },
];

// Async getters
export const getMetrics = async (): Promise<MetricCardData[]> => {
  // TODO: Replace with backend endpoint when available
  return Promise.resolve([...initialMetrics]);
};

export const getInventorySummary = async (componentType: string = 'RBC'): Promise<InventorySummary[]> => {
  try {
    const data = await apiClient.get<InventorySummary[]>(`/inventory/summary?component_type=${componentType}`);
    if (Array.isArray(data) && data.length > 0) return data;
    return [...initialInventorySummary];
  } catch (error) {
    console.error('Failed to fetch inventory summary, using mock data', error);
    return [...initialInventorySummary];
  }
};

export const getDemandTrend = async (): Promise<DemandDayData[]> => {
  // TODO: Replace with backend endpoint when available
  return Promise.resolve([...initialDemandTrends]);
};

export const getEmergencyRequests = async (): Promise<EmergencyRequest[]> => {
  try {
    const data = await apiClient.get<EmergencyRequest[]>('/requests');
    if (Array.isArray(data) && data.length > 0) return data;
    return [...initialEmergencyRequests];
  } catch (error) {
    console.error('Failed to fetch emergency requests, using mock data', error);
    return [...initialEmergencyRequests];
  }
};

export const createEmergencyRequest = async (newReq: any): Promise<EmergencyRequest> => {
  try {
    const created = await apiClient.post<EmergencyRequest>('/requests', newReq);
    if (created && created.id) return created;
  } catch (error) {
    console.error('Failed to create emergency request on backend, using local fallback', error);
  }

  // Local optimistic fallback so the UI queue updates even without backend
  const hospitalNames: Record<string, { name: string; zone: string }> = {
    'hosp-aiims-delhi': { name: 'AIIMS New Delhi (Trauma Centre)', zone: 'South Delhi Zone' },
    'hosp-safdarjung-delhi': { name: 'Safdarjung Hospital Emergency Block', zone: 'South West Delhi' },
    'hosp-max-saket': { name: 'Max Super Speciality Hospital, Saket', zone: 'South Delhi Zone' },
    'hosp-apollo-sarita': { name: 'Indraprastha Apollo Hospitals', zone: 'South East Delhi' },
    'hosp-fortis-escorts': { name: 'Fortis Escorts Heart Institute', zone: 'South East Delhi' },
    'hosp-medanta-gurgaon': { name: 'Medanta The Medicity, Gurugram', zone: 'Gurgaon NCR Zone' },
  };
  const hosp = hospitalNames[newReq.hospital_id] || {
    name: newReq.hospital_id || 'Unknown Hospital',
    zone: 'NCR Zone',
  };
  const units = Number(newReq.units_requested) || 1;
  const eta = Number(newReq.max_eta_minutes) || 30;
  const transport =
    units <= 4 && eta <= 25 ? 'DRONE' : 'AMBULANCE_SIREN';

  const localReq: EmergencyRequest = {
    id: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    hospital_id: newReq.hospital_id,
    hospital_name: hosp.name,
    location_zone: hosp.zone,
    blood_group: newReq.blood_group,
    component_type: newReq.component_type,
    units_requested: units,
    units_allocated: units,
    urgency: newReq.urgency || 'CRITICAL',
    transport_mode: transport as any,
    target_eta_mins: eta,
    actual_eta_mins: Math.max(8, Math.floor(eta * 0.7)),
    status: 'DISPATCHED',
    safety_checks_verified: 6,
    created_at: 'Just now',
    source_facility: 'Rotary Blood Bank, Tughlakabad',
  };
  return localReq;
};

export const fetchHospitals = async () => {
  try {
    return await apiClient.get('/facilities/hospitals');
  } catch (e) {
    // Fallback gracefully
  }
  return null;
};
