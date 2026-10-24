import React, { useState } from 'react';
import {
  Search,
  Eye,
  CheckCircle2,
  Plane,
  Truck,
} from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface VerifierQueueProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
}

export const VerifierQueue: React.FC<VerifierQueueProps> = ({
  requests,
  onSelectRequest,
}) => {
  const [search, setSearch] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [componentFilter, setComponentFilter] = useState<string>('ALL');

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      r.blood_group.toLowerCase().includes(search.toLowerCase());

    const matchesUrgency = urgencyFilter === 'ALL' || r.urgency === urgencyFilter;
    const matchesComponent = componentFilter === 'ALL' || r.component_type === componentFilter;

    return matchesSearch && matchesUrgency && matchesComponent;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Clinical Verification Queue
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
            Audit emergency blood allocation decisions across the Delhi NCR medical network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-ink-secondary bg-white px-3 py-1.5 rounded-full border border-shell-border shadow-xs">
            {filtered.length} Requests in View
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-secondary">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search request ID, receiving hospital, or blood group..."
            className="w-full pl-10 pr-4 py-2 bg-shell-bg border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-ink-secondary text-[11px] uppercase">Urgency:</span>
            {['ALL', 'CRITICAL', 'URGENT'].map((u) => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(u)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  urgencyFilter === u
                    ? 'bg-teal-brand text-white shadow-xs'
                    : 'bg-shell-bg text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Component Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-ink-secondary text-[11px] uppercase">Component:</span>
            {['ALL', 'RBC', 'PLATELETS', 'FFP', 'CRYO'].map((c) => (
              <button
                key={c}
                onClick={() => setComponentFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  componentFilter === c
                    ? 'bg-teal-brand text-white shadow-xs'
                    : 'bg-shell-bg text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-shell-bg/70 border-b border-shell-border text-ink-secondary uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Receiving Hospital</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Component & Units</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Transport & ETA</th>
                <th className="py-3 px-4">Safety Gate</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-shell-bg/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-ink-primary">
                    {req.id}
                    <span className="block text-[10px] text-ink-secondary font-sans font-normal">
                      {req.created_at}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-ink-primary block">{req.hospital_name}</span>
                    <span className="text-[11px] text-ink-secondary">{req.location_zone}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-lg font-mono font-bold">
                      {req.blood_group}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-ink-primary">
                      {req.units_allocated} / {req.units_requested} Units
                    </span>
                    <span className="block text-[10px] text-ink-secondary font-mono">
                      {req.component_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
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
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-ink-primary">
                      {req.transport_mode === 'DRONE' ? (
                        <Plane className="w-3.5 h-3.5 text-teal-brand" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 text-teal-brand" />
                      )}
                      <span className="font-mono text-teal-brand">{req.actual_eta_mins}m</span>
                    </div>
                    <span className="text-[10px] text-ink-secondary">Target: {req.target_eta_mins}m</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>{req.safety_checks_verified || 6}/6 Passed</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectRequest(req)}
                      className="px-3 py-1.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
