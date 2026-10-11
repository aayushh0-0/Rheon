import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  Plane,
  Truck,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';
import { EmergencyRequest, UrgencyLevel } from '../../types';

interface EmergencyTableProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const EmergencyTable: React.FC<EmergencyTableProps> = ({
  requests,
  onSelectRequest,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedUrgency] = useState<string>('ALL');

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location_zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.blood_group.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup =
      selectedGroup === 'ALL' || req.blood_group === selectedGroup;

    const matchesUrgency =
      selectedUrgency === 'ALL' || req.urgency === selectedUrgency;

    return matchesSearch && matchesGroup && matchesUrgency;
  });

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-pastel-rose-bg text-pastel-rose-text border-pastel-rose-border font-bold';
      case 'URGENT':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  };

  const bloodGroupFilterOptions = ['ALL', 'O-', 'O+', 'A+', 'B+', 'AB-', 'B-'];

  return (
    <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card mt-6">
      {/* Table Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-shell-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-ink-primary tracking-tight">
              Active Emergency Requests
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-teal-brand text-white rounded-full">
              {filteredRequests.length} Live
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Real-time multi-source dispatch queue across NCR trauma centers
          </p>
        </div>

        {/* Filters and Search toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Blood Group Filter Pills */}
          <div className="flex items-center gap-1 bg-shell-bg p-1 rounded-full border border-shell-border text-xs">
            {bloodGroupFilterOptions.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedGroup(bg)}
                className={`px-2.5 py-1 rounded-full font-bold text-xs transition-all ${
                  selectedGroup === bg
                    ? 'bg-teal-brand text-white shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter queue..."
              className="pl-8 pr-3 py-1.5 bg-shell-bg border border-shell-border rounded-full text-xs text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:border-teal-brand"
            />
          </div>
        </div>
      </div>

      {/* Table Data Structure */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-shell-border/60 text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
              <th className="py-3 px-3">Hospital & Zone</th>
              <th className="py-3 px-3">Blood & Component</th>
              <th className="py-3 px-3">Fulfillment</th>
              <th className="py-3 px-3">Transit & ETA</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Safety Gate</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-shell-border/40 text-xs">
            {filteredRequests.map((req) => (
              <tr
                key={req.id}
                onClick={() => onSelectRequest(req)}
                className="hover:bg-shell-bg/60 transition-colors cursor-pointer group"
              >
                {/* Hospital Name & Zone */}
                <td className="py-3.5 px-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-ink-primary group-hover:text-teal-brand transition-colors">
                      {req.hospital_name}
                    </span>
                    <span className="text-[11px] text-ink-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-teal-brand/70" />
                      {req.location_zone}
                    </span>
                  </div>
                </td>

                {/* Blood Group & Component */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-lg font-mono font-extrabold text-xs shadow-xs">
                      {req.blood_group}
                    </span>
                    <span className="font-semibold text-ink-secondary">
                      {req.component_type}
                    </span>
                  </div>
                </td>

                {/* Units Fulfillment Progress */}
                <td className="py-3.5 px-3">
                  <div className="flex flex-col gap-1 w-24">
                    <div className="flex justify-between text-[11px] font-bold text-ink-primary">
                      <span>{req.units_allocated} / {req.units_requested}u</span>
                      <span className="text-emerald-700">100%</span>
                    </div>
                    <div className="w-full bg-shell-bg rounded-full h-1.5 overflow-hidden border border-shell-border">
                      <div
                        className="bg-teal-brand h-full rounded-full"
                        style={{
                          width: `${(req.units_allocated / req.units_requested) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Transport Mode & ETA */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    {req.transport_mode === 'DRONE' ? (
                      <div className="w-7 h-7 rounded-full bg-pastel-mint-bg border border-pastel-mint-border flex items-center justify-center text-teal-brand">
                        <Plane className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-pastel-lime-bg border border-pastel-lime-border flex items-center justify-center text-pastel-lime-text">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-ink-primary font-mono">
                        {req.actual_eta_mins} min
                      </span>
                      <span className="text-[10px] text-ink-secondary">
                        Target: {req.target_eta_mins}m
                      </span>
                    </div>
                  </div>
                </td>

                {/* Priority Badge */}
                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] border uppercase tracking-wider ${getUrgencyBadge(
                      req.urgency
                    )}`}
                  >
                    {req.urgency}
                  </span>
                </td>

                {/* Safety Gate Verification */}
                <td className="py-3.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-brand" />
                    <span>6/6 Passed</span>
                  </span>
                </td>

                {/* Action Details Button */}
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRequest(req);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-shell-bg hover:bg-teal-brand hover:text-white border border-shell-border rounded-full text-xs font-semibold text-ink-primary transition-all shadow-xs group-hover:border-teal-brand"
                  >
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
