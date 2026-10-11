import React from 'react';
import { ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export const SafetyAuditView: React.FC = () => {
  const safetyGates = [
    {
      step: 1,
      name: 'Biological Compatibility (ABO / Rh)',
      type: 'Deterministic Strict Matrix',
      description:
        'Validates antigen/antibody compatibility across RBC, FFP, Platelets, and Cryoprecipitate. Zero heuristic tolerance.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
    {
      step: 2,
      name: 'Quantity Conservation Exactness',
      type: 'Mathematical Invariant',
      description:
        'Guarantees sum(Allocated) + Unmet == Requested. Prevents over-dispatch or unit duplication.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
    {
      step: 3,
      name: 'Safety Reserve Floor Protection',
      type: 'Statutory Safeguard',
      description:
        'Enforces Usable Stock = max(0, Available - SafetyReserve). Never breaches statutory emergency reserves.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
    {
      step: 4,
      name: 'Source Facility Operational Verification',
      type: 'Live Status Check',
      description:
        'Ensures supplying hub is online, active, and verified with valid cold-storage telemetry.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
    {
      step: 5,
      name: 'Logistics Route & Flight Corridor Validity',
      type: 'Geospatial Clearance',
      description:
        'Confirms positive distance/ETA, drone corridor green-flagging, and ambulance green-corridor availability.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
    {
      step: 6,
      name: 'Mathematical Consistency & Positivity',
      type: 'Allocation Bound Audit',
      description:
        'Requires all assigned unit quantities to be non-zero integers within physical transport bounds.',
      status: 'VERIFIED',
      checksToday: 248,
      fails: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Deterministic 6-Point Safety Gate
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary">
            Strict mathematical compliance: Zero LLM dependency in clinical & safety decision paths
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border rounded-full text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-teal-brand" />
            <span>Zero-Trust Enforced</span>
          </span>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="p-6 rounded-3xl bg-pastel-lime-bg border border-pastel-lime-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/80 border border-pastel-lime-border flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-emerald-950">
              Deterministic Safety Pipeline 100% Operational
            </h3>
            <p className="text-xs text-emerald-850 mt-0.5">
              1,488 Total Safety Invariant Audits executed across NCR today • 0 Invariant Breaches
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-white rounded-full text-xs font-mono font-extrabold text-emerald-900 border border-pastel-lime-border shadow-xs">
          Safety Score: 1.000 (Flawless)
        </span>
      </div>

      {/* 6-Gate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safetyGates.map((gate) => (
          <div
            key={gate.step}
            className="p-5 rounded-3xl bg-white border border-shell-border shadow-card flex flex-col justify-between space-y-4 hover:border-teal-brand/30 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-pastel-mint-bg text-teal-brand font-mono font-bold text-xs flex items-center justify-center">
                  {gate.step}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>{gate.status}</span>
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-primary">{gate.name}</h4>
              <span className="text-[11px] font-mono text-teal-brand font-semibold block mt-0.5">
                {gate.type}
              </span>
              <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
                {gate.description}
              </p>
            </div>

            <div className="pt-3 border-t border-shell-border/60 flex items-center justify-between text-[11px] text-ink-secondary">
              <span>Audits Today: <strong className="text-ink-primary font-mono">{gate.checksToday}</strong></span>
              <span className="text-emerald-700 font-bold">0 Violations</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
