import React, { useEffect, useMemo, useState } from 'react';
import {
  Navigation,
  Clock,
  Plane,
  Truck,
  Building2,
  Thermometer,
  MapPin,
  PhoneCall,
  CheckCircle2,
  Radio,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PatientEmergencyRequest } from '../../types/auth';

interface PatientTrackingViewProps {
  requestId?: string | null;
  onGoToRequests: () => void;
  onNewRequest: () => void;
}

type MilestoneStatus = 'COMPLETE' | 'ACTIVE' | 'PENDING';

interface LiveMilestone {
  id: string;
  title: string;
  desc: string;
  status: MilestoneStatus;
  atProgress: number; // 0-100 when this completes
}

/**
 * Live delivery simulator:
 * - progresses every second from request creation / session start
 * - writes status + ETA back into AuthContext so My Requests / Admin queue stay in sync
 * - FULFILLED when progress hits 100%
 */
export const PatientTrackingView: React.FC<PatientTrackingViewProps> = ({
  requestId,
  onGoToRequests,
  onNewRequest,
}) => {
  const { patientRequests, updatePatientRequest } = useAuth();
  const request: PatientEmergencyRequest | undefined = requestId
    ? patientRequests.find((r) => r.id === requestId)
    : patientRequests[0];

  const totalSeconds = Math.max(30, (request?.actual_eta_mins || request?.max_eta_minutes || 15) * 6); // demo: 6s per planned minute, min 30s
  const storageKey = request ? `rheon_track_start_${request.id}` : '';

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!request || !storageKey) return;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, String(Date.now()));
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [request?.id, storageKey]);

  const startMs = useMemo(() => {
    if (!storageKey) return Date.now();
    const raw = localStorage.getItem(storageKey);
    return raw ? parseInt(raw, 10) : Date.now();
  }, [storageKey, request?.id]);

  const elapsed = Math.max(0, (now - startMs) / 1000);
  const progress = request?.status === 'FULFILLED' ? 100 : Math.min(100, Math.round((elapsed / totalSeconds) * 100));
  const etaLeft = request?.status === 'FULFILLED' ? 0 : Math.max(0, Math.ceil(totalSeconds - elapsed));

  // Push live status into shared store (impacts request list / admin)
  useEffect(() => {
    if (!request) return;
    if (request.status === 'CANCELLED') return;

    let nextStatus = request.status;
    if (progress >= 100) nextStatus = 'FULFILLED';
    else if (progress >= 15) nextStatus = 'DISPATCHED';
    else if (progress >= 5) nextStatus = 'ALLOCATED';
    else nextStatus = request.status === 'PENDING' ? 'PENDING' : request.status;

    const nextEta = Math.max(1, Math.ceil(etaLeft / 6)); // map demo seconds back to "minutes" display
    const patch: Partial<PatientEmergencyRequest> = {};
    if (nextStatus !== request.status) patch.status = nextStatus;
    if (request.status !== 'FULFILLED' && nextEta !== request.actual_eta_mins) {
      patch.actual_eta_mins = nextStatus === 'FULFILLED' ? 0 : nextEta;
    }
    if (Object.keys(patch).length) {
      updatePatientRequest(request.id, patch);
    }
  }, [progress, etaLeft, request, updatePatientRequest]);

  if (!request) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-shell-border shadow-card max-w-lg mx-auto">
        <Navigation className="w-12 h-12 text-ink-secondary/40 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-ink-primary">No Active Request to Track</h3>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Create an emergency blood request, then use Track Delivery Live to follow cold-chain dispatch in real time.
        </p>
        <button
          onClick={onNewRequest}
          className="mt-5 px-5 py-2.5 bg-teal-brand text-white rounded-xl text-xs sm:text-sm font-bold shadow-pill hover:bg-teal-brand-hover transition-colors"
        >
          Create Blood Request
        </button>
      </div>
    );
  }

  const isFulfilled = progress >= 100 || request.status === 'FULFILLED';
  const mode = (request.transport_mode || 'DRONE').toUpperCase();

  const milestones: LiveMilestone[] = [
    {
      id: 'logged',
      title: 'Emergency Request Logged',
      desc: 'Requirements validated against registered NCR trauma protocols.',
      status: progress >= 5 ? 'COMPLETE' : progress >= 0 ? 'ACTIVE' : 'PENDING',
      atProgress: 5,
    },
    {
      id: 'safety',
      title: 'Deterministic Safety Gate Cleared',
      desc: '6/6 mathematical checks passed: ABO/Rh matrix and reserve floor protected.',
      status: progress >= 20 ? 'COMPLETE' : progress >= 5 ? 'ACTIVE' : 'PENDING',
      atProgress: 20,
    },
    {
      id: 'sourced',
      title: 'Cold-Chain Units Sourced',
      desc: `Units secured at ${request.source_facility || 'Rotary Central Blood Bank'}.`,
      status: progress >= 40 ? 'COMPLETE' : progress >= 20 ? 'ACTIVE' : 'PENDING',
      atProgress: 40,
    },
    {
      id: 'enroute',
      title: isFulfilled ? 'Delivered to Trauma OT' : 'En Route to Receiving Hospital',
      desc: isFulfilled
        ? `Handed over at ${request.hospital_name}.`
        : `${mode} leg active · live ETA updating every second.`,
      status: isFulfilled ? 'COMPLETE' : progress >= 40 ? 'ACTIVE' : 'PENDING',
      atProgress: 70,
    },
    {
      id: 'delivered',
      title: 'Handover Confirmed',
      desc: 'Receiving facility acknowledged units. Chain-of-custody closed.',
      status: isFulfilled ? 'COMPLETE' : 'PENDING',
      atProgress: 100,
    },
  ];

  const pulseLeft = 8 + progress * 0.75; // path animation 8% → 83%

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Live header */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-brand/10 text-teal-brand border border-teal-brand/20">
                <Radio className={`w-3 h-3 ${isFulfilled ? '' : 'animate-pulse'}`} />
                {isFulfilled ? 'DELIVERED' : 'LIVE TRACKING'}
              </span>
              <span className="text-[10px] font-mono font-bold text-ink-secondary">{request.id}</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-ink-primary mt-1.5">
              {isFulfilled ? 'Delivery complete' : 'Tracking emergency blood delivery'}
            </h1>
            <p className="text-xs text-ink-secondary mt-0.5">
              {request.units_requested}× {request.blood_group} ({request.component_type}) → {request.hospital_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-ink-secondary uppercase">Status</p>
            <p className={`text-sm font-bold ${isFulfilled ? 'text-emerald-600' : 'text-teal-brand'}`}>
              {isFulfilled ? 'FULFILLED' : request.status}
            </p>
            <p className="text-[11px] text-ink-secondary mt-0.5 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              {isFulfilled ? 'Arrived' : `ETA ~${Math.max(1, Math.ceil(etaLeft / 6))} min`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] font-bold text-ink-secondary mb-1.5">
            <span>Dispatch progress</span>
            <span className="text-teal-brand">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-shell-bg border border-shell-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isFulfilled ? 'bg-emerald-500' : 'bg-teal-brand'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Map-style path card */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          {mode.includes('DRONE') ? <Plane className="w-4 h-4 text-teal-brand" /> : <Truck className="w-4 h-4 text-teal-brand" />}
          <h2 className="text-sm font-bold text-ink-primary">Live route · {mode}</h2>
        </div>
        <div className="relative h-36 rounded-2xl bg-gradient-to-br from-shell-bg to-pastel-mint-bg/40 border border-shell-border">
          {/* Source */}
          <div className="absolute left-4 bottom-4 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white border border-shell-border flex items-center justify-center shadow-sm">
              <Package className="w-4 h-4 text-teal-brand" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-ink-primary">Source</p>
              <p className="text-[10px] text-ink-secondary max-w-[120px] truncate">{request.source_facility || 'Blood Bank'}</p>
            </div>
          </div>
          {/* Dest */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <div>
              <p className="text-[10px] font-bold text-ink-primary text-right">Receiving</p>
              <p className="text-[10px] text-ink-secondary max-w-[140px] truncate text-right">{request.hospital_name}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white border border-shell-border flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-teal-brand" />
            </div>
          </div>
          {/* Path line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <path
              d="M 48 120 C 160 120, 280 40, 420 40"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeDasharray="6 6"
            />
            <path
              d="M 48 120 C 160 120, 280 40, 420 40"
              fill="none"
              stroke="#0f766e"
              strokeWidth="3"
              strokeDasharray="600"
              strokeDashoffset={600 - (progress / 100) * 600}
              className="transition-all duration-1000"
            />
          </svg>
          {/* Moving marker */}
          <div
            className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-teal-brand text-white flex items-center justify-center shadow-pill transition-all duration-1000"
            style={{ left: `${pulseLeft}%`, top: `${70 - progress * 0.35}%` }}
          >
            {mode.includes('DRONE') ? <Plane className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Thermometer, label: 'Cold chain', value: isFulfilled ? 'Stable' : '2–6°C OK' },
            { icon: MapPin, label: 'Corridor', value: 'NCR priority' },
            { icon: Clock, label: 'Elapsed', value: `${Math.floor(elapsed)}s` },
            { icon: CheckCircle2, label: 'Safety', value: progress >= 20 ? '6/6 pass' : 'Running' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-shell-border bg-shell-bg/50 px-2.5 py-2">
              <p className="text-[9px] font-bold text-ink-secondary uppercase flex items-center gap-1">
                <k.icon className="w-3 h-3" /> {k.label}
              </p>
              <p className="text-[11px] font-bold text-ink-primary mt-0.5">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
        <h2 className="text-sm font-bold text-ink-primary mb-4">Delivery milestones</h2>
        <ol className="space-y-4">
          {milestones.map((m, i) => {
            const isDone = m.status === 'COMPLETE';
            const isActive = m.status === 'ACTIVE';
            return (
              <li key={m.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                      isDone
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isActive
                        ? 'bg-teal-brand text-white border-teal-brand animate-pulse'
                        : 'bg-shell-bg text-ink-secondary border-shell-border'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[20px] ${isDone ? 'bg-emerald-400' : 'bg-shell-border'}`} />
                  )}
                </div>
                <div className="pb-2 min-w-0">
                  <p className={`text-xs font-bold ${isActive ? 'text-teal-brand' : 'text-ink-primary'}`}>{m.title}</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5">{m.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-pastel-rose-bg text-crimson border border-pastel-rose-border"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Emergency 112
        </a>
        <button
          onClick={onGoToRequests}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-shell-border text-ink-primary hover:border-teal-brand"
        >
          My requests
        </button>
        <button
          onClick={onNewRequest}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-teal-brand text-white"
        >
          New request
        </button>
      </div>
    </div>
  );
};
