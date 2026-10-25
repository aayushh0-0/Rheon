import React, { useState, useEffect } from 'react';
import { FileText, Download, ArrowUpRight, Search } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';
import { PatientTab } from './PatientShell';

interface MedicalHistoryProps {
  onNavigateTab: (tab: PatientTab) => void;
}

export const MedicalHistory: React.FC<MedicalHistoryProps> = ({ onNavigateTab }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    medicalApi.listReports('patient-priya-01').then((res) => {
      setReports(res);
    }).catch(() => {});
  }, []);

  const filteredReports = reports.filter(r =>
    r.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.summary && r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold tracking-wider">
              ARCHIVE & RECORDS
            </span>
            <span className="text-xs text-ink-secondary font-medium">Longitudinal Medical History</span>
          </div>
          <h2 className="text-2xl font-black text-ink-primary tracking-tight">
            Medical History Archive
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Browse all uploaded diagnostic reports, structured lab extractions, and verification audit trails.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all"
          >
            <span>Upload New Report</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-shell-border shadow-card flex items-center gap-3">
        <Search className="w-4 h-4 text-ink-secondary ml-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by report name, category, or clinical summary..."
          className="w-full text-xs font-medium text-ink-primary bg-transparent focus:outline-none"
        />
      </div>

      {/* Reports List Table */}
      <div className="bg-white rounded-3xl border border-shell-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-shell-border flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-brand" />
            Saved Reports ({filteredReports.length})
          </h3>
          <span className="text-xs text-ink-secondary font-medium">Encrypted & Secure Storage</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-shell-border text-[11px] font-bold text-ink-secondary uppercase tracking-wider bg-shell-bg/50">
                <th className="py-3 px-6">Report Title / Filename</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Parameters</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shell-border text-xs">
              {filteredReports.map((r) => (
                <tr key={r.id} className="hover:bg-shell-bg/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-ink-primary flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-brand/10 text-teal-brand flex items-center justify-center shrink-0 font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-ink-primary">{r.filename}</p>
                      <p className="text-[10px] text-ink-secondary truncate max-w-xs">{r.summary || 'Extracted successfully'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-medium text-ink-secondary">
                    <span className="px-2.5 py-1 rounded-lg bg-shell-bg border border-shell-border text-[11px] font-bold text-ink-primary">
                      {r.report_type}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium text-ink-secondary">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-ink-primary">
                    {r.measurements?.length || 0} extracted
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => onNavigateTab('analysis')}
                      className="px-3 py-1.5 bg-shell-bg hover:bg-white text-ink-primary border border-shell-border rounded-xl font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                    >
                      <span>Analyze</span>
                      <ArrowUpRight className="w-3 h-3 text-teal-brand" />
                    </button>
                    <button
                      onClick={() => onNavigateTab('pdf')}
                      className="px-3 py-1.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-ink-secondary">
                    No medical reports found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
