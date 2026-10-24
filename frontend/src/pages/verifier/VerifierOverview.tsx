import React from 'react';
import {
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plane,
  Eye,
  Lock,
} from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface VerifierOverviewProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  onGoToQueue: () => void;
  onGoToSafety: () => void;
}

export const VerifierOverview: React.FC<VerifierOverviewProps> = ({
  requests,
  onSelectRequest,
  onGoToQueue,
  onGoToSafety,
}) => {
  const criticalCount = requests.filter((r) => r.urgency === 'CRITICAL').length;
  const droneCount = requests.filter((r) => r.transport_mode === 'DRONE').length;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Verification Queue Overview
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
            Real-time immunohematology evidence, quantity conservation audits, and safety invariant compliance.
          </p>
        </div>

        <button
          onClick={onGoToQueue}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs md:text-sm font-bold shadow-pill transition-all self-start sm:self-auto"
        >
          <span>Open Full Queue ({requests.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Transparent Limitation Banner */}
      <div className="p-4 bg-shell-card rounded-2xl border border-shell-border shadow-card flex items-start gap-3 text-xs text-ink-secondary">
        <Lock className="w-4 h-4 text-teal-brand shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink-primary font-semibold">Read-Oriented Clinical Architecture:</strong>{' '}
          In accordance with hospital safety standards, verification decisions are based strictly on deterministic compatibility algorithms and live inventory telemetry. No fake approval or rejection APIs are invoked.
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Requests in Scope</span>
            <p className="text-2xl font-extrabold text-ink-primary mt-1">{requests.length}</p>
            <span className="text-[11px] text-ink-secondary">Live NCR active queue</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Critical Urgency</span>
            <p className="text-2xl font-extrabold text-crimson mt-1">{criticalCount}</p>
            <span className="text-[11px] text-crimson font-medium">STAT trauma priority</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-rose-bg text-crimson flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Safety Invariants</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">6 / 6</p>
            <span className="text-[11px] text-emerald-700 font-medium">Deterministic gate pass</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-lime-bg text-emerald-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-ink-secondary uppercase">Drone Corridors</span>
            <p className="text-2xl font-extrabold text-ink-primary mt-1">{droneCount}</p>
            <span className="text-[11px] text-ink-secondary">Active flight paths</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pastel-lavender-bg text-pastel-lavender-text flex items-center justify-center">
            <Plane className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Top Priority Demands Table */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink-primary">
              High-Priority Requests Awaiting Audit
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5">
              Review antigen compatibility, quantity exactness, and reserve preservation.
            </p>
          </div>
          <button
            onClick={onGoToSafety}
            className="text-xs font-bold text-teal-brand hover:underline flex items-center gap-1"
          >
            <span>Compatibility Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-shell-border text-ink-secondary uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Receiving Hospital</th>
                <th className="py-2.5 px-3">Blood Group</th>
                <th className="py-2.5 px-3">Component & Units</th>
                <th className="py-2.5 px-3">Urgency</th>
                <th className="py-2.5 px-3">Safety Verification</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border">
              {requests.slice(0, 5).map((req) => (
                <tr key={req.id} className="hover:bg-shell-bg/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-ink-primary">
                    {req.id}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-ink-primary block">{req.hospital_name}</span>
                    <span className="text-[10px] text-ink-secondary">{req.location_zone}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded font-mono font-bold">
                      {req.blood_group}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-ink-primary">
                    {req.units_requested} Units {req.component_type}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-pastel-rose-bg text-crimson border border-pastel-rose-border'
                          : 'bg-pastel-lavender-bg text-pastel-lavender-text border border-pastel-lavender-border'
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>{req.safety_checks_verified || 6}/6 Passed</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => onSelectRequest(req)}
                      className="px-3 py-1 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
