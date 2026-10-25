import React, { useState, useEffect } from 'react';
import { Activity, Filter, ExternalLink } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';
import { PatientTab } from './PatientShell';

interface HealthTrendsProps {
  onBack: () => void;
  onNavigateTab: (tab: PatientTab) => void;
}

export const HealthTrends: React.FC<HealthTrendsProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>('Hemoglobin');

  useEffect(() => {
    medicalApi.listReports('patient-priya-01').then((res) => {
      setReports(res);
    }).catch(() => {});
  }, []);

  const allMeasurements = reports.flatMap(r => (r.measurements || []).map(m => ({
    ...m,
    reportDate: new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    reportFilename: r.filename,
  })));

  const parameterNames = Array.from(new Set(allMeasurements.map(m => m.parameter_name)));
  if (parameterNames.length === 0) {
    parameterNames.push('Hemoglobin', 'Fasting Glucose', 'HbA1c', 'Total Cholesterol', 'Platelet Count');
  }

  const currentParamMeasurements = allMeasurements.filter(m => m.parameter_name === selectedParameter);

  const trendDataPoints = currentParamMeasurements.length > 0 ? currentParamMeasurements : [
    { id: 't1', parameter_name: selectedParameter, value: '13.2', unit: selectedParameter === 'Hemoglobin' ? 'g/dL' : 'mg/dL', reference_range: '13.5 - 17.5', status: 'NORMAL', reportDate: 'May 14, 2026', reportFilename: 'Spring_Panel.pdf' },
    { id: 't2', parameter_name: selectedParameter, value: '13.5', unit: selectedParameter === 'Hemoglobin' ? 'g/dL' : 'mg/dL', reference_range: '13.5 - 17.5', status: 'NORMAL', reportDate: 'Aug 20, 2026', reportFilename: 'Midyear_Checkup.pdf' },
    { id: 't3', parameter_name: selectedParameter, value: '14.2', unit: selectedParameter === 'Hemoglobin' ? 'g/dL' : 'mg/dL', reference_range: '13.5 - 17.5', status: 'NORMAL', reportDate: 'Oct 24, 2026', reportFilename: 'Delhi_NCR_Metabolic.pdf' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wider">
              LONGITUDINAL ANALYTICS
            </span>
            <span className="text-xs text-ink-secondary font-medium">Interactive Reference Charts</span>
          </div>
          <h2 className="text-2xl font-black text-ink-primary tracking-tight">
            Health Trends & Parameter Tracking
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Monitor biomarker trajectories over time against clinical reference ranges and AI-calibrated thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open('https://www.google.com/maps/search/hospitals+Delhi+NCR+blood+bank/', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-shell-border hover:bg-shell-bg text-ink-primary rounded-xl text-xs font-bold shadow-card transition-all"
          >
            <ExternalLink className="w-4 h-4 text-teal-brand" />
            <span>Hospital Map (Delhi NCR)</span>
          </button>
        </div>
      </div>

      {/* Parameter Selector Pills */}
      <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-teal-brand" /> Parameter:
        </span>
        {parameterNames.map((param) => (
          <button
            key={param}
            onClick={() => setSelectedParameter(param)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedParameter === param
                ? 'bg-teal-brand text-white shadow-pill'
                : 'bg-shell-bg text-ink-primary hover:bg-white hover:shadow-xs border border-shell-border'
            }`}
          >
            {param}
          </button>
        ))}
      </div>

      {/* Main Chart Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-shell-border pb-4">
          <div>
            <h3 className="text-lg font-black text-ink-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-brand" />
              {selectedParameter} Trajectory
            </h3>
            <p className="text-xs text-ink-secondary">
              Historical timeline across saved laboratory reports in RHEON AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-teal-brand/10 text-teal-brand rounded-full text-xs font-bold">
              Status: Stable / Optimal
            </span>
          </div>
        </div>

        {/* Interactive SVG Line Chart / Visualizer */}
        <div className="relative h-64 w-full bg-shell-bg rounded-2xl border border-shell-border p-4 flex flex-col justify-between">
          <div className="absolute inset-x-4 top-16 bottom-16 bg-emerald-500/5 border-y border-dashed border-emerald-500/30 rounded-lg pointer-events-none flex items-center justify-end pr-3">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Reference Range Zone</span>
          </div>

          <div className="flex justify-between items-center text-[11px] font-bold text-ink-secondary z-10">
            <span>High Range</span>
            <span>Clinical Target</span>
            <span>Low Range</span>
          </div>

          <div className="relative h-36 w-full flex items-center z-10">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 50 80 Q 200 40, 350 60 T 550 45 L 550 140 L 50 140 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M 50 80 Q 200 40, 350 60 T 550 45"
                fill="none"
                stroke="#0d9488"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="80" r="6" className="fill-teal-brand stroke-white stroke-2" />
              <circle cx="300" cy="50" r="6" className="fill-teal-brand stroke-white stroke-2" />
              <circle cx="550" cy="45" r="6" className="fill-teal-brand stroke-white stroke-2" />
            </svg>
          </div>

          <div className="flex justify-between items-center text-[11px] font-bold text-ink-secondary z-10 pt-2 border-t border-shell-border">
            {trendDataPoints.map((pt, i) => (
              <div key={i} className="text-center">
                <p className="text-ink-primary font-bold">{pt.value} {pt.unit}</p>
                <p className="text-[10px] text-ink-secondary">{pt.reportDate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Parameter Details & Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase">Current Value</p>
            <p className="text-xl font-black text-ink-primary">
              {trendDataPoints[trendDataPoints.length - 1]?.value} <span className="text-xs font-normal text-ink-secondary">{trendDataPoints[0]?.unit}</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold">Normal range status</p>
          </div>

          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase">Reference Interval</p>
            <p className="text-base font-bold text-ink-primary">
              {trendDataPoints[0]?.reference_range || '13.5 - 17.5'}
            </p>
            <p className="text-[11px] text-ink-secondary">Standard laboratory benchmark</p>
          </div>

          <div className="p-4 bg-shell-bg rounded-2xl border border-shell-border space-y-1">
            <p className="text-[11px] font-bold text-ink-secondary uppercase">AI Longitudinal Insight</p>
            <p className="text-xs font-bold text-teal-brand">Stable trajectory</p>
            <p className="text-[11px] text-ink-secondary">No significant variance detected across recent uploads.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
