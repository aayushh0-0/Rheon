import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  LocateFixed,
  MapPin,
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

  /** Demonstration hospital nodes with approx. coords + verified unit counts (frontend demo). */
  const hospitalsList = [
    { id: 'hosp-aiims-delhi', name: 'AIIMS New Delhi (Apex Trauma Centre)', zone: 'South Delhi', lat: 28.5672, lng: 77.2100, verified: { 'O-': 6, 'O+': 12, 'A+': 8, 'A-': 3, 'B+': 5, 'B-': 2, 'AB+': 2, 'AB-': 1 } as Record<string, number> },
    { id: 'hosp-safdarjung-delhi', name: 'Safdarjung Hospital Emergency Block', zone: 'South West Delhi', lat: 28.5679, lng: 77.2080, verified: { 'O-': 4, 'O+': 10, 'A+': 6, 'A-': 2, 'B+': 4, 'B-': 1, 'AB+': 1, 'AB-': 1 } as Record<string, number> },
    { id: 'hosp-max-saket', name: 'Max Super Speciality Hospital, Saket', zone: 'South Delhi', lat: 28.5273, lng: 77.2111, verified: { 'O-': 3, 'O+': 8, 'A+': 5, 'A-': 1, 'B+': 3, 'B-': 1, 'AB+': 1, 'AB-': 0 } as Record<string, number> },
    { id: 'hosp-apollo-sarita', name: 'Indraprastha Apollo Hospitals, Sarita Vihar', zone: 'South East Delhi', lat: 28.5314, lng: 77.2896, verified: { 'O-': 5, 'O+': 9, 'A+': 4, 'A-': 2, 'B+': 4, 'B-': 2, 'AB+': 2, 'AB-': 1 } as Record<string, number> },
    { id: 'hosp-fortis-escorts', name: 'Fortis Escorts Heart Institute, Okhla', zone: 'South East Delhi', lat: 28.5616, lng: 77.2732, verified: { 'O-': 2, 'O+': 7, 'A+': 5, 'A-': 1, 'B+': 3, 'B-': 1, 'AB+': 1, 'AB-': 0 } as Record<string, number> },
    { id: 'hosp-medanta-gurgaon', name: 'Medanta The Medicity, Gurugram', zone: 'Gurgaon NCR', lat: 28.4395, lng: 77.0405, verified: { 'O-': 4, 'O+': 6, 'A+': 4, 'A-': 1, 'B+': 2, 'B-': 1, 'AB+': 1, 'AB-': 1 } as Record<string, number> },
  ];

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filterNearestOnly, setFilterNearestOnly] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ lat: number; lng: number } | null>(null);

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const eligibleHospitals = useMemo(() => {
    const need = Math.max(1, units);
    let list = hospitalsList
      .map((h) => {
        const verifiedUnits = h.verified[bloodGroup] ?? 0;
        const distance_km = userCoords ? haversineKm(userCoords, { lat: h.lat, lng: h.lng }) : undefined;
        return { ...h, verifiedUnits, distance_km, hasStock: verifiedUnits >= need };
      })
      .filter((h) => h.hasStock);

    if (filterNearestOnly && userCoords) {
      list = [...list].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    } else if (userCoords) {
      list = [...list].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    } else {
      list = [...list].sort((a, b) => b.verifiedUnits - a.verifiedUnits);
    }
    return list;
  }, [bloodGroup, units, userCoords, filterNearestOnly]);

  // Keep hospital selection valid when group/units/location filters change
  useEffect(() => {
    if (eligibleHospitals.length === 0) return;
    if (!eligibleHospitals.some((h) => h.id === hospitalId)) {
      setHospitalId(eligibleHospitals[0].id);
    }
  }, [eligibleHospitals, hospitalId]);

  const openMapPicker = () => {
    setLocationError(null);
    setMapDraft(userCoords);
    setMapOpen(true);
  };

  const confirmMapLocation = (coords: { lat: number; lng: number }) => {
    setUserCoords(coords);
    setFilterNearestOnly(true);
    setMapOpen(false);
    setMapDraft(null);
  };

  /** GPS first, then open map so user can fine-tune the pin */
  const useMyLocation = () => {
    setLocationError(null);
    setMapOpen(true);
    setMapDraft(userCoords);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not available — click the map to set your location.');
      // Default center: Delhi NCR
      if (!userCoords) setMapDraft({ lat: 28.6139, lng: 77.209 });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapDraft(c);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (!userCoords) setMapDraft({ lat: 28.6139, lng: 77.209 });
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Click the map to place your pin manually.'
            : 'GPS unavailable. Click the map to place your pin manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
    );
  };

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
        {/* Destination Hospital Selection — location + verified stock */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink-primary mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-brand" />
            Receiving Hospital / Trauma Center
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-2xl border border-shell-border bg-shell-bg/50">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-ink-primary flex items-center gap-1">
                <LocateFixed className="w-3.5 h-3.5 text-teal-brand" />
                Share current location
              </p>
              <p className="text-[10px] text-ink-secondary mt-0.5">
                Ranks nearest hospitals that have verified demo units for the selected blood group.
                {userCoords && (
                  <span className="text-teal-brand font-semibold">
                    {' '}Location set ({userCoords.lat.toFixed(3)}, {userCoords.lng.toFixed(3)})
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-teal-brand text-white disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5" />
                {locating ? 'Locating…' : userCoords ? 'Update location' : 'Use my current location'}
              </button>
              <button
                type="button"
                onClick={openMapPicker}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border border-shell-border bg-white text-ink-primary hover:bg-shell-bg"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-brand" />
                Pick on map
              </button>
            </div>
          </div>
          {locationError && (
            <p className="text-[11px] text-crimson font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {locationError}
            </p>
          )}

          {eligibleHospitals.length === 0 ? (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-[11px] text-amber-900">
              No registered hospital currently shows enough verified units for <strong>{bloodGroup}</strong> ({units}u needed).
              Try another blood group or lower units.
            </div>
          ) : (
            <>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full px-4 py-2.5 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand transition-all"
              >
                {eligibleHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.zone}
                    {h.distance_km != null ? ` · ${h.distance_km.toFixed(1)} km` : ''}
                    {` · ${h.verifiedUnits}u ${bloodGroup} verified`}
                  </option>
                ))}
              </select>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {eligibleHospitals.slice(0, 6).map((h, i) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => setHospitalId(h.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] transition-colors ${
                        hospitalId === h.id
                          ? 'border-teal-brand bg-teal-brand/5'
                          : 'border-shell-border hover:border-teal-brand/40'
                      }`}
                    >
                      <span className="font-bold text-ink-primary">
                        {userCoords && i === 0 ? 'Nearest · ' : ''}
                        {h.name}
                      </span>
                      <span className="block text-ink-secondary mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-0.5" />
                        {h.zone}
                        {h.distance_km != null ? ` · ${h.distance_km.toFixed(1)} km away` : ''}
                        {' · '}
                        <span className="text-teal-brand font-semibold">{h.verifiedUnits} verified {bloodGroup} units</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-ink-secondary">
                Only hospitals with verified demonstration stock ≥ {units} unit(s) of {bloodGroup} are listed
                {userCoords ? ', sorted nearest first.' : '.'}
              </p>
            </>
          )}
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

      {mapOpen && (
        <MapLocationModal
          initial={mapDraft || userCoords || { lat: 28.6139, lng: 77.209 }}
          locating={locating}
          onClose={() => {
            setMapOpen(false);
            setMapDraft(null);
          }}
          onConfirm={confirmMapLocation}
          onUseGps={useMyLocation}
        />
      )}
    </div>
  );
};


/** Map picker without external CDN — GPS + clickable NCR map + lat/lng confirm */
function MapLocationModal({
  initial,
  locating,
  onClose,
  onConfirm,
  onUseGps,
}: {
  initial: { lat: number; lng: number };
  locating: boolean;
  onClose: () => void;
  onConfirm: (c: { lat: number; lng: number }) => void;
  onUseGps: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const mapBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(initial);
  }, [initial.lat, initial.lng]);

  // Approximate Delhi NCR bounds for click-to-pin
  const BOUNDS = { north: 28.92, south: 28.28, west: 76.82, east: 77.58 };

  const pinStyle = (() => {
    const { north, south, west, east } = BOUNDS;
    const x = ((draft.lng - west) / (east - west)) * 100;
    const y = ((north - draft.lat) / (north - south)) * 100;
    return {
      left: `${Math.min(98, Math.max(2, x))}%`,
      top: `${Math.min(98, Math.max(2, y))}%`,
    };
  })();

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = mapBoxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const lng = BOUNDS.west + px * (BOUNDS.east - BOUNDS.west);
    const lat = BOUNDS.north - py * (BOUNDS.north - BOUNDS.south);
    setDraft({
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
    });
  };

  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${draft.lng - 0.06}%2C${draft.lat - 0.04}%2C${draft.lng + 0.06}%2C${draft.lat + 0.04}&layer=mapnik&marker=${draft.lat}%2C${draft.lng}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-label="Pick location on map"
        className="bg-white rounded-3xl border border-shell-border shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 border-b border-shell-border flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-brand" />
              Set your location
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5">
              Use GPS, tap the map grid, or edit coordinates — then confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-ink-secondary hover:text-ink-primary px-2 py-1"
          >
            Close
          </button>
        </div>

        <div className="relative">
          {/* Live OSM preview (read-only embed) */}
          <iframe
            title="OpenStreetMap preview"
            src={osmEmbed}
            className="w-full h-40 border-0 bg-shell-bg"
          />
          {/* Clickable NCR overlay for precise pin without CDN scripts */}
          <div className="px-4 pt-2">
            <p className="text-[10px] font-bold text-ink-secondary uppercase mb-1">
              Tap to place pin (Delhi NCR)
            </p>
            <div
              ref={mapBoxRef}
              onClick={onMapClick}
              className="relative w-full h-36 rounded-2xl border border-shell-border overflow-hidden cursor-crosshair select-none"
              style={{
                background:
                  'linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 45%, #f0fdfa 100%)',
              }}
            >
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(#0f766e22 1px, transparent 1px), linear-gradient(90deg, #0f766e22 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <span className="absolute top-1 left-2 text-[9px] font-bold text-ink-secondary">N</span>
              <span className="absolute bottom-1 left-2 text-[9px] font-bold text-ink-secondary">Gurugram · Delhi · Noida</span>
              <span
                className="absolute w-4 h-4 -ml-2 -mt-4 pointer-events-none"
                style={pinStyle}
              >
                <span className="block w-4 h-4 rounded-full bg-crimson border-2 border-white shadow-md" />
              </span>
              {locating && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-bold text-teal-brand">
                  Getting GPS…
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 space-y-3 border-t border-shell-border">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-ink-secondary uppercase">
              Latitude
              <input
                type="number"
                step="0.0001"
                value={Number(draft.lat.toFixed(5))}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  if (!Number.isNaN(lat)) setDraft((d) => ({ ...d, lat }));
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border bg-shell-bg text-xs font-semibold"
              />
            </label>
            <label className="text-[10px] font-bold text-ink-secondary uppercase">
              Longitude
              <input
                type="number"
                step="0.0001"
                value={Number(draft.lng.toFixed(5))}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  if (!Number.isNaN(lng)) setDraft((d) => ({ ...d, lng }));
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border bg-shell-bg text-xs font-semibold"
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={onUseGps}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border border-shell-border bg-white"
            >
              <Navigation className="w-3.5 h-3.5 text-teal-brand" />
              Re-run GPS
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-[11px] font-bold text-ink-secondary hover:bg-shell-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(draft)}
                className="px-4 py-2 rounded-full text-[11px] font-bold bg-teal-brand text-white"
              >
                Use this location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
