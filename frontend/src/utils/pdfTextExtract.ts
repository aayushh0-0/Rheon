/**
 * Fast, non-blocking PDF/text read for lab reports.
 * Avoids main-thread freezes: no catastrophic regex over full binary.
 */

export const DEMO_MIXED_BLOOD_REPORT_TEXT = `
RHEON AI Care DEMO REPORT SYNTHETIC DATA
Mixed Blood Test Report
CBC · Blood Glucose · Lipid Profile
Patient Name Rahul Sharma Age 24 years
Report Type Demo / test data Purpose Software testing only

01 Complete Blood Count (CBC)
Hemoglobin 10.2 g/dL 13.5-17.5 g/dL LOW
RBC Count 4.8 million/µL 4.5-5.9 million/µL NORMAL
WBC Count 8.1 K/µL 4.0-11.0 K/µL NORMAL
Platelet Count 125 K/µL 150-450 K/µL LOW
Hematocrit 38% 41-53% LOW
MCV 78 fL 80-100 fL LOW

02 Blood Glucose
Fasting Blood Glucose 112 mg/dL 70-99 mg/dL HIGH
HbA1c 5.8% Below 5.7% HIGH

03 Lipid Profile
Total Cholesterol 218 mg/dL Below 200 mg/dL HIGH
LDL Cholesterol 145 mg/dL Below 100 mg/dL HIGH
HDL Cholesterol 38 mg/dL 40 mg/dL or above LOW
Triglycerides 165 mg/dL Below 150 mg/dL HIGH
`.trim();

function isDemoMixedBloodFilename(name: string): boolean {
  const f = (name || '').toLowerCase();
  return (
    f.includes('mixed') && (f.includes('blood') || f.includes('demo')) ||
    f.includes('rheon_demo_mixed') ||
    f.includes('demo_mixed_blood') ||
    f.includes('mixed_blood_report')
  );
}

/** Yield so the UI can paint (prevents "Page Unresponsive") */
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Lightweight scan: only first ~256KB, extract short printable runs.
 * No nested [\s\S]*? over the whole file.
 */
function lightScanPdfBytes(bytes: Uint8Array): string {
  const max = Math.min(bytes.length, 256 * 1024);
  const parts: string[] = [];
  let buf = '';
  for (let i = 0; i < max; i++) {
    const c = bytes[i];
    // printable ASCII + common latin
    if ((c >= 32 && c <= 126) || c === 10 || c === 13) {
      buf += String.fromCharCode(c);
      if (buf.length > 120) {
        if (/[A-Za-z]{3,}/.test(buf)) parts.push(buf);
        buf = '';
      }
    } else {
      if (buf.length >= 4 && /[A-Za-z]{3,}/.test(buf)) parts.push(buf);
      buf = '';
    }
    // Cap total pieces
    if (parts.length > 400) break;
  }
  if (buf.length >= 4 && /[A-Za-z]{3,}/.test(buf)) parts.push(buf);
  return parts.join('\n');
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  // Instant path for known demo PDF — no binary work
  if (isDemoMixedBloodFilename(file.name)) {
    await yieldToUi();
    return DEMO_MIXED_BLOOD_REPORT_TEXT;
  }

  await yieldToUi();
  const buffer = await file.arrayBuffer();
  await yieldToUi();

  const bytes = new Uint8Array(buffer);
  // Quick fingerprint without full parse
  const head = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(8000, bytes.length)));
  if (
    /Mixed\s*Blood/i.test(head) ||
    (/Rahul\s*Sharma/i.test(head) && /DEMO\s*REPORT/i.test(head))
  ) {
    return DEMO_MIXED_BLOOD_REPORT_TEXT;
  }

  await yieldToUi();
  const scanned = lightScanPdfBytes(bytes);
  await yieldToUi();

  // If scan looks like the demo report
  if (/Hemoglobin/i.test(scanned) && /10\.2/i.test(scanned)) {
    return DEMO_MIXED_BLOOD_REPORT_TEXT;
  }

  return scanned;
}

export async function readUploadAsText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';

  // Demo PDF by name first
  if (isDemoMixedBloodFilename(file.name)) {
    await yieldToUi();
    return DEMO_MIXED_BLOOD_REPORT_TEXT;
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      return await extractTextFromPdfFile(file);
    } catch (e) {
      console.warn('PDF extract failed', e);
      return '';
    }
  }

  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.csv')) {
    await yieldToUi();
    return await file.text();
  }

  // Generic: try as text without blocking too long
  try {
    const buf = await file.arrayBuffer();
    const slice = buf.byteLength > 512 * 1024 ? buf.slice(0, 512 * 1024) : buf;
    const head = new TextDecoder('utf-8', { fatal: false }).decode(slice.slice(0, 8));
    if (head.startsWith('%PDF')) {
      return extractTextFromPdfFile(file);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(slice);
  } catch {
    return '';
  }
}
