import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Loader2, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';
import { readUploadAsText, DEMO_MIXED_BLOOD_REPORT_TEXT } from '../../utils/pdfTextExtract';

interface UploadReportViewProps {
  onSuccess: (report: MedicalReport) => void;
  onCancel: () => void;
}

export const UploadReportView: React.FC<UploadReportViewProps> = ({ onSuccess, onCancel }) => {
  const [filename, setFilename] = useState('');
  const [reportType, setReportType] = useState('BLOOD_WORK');
  const [contentText, setContentText] = useState('');
  const [extractHint, setExtractHint] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow selecting the same file again later
    e.target.value = '';
    if (!file) return;

    setFilename(file.name);
    setError(null);
    setReading(true);
    setExtractHint('Reading file…');
    setContentText('');

    // Defer heavy work so the "Reading…" state paints first
    await new Promise((r) => setTimeout(r, 30));

    try {
      const text = await readUploadAsText(file);
      if (text && text.trim().length > 20) {
        setContentText(text);
        setExtractHint(
          `Extracted lab text from “${file.name}” (${text.trim().length} chars). Review below, then Process.`
        );
      } else {
        setContentText('');
        setExtractHint(
          'Little text recovered from this PDF (it may be image-only). Paste the laboratory transcript below, or try the RHEON demo mixed blood PDF.'
        );
      }
    } catch (err) {
      console.warn(err);
      setExtractHint('Could not auto-read file. Paste OCR / report text below.');
    } finally {
      setReading(false);
    }
  };

  const loadDemoText = () => {
    setFilename('RHEON_Demo_Mixed_Blood_Report.pdf');
    setContentText(DEMO_MIXED_BLOOD_REPORT_TEXT);
    setExtractHint('Loaded demo mixed blood report text (CBC · Glucose · Lipids). Click Process to extract.');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename && !contentText.trim()) {
      setError('Please select a report file or paste laboratory text.');
      return;
    }
    if (!contentText.trim()) {
      setError('No laboratory text to parse. Wait for extraction to finish, or paste values / use Load demo text.');
      return;
    }

    setUploading(true);
    setError(null);
    // Yield so spinner shows
    await new Promise((r) => setTimeout(r, 20));

    try {
      const report = await medicalApi.uploadReport({
        patient_id: 'patient-priya-01',
        filename: filename || 'pasted-lab-report.txt',
        report_type: reportType,
        content_text: contentText,
      });
      setUploading(false);
      if (!report.measurements?.length) {
        setError(
          'No lab parameters detected in the text. Check that values look like “Hemoglobin 10.2 g/dL … LOW”.'
        );
      }
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
            Upload a PDF or paste report text. RHEON extracts structured measurements from the document content — not mock values.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-pastel-rose-bg border border-pastel-rose-border text-xs text-crimson">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {extractHint && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-teal-brand/5 border border-teal-brand/20 text-xs text-ink-primary">
            {reading ? (
              <Loader2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-brand animate-spin" />
            ) : (
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-teal-brand" />
            )}
            <span>{extractHint}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
              Report file (PDF / text)
            </label>
            <label
              className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed border-shell-border hover:border-teal-brand/50 bg-shell-bg/40 cursor-pointer transition-colors ${
                reading ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              {reading ? (
                <Loader2 className="w-8 h-8 text-teal-brand animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-teal-brand" />
              )}
              <span className="text-xs font-bold text-ink-primary">
                {reading ? 'Extracting text…' : filename ? filename : 'Click to select laboratory PDF'}
              </span>
              <span className="text-[10px] text-ink-secondary">
                Fast in-browser read — UI stays responsive
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.csv,application/pdf,text/plain"
                className="hidden"
                onChange={handleFileSelect}
                disabled={reading || uploading}
              />
            </label>
            <button
              type="button"
              onClick={loadDemoText}
              className="mt-2 text-[11px] font-bold text-teal-brand hover:underline"
            >
              Or load demo mixed blood report text
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
                Display filename
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. Mixed_Blood_Report.pdf"
                className="w-full px-4 py-2.5 rounded-xl border border-shell-border bg-white text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-primary uppercase tracking-wider mb-1.5">
                Report type
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
              Extracted / pasted laboratory text
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder={'Auto-filled from PDF when possible. Example:\nHemoglobin 10.2 g/dL 13.5-17.5 LOW\nFasting Blood Glucose 112 mg/dL …'}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-shell-border bg-white text-[11px] font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-teal-brand font-mono"
            />
            <p className="mt-1 text-[10px] text-ink-secondary flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-teal-brand" />
              Parser reads CBC · Glucose · Lipid parameters and flags LOW / HIGH / NORMAL from this text.
            </p>
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
              disabled={uploading || reading}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting & Parsing…</span>
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
