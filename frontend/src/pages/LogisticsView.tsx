import React, { useState } from 'react';
import { Plane, Truck, MapPin, Thermometer, Radio } from 'lucide-react';

export const LogisticsView: React.FC = () => {
  const [filterMode, setFilterMode] = useState<string>('ALL');

  const activeDispatches = [
    {
      id: 'DISP-8491',
      origin: 'Rotary Blood Bank, Tughlakabad',
      destination: 'AIIMS Trauma Centre',
      mode: 'DRONE',
      bloodType: 'O- RBC',
      units: 4,
      etaMins: 11,
      targetEta: 15,
      temp: '4.2°C',
      tempStatus: 'NOMINAL',
      status: 'AIRBORNE',
      coordinates: '28.5672° N, 77.2100° E',
      speed: '65 km/h',
    },
    {
      id: 'DISP-8492',
      origin: 'Red Cross Regional Blood Bank',
      destination: 'Safdarjung Hospital',
      mode: 'EMERGENCY_AMBULANCE',
      bloodType: 'A+ Whole',
      units: 6,
      etaMins: 18,
      targetEta: 25,
      temp: '3.8°C',
      tempStatus: 'NOMINAL',
      status: 'EN_ROUTE',
      coordinates: '28.5700° N, 77.2085° E',
      speed: '42 km/h',
    },
    {
      id: 'DISP-8493',
      origin: 'Medanta Blood Bank, Gurugram',
      destination: 'Max Super Speciality, Saket',
      mode: 'EMERGENCY_AMBULANCE',
      bloodType: 'AB- Platelets',
      units: 2,
      etaMins: 22,
      targetEta: 30,
      temp: '21.5°C',
      tempStatus: 'NOMINAL (AGITATED)',
      status: 'EN_ROUTE',
      coordinates: '28.5244° N, 77.2066° E',
      speed: '48 km/h',
    },
    {
      id: 'DISP-8494',
      origin: 'Rotary Blood Bank, Tughlakabad',
      destination: 'Fortis Escorts Heart Institute',
      mode: 'DRONE',
      bloodType: 'B+ FFP',
      units: 3,
      etaMins: 8,
      targetEta: 15,
      temp: '-18.5°C',
      tempStatus: 'FROZEN NOMINAL',
      status: 'FINAL_APPROACH',
      coordinates: '28.5601° N, 77.2762° E',
      speed: '58 km/h',
    },
  ];

  const filtered = activeDispatches.filter(
    (d) => filterMode === 'ALL' || d.mode === filterMode
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
            Logistics Dispatch & Cold Chain Tracking
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary">
            Deterministic multimodal routing (STAT Drone + Green Corridor Ambulance) across Delhi NCR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-pastel-mint-bg text-pastel-mint-text border border-pastel-mint-border rounded-full text-xs font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-teal-brand animate-pulse" />
            <span>4 Active Multimodal Feeds</span>
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-shell-border shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase">
              Average Drone Flight Time
            </span>
            <Plane className="w-4 h-4 text-teal-brand" />
          </div>
          <p className="text-2xl font-extrabold text-ink-primary mt-1">9.4 min</p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            68% faster than road traffic
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-shell-border shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase">
              Average Ambulance ETA
            </span>
            <Truck className="w-4 h-4 text-teal-brand" />
          </div>
          <p className="text-2xl font-extrabold text-ink-primary mt-1">19.2 min</p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Green corridor assisted
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-pastel-lime-bg border border-pastel-lime-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pastel-lime-text uppercase">
              Cold Chain Integrity
            </span>
            <Thermometer className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-pastel-lime-text mt-1">100% Locked</p>
          <span className="text-[11px] text-pastel-lime-text/80">
            IoT continuous thermal telemetry
          </span>
        </div>
      </div>

      {/* Filter and Dispatch Feed */}
      <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card">
        <div className="flex items-center justify-between pb-4 border-b border-shell-border">
          <h3 className="text-base font-bold text-ink-primary">Live Transit Fleet</h3>
          <div className="flex items-center gap-1 bg-shell-bg p-1 rounded-full border border-shell-border text-xs">
            {['ALL', 'DRONE', 'EMERGENCY_AMBULANCE'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${
                  filterMode === mode
                    ? 'bg-teal-brand text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {mode === 'ALL'
                  ? 'All Modes'
                  : mode === 'DRONE'
                  ? 'Drones Only'
                  : 'Ambulances'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {filtered.map((disp) => (
            <div
              key={disp.id}
              className="p-5 rounded-2xl bg-shell-bg border border-shell-border flex flex-col justify-between space-y-4 hover:border-teal-brand/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      disp.mode === 'DRONE'
                        ? 'bg-pastel-mint-bg text-teal-brand border border-pastel-mint-border'
                        : 'bg-pastel-lime-bg text-pastel-lime-text border border-pastel-lime-border'
                    }`}
                  >
                    {disp.mode === 'DRONE' ? (
                      <Plane className="w-5 h-5" />
                    ) : (
                      <Truck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-ink-primary">{disp.id}</span>
                    <span className="block text-[11px] font-mono text-ink-secondary">
                      {disp.mode === 'DRONE' ? 'Autonomous Drone' : 'Emergency Ambulance'} •{' '}
                      {disp.speed}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-lg text-xs font-mono font-bold">
                  {disp.bloodType} ({disp.units}u)
                </span>
              </div>

              {/* Origin -> Destination */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-ink-secondary">
                  <MapPin className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                  <span className="truncate">From: {disp.origin}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-ink-primary">
                  <MapPin className="w-3.5 h-3.5 text-teal-brand shrink-0" />
                  <span className="truncate">To: {disp.destination}</span>
                </div>
              </div>

              {/* Cold Chain & ETA */}
              <div className="pt-3 border-t border-shell-border/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>{disp.temp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-brand">
                    ETA: {disp.etaMins}m
                  </span>
                  <span className="px-2 py-0.5 bg-pastel-mint-bg text-pastel-mint-text border border-pastel-mint-border rounded-full text-[10px] font-bold">
                    {disp.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
