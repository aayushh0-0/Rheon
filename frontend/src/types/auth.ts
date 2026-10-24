export type UserRole = 'patient' | 'admin' | 'verifier';

export interface AuthUser {
  role: UserRole;
  email: string;
  name: string;
  title: string;
  avatarText: string;
}

export interface PatientEmergencyRequest {
  id: string;
  hospital_id: string;
  hospital_name: string;
  patient_name?: string;
  attendant_phone?: string;
  blood_group: string;
  component_type: string;
  units_requested: number;
  urgency: string;
  max_eta_minutes: number;
  clinical_notes?: string;
  status: string;
  created_at: string;
  source_facility?: string;
  actual_eta_mins?: number;
  transport_mode?: string;
}
