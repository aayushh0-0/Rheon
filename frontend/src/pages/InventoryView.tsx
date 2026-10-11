import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [filterGroup, setFilterGroup] = useState<string>('ALL');

  const facilityStock = [
    {
      facility: 'AIIMS New Delhi (Trauma Level 1)',
      type: 'HOSPITAL',
      zone: 'South Delhi',
      bloodGroup: 'O-',
      available: 18,
      reserve: 12,
      usable: 6,
      status: 'HEALTHY',
    },
    {
      facility: 'AIIMS New Delhi (Trauma Level 1)',
      type: 'HOSPITAL',
      zone: 'South Delhi',
      bloodGroup: 'A+',
      available: 34,
      reserve: 15,
      usable: 19,
      status: 'HEALTHY',
    },
    {
      facility: 'Safdarjung Hospital (Trauma Level 1)',
      type: 'HOSPITAL',
      zone: 'South West Delhi',
      bloodGroup: 'O-',
      available: 14,
      reserve: 12,
      usable: 2,
      status: 'LOW',
    },
    {
      facility: 'Rotary Blood Bank, Tughlakabad',
      type: 'BLOOD_BANK',
      zone: 'South Delhi',
      bloodGroup: 'O-',
      available: 48,
      reserve: 15,
      usable: 33,
      status: 'HEALTHY',
    },
    {
      facility: 'Red Cross Regional Blood Bank',
      type: 'BLOOD_BANK',
      zone: 'Central Delhi',
      bloodGroup: 'B+',
      available: 62,
      reserve: 20,
      usable: 42,
      status: 'HEALTHY',
    },
    {
      facility: 'Max Super Speciality Hospital, Saket',
      type: 'HOSPITAL',
      zone: 'South Delhi',
      bloodGroup: 'AB-',
      available: 6,
      reserve: 4,
      usable: 2,
      status: 'LOW',
    },
    {
      facility: 'Medanta The Medicity',
      type: 'HOSPITAL',
      zone: 'Gurgaon NCR',
      bloodGroup: 'O+',
      available: 28,
      reserve: 12,
      usable: 16,
      status: 'HEALTHY',
    },
  ];

  const filtered = facilityStock.filter(
    (item) => filterGroup === 'ALL' || item.bloodGroup === filterGroup
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Inventory Reserves & Safety Floors
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary">
            Deterministic statutory reserve protection: Usable Stock = max(0, Available - SafetyReserve)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border rounded-full text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-brand" />
            <span>Reserves Locked</span>
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-shell-border shadow-card">
          <span className="text-xs font-bold text-ink-secondary uppercase">
            Total Network Available
          </span>
          <p className="text-2xl font-extrabold text-ink-primary mt-1">1,894 Units</p>
          <span className="text-[11px] text-ink-secondary">Across 13 NCR facilities</span>
        </div>

        <div className="p-5 rounded-3xl bg-pastel-rose-bg border border-pastel-rose-border shadow-sm">
          <span className="text-xs font-bold text-pastel-rose-text uppercase">
            Protected Safety Floor
          </span>
          <p className="text-2xl font-extrabold text-pastel-rose-text mt-1">646 Units</p>
          <span className="text-[11px] text-pastel-rose-text/80">Non-allocatable buffer</span>
        </div>

        <div className="p-5 rounded-3xl bg-pastel-lime-bg border border-pastel-lime-border shadow-sm">
          <span className="text-xs font-bold text-pastel-lime-text uppercase">
            Net Usable Stock
          </span>
          <p className="text-2xl font-extrabold text-pastel-lime-text mt-1">1,248 Units</p>
          <span className="text-[11px] text-pastel-lime-text/80">Available for emergency dispatch</span>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center justify-between pb-4 border-b border-shell-border">
          <h3 className="text-base font-bold text-ink-primary">
            Facility Inventory Breakdown
          </h3>
          <div className="flex items-center gap-1 bg-shell-bg p-1 rounded-full border border-shell-border text-xs">
            {['ALL', 'O-', 'O+', 'A+', 'B+', 'AB-'].map((bg) => (
              <button
                key={bg}
                onClick={() => setFilterGroup(bg)}
                className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
                  filterGroup === bg
                    ? 'bg-teal-brand text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-shell-border/60 text-[11px] font-bold text-ink-secondary uppercase">
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Blood Group</th>
                <th className="py-3 px-3">Gross Available</th>
                <th className="py-3 px-3">Safety Floor</th>
                <th className="py-3 px-3">Net Usable</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border/40 text-xs">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-shell-bg/50">
                  <td className="py-3 px-3 font-bold text-ink-primary">{item.facility}</td>
                  <td className="py-3 px-3 text-ink-secondary font-mono text-[11px]">
                    {item.type}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded font-mono font-bold">
                      {item.bloodGroup}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{item.available}u</td>
                  <td className="py-3 px-3 font-mono text-crimson font-semibold">
                    {item.reserve}u
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-sm">
                    {item.usable}u
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'HEALTHY'
                          ? 'bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
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
