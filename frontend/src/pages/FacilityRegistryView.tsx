import React, { useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';

export const FacilityRegistryView: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const facilities = [
    {
      id: 'hosp-aiims-delhi',
      name: 'AIIMS New Delhi (Apex Trauma Centre)',
      type: 'HOSPITAL',
      zone: 'South Delhi',
      address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
      phone: '+91 11 2658 8500',
      dronesSupported: true,
      bloodStock: 184,
      status: 'ACTIVE_NODE',
    },
    {
      id: 'hosp-safdarjung-delhi',
      name: 'Safdarjung Hospital & Trauma Level 1',
      type: 'HOSPITAL',
      zone: 'South West Delhi',
      address: 'Ring Road, Opposite AIIMS, New Delhi',
      phone: '+91 11 2616 5060',
      dronesSupported: true,
      bloodStock: 112,
      status: 'ACTIVE_NODE',
    },
    {
      id: 'bb-rotary-tughlakabad',
      name: 'Rotary Blood Bank Central Hub',
      type: 'BLOOD_BANK',
      zone: 'South Delhi',
      address: '56-57 Institutional Area, Tughlakabad, New Delhi',
      phone: '+91 11 2995 5566',
      dronesSupported: true,
      bloodStock: 420,
      status: 'DISPATCH_HUB',
    },
    {
      id: 'bb-redcross-central',
      name: 'Indian Red Cross Regional Blood Bank',
      type: 'BLOOD_BANK',
      zone: 'Central Delhi',
      address: '1 Red Cross Road, Sansad Marg, New Delhi',
      phone: '+91 11 2371 6441',
      dronesSupported: true,
      bloodStock: 388,
      status: 'DISPATCH_HUB',
    },
    {
      id: 'hosp-max-saket',
      name: 'Max Super Speciality Hospital, Saket',
      type: 'HOSPITAL',
      zone: 'South Delhi',
      address: '1, 2 Press Enclave Marg, Saket, New Delhi',
      phone: '+91 11 2651 5050',
      dronesSupported: true,
      bloodStock: 94,
      status: 'ACTIVE_NODE',
    },
    {
      id: 'hosp-medanta-gurgaon',
      name: 'Medanta The Medicity',
      type: 'HOSPITAL',
      zone: 'Gurgaon NCR',
      address: 'CH Bakhtawar Singh Rd, Sector 38, Gurugram',
      phone: '+91 124 414 1414',
      dronesSupported: false,
      bloodStock: 145,
      status: 'ACTIVE_NODE',
    },
  ];

  const filtered = facilities.filter((f) => {
    const matchesType = filterType === 'ALL' || f.type === filterType;
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Delhi NCR Facility & Hub Registry
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary">
            Verified Trauma Centers, Tertiary Hospitals, and Regional Blood Hubs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-pastel-mint-bg text-pastel-mint-text border border-pastel-mint-border rounded-full text-xs font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-brand" />
            <span>13 Verified NCR Nodes</span>
          </span>
        </div>
      </div>

      {/* Grid of facilities */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-shell-border">
          <div className="flex items-center gap-1 bg-shell-bg p-1 rounded-full border border-shell-border text-xs">
            {['ALL', 'HOSPITAL', 'BLOOD_BANK'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
                  filterType === type
                    ? 'bg-teal-brand text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {type === 'ALL'
                  ? 'All Facilities'
                  : type === 'HOSPITAL'
                  ? 'Trauma Hospitals'
                  : 'Blood Banks'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facility name or zone..."
              className="pl-8 pr-3 py-1.5 bg-shell-bg border border-shell-border rounded-full text-xs text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:border-teal-brand"
            />
          </div>
        </div>

        {/* Facility Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map((fac) => (
            <div
              key={fac.id}
              className="p-5 rounded-2xl bg-shell-bg border border-shell-border flex flex-col justify-between space-y-4 hover:border-teal-brand/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-ink-secondary border border-shell-border">
                    {fac.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border">
                    {fac.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink-primary">{fac.name}</h3>
                <span className="text-xs text-ink-secondary flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-teal-brand shrink-0" />
                  {fac.zone}
                </span>
                <p className="text-[11px] text-ink-secondary mt-2 truncate">
                  {fac.address}
                </p>
              </div>

              <div className="pt-3 border-t border-shell-border/80 flex items-center justify-between text-xs">
                <span className="font-mono text-ink-secondary text-[11px]">
                  Stock: <strong className="text-ink-primary">{fac.bloodStock}u</strong>
                </span>
                <span className="text-[11px] text-teal-brand font-semibold">
                  {fac.dronesSupported ? '🚁 Drone Pad Ready' : '🚑 Ground Only'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
