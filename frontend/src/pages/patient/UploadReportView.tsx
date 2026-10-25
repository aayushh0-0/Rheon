import React, { useState } from 'react';
import { Upload, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';

interface UploadReportViewProps {
  onSuccess: (report: MedicalReport) => void;
  onCancel: () => void;
}

export const UploadReportView: React.FC<UploadReportViewProps> = ({ onSuccess, onCancel }) => {
  const [filename, setFilename] = useState('');
  const [reportType, setReportType] = useState('BLOOD_WORK');
  const [contentText, setContentText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setContentText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename) {
      setError('Please select or enter a report file name.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const report = await medicalApi.uploadReport({
        patient_id: 'patient-priya-01',
        filename,
        report_type: reportType,
        content_text: contentText || `Uploaded report ${filename} containing metabolic and CBC parameters.`,
      });
      setUploading(false);
      onSuccess(report);
    } catch (err: any) {
      setUploading(false);
      setError(err?.message || 'Failed to upload and extract report. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card space-y-6">
        <div>
          <span className="px-3 py-1 bg-teal-brand/10 text-teal-brand rounded-full text-xs font-bold">
            DOCUMENT INGESTION & OCR
          </span>
          <h2 className="text-xl md:text-2xl font-black text-ink-primary mt-2">
            Upload Medical Laboratory Report
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Upload a PDF or paste report text. RHEON AI will securely extract structured measurements, reference ranges, and clinical indicators.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-pastel-rose-bg border border-pastel-rose-border text-crimson text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Dropzone */}
          <div className="border-2 border-dashed border-shell-border hover:border-teal-brand rounded-3xl p-8 text-center bg-shell-bg transition-colors flex flex-col items-center justify-center cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx,.png,.jpg"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-2xl bg-teal-brand/10 text-teal-brand flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-ink-primary">
              {filename ? filename : 'Click to browse or drop your medical report here'}
            </p>
            <p className="text-xs text-ink-secondary mt-1">
              Supports PDF, scanned reports, and laboratory transcripts (.pdf, .txt, .png)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
                Report Title / Filename
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. Annual_Metabolic_Panel_Oct2026.pdf"
                className="w-full px-4 py-2.5 rounded-xl border border-shell-border bg-white text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
                Report Category
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-shell-border bg-white text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand"
              >
                <option value="BLOOD_WORK">Comprehensive Blood Work / CBC</option>
                <option value="LIPID_PROFILE">Lipid Profile</option>
                <option value="GLUCOSE_PANEL">Glucose & HbA1c Panel</option>
                <option value="METABOLIC_PANEL">Comprehensive Metabolic Panel</option>
                <option value="GENERAL_CLINICAL">General Clinical Summary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
              Raw Text / Laboratory Transcript (Optional)
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Paste raw OCR text or clinical notes here if needed..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-shell-border bg-white text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-shell-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-shell-border text-xs font-bold text-ink-secondary hover:bg-shell-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting & Parsing...</span>
                </>
              ) : (
                <>
                  <span>Process Report & Extract</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
