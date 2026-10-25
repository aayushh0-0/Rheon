import { apiClient } from './apiClient';

export interface Donor {
  id: string;
  anonymous_id: string;
  name: string;
  blood_group: string;
  location: string;
  latitude: number;
  longitude: number;
  availability_status: 'AVAILABLE_IMMEDIATE' | 'STANDBY_ON_CALL' | 'BUSY';
  last_donated_date?: string;
  contact_token: string;
  created_at: string;
  updated_at: string;
}

export interface DonorCreatePayload {
  anonymous_id: string;
  name: string;
  blood_group: string;
  location: string;
  latitude: number;
  longitude: number;
  availability_status: 'AVAILABLE_IMMEDIATE' | 'STANDBY_ON_CALL' | 'BUSY';
  contact_token: string;
}

export interface MatchingCandidate {
  source_facility_id: string;
  source_facility_type: string;
  source_name: string;
  donor_blood_group: string;
  is_compatible: boolean;
  is_exact_match: boolean;
  is_universal_donor: boolean;
  total_units: number;
  available_units: number;
  safety_reserve_units: number;
  usable_units: number;
  units_available_for_request: number;
  distance_km: number;
  estimated_minutes: number;
  traffic_factor: number;
  is_operational: boolean;
  is_hub: boolean;
  composite_score: number;
  is_feasible: boolean;
  rejection_reasons: string[];
}

export interface MatchingResponse {
  request_blood_group: string;
  component_type: string;
  units_requested: number;
  urgency: string;
  max_eta_minutes: number;
  compatible_donor_groups: string[];
  candidates: MatchingCandidate[];
  total_network_usable_units: number;
  feasible_candidates_count: number;
  sufficient_inventory_available: boolean;
}

export const donorApi = {
  listDonors: async (bloodGroup?: string, status?: string): Promise<Donor[]> => {
    try {
      let query = '/donors';
      const params = new URLSearchParams();
      if (bloodGroup) params.append('blood_group', bloodGroup);
      if (status) params.append('availability_status', status);
      if (params.toString()) query += `?${params.toString()}`;

      const res = await apiClient.get<Donor[]>(query);
      if (Array.isArray(res) && res.length > 0) return res;
    } catch (e) {
      console.warn('Failed to fetch donors from API, using fallback', e);
    }
    return getLocalDonors();
  },

  registerDonor: async (payload: DonorCreatePayload): Promise<Donor> => {
    try {
      const res = await apiClient.post<Donor>('/donors', payload);
      saveLocalDonor(res);
      return res;
    } catch (e) {
      console.warn('Failed to register donor on backend, using local fallback', e);
      return simulateLocalDonorRegister(payload);
    }
  },

  updateDonorStatus: async (donorId: string, status: string): Promise<Donor> => {
    try {
      const res = await apiClient.patch<Donor>(`/donors/${donorId}/status`, { availability_status: status });
      return res;
    } catch (e) {
      console.warn('Failed to update donor status on backend, using local fallback', e);
      return updateLocalDonorStatus(donorId, status);
    }
  },

  evaluateMatching: async (payload: {
    hospital_id?: string;
    blood_group: string;
    component_type: string;
    units_requested: number;
    urgency: string;
    max_eta_minutes: number;
  }): Promise<MatchingResponse> => {
    try {
      const res = await apiClient.post<MatchingResponse>('/matching/evaluate', payload);
      return res;
    } catch (e) {
      console.warn('Failed to evaluate matching on backend, using simulation fallback', e);
      return simulateMatchingFallback(payload);
    }
  },
};

// Fallback Local Storage & Mock Data for Donors
const LOCAL_DONORS_KEY = 'rheon_ai_synthetic_donors_v1';

