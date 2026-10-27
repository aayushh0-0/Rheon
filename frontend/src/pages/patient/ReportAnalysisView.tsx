import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  FileText,
  ArrowLeft,
  Sparkles,
  XCircle,
  Trash2,
} from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';
import { buildGroundedExplanations, ParsedLabMeasurement } from '../../utils/labReportParser';

interface ReportAnalysisViewProps {
  onBack: () => void;
  /** Optional: jump straight to a report just uploaded */
  initialReportId?: string;
}

function statusBadgeClass(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'LOW') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (s === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200';
  if (s === 'NORMAL') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-shell-bg text-ink-secondary border-shell-border';
}

export const ReportAnalysisView: React.FC<ReportAnalysisViewProps> = ({ onBack, initialReportId }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [editingMeasId, setEditingMeasId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    medicalApi
      .listReports('patient-priya-01')
      .then((res) => {
        setReports(res);
        if (initialReportId && res.some((r) => r.id === initialReportId)) {
          setSelectedReportId(initialReportId);
        } else if (res.length > 0) {
          setSelectedReportId(res[0].id);
        }
      })
      .catch(() => {});
  }, [initialReportId]);

  const currentReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const explanations = useMemo(() => {
    if (!currentReport?.measurements?.length) return [];
    if (currentReport.explanations?.length) return currentReport.explanations;
    const asParsed: ParsedLabMeasurement[] = currentReport.measurements.map((m) => ({
      parameter_name: m.parameter_name,
      value: m.value,
      unit: m.unit || '',
      reference_range: m.reference_range || '',
      status: (m.status as ParsedLabMeasurement['status']) || 'UNKNOWN',
    }));
    return buildGroundedExplanations(asParsed);
  }, [currentReport]);

  const statusCounts = useMemo(() => {
    const c = { NORMAL: 0, LOW: 0, HIGH: 0, CRITICAL: 0 };
    for (const m of currentReport?.measurements || []) {
      const s = (m.status || '').toUpperCase();
      if (s in c) c[s as keyof typeof c]++;
    }
    return c;
  }, [currentReport]);

  const handleSaveEdit = async (measId: string) => {
    try {
      await medicalApi.updateMeasurement(measId, {
        value: editValue,
        notes: editNotes,
        is_verified: true,
      });
      const refreshed = await medicalApi.listReports('patient-priya-01');
      setReports(refreshed);
      setEditingMeasId(null);
    } catch (err) {
      console.error('Failed to update measurement', err);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Delete this report analysis permanently from medical history?')) return;
    try {
      await medicalApi.deleteReport(reportId);
      const refreshed = await medicalApi.listReports('patient-priya-01');
      setReports(refreshed);
      setSelectedReportId(refreshed[0]?.id || '');
    } catch (err) {
      console.error('Failed to delete report', err);
      window.alert('Could not delete report. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-shell-border shadow-card">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-teal-brand font-bold flex items-center gap-1.5 mb-2 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <h2 className="text-xl md:text-2xl font-black text-ink-primary">
            Report Analysis & Extraction Review
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Values below are parsed from the uploaded report text/PDF — not hardcoded demo numbers.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-shell-border text-xs font-medium bg-white max-w-[220px]"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.filename}
                </option>
              ))}
            </select>
            {currentReport && (
              <button
                type="button"
                title="Delete selected report"
                onClick={() => handleDeleteReport(currentReport.id)}
                className="p-2 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {!currentReport ? (
        <div className="bg-white rounded-3xl border border-shell-border p-12 text-center shadow-card">
          <FileText className="w-10 h-10 text-ink-secondary/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-ink-primary">No reports extracted yet</p>
          <p className="text-xs text-ink-secondary mt-1">Upload a laboratory PDF from the patient portal to begin analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-shell-border shadow-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-brand" />
                  Extracted Parameters ({currentReport.measurements.length})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-brand/10 text-teal-brand border border-teal-brand/20">
                    Status: {currentReport.status}
                  </span>
                  <button
                    type="button"
                    title="Delete report analysis"
                    onClick={() => handleDeleteReport(currentReport.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-2xl bg-teal-brand/5 border border-teal-brand/15 text-xs text-ink-secondary">
                <p className="font-bold text-teal-brand flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Extraction Summary
                </p>
                <p>{currentReport.summary}</p>
              </div>

              {/* Status chips matching demo report style */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { k: 'NORMAL', n: statusCounts.NORMAL, bg: 'bg-emerald-50 text-emerald-800' },
                  { k: 'LOW', n: statusCounts.LOW, bg: 'bg-amber-50 text-amber-800' },
                  { k: 'HIGH', n: statusCounts.HIGH, bg: 'bg-orange-50 text-orange-800' },
                  { k: 'CRITICAL', n: statusCounts.CRITICAL, bg: 'bg-slate-100 text-slate-600' },
                ].map((c) => (
                  <div key={c.k} className={`rounded-xl px-2 py-2 text-center ${c.bg}`}>
                    <p className="text-lg font-black">{c.n}</p>
                    <p className="text-[9px] font-bold tracking-wide">{c.k}</p>
                  </div>
                ))}
              </div>

              {currentReport.measurements.length === 0 ? (
                <p className="text-xs text-ink-secondary py-8 text-center">
                  No parameters detected. Re-upload with clearer PDF text or paste the lab transcript.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-shell-border text-[10px] uppercase tracking-wider text-ink-secondary">
                        <th className="py-2 pr-2 font-bold">Test Parameter</th>
                        <th className="py-2 pr-2 font-bold">Result & Unit</th>
                        <th className="py-2 pr-2 font-bold">Reference Range</th>
                        <th className="py-2 pr-2 font-bold">Interpretation</th>
                        <th className="py-2 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.measurements.map((m) => (
                        <tr key={m.id} className="border-b border-shell-border/60 last:border-0">
                          <td className="py-3 pr-2 font-bold text-ink-primary">{m.parameter_name}</td>
                          <td className="py-3 pr-2 font-semibold text-ink-primary">
                            {editingMeasId === m.id ? (
                              <input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 rounded-lg border border-shell-border"
                              />
                            ) : (
                              <>
                                {m.value} <span className="text-ink-secondary font-medium">{m.unit}</span>
                              </>
                            )}
                          </td>
                          <td className="py-3 pr-2 text-ink-secondary">{m.reference_range || '—'}</td>
                          <td className="py-3 pr-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadgeClass(
                                m.status
                              )}`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {editingMeasId === m.id ? (
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(m.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-brand"
                              >
                                <Save className="w-3 h-3" /> Save
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMeasId(m.id);
                                  setEditValue(m.value);
                                  setEditNotes(m.notes || '');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-secondary hover:text-teal-brand"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-shell-border shadow-card space-y-4">
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-brand" />
                Grounded AI Explanation
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Based on structured extraction from{' '}
                <strong className="text-ink-primary">{currentReport.filename}</strong>, parameters are evaluated
                against the laboratory-supplied reference intervals in the report.
              </p>
              <div className="space-y-3 pt-2 border-t border-shell-border">
                {explanations.length === 0 ? (
                  <p className="text-xs text-ink-secondary">Upload a report with lab values to generate explanations.</p>
                ) : (
                  explanations.map((ex) => (
                    <div
                      key={ex.title}
                      className={`p-3 rounded-2xl border text-xs space-y-1 ${
                        ex.tone === 'ok'
                          ? 'bg-shell-bg border-shell-border'
                          : ex.tone === 'bad'
                          ? 'bg-red-50 border-red-100'
                          : 'bg-amber-50 border-amber-100'
                      }`}
                    >
                      <p className="font-bold text-ink-primary flex items-center gap-1.5">
                        {ex.tone === 'ok' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {ex.title}
                      </p>
                      <p className="text-ink-secondary leading-tight">{ex.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-pastel-rose-bg border border-pastel-rose-border rounded-3xl text-xs text-pastel-rose-text space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-crimson">
                <AlertTriangle className="w-4 h-4" />
                Clinical Disclaimer
              </p>
              <p className="leading-tight opacity-90">
                AI explanations are assistive summaries and do not replace professional medical diagnosis. Consult a
                qualified physician for clinical evaluation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
