import React, { useState, useEffect, useMemo } from 'react';
import { MoreHorizontal, Zap, ShieldCheck, Timer } from 'lucide-react';
import { DemandDayData } from '../../types';

interface DemandChartProps {
  data: DemandDayData[];
}

export const DemandChart: React.FC<DemandChartProps> = ({ data }) => {
  const safeData = useMemo(() => (Array.isArray(data) && data.length > 0 ? data : []), [data]);

  const [activeDay, setActiveDay] = useState<DemandDayData | null>(null);

  useEffect(() => {
    if (safeData.length === 0) {
      setActiveDay(null);
      return;
    }
    setActiveDay(safeData.find((d) => d.isCurrent) || safeData[Math.min(4, safeData.length - 1)]);
  }, [safeData]);

  const maxRequests = Math.max(...safeData.map((d) => d.requests), 1, 40);

  return (
    <div className="bg-white rounded-3xl p-6 border border-shell-border shadow-card flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-shell-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-bold text-ink-primary tracking-tight">
              Emergency Demand Overview
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border rounded-full">
              Live Cycle
            </span>
          </div>
          <p className="text-xs text-ink-secondary">
            Daily incoming STAT emergency blood requests across NCR network
          </p>
        </div>
        <button
          title="Chart Options"
          className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-shell-bg rounded-full transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Bar Chart Body with Floating Tooltip */}
      <div className="relative my-4 pt-8">
        {/* Floating Tooltip positioned over the active/selected day */}
        {activeDay && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-teal-brand text-white px-3 py-1.5 rounded-full shadow-pill flex items-center gap-2 text-xs font-semibold whitespace-nowrap animate-bounce">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span>{activeDay.day}: {activeDay.requests} Requests ({activeDay.units} Units)</span>
              <span className="text-[10px] text-teal-100 font-mono">• 100% Routed</span>
            </div>
          </div>
        )}

        {/* Chart Bars Grid */}
        <div className="flex items-end justify-between gap-2 sm:gap-4 h-44 px-2 border-b border-shell-border">
          {safeData.map((item) => {
            const heightPct = (item.requests / maxRequests) * 100;
            const isSelected = activeDay?.day === item.day;
            const isCurrent = item.isCurrent;

            return (
              <div
                key={item.day}
                className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => setActiveDay(item)}
                onMouseEnter={() => setActiveDay(item)}
              >
                {/* Bar Value Indicator */}
                <span
                  className={`text-[11px] font-mono font-bold transition-all ${
                    isSelected
                      ? 'text-crimson opacity-100 scale-110'
                      : 'text-ink-secondary opacity-60 group-hover:opacity-100'
                  }`}
                >
                  {item.requests}
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[36px] bg-shell-bg rounded-t-2xl h-32 flex items-end justify-center p-0.5 overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-crimson to-rose-400 shadow-sm'
                        : isSelected
                        ? 'bg-teal-brand'
                        : 'bg-teal-brand/30 group-hover:bg-teal-brand/50'
                    }`}
                  ></div>
                </div>

                {/* Day Label */}
                <span
                  className={`text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'text-crimson font-bold'
                      : isSelected
                      ? 'text-teal-brand font-bold'
                      : 'text-ink-secondary'
                  }`}
                >
                  {item.shortDay}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Metrics Row */}
      <div className="pt-3 border-t border-shell-border/60 grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-secondary uppercase">
            Avg Dispatch
          </span>
          <span className="text-xs font-bold text-ink-primary flex items-center justify-center gap-1">
            <Timer className="w-3 h-3 text-teal-brand" />
            14.2 min
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-secondary uppercase">
            Max Transit ETA
          </span>
          <span className="text-xs font-bold text-ink-primary flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            28.0 min
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-secondary uppercase">
            Safety Gate
          </span>
          <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            100% Passed
          </span>
        </div>
      </div>
    </div>
  );
};