export const getLocalDonors = (): Donor[] => {
  try {
    const raw = localStorage.getItem(LOCAL_DONORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const defaults: Donor[] = [
    {
      id: 'don-001',
      anonymous_id: 'ANON-DELHI-001',
      name: 'Rohan Verma (Standby)',
      blood_group: 'O-',
      location: 'Connaught Place, New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      availability_status: 'AVAILABLE_IMMEDIATE',
      contact_token: 'token-sec-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'don-002',
      anonymous_id: 'ANON-DELHI-002',
      name: 'Sneha Gupta (Standby)',
      blood_group: 'A+',
      location: 'AIIMS Trauma Center Zone, New Delhi',
      latitude: 28.5672,
      longitude: 77.2100,
      availability_status: 'AVAILABLE_IMMEDIATE',
      contact_token: 'token-sec-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'don-003',
      anonymous_id: 'ANON-DELHI-003',
      name: 'Vikram Malhotra',
      blood_group: 'B+',
      location: 'Saket Medical District, South Delhi',
      latitude: 28.5244,
      longitude: 77.2066,
      availability_status: 'STANDBY_ON_CALL',
      contact_token: 'token-sec-003',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'don-004',
      anonymous_id: 'ANON-DELHI-004',
      name: 'Pooja Nair',
      blood_group: 'AB-',
      location: 'Sarita Vihar, South-East Delhi',
      latitude: 28.5355,
      longitude: 77.2840,
      availability_status: 'AVAILABLE_IMMEDIATE',
      contact_token: 'token-sec-004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  saveAllLocalDonors(defaults);
  return defaults;
};

const saveAllLocalDonors = (donors: Donor[]) => {
  try {
    localStorage.setItem(LOCAL_DONORS_KEY, JSON.stringify(donors));
  } catch (e) {}
};

const saveLocalDonor = (donor: Donor) => {
  const all = getLocalDonors().filter(d => d.id !== donor.id && d.anonymous_id !== donor.anonymous_id);
  all.unshift(donor);
  saveAllLocalDonors(all);
};

const simulateLocalDonorRegister = (payload: DonorCreatePayload): Donor => {
  const newDonor: Donor = {
    id: `don-${Date.now()}`,
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocalDonor(newDonor);
  return newDonor;
};

const updateLocalDonorStatus = (donorId: string, status: string): Donor => {
  const all = getLocalDonors();
  let updated = all[0];
  for (const d of all) {
    if (d.id === donorId || d.anonymous_id === donorId) {
      d.availability_status = status as any;
      d.updated_at = new Date().toISOString();
      updated = d;
    }
  }
  saveAllLocalDonors(all);
  return updated;
};

const simulateMatchingFallback = (payload: any): MatchingResponse => {
  return {
    request_blood_group: payload.blood_group,
    component_type: payload.component_type || 'RBC',
    units_requested: payload.units_requested || 2,
    urgency: payload.urgency || 'CRITICAL',
    max_eta_minutes: payload.max_eta_minutes || 30,
    compatible_donor_groups: [payload.blood_group, 'O-'],
    feasible_candidates_count: 3,
    total_network_usable_units: 42,
    sufficient_inventory_available: true,
    candidates: [
      {
        source_facility_id: 'hosp-aiims-delhi',
        source_facility_type: 'HOSPITAL',
        source_name: 'AIIMS New Delhi Apex Trauma Center',
        donor_blood_group: payload.blood_group,
        is_compatible: true,
        is_exact_match: true,
        is_universal_donor: false,
        total_units: 25,
        available_units: 20,
        safety_reserve_units: 5,
        usable_units: 15,
        units_available_for_request: Math.min(15, payload.units_requested),
        distance_km: 3.2,
        estimated_minutes: 11,
        traffic_factor: 1.0,
        is_operational: true,
        is_hub: true,
        composite_score: 0.9450,
        is_feasible: true,
        rejection_reasons: [],
      },
      {
        source_facility_id: 'bank-rotary-tughlakabad',
        source_facility_type: 'BLOOD_BANK',
        source_name: 'Rotary Blood Bank, Tughlakabad',
        donor_blood_group: 'O-',
        is_compatible: true,
        is_exact_match: false,
        is_universal_donor: true,
        total_units: 50,
        available_units: 45,
        safety_reserve_units: 10,
        usable_units: 35,
        units_available_for_request: Math.min(35, payload.units_requested),
        distance_km: 8.5,
        estimated_minutes: 18,
        traffic_factor: 1.0,
        is_operational: true,
        is_hub: true,
        composite_score: 0.8920,
        is_feasible: true,
        rejection_reasons: [],
      },
      {
        source_facility_id: 'hosp-max-saket',
        source_facility_type: 'HOSPITAL',
        source_name: 'Max Super Speciality Hospital, Saket',
        donor_blood_group: payload.blood_group,
        is_compatible: true,
        is_exact_match: true,
        is_universal_donor: false,
        total_units: 18,
        available_units: 14,
        safety_reserve_units: 3,
        usable_units: 11,
        units_available_for_request: Math.min(11, payload.units_requested),
        distance_km: 5.1,
        estimated_minutes: 14,
        traffic_factor: 1.0,
        is_operational: true,
        is_hub: false,
        composite_score: 0.8710,
        is_feasible: true,
        rejection_reasons: [],
      },
    ],
  };
};
