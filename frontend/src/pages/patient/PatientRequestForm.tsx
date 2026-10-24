import React, { useState } from 'react';
import {
  PlusCircle,
  ShieldCheck,
  Building2,
  Droplets,
  Clock,
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight,
} from 'lucide-react';
import { BloodGroup, ComponentType, UrgencyLevel, BloodRequestCreate } from '../../types';
import { createEmergencyRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PatientEmergencyRequest } from '../../types/auth';

interface PatientRequestFormProps {
  onSuccess: (requestId: string) => void;
  onCancel: () => void;
}

export const PatientRequestForm: React.FC<PatientRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { addPatientRequest } = useAuth();

  const [hospitalId, setHospitalId] = useState<string>('hosp-aiims-delhi');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [componentType, setComponentType] = useState<ComponentType>('RBC');
  const [units, setUnits] = useState<number>(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [maxEta, setMaxEta] = useState<number>(30);
  const [patientName, setPatientName] = useState<string>('Aarav Sharma');
  const [attendantPhone, setAttendantPhone] = useState<string>('+91 98710 43210');
  const [clinicalNotes, setClinicalNotes] = useState<string>('Emergency stabilization, Trauma Level 1 ICU');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<PatientEmergencyRequest | null>(null);

  const hospitalsList = [
    { id: 'hosp-aiims-delhi', name: 'AIIMS New Delhi (Apex Trauma Centre)', zone: 'South Delhi' },
    { id: 'hosp-safdarjung-delhi', name: 'Safdarjung Hospital Emergency Block', zone: 'South West Delhi' },
    { id: 'hosp-max-saket', name: 'Max Super Speciality Hospital, Saket', zone: 'South Delhi' },
    { id: 'hosp-apollo-sarita', name: 'Indraprastha Apollo Hospitals, Sarita Vihar', zone: 'South East Delhi' },
    { id: 'hosp-fortis-escorts', name: 'Fortis Escorts Heart Institute, Okhla', zone: 'South East Delhi' },
    { id: 'hosp-medanta-gurgaon', name: 'Medanta The Medicity, Gurugram', zone: 'Gurgaon NCR' },
  ];

  const componentDescriptions: Record<ComponentType, string> = {
    RBC: 'Red Blood Cells — Oxygen carrying capacity for trauma, surgery, or severe anemia',
    PRBC: 'Packed Red Blood Cells — Concentrated RBCs for acute blood loss',
    PLATELETS: 'Platelets — For clotting disorders, dengue hemorrhage, and active bleeding',
    FFP: 'Fresh Frozen Plasma — Fluid and clotting factors for massive transfusions',
    CRYO: 'Cryoprecipitate — Concentrated fibrinogen for specific coagulation deficiencies',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload: BloodRequestCreate = {
      hospital_id: hospitalId,
      blood_group: bloodGroup,
      component_type: componentType,
      units_requested: units,
      urgency: urgency,
      max_eta_minutes: maxEta,
      clinical_notes: `Patient: ${patientName} | Contact: ${attendantPhone} | ${clinicalNotes}`,
      status: 'PENDING',
    };

    try {
      const created = await createEmergencyRequest(payload);

      const targetHosp = hospitalsList.find((h) => h.id === hospitalId);
      const patientReq: PatientEmergencyRequest = {
        id: created.id,
        hospital_id: hospitalId,
        hospital_name: targetHosp ? targetHosp.name : created.hospital_name || hospitalId,
        patient_name: patientName,
        attendant_phone: attendantPhone,
        blood_group: bloodGroup,
        component_type: componentType,
        units_requested: units,
        urgency: urgency,
        max_eta_minutes: maxEta,
        clinical_notes: clinicalNotes,
        status: created.status || 'DISPATCHED',
        created_at: 'Just now',
        source_facility: created.source_facility || 'Rotary Blood Bank, Tughlakabad',
        actual_eta_mins: created.actual_eta_mins || Math.floor(maxEta * 0.7),
        transport_mode: created.transport_mode || (units <= 4 && maxEta <= 25 ? 'DRONE' : 'AMBULANCE_SIREN'),
      };

      addPatientRequest(patientReq);
      setCreatedResult(patientReq);
    } catch (err: any) {
      console.error('Failed to submit patient request:', err);
      setError('Unable to log emergency request with network coordinator. Please try again or notify the hospital desk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdResult) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-shell-border shadow-card max-w-2xl mx-auto animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-pastel-mint-bg text-emerald-800 flex items-center justify-center mx-auto mb-4 border border-pastel-mint-border">
          <CheckCircle2 className="w-8 h-8 text-emerald-700" />
        </div>

        <div className="text-center">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Emergency Request Confirmed
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-primary mt-1">
            Request {createdResult.id} Created
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Logged into RHEON NCR emergency coordinator with status <strong className="text-teal-brand">{createdResult.status}</strong>.
          </p>
        </div>

        {/* Confirmation Details Card */}
        <div className="mt-6 p-4 rounded-2xl bg-shell-bg border border-shell-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-shell-border text-xs">
            <span className="text-ink-secondary">Receiving Hospital</span>
            <span className="font-bold text-ink-primary text-right">{createdResult.hospital_name}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-shell-border text-xs">
            <span className="text-ink-secondary">Blood Component</span>
            <span className="font-bold text-ink-primary font-mono">
              {createdResult.units_requested} Units • {createdResult.blood_group} ({createdResult.component_type})
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-shell-border text-xs">
            <span className="text-ink-secondary">Estimated Arrival</span>
            <span className="font-bold text-teal-brand font-mono">
              ~{createdResult.actual_eta_mins || createdResult.max_eta_minutes} Minutes
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-secondary">Allocated Source</span>
            <span className="font-bold text-ink-primary">{createdResult.source_facility}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onSuccess(createdResult.id)}
            className="w-full sm:w-auto px-6 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill flex items-center justify-center gap-2 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Track Delivery Live</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-shell-card-subtle border border-shell-border text-ink-primary rounded-xl text-xs sm:text-sm font-semibold transition-all"
          >
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-shell-border shadow-card max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="pb-5 border-b border-shell-border">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-teal-brand" />
          <h2 className="text-lg sm:text-xl font-bold text-ink-primary">
            Submit Emergency Blood Request
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Directly coordinates with registered Delhi NCR blood banks and hospital trauma centers.
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-pastel-rose-bg border border-pastel-rose-border rounded-xl text-xs text-crimson font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Destination Hospital Selection */}
        <div>
          <label className="block text-xs font-bold text-ink-primary mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-brand" />
            Receiving Hospital / Trauma Center
          </label>
          <select
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
          >
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — ({h.zone})
              </option>
            ))}
          </select>
        </div>

        {/* Patient & Attendant Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5">
              Patient Full Name
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              required
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5">
              Attendant / Doctor Phone Number
            </label>
            <input
              type="tel"
              value={attendantPhone}
              onChange={(e) => setAttendantPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
            />
          </div>
        </div>

        {/* Blood Group Selection Grid */}
        <div>
          <label className="block text-xs font-bold text-ink-primary mb-2 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-crimson" />
            Required Blood Group
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => {
              const isSelected = bloodGroup === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bg)}
                  className={`py-2.5 rounded-xl font-mono font-bold text-xs sm:text-sm transition-all ${
                    isSelected
                      ? 'bg-teal-brand text-white shadow-pill ring-2 ring-teal-brand/30'
                      : 'bg-shell-bg text-ink-primary hover:bg-shell-card-subtle border border-shell-border'
                  }`}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Component Type & Units */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5">
              Blood Component Type
            </label>
            <select
              value={componentType}
              onChange={(e) => setComponentType(e.target.value as ComponentType)}
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all font-mono"
            >
              <option value="RBC">RBC — Red Blood Cells</option>
              <option value="PRBC">PRBC — Packed Red Blood Cells</option>
              <option value="PLATELETS">PLATELETS — Random / Single Donor</option>
              <option value="FFP">FFP — Fresh Frozen Plasma</option>
              <option value="CRYO">CRYO — Cryoprecipitate</option>
            </select>
            <p className="text-[11px] text-ink-secondary mt-1">
              {componentDescriptions[componentType]}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5">
              Number of Units Needed
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={10}
                value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                className="w-24 px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary font-bold focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
              />
              <span className="text-xs text-ink-secondary">
                Units (1 unit ≈ 350-450 mL)
              </span>
            </div>
          </div>
        </div>

        {/* Urgency & Required Within */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-brand" />
              Clinical Urgency Level
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
            >
              <option value="CRITICAL">Critical — Immediate surgical need (&lt; 30 min)</option>
              <option value="URGENT">Urgent — Required within 1-2 hours</option>
              <option value="ROUTINE">Routine — Scheduled replacement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-primary mb-1.5">
              Maximum Acceptable Arrival Time
            </label>
            <select
              value={maxEta}
              onChange={(e) => setMaxEta(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
            >
              <option value={15}>Within 15 minutes (Drone High-Priority)</option>
              <option value={30}>Within 30 minutes (Standard Emergency)</option>
              <option value={45}>Within 45 minutes</option>
              <option value={60}>Within 60 minutes (1 Hour)</option>
              <option value={120}>Within 120 minutes (2 Hours)</option>
            </select>
          </div>
        </div>

        {/* Clinical / Hospital Notes */}
        <div>
          <label className="block text-xs font-bold text-ink-primary mb-1.5">
            Clinical Notes / Ward & Bed Number
          </label>
          <textarea
            rows={2}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="e.g. ICU Bed 4B, Emergency OT, severe surgical blood loss"
            className="w-full px-4 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
          />
        </div>

        {/* 6-Point Gate Safe Verification Notice */}
        <div className="p-3.5 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-brand shrink-0 mt-0.5" />
          <p className="text-[11px] text-pastel-mint-text leading-relaxed">
            <strong>Deterministic Safety Protection:</strong> Submitting this request initiates automated ABO/Rh compatibility matching and verifies cold-chain temperature telemetry before hospital dispatch.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-shell-border hover:bg-shell-card-subtle text-ink-primary rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill flex items-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Emergency Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
