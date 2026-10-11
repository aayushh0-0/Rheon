import React, { useState } from 'react';
import { MoreHorizontal, ShieldCheck, Info } from 'lucide-react';
import { InventoryGroupDistribution } from '../../types';

interface InventoryDonutProps {
  distribution: InventoryGroupDistribution[];
  totalUsableUnits?: number;
}

export const InventoryDonut: React.FC<InventoryDonutProps> = ({
  distribution,
  totalUsableUnits = 1248,
}) => {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Calculate SVG Donut Chart Slices
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-shell-border/60">
        <div>
          <h2 className="text-sm md:text-base font-bold text-ink-primary tracking-tight">
            Blood Inventory Distribution
          </h2>
          <p className="text-xs text-ink-secondary">
            Net usable stock above statutory safety reserve floor
          </p>
        </div>
        <button
          title="Distribution Options"
          className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-shell-bg rounded-full transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Donut Chart Visual Body */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
        {/* SVG Donut Graphic */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#F0F8F7"
              strokeWidth={strokeWidth}
            />

            {/* Segmented Slices */}
            {distribution.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              const isHovered = hoveredGroup === item.group;

              return (
                <circle
                  key={item.group}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredGroup(item.group)}
                  onMouseLeave={() => setHoveredGroup(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-extrabold text-ink-primary tracking-tight font-sans">
              {hoveredGroup
                ? distribution.find((d) => d.group === hoveredGroup)?.units
                : totalUsableUnits.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
              {hoveredGroup ? `${hoveredGroup} Units` : 'Usable Units'}
            </span>
            <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Safe Floor</span>
            </div>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full max-w-[240px]">
          {distribution.map((item) => (
            <div
              key={item.group}
              onMouseEnter={() => setHoveredGroup(item.group)}
              onMouseLeave={() => setHoveredGroup(null)}
              className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer ${
                hoveredGroup === item.group
                  ? 'bg-shell-bg font-semibold shadow-sm'
                  : 'hover:bg-shell-bg/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs font-bold text-ink-primary font-mono">
                  {item.group}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-ink-secondary">
                  {item.units}u
                </span>
                <span className="text-[10px] text-ink-secondary/70 ml-1">
                  ({item.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info Badge */}
      <div className="pt-3 border-t border-shell-border/60 flex items-center justify-between text-xs text-ink-secondary">
        <span className="inline-flex items-center gap-1 font-medium">
          <Info className="w-3.5 h-3.5 text-teal-brand" />
          <span>Formula: Usable = max(0, Available - Reserve)</span>
        </span>
        <span className="font-mono text-[11px] font-semibold text-teal-brand">
          100% Deterministic
        </span>
      </div>
    </div>
  );
};
