export type AgeGroup = '0-12' | '13-17' | '18-40' | '41-60' | '60+';
export type AppointmentCriticality = 'ROUTINE' | 'PRIORITY' | 'CRITICAL';
export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface PrescriptionMed {
  name: string;
  dosage: string;
  duration: string;
}

export interface PatientAppointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_age_group: AgeGroup;
  patient_photo?: string;
  hospital_id: string;
  hospital_name: string;
  hospital_city: string;
  hospital_map_url: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  purpose: string;
  purpose_label: string;
  problem_description: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  criticality: AppointmentCriticality;
  is_emergency_slot: boolean;
  agent_note?: string;
  created_at: string;
  total_bill_inr: number;
  prescription?: {
    medicines: PrescriptionMed[];
    advice: string;
    issued_at: string;
    doctor_name: string;
  };
  reappointment_date?: string;
  reappointment_time?: string;
  reappointment_note?: string;
}
