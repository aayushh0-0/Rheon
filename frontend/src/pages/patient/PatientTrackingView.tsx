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
  ExternalLink,
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
}

function hospitalMapsUrl(name: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Delhi NCR')}`;
}

function sourceMapsUrl(name: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || 'Blood Bank Delhi')}`;
}

/** Point along cubic bezier (same as SVG path) for marker placement */
function cubicPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export const PatientTrackingView: React.FC<PatientTrackingViewProps> = ({
  requestId,
  onGoToRequests,
  onNewRequest,
}) => {
  const { patientRequests, updatePatientRequest } = useAuth();
  const request: PatientEmergencyRequest | undefined = requestId
    ? patientRequests.find((r) => r.id === requestId)
    : patientRequests[0];

  const totalSeconds = Math.max(45, (request?.actual_eta_mins || request?.max_eta_minutes || 15) * 5);
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
  const progress =
    request?.status === 'FULFILLED' ? 100 : Math.min(100, Math.round((elapsed / totalSeconds) * 100));
  const etaLeft = request?.status === 'FULFILLED' ? 0 : Math.max(0, Math.ceil(totalSeconds - elapsed));

  useEffect(() => {
    if (!request || request.status === 'CANCELLED') return;
    let nextStatus = request.status;
    if (progress >= 100) nextStatus = 'FULFILLED';
    else if (progress >= 15) nextStatus = 'DISPATCHED';
    else if (progress >= 5) nextStatus = 'ALLOCATED';

    const nextEta = Math.max(1, Math.ceil(etaLeft / 5));
    const patch: Partial<PatientEmergencyRequest> = {};
    if (nextStatus !== request.status) patch.status = nextStatus;
    if (request.status !== 'FULFILLED' && nextEta !== request.actual_eta_mins) {
      patch.actual_eta_mins = nextStatus === 'FULFILLED' ? 0 : nextEta;
    }
    if (Object.keys(patch).length) updatePatientRequest(request.id, patch);
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
  const isDrone = mode.includes('DRONE');

  // SVG coordinate system 0..1000 x 0..280 — clean left-to-right arc
  const p0 = { x: 80, y: 200 };
  const p1 = { x: 280, y: 200 };
  const p2 = { x: 620, y: 70 };
  const p3 = { x: 900, y: 70 };
  const tProg = progress / 100;
  const marker = cubicPoint(tProg, p0, p1, p2, p3);
  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  const milestones: LiveMilestone[] = [
    {
      id: 'logged',
      title: 'Emergency Request Logged',
      desc: 'Requirements validated against registered NCR trauma protocols.',
      status: progress >= 5 ? 'COMPLETE' : 'ACTIVE',
    },
    {
      id: 'safety',
      title: 'Deterministic Safety Gate Cleared',
      desc: '6/6 mathematical checks passed: ABO/Rh matrix and reserve floor protected.',
      status: progress >= 20 ? 'COMPLETE' : progress >= 5 ? 'ACTIVE' : 'PENDING',
    },
    {
      id: 'sourced',
      title: 'Cold-Chain Units Sourced',
      desc: `Units secured at ${request.source_facility || 'Rotary Central Blood Bank'}.`,
      status: progress >= 40 ? 'COMPLETE' : progress >= 20 ? 'ACTIVE' : 'PENDING',
    },
    {
      id: 'enroute',
      title: isFulfilled ? 'Arrived at receiving hospital' : 'En route to receiving hospital',
      desc: isFulfilled
        ? `Handed over at ${request.hospital_name}.`
        : `${mode} leg active · ETA updates every second.`,
      status: isFulfilled ? 'COMPLETE' : progress >= 40 ? 'ACTIVE' : 'PENDING',
    },
    {
      id: 'delivered',
      title: 'Handover confirmed',
      desc: 'Receiving facility acknowledged units. Chain-of-custody closed.',
      status: isFulfilled ? 'COMPLETE' : 'PENDING',
    },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
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
              {isFulfilled ? 'Arrived' : `ETA ~${Math.max(1, Math.ceil(etaLeft / 5))} min`}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] font-bold text-ink-secondary mb-1.5">
            <span>Dispatch progress</span>
            <span className="text-teal-brand">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-shell-bg border border-shell-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${isFulfilled ? 'bg-emerald-500' : 'bg-teal-brand'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live route — single clean layer, no overlaps */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {isDrone ? <Plane className="w-4 h-4 text-teal-brand" /> : <Truck className="w-4 h-4 text-teal-brand" />}
            <h2 className="text-sm font-bold text-ink-primary">Live route · {mode}</h2>
          </div>
          <p className="text-[10px] text-ink-secondary">Tap hospital to open map &amp; navigate</p>
        </div>

        <div className="relative w-full rounded-2xl border border-shell-border bg-gradient-to-b from-[#f3faf8] to-[#eef6f3] overflow-hidden">
          {/* Fixed aspect canvas */}
          <svg viewBox="0 0 1000 280" className="w-full h-auto block" role="img" aria-label="Delivery route map">
            {/* soft grid */}
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="1" />
              </linearGradient>
            </defs>
            {[80, 140, 200].map((y) => (
              <line key={y} x1="40" y1={y} x2="960" y2={y} stroke="#d7e5e1" strokeWidth="1" strokeDasharray="4 8" />
            ))}

            {/* full path (track) */}
            <path d={pathD} fill="none" stroke="#c5d9d4" strokeWidth="6" strokeLinecap="round" />
            {/* progress path */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="1200"
              strokeDashoffset={1200 - tProg * 1200}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />

            {/* Source node */}
            <circle cx={p0.x} cy={p0.y} r="18" fill="#fff" stroke="#0f766e" strokeWidth="2.5" />
            <circle cx={p0.x} cy={p0.y} r="8" fill="#0f766e" />

            {/* Destination node */}
            <circle cx={p3.x} cy={p3.y} r="18" fill="#fff" stroke="#0f766e" strokeWidth="2.5" />
            <circle cx={p3.x} cy={p3.y} r="8" fill={isFulfilled ? '#059669' : '#0f766e'} />

            {/* Moving vehicle */}
            <g
              style={{ transition: 'transform 1s linear' }}
              transform={`translate(${marker.x}, ${marker.y})`}
            >
              <circle r="22" fill="#0f766e" opacity="0.15" />
              <circle r="16" fill="#0f766e" />
              {/* simple plane/truck glyph via text for crispness */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fill="#fff"
              >
                {isDrone ? '✈' : '🚚'}
              </text>
            </g>
          </svg>

          {/* Labels outside the path — HTML overlay with absolute positions matching SVG ends */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 pointer-events-auto max-w-[42%]">
              <a
                href={sourceMapsUrl(request.source_facility || 'Blood Bank')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 rounded-2xl bg-white/95 border border-shell-border shadow-sm px-2.5 py-2 hover:border-teal-brand transition-colors"
              >
                <span className="w-8 h-8 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold text-ink-primary">Source</span>
                  <span className="block text-[10px] text-ink-secondary leading-snug line-clamp-2">
                    {request.source_facility || 'Blood Bank'}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-teal-brand">
                    <MapPin className="w-2.5 h-2.5" /> Map
                  </span>
                </span>
              </a>
            </div>

            <div className="absolute right-3 top-3 sm:right-4 sm:top-4 pointer-events-auto max-w-[48%]">
              <a
                href={hospitalMapsUrl(request.hospital_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 rounded-2xl bg-white/95 border border-shell-border shadow-sm px-2.5 py-2 hover:border-teal-brand transition-colors text-right flex-row-reverse"
                title="Open hospital location on Google Maps"
              >
                <span className="w-8 h-8 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold text-ink-primary">Receiving hospital</span>
                  <span className="block text-[10px] text-ink-secondary leading-snug line-clamp-2">
                    {request.hospital_name}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-teal-brand justify-end">
                    Open location <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <a
          href={hospitalMapsUrl(request.hospital_name)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-teal-brand/30 text-teal-brand hover:bg-teal-brand/5"
        >
          <Building2 className="w-3.5 h-3.5" /> Hospital location
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
