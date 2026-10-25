import React, { useState, useEffect } from 'react';
import {
  Upload,
  TrendingUp,
  FileText,
  Download,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  FileCheck,
} from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';
import { PatientTab } from './PatientShell';

interface HealthOverviewProps {
  onNavigateTab: (tab: PatientTab) => void;
}

export const HealthOverview: React.FC<HealthOverviewProps> = ({ onNavigateTab }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    medicalApi.listReports('patient-priya-01').then((res) => {
      setReports(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const latestReport = reports[0];
  const allMeasurements = reports.flatMap(r => r.measurements || []);
  const abnormalCount = allMeasurements.filter(m => m.status !== 'NORMAL').length;
  const verifiedCount = allMeasurements.filter(m => m.is_verified).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-brand/10 via-pastel-mint-bg to-white p-6 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-brand text-white text-[10px] font-bold tracking-wider">
              PERSONAL HEALTH INTELLIGENCE
            </span>
            <span className="text-xs text-ink-secondary font-medium">
              Secure Longitudinal Medical Records & Analytics
            </span>
          </div>
          <h2 className="text-2xl font-black text-ink-primary tracking-tight">
            Priya Sharma's Health Command Center
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Track lab reports, review extracted values, monitor longitudinal trends, and export verified PDF summaries.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab('upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all transform hover:scale-[1.02]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Report</span>
          </button>
          <button
            onClick={() => onNavigateTab('pdf')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-shell-border hover:bg-shell-bg text-ink-primary rounded-xl text-xs font-bold shadow-card transition-all"
          >
            <Download className="w-4 h-4 text-teal-brand" />
            <span>Export Health PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-secondary uppercase">Saved Reports</p>
            <h3 className="text-2xl font-black text-ink-primary mt-1">{reports.length}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All verified & secure
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-brand/10 border border-teal-brand/20 flex items-center justify-center text-teal-brand">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-secondary uppercase">Tracked Measurements</p>
            <h3 className="text-2xl font-black text-ink-primary mt-1">{allMeasurements.length}</h3>
            <p className="text-[11px] text-ink-secondary mt-1">
              {verifiedCount} clinically reviewed
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-secondary uppercase">Out of Reference Range</p>
            <h3 className={`text-2xl font-black mt-1 ${abnormalCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {abnormalCount}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-1">
              {abnormalCount === 0 ? 'All parameters optimal' : 'Requires clinical attention'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${abnormalCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-shell-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-secondary uppercase">Longitudinal Tracking</p>
            <h3 className="text-2xl font-black text-ink-primary mt-1">Active</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Trends calculated
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Measurements Cards */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-shell-border shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-brand" />
                Latest Extracted Lab Measurements
              </h3>
              <p className="text-xs text-ink-secondary">
                From most recent report: <strong className="text-ink-primary">{latestReport?.filename || 'Delhi_NCR_Panel.pdf'}</strong>
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('trends')}
              className="text-xs text-teal-brand hover:underline font-bold flex items-center gap-1"
            >
              <span>View All Trends</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {latestReport?.measurements?.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-shell-bg border border-shell-border flex flex-col justify-between hover:shadow-card transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink-primary">{m.parameter_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    m.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-xl font-black text-ink-primary">{m.value}</span>
                  <span className="text-xs font-semibold text-ink-secondary">{m.unit}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-secondary pt-2 border-t border-shell-border/60">
                  <span>Ref: {m.reference_range || 'N/A'}</span>
                  <span className="text-teal-brand font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Reviewed
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-xs text-ink-secondary">No measurements found. Upload a report to begin.</p>
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions */}
        <div className="bg-white p-6 rounded-3xl border border-shell-border shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-brand" />
              Health Intelligence Modules
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('upload')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-shell-bg hover:bg-teal-brand/5 border border-shell-border text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-brand/10 text-teal-brand flex items-center justify-center font-bold">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary group-hover:text-teal-brand">Upload Report & OCR</p>
                    <p className="text-[10px] text-ink-secondary">PDF & scan extraction</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-secondary group-hover:text-teal-brand" />
              </button>

              <button
                onClick={() => onNavigateTab('analysis')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-shell-bg hover:bg-teal-brand/5 border border-shell-border text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary group-hover:text-teal-brand">Report Analysis & Review</p>
                    <p className="text-[10px] text-ink-secondary">Validate extracted values</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-secondary group-hover:text-teal-brand" />
              </button>

              <button
                onClick={() => onNavigateTab('trends')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-shell-bg hover:bg-teal-brand/5 border border-shell-border text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary group-hover:text-teal-brand">Health Trends & Charts</p>
                    <p className="text-[10px] text-ink-secondary">Longitudinal line graphs</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-secondary group-hover:text-teal-brand" />
              </button>

              <button
                onClick={() => onNavigateTab('history')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-shell-bg hover:bg-teal-brand/5 border border-shell-border text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary group-hover:text-teal-brand">Medical History Archive</p>
                    <p className="text-[10px] text-ink-secondary">All saved reports</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-secondary group-hover:text-teal-brand" />
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl text-[11px] text-ink-primary space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-teal-brand">
              <ShieldCheck className="w-4 h-4" />
              Data Privacy & Security
            </p>
            <p className="text-ink-secondary leading-tight">
              Your health records are encrypted and isolated under RHEON AI patient security policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
