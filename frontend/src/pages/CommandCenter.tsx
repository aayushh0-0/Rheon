import React from 'react';
import { WelcomeHeader } from '../components/dashboard/WelcomeHeader';
import { MetricCard } from '../components/dashboard/MetricCard';
import { InventoryDonut } from '../components/dashboard/InventoryDonut';
import { DemandChart } from '../components/dashboard/DemandChart';
import { EmergencyTable } from '../components/dashboard/EmergencyTable';
import {
  MetricCardData,
  InventoryGroupDistribution,
  DemandDayData,
  EmergencyRequest
} from '../types';
import { Flame } from 'lucide-react';

interface CommandCenterProps {
  metrics: MetricCardData[];
  inventoryDistribution: InventoryGroupDistribution[];
  demandData: DemandDayData[];
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** 'overview' = Command Center dashboard; 'queue' = Emergency Queue page */
  variant?: 'overview' | 'queue';
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  metrics,
  inventoryDistribution,
  demandData,
  requests,
  onSelectRequest,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  variant = 'overview',
}) => {
  if (variant === 'queue') {
    return (
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-ink-primary tracking-tight">
                Emergency Queue
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pastel-rose-bg text-pastel-rose-text border border-pastel-rose-border">
                <Flame className="w-3 h-3" />
                Live
              </span>
            </div>
            <p className="text-xs md:text-sm text-ink-secondary mt-0.5">
              Active emergency blood requests, prioritization and fulfillment tracking.
            </p>
          </div>
        </div>

        <EmergencyTable
          requests={requests}
          onSelectRequest={onSelectRequest}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      </div>
    );
  }

  // Default: Command Center overview
  return (
    <div className="flex flex-col">
      {/* Top Welcome Header */}
      <WelcomeHeader onRefresh={onRefresh} isRefreshing={isRefreshing} />

      {/* 4 Pastel Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} data={metric} />
        ))}
      </div>

      {/* Two Large Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Blood Inventory Distribution Donut */}
        <InventoryDonut distribution={inventoryDistribution} />

        {/* Right: Emergency Demand Overview Bar Chart */}
        <DemandChart data={demandData} />
      </div>
    </div>
  );
};
