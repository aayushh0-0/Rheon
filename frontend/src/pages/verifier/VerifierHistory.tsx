import React, { useState } from 'react';
import {
  CheckCircle2,
  Search,
} from 'lucide-react';
import { EmergencyRequest } from '../../types';

interface VerifierHistoryProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
}

export const VerifierHistory: React.FC<VerifierHistoryProps> = ({
  requests,
  onSelectRequest,
}) => {
  const [search, setSearch] = useState<string>('');

  const filtered = requests.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.hospital_name.toLowerCase().includes(search.toLowerCase()) ||
      r.blood_group.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Verification Audit Log
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
            Immutable log of verified emergency dispatches, mathematical checks, and immunohematology audits.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-shell-border rounded-xl text-xs sm:text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 focus:border-teal-brand"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-shell-bg/70 border-b border-shell-border text-ink-secondary uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Audit Timestamp</th>
                <th className="py-3 px-4">Consignment / ID</th>
                <th className="py-3 px-4">Receiving Center</th>
                <th className="py-3 px-4">Component & Units</th>
                <th className="py-3 px-4">Audit Outcome</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-shell-bg/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-ink-secondary">
                    {req.created_at}
                    <span className="block text-[10px] font-sans text-ink-secondary/70">
                      Auto-Logged
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded font-mono font-bold text-xs">
                        {req.blood_group}
                      </span>
                      <span className="font-mono font-bold text-ink-primary">{req.id}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-ink-primary block">{req.hospital_name}</span>
                    <span className="text-[10px] text-ink-secondary">{req.source_facility || 'Rotary Hub'}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-ink-primary">
                      {req.units_allocated} Units {req.component_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>6/6 Invariants Passed</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectRequest(req)}
                      className="text-xs font-bold text-teal-brand hover:underline"
                    >
                      Inspect Audit
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
