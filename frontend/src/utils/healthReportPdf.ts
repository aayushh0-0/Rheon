import type { MedicalReport } from '../services/medicalApi';

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHealthReportHtml(
  report: MedicalReport,
  patientName = 'Priya Sharma',
  patientPhoto?: string | null
): string {
  const logoSrc = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
  const photo =
    patientPhoto &&
    typeof patientPhoto === 'string' &&
    (patientPhoto.startsWith('data:image/') ||
      patientPhoto.startsWith('http') ||
      patientPhoto.startsWith('/'))
      ? patientPhoto
      : null;
  const photoHtml = photo
    ? `<img class="patient-photo" src="${photo.replace(/"/g, '')}" alt="Patient" />`
    : `<div class="patient-photo placeholder">&#128100;</div>`;
  const issued = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const uploaded = report.created_at
    ? new Date(report.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const rows = (report.measurements || [])
    .map((m, i) => {
      const status = (m.status || 'UNKNOWN').toUpperCase();
      const cls =
        status === 'CRITICAL'
          ? 'st-crit'
          : status === 'HIGH' || status === 'LOW'
            ? 'st-warn'
            : status === 'NORMAL'
              ? 'st-ok'
              : 'st-unk';
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(m.parameter_name)}</td>
        <td>${escapeHtml(String(m.value))}${m.unit ? ' ' + escapeHtml(m.unit) : ''}</td>
        <td>${escapeHtml(m.reference_range || '—')}</td>
        <td><span class="badge ${cls}">${escapeHtml(status)}</span></td>
      </tr>`;
    })
    .join('');

  const measTable = rows
    ? `<table class="meds"><thead><tr><th>#</th><th>Parameter</th><th>Value</th><th>Reference</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="pending-box"><div class="pending-title">No structured parameters</div><div class="pending-sub">Upload a lab report to extract measurements.</div></div>`;

  const counts = report.status_counts;
  const countsHtml = counts
    ? `<div class="counts">
        <span class="c ok">Normal ${counts.NORMAL ?? 0}</span>
        <span class="c warn">Low ${counts.LOW ?? 0}</span>
        <span class="c warn">High ${counts.HIGH ?? 0}</span>
        <span class="c crit">Critical ${counts.CRITICAL ?? 0}</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Health Report — ${escapeHtml(report.filename || 'summary')}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f1f1c; background: #f3f4f6; font-size: 12px; line-height: 1.45; }
  .actions { position: sticky; top: 0; z-index: 20; background: #0f766e; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; }
  .actions button { background: #fff; color: #0f766e; border: none; border-radius: 999px; padding: 8px 18px; font-weight: 700; cursor: pointer; font-size: 12px; }
  .sheet { max-width: 820px; margin: 16px auto 32px; background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 8px 30px rgba(15,23,42,.08); }
  .topbar { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #0f766e; gap: 12px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand img.logo { width: 48px; height: 48px; object-fit: contain; border-radius: 10px; background: #f0fdfa; border: 1px solid #d1e7e2; }
  .brand-text h1 { font-size: 18px; font-weight: 800; color: #0f766e; }
  .brand-text p { font-size: 9px; color: #5b6b68; text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
  .demo-pill { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .06em; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; color: #0f766e; border: 1px solid #a7f3d0; }
  .title-block { margin: 18px 0 6px; }
  .title-block h2 { font-size: 20px; font-weight: 800; }
  .hospital-banner { margin: 12px 0 16px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(90deg,#f0fdfa,#f8fafc); border: 1px solid #d1e7e2; }
  .hospital-banner strong { font-size: 14px; color: #0f766e; display: block; }
  .hospital-banner span { font-size: 11px; color: #5b6b68; }
  .section { margin-top: 14px; border: 1px solid #e2e8e6; border-radius: 14px; overflow: hidden; }
  .section-h { padding: 9px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8e6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  .section-b { padding: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
  .field label { display: block; font-size: 9px; font-weight: 700; color: #5b6b68; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .field div { font-size: 12px; font-weight: 600; word-break: break-word; }
  .patient-row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  .patient-photo { width: 88px; height: 88px; border-radius: 16px; object-fit: cover; border: 1px solid #d1e7e2; background: #f0fdfa; flex-shrink: 0; }
  .patient-photo.placeholder { display: flex; align-items: center; justify-content: center; font-size: 36px; }
  table.meds { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.meds th { text-align: left; padding: 6px 8px; background: #f8fafc; color: #5b6b68; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #e2e8e6; }
  table.meds td { padding: 8px; border-bottom: 1px solid #f1f5f4; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .st-ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .st-warn { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
  .st-crit { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .st-unk { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
  .pending-box { text-align: center; padding: 18px; border-radius: 12px; background: #f8fafc; border: 1px dashed #cbd5d1; }
  .pending-title { font-weight: 700; }
  .pending-sub { font-size: 11px; color: #5b6b68; }
  .counts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .counts .c { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid #e2e8e6; background: #f8fafc; }
  .counts .ok { color: #047857; }
  .counts .warn { color: #c2410c; }
  .counts .crit { color: #b91c1c; }
  .footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid #e2e8e6; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .footer .muted { font-size: 10px; color: #5b6b68; }
  .footer .muted strong { color: #0f1f1c; display: block; font-size: 11px; margin-top: 2px; }
  .disclaimer { margin-top: 14px; text-align: center; font-size: 9px; color: #94a3b0; text-transform: uppercase; letter-spacing: .08em; }
  @media print {
    body { background: #fff; }
    .actions { display: none !important; }
    .sheet { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
  }
</style></head>
<body>
  <div class="actions">
    <span>RHEON AI · Health report — use Print → Save as PDF</span>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="sheet">
    <div class="topbar">
      <div class="brand">
        <img class="logo" src="${logoSrc}" alt="RHEON AI" onerror="this.style.display='none'"/>
        <div class="brand-text">
          <h1>RHEON AI</h1>
          <p>Personal Health &amp; Emergency Network</p>
        </div>
      </div>
      <div class="demo-pill">CERTIFIED SUMMARY</div>
    </div>

    <div class="title-block">
      <h2>Clinical Health Summary</h2>
    </div>

    <div class="hospital-banner">
      <strong>Delhi NCR Trauma &amp; Longitudinal Medical Network</strong>
      <span>Partner facilities · AIIMS · Max · Medanta · Apollo · Rotary Blood Network</span>
    </div>

    <div class="section">
      <div class="section-h">Patient &amp; document</div>
      <div class="section-b">
        <div class="patient-row">
          ${photoHtml}
          <div class="grid" style="flex:1;min-width:220px;">
            <div class="field"><label>Patient</label><div>${escapeHtml(patientName)}</div></div>
            <div class="field"><label>Patient ID</label><div>${escapeHtml(report.patient_id || 'patient-priya-01')}</div></div>
            <div class="field"><label>Report file</label><div>${escapeHtml(report.filename || 'report')}</div></div>
            <div class="field"><label>Category</label><div>${escapeHtml(report.report_type || 'LAB')}</div></div>
            <div class="field"><label>Uploaded</label><div>${escapeHtml(uploaded)}</div></div>
            <div class="field"><label>Extraction status</label><div>${escapeHtml(report.status || 'EXTRACTED')}</div></div>
            <div class="field"><label>Report ID</label><div>${escapeHtml(report.id || '—')}</div></div>
            <div class="field"><label>Issued</label><div>${escapeHtml(issued)}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-h">Clinical summary</div>
      <div class="section-b">
        <p style="font-weight:600;font-size:12px;">${escapeHtml(report.summary || 'Structured lab extraction complete.')}</p>
        ${countsHtml}
      </div>
    </div>

    <div class="section">
      <div class="section-h">Extracted parameters (${(report.measurements || []).length})</div>
      <div class="section-b">${measTable}</div>
    </div>

    <div class="footer">
      <div class="muted">Generated by<strong>RHEON AI Care Portal</strong></div>
      <div class="muted">Network<strong>Delhi NCR Medical Grid</strong></div>
      <div class="muted">Audit<strong>rheon-pdf-${Date.now().toString().slice(-8)}</strong></div>
    </div>
    <p class="disclaimer">Demo clinical export · Not a substitute for official hospital letterhead · Verify before clinical use</p>
  </div>
</body></html>`;
}

/**
 * Open branded health-report preview.
 * Matches prescriptionPdf: no noopener (avoids blank about:blank), iframe fallback.
 */
export function openHealthReportDocument(
  report: MedicalReport,
  patientName?: string,
  patientPhoto?: string | null
) {
  if (!report) {
    window.alert('No report selected.');
    return;
  }
  const html = buildHealthReportHtml(report, patientName, patientPhoto);

  try {
    // Do NOT use noopener — that leaves a hung blank tab in Chromium/Brave
    const w = window.open('about:blank', '_blank');
    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      try {
        w.focus();
      } catch {
        /* ignore */
      }
      return;
    }
  } catch (err) {
    console.warn('window.open health report failed', err);
  }

  try {
    const existing = document.getElementById('rheon-health-print-frame');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'rheon-health-print-frame';
    iframe.setAttribute('title', 'Health report preview');
    iframe.style.cssText =
      'position:fixed;inset:24px;width:auto;height:auto;border:1px solid #d1e7e2;border-radius:16px;z-index:99999;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,.2);';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe document unavailable');
    doc.open();
    doc.write(html);
    doc.close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        iframe.remove();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  } catch (err) {
    console.error(err);
    window.alert('Could not open health report. Allow pop-ups for this site, then try again.');
  }
}

/** Download branded template as HTML (opens with full layout; Print → Save as PDF). */
export function downloadHealthReportDocument(
  report: MedicalReport,
  patientName?: string,
  patientPhoto?: string | null
) {
  if (!report) {
    window.alert('No report selected.');
    return;
  }
  const html = buildHealthReportHtml(report, patientName, patientPhoto);
  const safeName = (report.filename || 'health_summary')
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RHEON_Health_Summary_${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
