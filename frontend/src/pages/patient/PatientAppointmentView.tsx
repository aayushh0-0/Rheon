import React, { useMemo, useState, useCallback } from 'react';
import {
  CalendarPlus, MapPin, Star, Search, ChevronRight, ExternalLink,
  Clock, Stethoscope, CheckCircle2, ArrowLeft, Bot, LocateFixed,
  Download, IndianRupee, CalendarClock, Camera, User, Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  CITIES, PURPOSE_LABELS, SORT_OPTIONS, rankHospitalsByProblem, getAvailableSlots,
  CityZone, AppointmentPurpose, HospitalInfo, HospitalDoctor, HospitalSortMode, UserCoords,
} from '../../data/hospitals';
import { AgeGroup, PatientAppointment } from '../../types/appointments';
import { openPrescriptionDocument } from '../../utils/prescriptionPdf';

interface Props { onSuccess?: () => void; onCancel?: () => void; }
type Step = 'list' | 'search' | 'hospital' | 'doctor' | 'slot' | 'confirm' | 'done';

const AGE_GROUPS: AgeGroup[] = ['0-12', '13-17', '18-40', '41-60', '60+'];

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatTime12(t: string) {
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export const PatientAppointmentView: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const { user, addAppointment, appointments, bookedSlotKeys } = useAuth();

  const [step, setStep] = useState<Step>('list');
  const [problem, setProblem] = useState('');
  const [city, setCity] = useState<CityZone | 'ALL'>('ALL');
  const [purpose, setPurpose] = useState<AppointmentPurpose>('consultation');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('18-40');
  const [patientPhoto, setPatientPhoto] = useState<string | undefined>();
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [sortMode, setSortMode] = useState<HospitalSortMode>('best');
  const [locating, setLocating] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState<HospitalInfo | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<HospitalDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(tomorrowISO());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'FOLLOW_UP'>('ALL');
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null);
  const [rankingReady, setRankingReady] = useState(false);

  const myAppointments = useMemo(() => {
    const mine = (appointments || []).filter(
      (a) => a.patient_email === user?.email || a.patient_name === user?.name
    );
    if (historyFilter === 'ALL') return mine;
    if (historyFilter === 'FOLLOW_UP') return mine.filter((a) => !!a.reappointment_date && a.status !== 'CANCELLED');
    return mine.filter((a) => a.status === historyFilter);
  }, [appointments, user, historyFilter]);

  const historyCounts = useMemo(() => {
    const mine = (appointments || []).filter(
      (a) => a.patient_email === user?.email || a.patient_name === user?.name
    );
    return {
      ALL: mine.length,
      BOOKED: mine.filter((a) => a.status === 'BOOKED').length,
      CONFIRMED: mine.filter((a) => a.status === 'CONFIRMED').length,
      COMPLETED: mine.filter((a) => a.status === 'COMPLETED').length,
      CANCELLED: mine.filter((a) => a.status === 'CANCELLED').length,
      FOLLOW_UP: mine.filter((a) => !!a.reappointment_date && a.status !== 'CANCELLED').length,
    };
  }, [appointments, user]);

  // Only rank when user explicitly runs agent match — avoids freeze on mount
  const ranked = useMemo(() => {
    if (!rankingReady) return [];
    return rankHospitalsByProblem(problem, city, sortMode, userCoords);
  }, [rankingReady, problem, city, sortMode, userCoords]);

  const slots = useMemo(() => {
    if (!selectedHospital || !selectedDoctor) return [];
    return getAvailableSlots(selectedDoctor, bookedSlotKeys || new Set(), selectedHospital.id, selectedDate);
  }, [selectedHospital, selectedDoctor, bookedSlotKeys, selectedDate]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      window.alert('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortMode('nearest');
        setLocating(false);
      },
      () => {
        setLocating(false);
        window.alert('Could not get location. Allow location permission and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 600_000) {
      window.alert('Please choose a smaller photo (under ~600KB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPatientPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const runAgentMatch = () => {
    setRankingReady(true);
    setStep('hospital');
  };

  const book = () => {
    if (!selectedHospital || !selectedDoctor || !selectedTime || !user) return;
    const appt: PatientAppointment = {
      id: `APT-${Math.floor(100000 + Math.random() * 900000)}`,
      patient_name: user.name,
      patient_email: user.email,
      patient_age_group: ageGroup,
      patient_photo: patientPhoto,
      hospital_id: selectedHospital.id,
      hospital_name: selectedHospital.name,
      hospital_city: selectedHospital.city,
      hospital_map_url: selectedHospital.map_url,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      doctor_specialty: selectedDoctor.specialty,
      purpose,
      purpose_label: PURPOSE_LABELS[purpose],
      problem_description: problem || 'General consultation',
      date: selectedDate,
      time: selectedTime,
      status: 'BOOKED',
      criticality: 'ROUTINE',
      is_emergency_slot: false,
      agent_note: 'Matched by RHEON Agent AI using specialty fit and distance.',
      created_at: new Date().toLocaleString('en-IN'),
      total_bill_inr: 1500 + Math.floor(Math.random() * 2000),
    };
    addAppointment(appt);
    setStep('done');
    onSuccess?.();
  };

  const resetBooking = () => {
    setStep('list');
    setRankingReady(false);
    setSelectedHospital(null);
    setSelectedDoctor(null);
    setSelectedTime(null);
    setProblem('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-teal-brand uppercase tracking-wider flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" /> Agent AI scheduling
          </p>
          <h2 className="text-xl font-black text-ink-primary mt-0.5">My Appointments</h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Book slots, review history, prescriptions and follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step !== 'list' && step !== 'done' && (
            <button type="button" onClick={resetBooking}
              className="px-3 py-2 rounded-full text-xs font-bold border border-shell-border text-ink-secondary hover:border-teal-brand">
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Back to list
            </button>
          )}
          {step === 'list' && (
            <button type="button" onClick={() => setStep('search')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white shadow-pill">
              <CalendarPlus className="w-4 h-4" /> Book new appointment
            </button>
          )}
          {onCancel && step === 'list' && (
            <button type="button" onClick={onCancel}
              className="px-3 py-2 rounded-full text-xs font-bold border border-shell-border text-ink-secondary">
              Close
            </button>
          )}
        </div>
      </div>

      {/* LIST / HISTORY */}
      {step === 'list' && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-ink-primary">Your appointments</h3>
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: 'ALL' as const, label: 'All' },
                { id: 'BOOKED' as const, label: 'Booked' },
                { id: 'CONFIRMED' as const, label: 'Confirmed' },
                { id: 'COMPLETED' as const, label: 'Completed' },
                { id: 'FOLLOW_UP' as const, label: 'Follow-up' },
                { id: 'CANCELLED' as const, label: 'Cancelled' },
              ]).map((f) => (
                <button key={f.id} type="button" onClick={() => setHistoryFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                    historyFilter === f.id
                      ? f.id === 'CANCELLED' ? 'bg-red-600 text-white border-red-600' : 'bg-teal-brand text-white border-teal-brand'
                      : 'bg-white text-ink-secondary border-shell-border hover:border-teal-brand/40'
                  }`}>
                  {f.label} ({historyCounts[f.id]})
                </button>
              ))}
            </div>
          </div>

          {myAppointments.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarPlus className="w-10 h-10 text-ink-secondary/30 mx-auto mb-2" />
              <p className="text-sm font-bold text-ink-primary">No appointments in this filter</p>
              <p className="text-xs text-ink-secondary mt-1">Book a new appointment with Agent AI matching.</p>
              <button type="button" onClick={() => setStep('search')}
                className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white">
                Book new appointment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myAppointments.map((a) => {
                const cancelled = a.status === 'CANCELLED';
                const open = expandedAppt === a.id;
                return (
                  <div key={a.id}
                    className={`rounded-2xl border p-3.5 ${
                      cancelled ? 'bg-red-50 border-red-200' : 'bg-shell-bg/40 border-shell-border'
                    }`}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-shell-border shrink-0">
                        {a.patient_photo ? (
                          <img src={a.patient_photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-secondary">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono font-bold text-ink-secondary">{a.id}</p>
                            <p className={`text-xs font-bold truncate ${cancelled ? 'text-red-700' : 'text-ink-primary'}`}>
                              {a.hospital_name}
                            </p>
                            <p className={`text-[11px] ${cancelled ? 'text-red-600' : 'text-ink-secondary'}`}>
                              {a.doctor_name} · {a.date} {formatTime12(a.time)} · Age {a.patient_age_group}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            cancelled ? 'bg-red-100 text-red-700 border-red-200'
                              : a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : a.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>{a.status}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          <a href={a.hospital_map_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-bold text-teal-brand">
                            <MapPin className="w-3 h-3" /> Map
                          </a>
                          <button type="button" onClick={() => setExpandedAppt(open ? null : a.id)}
                            className="font-bold text-ink-secondary hover:text-teal-brand">
                            {open ? 'Hide details' : 'Prescription & bill'}
                          </button>
                        </div>
                        {open && (
                          <div className="mt-3 rounded-xl bg-white border border-shell-border p-3 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-ink-secondary flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Total bill</span>
                              <span className="font-bold">₹{a.total_bill_inr.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-[11px] text-ink-secondary">
                              <p className="font-bold text-ink-primary">Prescription</p>
                              <p>{a.prescription ? a.prescription.advice : 'Prescription will appear after the doctor completes the visit.'}</p>
                            </div>
                            <div className="text-[11px] text-ink-secondary">
                              <p className="font-bold text-ink-primary flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Re-appointment</p>
                              <p>{a.reappointment_date
                                ? `${a.reappointment_date}${a.reappointment_time ? ' · ' + formatTime12(a.reappointment_time) : ''}`
                                : 'No follow-up allotted yet.'}</p>
                            </div>
                            <button type="button" onClick={() => openPrescriptionDocument(a)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-teal-brand text-white">
                              <Download className="w-3 h-3" /> Download / Print prescription PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEARCH */}
      {step === 'search' && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">What do you need help with?</label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
              <input value={problem} onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g. chest pain, blood sample test, pregnancy checkup…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-shell-border text-xs focus:outline-none focus:ring-2 focus:ring-teal-brand" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Appointment type</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value as AppointmentPurpose)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs bg-white">
                {Object.entries(PURPOSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> City filter</label>
              <select value={city} onChange={(e) => setCity(e.target.value as CityZone | 'ALL')}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs bg-white">
                <option value="ALL">All NCR cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-secondary uppercase">Age group</label>
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-shell-border text-xs bg-white">
                {AGE_GROUPS.map((g) => <option key={g} value={g}>{g} years</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl border border-shell-border bg-shell-bg/50">
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <Camera className="w-4 h-4 text-teal-brand" />
              <span>Patient photo (optional, shown on cards)</span>
            </div>
            <label className="px-3 py-1.5 rounded-full text-[10px] font-bold border border-shell-border cursor-pointer hover:border-teal-brand">
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl border border-shell-border bg-shell-bg/50">
            <div className="text-xs text-ink-secondary">
              <p className="font-bold text-ink-primary flex items-center gap-1"><LocateFixed className="w-3.5 h-3.5 text-teal-brand" /> Use my current location</p>
              <p className="text-[11px]">Agent ranks by real distance (browser permission only).</p>
            </div>
            <button type="button" onClick={useMyLocation} disabled={locating}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-teal-brand text-white disabled:opacity-50">
              {locating ? 'Locating…' : userCoords ? 'Location set' : 'Use my location'}
            </button>
          </div>
          <button type="button" onClick={runAgentMatch}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-teal-brand text-white shadow-pill">
            <Bot className="w-4 h-4" /> Run Agent Match
          </button>
        </div>
      )}

      {/* HOSPITALS */}
      {step === 'hospital' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSortMode(s.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  sortMode === s.id ? 'bg-teal-brand text-white border-teal-brand' : 'border-shell-border text-ink-secondary'
                }`}>{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ranked.map((h) => (
              <button key={h.id} type="button" onClick={() => { setSelectedHospital(h); setSelectedDoctor(null); setSelectedTime(null); setStep('doctor'); }}
                className="text-left bg-white rounded-2xl border border-shell-border p-4 hover:border-teal-brand shadow-card transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">{h.name}</p>
                    <p className="text-[11px] text-ink-secondary">{h.city}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5"><Star className="w-3 h-3" />{h.rating}</span>
                </div>
                <p className="mt-2 text-[11px] text-ink-secondary">
                  <span className="font-bold text-ink-primary">Famous for:</span> {h.famous_for.join(', ')}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-ink-secondary">{h.distance_km != null ? `${h.distance_km.toFixed(1)} km away` : 'Distance —'}</span>
                  <a href={h.map_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="font-bold text-teal-brand inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> Map <ExternalLink className="w-2.5 h-2.5" /></a>
                </div>
              </button>
            ))}
          </div>
          {ranked.length === 0 && (
            <p className="text-xs text-ink-secondary text-center py-8">No hospitals matched. Go back and adjust filters.</p>
          )}
        </div>
      )}

      {/* DOCTOR */}
      {step === 'doctor' && selectedHospital && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-brand" /> Doctors at {selectedHospital.name}
          </h3>
          {selectedHospital.doctors.map((d) => (
            <button key={d.id} type="button" onClick={() => { setSelectedDoctor(d); setSelectedTime(null); setStep('slot'); }}
              className="w-full text-left p-3 rounded-2xl border border-shell-border hover:border-teal-brand flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-ink-primary">{d.name}</p>
                <p className="text-[11px] text-ink-secondary">{d.specialty}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-secondary" />
            </button>
          ))}
        </div>
      )}

      {/* SLOT */}
      {step === 'slot' && selectedDoctor && selectedHospital && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-ink-primary">{selectedDoctor.name}</p>
            <p className="text-[11px] text-ink-secondary">{selectedDoctor.specialty} · Agent AI free/busy slots</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-secondary uppercase">Date</label>
            <input type="date" value={selectedDate} min={tomorrowISO()}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
              className="mt-1 block px-3 py-2 rounded-xl border border-shell-border text-xs" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((s) => (
              <button key={s.time} type="button" disabled={s.booked}
                onClick={() => setSelectedTime(s.time)}
                className={`px-2 py-2 rounded-xl text-[11px] font-bold border ${
                  s.booked ? 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed'
                    : selectedTime === s.time ? 'bg-teal-brand text-white border-teal-brand'
                    : 'border-shell-border text-ink-primary hover:border-teal-brand'
                }`}>
                <Clock className="w-3 h-3 inline mr-0.5" />
                {formatTime12(s.time)}
              </button>
            ))}
          </div>
          <button type="button" disabled={!selectedTime} onClick={() => setStep('confirm')}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-teal-brand text-white disabled:opacity-40">
            Continue to confirm
          </button>
        </div>
      )}

      {/* CONFIRM */}
      {step === 'confirm' && selectedHospital && selectedDoctor && selectedTime && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 space-y-3 max-w-lg">
          <h3 className="text-sm font-bold text-ink-primary">Confirm appointment</h3>
          <ul className="text-xs text-ink-secondary space-y-1">
            <li><strong className="text-ink-primary">Hospital:</strong> {selectedHospital.name}</li>
            <li><strong className="text-ink-primary">Doctor:</strong> {selectedDoctor.name} · {selectedDoctor.specialty}</li>
            <li><strong className="text-ink-primary">When:</strong> {selectedDate} · {formatTime12(selectedTime)}</li>
            <li><strong className="text-ink-primary">Type:</strong> {PURPOSE_LABELS[purpose]}</li>
            <li><strong className="text-ink-primary">Age group:</strong> {ageGroup}</li>
          </ul>
          <button type="button" onClick={book}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-teal-brand text-white">
            <CheckCircle2 className="w-4 h-4" /> Confirm booking
          </button>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-8 text-center max-w-md mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-ink-primary">Appointment booked</h3>
          <p className="text-xs text-ink-secondary mt-1">Agent AI saved your slot. You can view it under My Appointments.</p>
          <button type="button" onClick={resetBooking}
            className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white">
            Back to My Appointments
          </button>
        </div>
      )}
    </div>
  );
};
