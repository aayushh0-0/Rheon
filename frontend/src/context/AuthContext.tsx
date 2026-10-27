import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, AuthUser, PatientEmergencyRequest } from '../types/auth';
import { PatientAppointment } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (role: UserRole, email?: string) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  patientRequests: PatientEmergencyRequest[];
  addPatientRequest: (req: PatientEmergencyRequest) => void;
  updatePatientRequest: (id: string, patch: Partial<PatientEmergencyRequest>) => void;
  getPatientRequestById: (id: string) => PatientEmergencyRequest | undefined;
  appointments: PatientAppointment[];
  addAppointment: (appt: PatientAppointment) => void;
  updateAppointmentStatus: (id: string, status: PatientAppointment['status']) => void;
  updateAppointment: (id: string, patch: Partial<PatientAppointment>) => void;
  /** Count of non-cancelled bookings for doctor|date|time */
  slotOccupancy: (doctorId: string, date: string, time: string) => number;
  /** Keys for fully booked normal slots (1+ non-emergency) or emergency at capacity 3 */
  bookedSlotKeys: Set<string>;
  emergencySlotCount: (doctorId: string, date: string, time: string) => number;
}

const STORAGE_KEY = 'rheon_demo_session';
const PATIENT_REQUESTS_KEY = 'rheon_patient_requests';
const APPOINTMENTS_KEY = 'rheon_appointments';

const ROLE_PROFILES: Record<UserRole, { name: string; email: string; title: string; avatarText: string }> = {
  patient: { name: 'Priya Sharma', email: 'priya.sharma@patientcare.in', title: 'Emergency Care Requester', avatarText: 'PS' },
  admin: { name: 'Dr. Ayush Rawat', email: 'ayush.rawat@rheon.ai', title: 'Chief Medical Officer', avatarText: 'AR' },
  verifier: { name: 'Dr. Sunita Rao', email: 'sunita.rao@delhi-transfusion.gov.in', title: 'Senior Immunohematology Verifier', avatarText: 'SR' },
};

