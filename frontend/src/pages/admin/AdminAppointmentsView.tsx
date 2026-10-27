import React, { useMemo, useState } from 'react';
import {
  Calendar, MapPin, Bot, Stethoscope, ExternalLink, CheckCircle2, XCircle, Clock, User,
  Filter, AlertTriangle, Sparkles, IndianRupee, CalendarPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PatientAppointment, AppointmentCriticality } from '../../types';
import { HOSPITALS, getAvailableSlots } from '../../data/hospitals';

function formatTime12(t: string) {
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const CRITICALITY_STYLE: Record<AppointmentCriticality, string> = {
  ROUTINE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PRIORITY: 'bg-sky-50 text-sky-800 border-sky-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const CRITICALITY_BAR: Record<AppointmentCriticality, string> = {
  ROUTINE: 'bg-emerald-500',
  PRIORITY: 'bg-sky-500',
  CRITICAL: 'bg-red-500',
};

export const AdminAppointmentsView: React.FC = () => {
  const {
    appointments, updateAppointmentStatus, updateAppointment,
    slotOccupancy, emergencySlotCount, bookedSlotKeys,
  } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'ALL' | PatientAppointment['status']>('ALL');
  const [search, setSearch] = useState('');
  const [panelAppt, setPanelAppt] = useState<PatientAppointment | null>(null);
  const [rxMed, setRxMed] = useState('Paracetamol 500mg');
  const [rxDose, setRxDose] = useState('1 tab SOS');
  const [rxDur, setRxDur] = useState('5 days');
  const [rxAdvice, setRxAdvice] = useState('Rest, hydrate, follow up if symptoms persist.');
  const [reDate, setReDate] = useState(tomorrowISO());
  const [reTime, setReTime] = useState('10:00');
  const [reNote, setReNote] = useState('Follow-up review');
  const [emergencyTarget, setEmergencyTarget] = useState<PatientAppointment | null>(null);
  const [emDate, setEmDate] = useState(tomorrowISO());
  const [emTime, setEmTime] = useState('09:00');
  const [emMsg, setEmMsg] = useState('');

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.patient_name.toLowerCase().includes(q) ||
        a.hospital_name.toLowerCase().includes(q) ||
        a.doctor_name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [appointments, statusFilter, search]);

  const stats = useMemo(() => ({
    total: appointments.length,
    booked: appointments.filter((a) => a.status === 'BOOKED').length,
    confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
    critical: appointments.filter((a) => a.criticality === 'CRITICAL' && a.status !== 'CANCELLED').length,
  }), [appointments]);

  // Agent AI slot suggestions for a doctor/date
  const agentSlotHints = useMemo(() => {
    if (!emergencyTarget) return [];
    const slots = getAvailableSlots(emergencyTarget.doctor_id, emDate, new Set());
    return slots.map((s) => {
      const occ = slotOccupancy(emergencyTarget.doctor_id, emDate, s.time);
      const emCount = emergencySlotCount(emergencyTarget.doctor_id, emDate, s.time);
      const free = occ === 0;
      const emRoom = emCount < 3;
      let suggestion = 'Free — preferred';
      let color: 'green' | 'blue' | 'red' = 'green';
      if (occ > 0 && emCount >= 3) {
        suggestion = 'Full (3/3 emergency) — blocked';
        color = 'red';
      } else if (occ > 0 && emRoom) {
        suggestion = `Occupied · emergency room ${emCount}/3`;
        color = 'blue';
      } else if (occ >= 1) {
        suggestion = 'Booked';
        color = 'red';
      }
      return { time: s.time, occ, emCount, free, emRoom, suggestion, color };
    });
  }, [emergencyTarget, emDate, slotOccupancy, emergencySlotCount]);

  const issuePrescription = (a: PatientAppointment) => {
    updateAppointment(a.id, {
      status: 'COMPLETED',
      prescription: {
        medicines: [{ name: rxMed, dosage: rxDose, duration: rxDur }],
        advice: rxAdvice,
        issued_at: new Date().toLocaleString('en-IN', { hour12: true }),
        doctor_name: a.doctor_name,
      },
    });
    setPanelAppt(null);
  };

  const allotReappointment = (a: PatientAppointment) => {
    updateAppointment(a.id, {
      reappointment_date: reDate,
      reappointment_time: reTime,
      reappointment_note: reNote,
    });
    setPanelAppt(null);
  };

  const putEmergency = (a: PatientAppointment) => {
    const emCount = emergencySlotCount(a.doctor_id, emDate, emTime);
    if (emCount >= 3) {
      setEmMsg('Emergency capacity full (3/3). Choose another slot.');
      return;
    }
    updateAppointment(a.id, {
      date: emDate,
      time: emTime,
      is_emergency_slot: true,
      criticality: 'CRITICAL',
      status: a.status === 'CANCELLED' ? 'BOOKED' : a.status,
      agent_note: `${a.agent_note} · Admin emergency override to ${emDate} ${formatTime12(emTime)} (${emCount + 1}/3).`,
    });
    setEmMsg(`Placed in emergency slot ${formatTime12(emTime)} (${emCount + 1}/3).`);
    setEmergencyTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">Appointments</h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-brand/10 text-teal-brand border border-teal-brand/20">
            <Bot className="w-3 h-3" /> Agent AI allotted
          </span>
        </div>
        <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
          Medical Officer view — colour by criticality (green routine · blue priority · red critical). Emergency slots allow up to 3 patients.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-ink-primary' },
          { label: 'Booked', value: stats.booked, color: 'text-amber-600' },
          { label: 'Confirmed', value: stats.confirmed, color: 'text-teal-brand' },
          { label: 'Critical', value: stats.critical, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-shell-border shadow-card p-4">
            <p className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-secondary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, doctor, hospital, ID…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-shell-border rounded-full text-xs focus:outline-none focus:border-teal-brand" />
        </div>
        {(['ALL', 'BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
              statusFilter === s ? 'bg-teal-brand text-white border-teal-brand' : 'bg-white text-ink-secondary border-shell-border'
            }`}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-shell-border shadow-card p-12 text-center">
          <Calendar className="w-10 h-10 text-ink-secondary/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-ink-primary">No appointments yet</p>
          <p className="text-xs text-ink-secondary mt-1">Patient bookings via Agent AI appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((a) => {
            const cancelled = a.status === 'CANCELLED';
            return (
              <div key={a.id}
                className={`bg-white rounded-3xl border shadow-card p-5 flex flex-col gap-3 relative overflow-hidden ${
                  cancelled ? 'border-red-200' : 'border-shell-border'
                }`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cancelled ? 'bg-red-500' : CRITICALITY_BAR[a.criticality || 'ROUTINE']}`} />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 ${cancelled ? 'border-red-200' : 'border-shell-border'}`}>
                      {a.patient_photo ? (
                        <img src={a.patient_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-ink-secondary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-[10px] font-mono font-bold ${cancelled ? 'text-red-600' : 'text-teal-brand'}`}>{a.id}</span>
                      <h3 className={`text-sm font-bold mt-0.5 ${cancelled ? 'text-red-900' : 'text-ink-primary'}`}>{a.patient_name}</h3>
                      <p className="text-[11px] text-ink-secondary">Age {a.patient_age_group} · {a.patient_email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      cancelled ? 'bg-red-100 text-red-700 border-red-300'
                        : a.status === 'COMPLETED' ? 'bg-pastel-mint-bg text-pastel-mint-text border-pastel-mint-border'
                        : a.status === 'CONFIRMED' ? 'bg-teal-brand/10 text-teal-brand border-teal-brand/20'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>{a.status}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${CRITICALITY_STYLE[a.criticality || 'ROUTINE']}`}>
                      {a.criticality || 'ROUTINE'}
                      {a.is_emergency_slot ? ' · EM' : ''}
                    </span>
                  </div>
                </div>

                <div className={`rounded-2xl border p-3 space-y-1.5 ml-2 ${cancelled ? 'bg-red-50/50 border-red-100' : 'bg-shell-bg border-shell-border/60'}`}>
                  <p className="text-xs font-bold text-ink-primary flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-brand" />
                    {a.doctor_name}
                    <span className="font-medium text-ink-secondary">· {a.doctor_specialty}</span>
                  </p>
                  <p className="text-[11px] text-ink-secondary flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{a.hospital_name} · {a.hospital_city}
                  </p>
                  <p className="text-[11px] font-semibold text-ink-primary flex items-center gap-1">
                    <Clock className="w-3 h-3 text-teal-brand" />{a.date} · {formatTime12(a.time)}
                    <span className="font-normal text-ink-secondary">
                      · slot load {slotOccupancy(a.doctor_id, a.date, a.time)}
                      {a.is_emergency_slot ? ` · EM ${emergencySlotCount(a.doctor_id, a.date, a.time)}/3` : ''}
                    </span>
                  </p>
                  <p className="text-[11px] text-ink-secondary">{a.purpose_label} · ₹{a.total_bill_inr?.toLocaleString('en-IN')}</p>
                  {a.problem_description && <p className="text-[11px] text-ink-secondary italic">&ldquo;{a.problem_description}&rdquo;</p>}
                </div>

                <p className="text-[10px] text-ink-secondary leading-relaxed flex items-start gap-1 ml-2">
                  <Bot className="w-3 h-3 text-teal-brand shrink-0 mt-0.5" />{a.agent_note}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-shell-border/60 ml-2">
                  <a href={a.hospital_map_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-brand hover:underline">
                    <ExternalLink className="w-3 h-3" /> Map
                  </a>
                  <div className="flex-1" />
                  {!cancelled && a.status === 'BOOKED' && (
                    <button onClick={() => updateAppointmentStatus(a.id, 'CONFIRMED')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-brand text-white">
                      <CheckCircle2 className="w-3 h-3" /> Confirm
                    </button>
                  )}
                  {!cancelled && (a.status === 'BOOKED' || a.status === 'CONFIRMED') && (
                    <>
                      <button onClick={() => { setPanelAppt(a); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-pastel-mint-bg text-pastel-mint-text border border-pastel-mint-border">
                        Rx / Rebook
                      </button>
                      <button onClick={() => { setEmergencyTarget(a); setEmDate(a.date); setEmTime(a.time); setEmMsg(''); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Emergency slot
                      </button>
                      <button onClick={() => updateAppointmentStatus(a.id, 'CANCELLED')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-crimson hover:bg-pastel-rose-bg">
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rx / Reappointment modal */}
      {panelAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl border border-shell-border shadow-card max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-ink-primary mb-1">Complete visit — {panelAppt.patient_name}</h3>
            <p className="text-[11px] text-ink-secondary mb-4">{panelAppt.id} · {panelAppt.doctor_name}</p>
            <p className="text-[10px] font-bold text-ink-secondary uppercase mb-1">Prescription</p>
            <input value={rxMed} onChange={(e) => setRxMed(e.target.value)} placeholder="Medicine" className="w-full mb-2 px-3 py-2 rounded-xl border border-shell-border text-xs" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={rxDose} onChange={(e) => setRxDose(e.target.value)} placeholder="Dosage" className="px-3 py-2 rounded-xl border border-shell-border text-xs" />
              <input value={rxDur} onChange={(e) => setRxDur(e.target.value)} placeholder="Duration" className="px-3 py-2 rounded-xl border border-shell-border text-xs" />
            </div>
            <textarea value={rxAdvice} onChange={(e) => setRxAdvice(e.target.value)} rows={2} className="w-full mb-3 px-3 py-2 rounded-xl border border-shell-border text-xs" />
            <p className="text-[10px] font-bold text-ink-secondary uppercase mb-1 flex items-center gap-1"><CalendarPlus className="w-3 h-3" /> Allot re-appointment</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} className="px-3 py-2 rounded-xl border border-shell-border text-xs" />
              <input type="time" value={reTime} onChange={(e) => setReTime(e.target.value)} className="px-3 py-2 rounded-xl border border-shell-border text-xs" />
            </div>
            <input value={reNote} onChange={(e) => setReNote(e.target.value)} placeholder="Note" className="w-full mb-4 px-3 py-2 rounded-xl border border-shell-border text-xs" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => issuePrescription(panelAppt)} className="px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white">Issue Rx & complete</button>
              <button onClick={() => allotReappointment(panelAppt)} className="px-4 py-2 rounded-full text-xs font-bold border border-shell-border">Save re-appointment only</button>
              <button onClick={() => setPanelAppt(null)} className="px-4 py-2 rounded-full text-xs font-bold text-ink-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency slot modal with AI suggestions */}
      {emergencyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl border border-shell-border shadow-card max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Emergency slot override
            </h3>
            <p className="text-[11px] text-ink-secondary mb-3">
              {emergencyTarget.patient_name} · max <strong>3</strong> emergency patients per slot. Agent AI colours: green free · blue room for EM · red full.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input type="date" value={emDate} onChange={(e) => setEmDate(e.target.value)} className="px-3 py-2 rounded-xl border border-shell-border text-xs" />
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-brand" />
              <p className="text-[10px] font-bold text-ink-primary uppercase">Agent AI slot board</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {agentSlotHints.map((h) => (
                <button key={h.time} type="button" onClick={() => setEmTime(h.time)}
                  disabled={h.color === 'red' && !h.emRoom}
                  className={`text-left px-2.5 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                    emTime === h.time ? 'ring-2 ring-teal-brand ring-offset-1' : ''
                  } ${
                    h.color === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : h.color === 'blue' ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-red-50 text-red-700 border-red-200 opacity-80'
                  }`}>
                  <div>{formatTime12(h.time)}</div>
                  <div className="font-medium opacity-90">{h.suggestion}</div>
                </button>
              ))}
            </div>
            {emMsg && <p className="text-[11px] font-semibold text-red-600 mb-2">{emMsg}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => putEmergency(emergencyTarget)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 text-white">
                Put in emergency @ {formatTime12(emTime)}
              </button>
              <button onClick={() => setEmergencyTarget(null)} className="px-4 py-2 rounded-full text-xs font-bold text-ink-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
