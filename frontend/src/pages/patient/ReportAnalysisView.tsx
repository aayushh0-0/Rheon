import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Edit3, Save, FileText, ArrowLeft, Sparkles } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';

interface ReportAnalysisViewProps {
  onBack: () => void;
}

export const ReportAnalysisView: React.FC<ReportAnalysisViewProps> = ({ onBack }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [editingMeasId, setEditingMeasId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    medicalApi.listReports('patient-priya-01').then((res) => {
      setReports(res);
      if (res.length > 0) {
        setSelectedReportId(res[0].id);
      }
    }).catch(() => {});
  }, []);

  const currentReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const handleSaveEdit = async (measId: string) => {
    try {
      const updated = await medicalApi.updateMeasurement(measId, {
        value: editValue,
        notes: editNotes,
        is_verified: true,
      });
      setReports(prev => prev.map(r => {
        if (r.id === currentReport.id) {
          return {
            ...r,
            measurements: r.measurements.map(m => m.id === measId ? updated : m)
          };
        }
        return r;
      }));
      setEditingMeasId(null);
    } catch (err) {
      console.error('Failed to update measurement', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
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
            Review AI-extracted laboratory measurements, verify values, edit corrections, and read grounded clinical summaries.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-ink-secondary">Select Report:</label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-shell-border bg-shell-bg text-xs font-bold text-ink-primary focus:outline-none"
            >
              {reports.map(r => (
                <option key={r.id} value={r.id}>{r.filename}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {currentReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Measurements Table & Review */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-shell-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-brand" />
                Extracted Parameters ({currentReport.measurements?.length || 0})
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Status: {currentReport.status}
              </span>
            </div>

            <div className="p-4 bg-pastel-mint-bg border border-pastel-mint-border rounded-2xl text-xs text-ink-primary flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-teal-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">AI Extraction Summary</p>
                <p className="text-ink-secondary mt-0.5">{currentReport.summary}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-shell-border text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                    <th className="py-3 px-3">Test Parameter</th>
                    <th className="py-3 px-3">Result & Unit</th>
                    <th className="py-3 px-3">Reference Range</th>
                    <th className="py-3 px-3">Interpretation</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shell-border text-xs">
                  {currentReport.measurements?.map((m) => {
                    const isEditing = editingMeasId === m.id;
                    return (
                      <tr key={m.id} className="hover:bg-shell-bg/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-ink-primary">{m.parameter_name}</td>
                        <td className="py-3 px-3 font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 px-2 py-1 rounded border border-shell-border text-xs font-bold"
                            />
                          ) : (
                            <span className="text-ink-primary font-bold text-sm">
                              {m.value} <span className="text-xs font-normal text-ink-secondary">{m.unit}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-ink-secondary">{m.reference_range || 'Not provided'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveEdit(m.id)}
                              className="px-2.5 py-1 bg-teal-brand text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingMeasId(m.id);
                                setEditValue(m.value);
                                setEditNotes(m.notes || '');
                              }}
                              className="px-2.5 py-1 bg-shell-bg hover:bg-white text-ink-primary border border-shell-border rounded-lg font-medium text-[11px] inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-teal-brand" /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Col: AI Grounded Explanation & Guidelines */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-shell-border shadow-card space-y-4">
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-brand" />
                Grounded AI Explanation
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Based on structured extraction from <strong className="text-ink-primary">{currentReport.filename}</strong>, all analyzed parameters are evaluated against the laboratory-supplied reference intervals.
              </p>
              <div className="space-y-3 pt-2 border-t border-shell-border">
                <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-xs space-y-1">
                  <p className="font-bold text-ink-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Hemoglobin & Oxygen Capacity
                  </p>
                  <p className="text-ink-secondary leading-tight">
                    Measured at 14.2 g/dL (Normal range: 13.5 - 17.5 g/dL). Adequate red blood cell mass for tissue oxygenation.
                  </p>
                </div>

                <div className="p-3 bg-shell-bg rounded-2xl border border-shell-border text-xs space-y-1">
                  <p className="font-bold text-ink-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Glycemic Control (Glucose & HbA1c)
                  </p>
                  <p className="text-ink-secondary leading-tight">
                    Fasting glucose (98 mg/dL) and HbA1c (5.4%) are within normal non-diabetic reference intervals.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-pastel-rose-bg border border-pastel-rose-border rounded-3xl text-xs text-pastel-rose-text space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-crimson">
                <AlertTriangle className="w-4 h-4" />
                Clinical Disclaimer
              </p>
              <p className="leading-tight opacity-90">
                AI explanations are assistive summaries and do not replace professional medical diagnosis. Consult a qualified physician for clinical evaluation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
