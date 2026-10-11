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
}) => {
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

      {/* Bottom: Active Emergency Requests Table */}
      <EmergencyTable
        requests={requests}
        onSelectRequest={onSelectRequest}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
    </div>
  );
};
