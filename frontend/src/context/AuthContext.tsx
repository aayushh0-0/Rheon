import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, AuthUser, PatientEmergencyRequest } from '../types/auth';
import { PatientAppointment } from '../types/appointments';

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
  bookedSlotKeys: Set<string>;
}

const STORAGE_KEY = 'rheon_demo_session';
const PATIENT_REQUESTS_KEY = 'rheon_patient_requests';
const APPOINTMENTS_KEY = 'rheon_patient_appointments_v1';

const ROLE_PROFILES: Record<UserRole, { name: string; email: string; title: string; avatarText: string }> = {
  patient: {
    name: 'Priya Sharma',
    email: 'priya.sharma@patientcare.in',
    title: 'Emergency Care Requester',
    avatarText: 'PS',
  },
  admin: {
    name: 'Dr. Ayush Rawat',
    email: 'ayush.rawat@rheon.ai',
    title: 'Chief Medical Officer',
    avatarText: 'AR',
  },
  verifier: {
    name: 'Dr. Sunita Rao',
    email: 'sunita.rao@delhi-transfusion.gov.in',
    title: 'Senior Immunohematology Verifier',
    avatarText: 'SR',
  },
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
        if (parsed && (parsed.role === 'patient' || parsed.role === 'admin' || parsed.role === 'verifier')) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [patientRequests, setPatientRequests] = useState<PatientEmergencyRequest[]>(() => {
    try {
      const stored = localStorage.getItem(PATIENT_REQUESTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // Initialize with one demo request associated with this demo patient session
    return [INITIAL_SAMPLE_PATIENT_REQUEST];
  });

  useEffect(() => {
    try {
      localStorage.setItem(PATIENT_REQUESTS_KEY, JSON.stringify(patientRequests));
    } catch {
      // Ignore storage errors
    }
  }, [patientRequests]);

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    login(newRole);
  }, [login]);

  const [appointments, setAppointments] = useState<PatientAppointment[]>(() => {
    try {
      const raw = localStorage.getItem(APPOINTMENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    } catch { /* ignore */ }
  }, [appointments]);

  const addPatientRequest = useCallback((req: PatientEmergencyRequest) => {
    setPatientRequests((prev) => [req, ...prev]);
  }, []);

  const updatePatientRequest = useCallback((id: string, patch: Partial<PatientEmergencyRequest>) => {
    setPatientRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const getPatientRequestById = useCallback((id: string) => {
    return patientRequests.find((r) => r.id === id);
  }, [patientRequests]);

  const addAppointment = useCallback((appt: PatientAppointment) => {
    setAppointments((prev) => [appt, ...prev]);
  }, []);

  const bookedSlotKeys = useMemo(() => {
    const s = new Set<string>();
    for (const a of appointments) {
      if (a.status === 'CANCELLED') continue;
      s.add(`${a.hospital_id}|${a.doctor_id}|${a.date}|${a.time}`);
    }
    return s;
  }, [appointments]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        patientRequests,
        addPatientRequest,
        updatePatientRequest,
        getPatientRequestById,
        appointments,
        addAppointment,
        bookedSlotKeys,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
