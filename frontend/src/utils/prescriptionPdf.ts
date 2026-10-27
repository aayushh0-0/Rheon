import type { PatientAppointment } from '../types';

function formatTime12(t: string) {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${(m || '00').padStart(2, '0')} ${ampm}`;
}

function formatVisitDate(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time || '00:00'}`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch { /* ignore */ }
  return `${date} ${formatTime12(time)}`;
}

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeImageSrc(src?: string): string | null {
  if (!src || typeof src !== 'string') return null;
  const s = src.trim();
  // Cap very large data URLs to avoid browser hang
  if (s.startsWith('data:image/') && s.length > 400_000) return null;
  if (s.startsWith('data:image/')) return s;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s;
  return null;
}

function buildPrescriptionHtml(a: PatientAppointment): string {
  const meds = a.prescription?.medicines ?? [];
  const medsHtml = meds.length
    ? `<table class="meds"><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${meds
        .map(
          (m, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dosage)}</td><td>${escapeHtml(m.duration)}</td></tr>`
        )
        .join('')}</tbody></table>`
    : `<div class="pending-box"><div class="pending-title">Prescription pending</div><div class="pending-sub">The doctor has not completed the visit yet.</div></div>`;

  const photoSrc = safeImageSrc(a.patient_photo);
  const photoHtml = photoSrc
    ? `<img class="patient-photo" src="${photoSrc}" alt="Patient" />`
    : `<div class="patient-photo placeholder">&#128100;</div>`;

  const priorityClass =
    a.criticality === 'CRITICAL'
      ? 'badge-critical'
      : a.criticality === 'PRIORITY'
      ? 'badge-priority'
      : 'badge-routine';

  const logoSrc = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
  const reAppt = a.reappointment_date
    ? escapeHtml(
        `${a.reappointment_date}${a.reappointment_time ? ' · ' + formatTime12(a.reappointment_time) : ''}${
          a.reappointment_note ? ' — ' + a.reappointment_note : ''
        }`
      )
    : 'Not allotted yet';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Prescription — ${escapeHtml(a.id)}</title>
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
  .title-block h2 { font-size: 22px; font-weight: 800; }
  .hospital-banner { margin: 12px 0 16px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(90deg,#f0fdfa,#f8fafc); border: 1px solid #d1e7e2; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .hospital-banner strong { font-size: 14px; color: #0f766e; }
  .section { margin-top: 14px; border: 1px solid #e2e8e6; border-radius: 14px; overflow: hidden; }
  .section-h { padding: 9px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8e6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  .section-b { padding: 14px; }
  .patient-row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  .patient-photo { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; border: 1px solid #d1e7e2; background: #f0fdfa; flex-shrink: 0; }
  .patient-photo.placeholder { display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; flex: 1; min-width: 220px; }
  .field label { display: block; font-size: 9px; font-weight: 700; color: #5b6b68; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .field div { font-size: 12px; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .badge-critical { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .badge-priority { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge-routine { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge-status { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }
  table.meds { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.meds th { text-align: left; padding: 6px 8px; background: #f8fafc; color: #5b6b68; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #e2e8e6; }
  table.meds td { padding: 8px; border-bottom: 1px solid #f1f5f4; font-weight: 600; }
  .pending-box { text-align: center; padding: 18px; border-radius: 12px; background: #f8fafc; border: 1px dashed #cbd5d1; }
  .pending-title { font-weight: 700; }
  .pending-sub { font-size: 11px; color: #5b6b68; }
  .bill-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bill-card { padding: 12px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8e6; }
  .bill-card label { font-size: 9px; font-weight: 700; color: #5b6b68; text-transform: uppercase; }
  .bill-card .val { font-size: 15px; font-weight: 800; margin-top: 4px; }
  .footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid #e2e8e6; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-items: end; }
  .footer .muted { font-size: 10px; color: #5b6b68; }
  .footer .muted strong { color: #0f1f1c; display: block; font-size: 11px; margin-top: 2px; }
  .sign { text-align: center; padding: 10px; border: 1px dashed #cbd5d1; border-radius: 10px; font-size: 10px; color: #5b6b68; }
  .disclaimer { margin-top: 14px; text-align: center; font-size: 9px; color: #94a3b0; text-transform: uppercase; letter-spacing: .08em; }
  @media print { .actions { display: none !important; } .sheet { box-shadow: none; margin: 0; } body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="actions"><span>RHEON AI Care · Official Prescription</span><button type="button" onclick="window.print()">Download / Print PDF</button></div>
  <div class="sheet">
    <div class="topbar">
      <div class="brand"><img class="logo" src="${logoSrc}" alt="RHEON"/><div class="brand-text"><h1>RHEON AI Care</h1><p>Personal Health · Smarter Care</p></div></div>
      <div><span class="demo-pill">DEMO PRESCRIPTION</span><div style="margin-top:6px;font-size:10px;color:#5b6b68">Delhi NCR · Demonstration document</div></div>
    </div>
    <div class="title-block"><h2>Official Prescription</h2><div style="font-size:11px;color:#5b6b68">Delhi NCR · Demonstration document</div></div>
    <div class="hospital-banner">
      <div><strong>${escapeHtml(a.hospital_name || 'Hospital')}</strong><div style="font-size:11px;color:#5b6b68">${escapeHtml(a.hospital_city || '')}${a.doctor_specialty ? ' · ' + escapeHtml(a.doctor_specialty) : ''}</div></div>
      <div style="text-align:right"><span style="font-size:10px;color:#5b6b68">Visit slot</span><strong style="display:block;font-size:13px">${escapeHtml(formatVisitDate(a.date, a.time))}</strong></div>
    </div>
    <div class="section"><div class="section-h">Patient &amp; Visit Information</div><div class="section-b"><div class="patient-row">${photoHtml}<div class="grid">
      <div class="field"><label>Appointment ID</label><div>${escapeHtml(a.id)}</div></div>
      <div class="field"><label>Doctor</label><div>${escapeHtml(a.doctor_name || '—')}</div></div>
      <div class="field"><label>Patient Name</label><div>${escapeHtml(a.patient_name || '—')}</div></div>
      <div class="field"><label>Specialty</label><div>${escapeHtml(a.doctor_specialty || '—')}</div></div>
      <div class="field"><label>Age Group</label><div>${escapeHtml(a.patient_age_group || '—')} years</div></div>
      <div class="field"><label>Hospital</label><div>${escapeHtml(a.hospital_name || '—')}${a.hospital_city ? ' (' + escapeHtml(a.hospital_city) + ')' : ''}</div></div>
      <div class="field"><label>Visit Date &amp; Time</label><div>${escapeHtml(formatVisitDate(a.date, a.time))}</div></div>
      <div class="field"><label>Status / Priority</label><div><span class="badge badge-status">${escapeHtml(a.status || 'BOOKED')}</span> <span class="badge ${priorityClass}">${escapeHtml(a.criticality || 'ROUTINE')}</span></div></div>
    </div></div></div></div>
    <div class="section"><div class="section-h">Medicines &amp; Dosage</div><div class="section-b">${medsHtml}</div></div>
    <div class="section"><div class="section-h">Clinical Advice</div><div class="section-b"><p>${escapeHtml(a.prescription?.advice || "Follow the treating physician's instructions.")}</p></div></div>
    <div class="section"><div class="section-h">Billing &amp; Follow-up</div><div class="section-b"><div class="bill-row">
      <div class="bill-card"><label>Total Bill</label><div class="val">INR ${(a.total_bill_inr ?? 0).toLocaleString('en-IN')}</div></div>
      <div class="bill-card"><label>Re-appointment</label><div class="val" style="font-size:13px">${reAppt}</div></div>
    </div></div></div>
    <div class="footer">
      <div class="muted">Issued<strong>${escapeHtml(a.prescription?.issued_at || a.created_at || '—')}</strong></div>
      <div class="muted">Generated by<strong>RHEON AI Care · Delhi NCR</strong></div>
      <div class="sign">Doctor's signature<br/><strong style="color:#0f1f1c">${a.prescription ? escapeHtml(a.doctor_name) : 'Pending consultation'}</strong></div>
    </div>
    <div class="disclaimer">Demo — not valid for medical use · RHEON AI Care</div>
  </div>
</body></html>`;
}

/**
 * Open prescription without blob: URLs (avoids Brave RESULT_CODE_HUNG).
 * Uses about:blank + document.write, with same-tab iframe fallback.
 */
export function openPrescriptionDocument(a: PatientAppointment) {
  const html = buildPrescriptionHtml(a);

  try {
    // Do NOT use noopener — that returns null and leaves a hung tab in some browsers
    const w = window.open('about:blank', '_blank');
    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      try {
        w.focus();
      } catch { /* ignore */ }
      return;
    }
  } catch (err) {
    console.warn('window.open prescription failed', err);
  }

  // Fallback: same-page print iframe (no popup)
  try {
    const existing = document.getElementById('rheon-rx-print-frame');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'rheon-rx-print-frame';
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe document unavailable');
    doc.open();
    doc.write(html);
    doc.close();
    // Give layout a tick then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  } catch (err) {
    console.error(err);
    window.alert('Could not open prescription. Allow pop-ups for this site, then try again.');
  }
}

export function downloadPdf(_filename: string, _lines: string[]) {
  console.warn('downloadPdf is deprecated — use openPrescriptionDocument');
}