const INITIAL_SAMPLE_PATIENT_REQUEST: PatientEmergencyRequest = {
  id: 'REQ-2026-0891',
  hospital_id: 'hosp-aiims-delhi',
  hospital_name: 'AIIMS New Delhi (Trauma Centre)',
  patient_name: 'Aarav Sharma',
  attendant_phone: '+91 98710 43210',
  blood_group: 'O-',
  component_type: 'RBC',
  units_requested: 2,
  urgency: 'CRITICAL',
  max_eta_minutes: 25,
  clinical_notes: 'Urgent stabilization for emergency surgical intervention.',
  status: 'DISPATCHED',
  created_at: '12 mins ago',
  source_facility: 'Rotary Blood Bank, Tughlakabad',
  actual_eta_mins: 15,
  transport_mode: 'DRONE',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.role === 'patient' || parsed.role === 'admin' || parsed.role === 'verifier')) return parsed;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [patientRequests, setPatientRequests] = useState<PatientEmergencyRequest[]>(() => {
    try {
      const stored = localStorage.getItem(PATIENT_REQUESTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [INITIAL_SAMPLE_PATIENT_REQUEST];
  });

const [appointments, setAppointments] = useState<PatientAppointment[]>(() => {
    try {
      const stored = localStorage.getItem(APPOINTMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    // Seed demo cards across statuses so filters always have content on first load
    const seed: PatientAppointment[] = [
      {
        id: 'APT-SEED-01',
        patient_name: 'Priya Sharma',
        patient_email: 'priya.sharma@patientcare.in',
        patient_age_group: '18-40',
        hospital_id: 'noid-jaypee',
        hospital_name: 'Jaypee Hospital',
        hospital_city: 'Noida',
        hospital_map_url: 'https://www.google.com/maps/search/?api=1&query=Jaypee+Hospital+Noida',
        doctor_id: 'noid-jaypee-doc-1',
        doctor_name: 'Dr. Sanjay Batra',
        doctor_specialty: 'Cardiology',
        purpose: 'consultation',
        purpose_label: 'Specialist Consultation',
        problem_description: 'Follow-up chest discomfort',
        date: '2026-11-05',
        time: '10:00',
        status: 'BOOKED',
        criticality: 'PRIORITY',
        is_emergency_slot: false,
        agent_note: 'Seed demo — booked upcoming visit.',
        created_at: '26/10/2026, 4:00:00 pm',
        total_bill_inr: 1800,
      },
      {
        id: 'APT-SEED-02',
        patient_name: 'Priya Sharma',
        patient_email: 'priya.sharma@patientcare.in',
        patient_age_group: '18-40',
        hospital_id: 'del-aiims',
        hospital_name: 'AIIMS Delhi',
        hospital_city: 'Delhi',
        hospital_map_url: 'https://www.google.com/maps/search/?api=1&query=AIIMS+Delhi',
        doctor_id: 'del-aiims-doc-1',
        doctor_name: 'Dr. Ramesh Chandra',
        doctor_specialty: 'Neurosciences',
        purpose: 'follow_up',
        purpose_label: 'Follow-up Visit',
        problem_description: 'Post-consult review',
        date: '2026-10-20',
        time: '11:30',
        status: 'COMPLETED',
        criticality: 'ROUTINE',
        is_emergency_slot: false,
        agent_note: 'Seed demo — completed with Rx + reappointment.',
        created_at: '18/10/2026, 9:00:00 am',
        total_bill_inr: 2500,
        prescription: {
          medicines: [
            { name: 'Aspirin 75mg', dosage: '1 tab daily', duration: '30 days' },
            { name: 'Atorvastatin 10mg', dosage: '1 tab night', duration: '30 days' },
          ],
          advice: 'Low-salt diet. Report dizziness immediately.',
          issued_at: '20/10/2026, 12:00:00 pm',
          doctor_name: 'Dr. Ramesh Chandra',
        },
        reappointment_date: '2026-11-20',
        reappointment_time: '10:30',
        reappointment_note: 'Cardiology follow-up after labs',
      },
      {
        id: 'APT-SEED-03',
        patient_name: 'Priya Sharma',
        patient_email: 'priya.sharma@patientcare.in',
        patient_age_group: '18-40',
        hospital_id: 'noid-cloudnine',
        hospital_name: 'Cloudnine Hospital',
        hospital_city: 'Noida',
        hospital_map_url: 'https://www.google.com/maps/search/?api=1&query=Cloudnine+Hospital+Noida',
        doctor_id: 'noid-cloudnine-doc-1',
        doctor_name: 'Dr. Swati Deshmukh',
        doctor_specialty: 'Obstetrics',
        purpose: 'consultation',
        purpose_label: 'Specialist Consultation',
        problem_description: 'Routine checkup',
        date: '2026-10-15',
        time: '09:00',
        status: 'CANCELLED',
        criticality: 'ROUTINE',
        is_emergency_slot: false,
        agent_note: 'Seed demo — cancelled by patient.',
        created_at: '12/10/2026, 2:00:00 pm',
        total_bill_inr: 0,
      },
      {
        id: 'APT-SEED-04',
        patient_name: 'Priya Sharma',
        patient_email: 'priya.sharma@patientcare.in',
        patient_age_group: '18-40',
        hospital_id: 'ggn-medanta',
        hospital_name: 'Medanta – The Medicity',
        hospital_city: 'Gurugram',
        hospital_map_url: 'https://www.google.com/maps/search/?api=1&query=Medanta+The+Medicity+Gurugram',
        doctor_id: 'ggn-medanta-doc-1',
        doctor_name: 'Dr. Naresh Trehan',
        doctor_specialty: 'Cardiac Surgery',
        purpose: 'diagnostics',
        purpose_label: 'Diagnostics / Imaging',
        problem_description: 'ECG + Echo package',
        date: '2026-11-02',
        time: '14:00',
        status: 'CONFIRMED',
        criticality: 'PRIORITY',
        is_emergency_slot: false,
        agent_note: 'Seed demo — confirmed by medical officer.',
        created_at: '25/10/2026, 11:00:00 am',
        total_bill_inr: 4200,
        reappointment_date: '2026-11-12',
        reappointment_time: '15:00',
        reappointment_note: 'Review imaging results',
      },
      {
        id: 'APT-SEED-05',
        patient_name: 'Priya Sharma',
        patient_email: 'priya.sharma@patientcare.in',
        patient_age_group: '18-40',
        hospital_id: 'noid-icare',
        hospital_name: 'ICARE Eye Hospital',
        hospital_city: 'Noida',
        hospital_map_url: 'https://www.google.com/maps/search/?api=1&query=ICARE+Eye+Hospital+Noida',
        doctor_id: 'noid-icare-doc-1',
        doctor_name: 'Dr. Vikram Luthra',
        doctor_specialty: 'Ophthalmology',
        purpose: 'consultation',
        purpose_label: 'Specialist Consultation',
        problem_description: 'Vision blur',
        date: '2026-10-28',
        time: '16:00',
        status: 'COMPLETED',
        criticality: 'ROUTINE',
        is_emergency_slot: false,
        agent_note: 'Seed demo — completed eye consult with Rx.',
        created_at: '27/10/2026, 5:00:00 pm',
        total_bill_inr: 1500,
        prescription: {
          medicines: [{ name: 'Lubricant eye drops', dosage: '2 drops 4x/day', duration: '14 days' }],
          advice: 'Reduce screen time. Review in 2 weeks.',
          issued_at: '28/10/2026, 4:30:00 pm',
          doctor_name: 'Dr. Vikram Luthra',
        },
        reappointment_date: '2026-11-11',
        reappointment_time: '16:30',
        reappointment_note: 'Vision recheck',
      },
    ];
    const ids = new Set(existing.map((a) => a.id));
    const missing = seed.filter((s) => !ids.has(s.id));
    return [...existing, ...missing];
  });

  useEffect(() => {
    try { localStorage.setItem(PATIENT_REQUESTS_KEY, JSON.stringify(patientRequests)); } catch { /* ignore */ }
  }, [patientRequests]);

  useEffect(() => {
    try { localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments)); } catch { /* ignore */ }
  }, [appointments]);

  const login = useCallback((role: UserRole, email?: string) => {
    const profile = ROLE_PROFILES[role];
    const newUser: AuthUser = {
      role,
      name: profile.name,
      email: email && email.trim() ? email.trim() : profile.email,
      title: profile.title,
      avatarText: profile.avatarText,
    };
    setUser(newUser);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser)); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const switchRole = useCallback((newRole: UserRole) => { login(newRole); }, [login]);
  const addPatientRequest = useCallback((req: PatientEmergencyRequest) => {
    setPatientRequests((prev) => [req, ...prev]);
  }, []);
  const updatePatientRequest = useCallback((id: string, patch: Partial<PatientEmergencyRequest>) => {
    setPatientRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);
  const getPatientRequestById = useCallback((id: string) => patientRequests.find((r) => r.id === id), [patientRequests]);
  const addAppointment = useCallback((appt: PatientAppointment) => {
    setAppointments((prev) => [appt, ...prev]);
  }, []);
  const updateAppointmentStatus = useCallback((id: string, status: PatientAppointment['status']) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);
  const updateAppointment = useCallback((id: string, patch: Partial<PatientAppointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const slotOccupancy = useCallback((doctorId: string, date: string, time: string) => {
    return appointments.filter(
      (a) => a.doctor_id === doctorId && a.date === date && a.time === time && a.status !== 'CANCELLED'
    ).length;
  }, [appointments]);

  const emergencySlotCount = useCallback((doctorId: string, date: string, time: string) => {
    return appointments.filter(
      (a) =>
        a.doctor_id === doctorId &&
        a.date === date &&
        a.time === time &&
        a.status !== 'CANCELLED' &&
        a.is_emergency_slot
    ).length;
  }, [appointments]);

  // Normal patient booking: block if any non-cancelled occupies the slot (1 regular OR emergency still allows up to 3 emergency via admin)
  // For patient UI: treat slot as booked (red) if occupancy >= 1 for regular flow
  const bookedSlotKeys = useMemo(() => {
    const keys = new Set<string>();
    const counts = new Map<string, number>();
    for (const a of appointments) {
      if (a.status === 'CANCELLED') continue;
      const k = `${a.doctor_id}|${a.date}|${a.time}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    counts.forEach((n, k) => {
      if (n >= 1) keys.add(k);
    });
    return keys;
  }, [appointments]);

  return (
    <AuthContext.Provider
      value={{
        user, role: user?.role ?? null, isAuthenticated: !!user,
        login, logout, switchRole, patientRequests, addPatientRequest, updatePatientRequest, getPatientRequestById,
        appointments, addAppointment, updateAppointmentStatus, updateAppointment,
        slotOccupancy, bookedSlotKeys, emergencySlotCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
