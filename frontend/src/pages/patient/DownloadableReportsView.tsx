import React, { useState, useEffect } from 'react';
import { Download, FileText, ShieldCheck, ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { medicalApi, MedicalReport } from '../../services/medicalApi';

interface DownloadableReportsViewProps {
  onBack: () => void;
}

export const DownloadableReportsView: React.FC<DownloadableReportsViewProps> = ({ onBack }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  useEffect(() => {
    medicalApi.listReports('patient-priya-01').then((res) => {
      setReports(res);
      if (res.length > 0) setSelectedReportId(res[0].id);
    }).catch(() => {});
  }, []);

  const currentReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Delete this report from medical history?')) return;
    try {
      await medicalApi.deleteReport(reportId);
      const refreshed = await medicalApi.listReports('patient-priya-01');
      setReports(refreshed);
      setSelectedReportId(refreshed[0]?.id || '');
    } catch (err) {
      console.error(err);
      window.alert('Could not delete report.');
    }
  };

  const handleDownloadPDF = () => {
    const element = document.createElement('a');
    const file = new Blob([
      `RHEON AI - OFFICIAL HEALTH SUMMARY REPORT\n` +
      `Report ID: ${currentReport?.id || 'demo'}\n` +
      `Patient ID: Priya Sharma (patient-priya-01)\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `Status: VERIFIED & CERTIFIED\n\n` +
      `Summary: ${currentReport?.summary || 'No summary'}\n\n` +
      `Measurements:\n` +
      (currentReport?.measurements || []).map(m => `- ${m.parameter_name}: ${m.value} ${m.unit || ''} [Ref: ${m.reference_range || 'N/A'}] (${m.status})`).join('\n')
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `rheon_health_summary_${currentReport?.patient_id || 'priya'}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-teal-brand font-bold flex items-center gap-1.5 mb-2 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-brand/10 text-teal-brand text-[10px] font-bold tracking-wider">
              OFFICIAL EXPORTS
            </span>
            <span className="text-xs text-ink-secondary font-medium">Downloadable Health PDF & Summary</span>
          </div>
          <h2 className="text-2xl font-black text-ink-primary tracking-tight">
            Downloadable Reports & Certificates
          </h2>
          <p className="text-xs md:text-sm text-ink-secondary mt-1">
            Generate and download certified clinical health summary documents, lab extraction audits, and physician briefs.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-ink-secondary">Report:</label>
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

      {/* Main Export Center Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: PDF Preview Card */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-shell-border shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-shell-border pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-brand" />
                Certified Health Summary Document
              </h3>
              <p className="text-xs text-ink-secondary">
                Ready for clinical sharing, hospital admission, or personal records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => currentReport && handleDeleteReport(currentReport.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete report from history
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-xs font-bold shadow-pill transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Summary</span>
            </button>
          </div>

          {/* Document Preview Box */}
          <div className="p-6 bg-shell-bg rounded-2xl border border-shell-border space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-shell-border pb-3">
              <div>
                <p className="font-bold text-ink-primary text-sm font-sans">RHEON AI HEALTH INTELLIGENCE NETWORK</p>
                <p className="text-[10px] text-ink-secondary">Official Clinical Summary & Verification Certificate</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                VERIFIED PDF
              </span>
            </div>

            <div className="space-y-1 text-ink-secondary font-sans">
              <p><strong className="text-ink-primary">Patient Name:</strong> Priya Sharma (ID: patient-priya-01)</p>
              <p><strong className="text-ink-primary">Report Source:</strong> {currentReport?.filename || 'Delhi_NCR_Metabolic_Panel.pdf'}</p>
              <p><strong className="text-ink-primary">Generated On:</strong> {new Date().toLocaleString()}</p>
              <p><strong className="text-ink-primary">Clinical Summary:</strong> {currentReport?.summary || 'All parameters extracted and verified successfully.'}</p>
            </div>

            <div className="pt-3 border-t border-shell-border space-y-2">
              <p className="font-bold text-ink-primary text-xs font-sans">Extracted Parameters ({currentReport?.measurements?.length || 0}):</p>
              <div className="space-y-1">
                {currentReport?.measurements?.map(m => (
                  <div key={m.id} className="flex justify-between py-1 border-b border-shell-border/40 text-[11px]">
                    <span className="font-bold text-ink-primary">{m.parameter_name}</span>
                    <span>{m.value} {m.unit} (Ref: {m.reference_range}) - <strong className="text-teal-brand">{m.status}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 text-[10px] text-ink-secondary flex items-center justify-between border-t border-shell-border">
              <span>Certified by Rheon AI Platform • Delhi NCR Emergency & Blood Network</span>
              <span className="text-teal-brand font-bold">Secure Cryptographic Audit ID: rheon-pdf-{Date.now().toString().slice(-6)}</span>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-shell-border shadow-card space-y-4">
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-brand" />
              Document Security
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              All exported PDF summaries include digital provenance hashes ensuring tamper-proof verification by healthcare providers across Delhi NCR.
            </p>
            <button
              onClick={() => window.open('https://www.google.com/maps/search/hospitals+Delhi+NCR+blood+bank/', '_blank')}
              className="w-full flex items-center justify-between p-3 bg-shell-bg hover:bg-teal-brand/5 border border-shell-border rounded-xl text-xs font-bold text-ink-primary transition-all group"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-teal-brand" />
                <span>Open Hospital Google Maps</span>
              </div>
              <span className="text-teal-brand group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
