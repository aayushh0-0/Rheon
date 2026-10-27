/** Minimal single-page PDF writer (no external deps). */

function escapePdfText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPrescriptionPdfBytes(lines: string[]): Uint8Array {
  const pageW = 595;
  const pageH = 842;
  const left = 50;
  let y = 800;
  const contentParts: string[] = ['BT', '/F1 11 Tf', `${left} ${y} Td`, '14 TL'];

  lines.forEach((line, i) => {
    const text = escapePdfText(line || ' ');
    if (i === 0) {
      contentParts.push('/F1 16 Tf', `(${text}) Tj`, '0 -22 Td', '/F1 11 Tf');
    } else {
      contentParts.push(`(${text}) Tj`, '0 -16 Td');
    }
  });
  contentParts.push('ET');
  const stream = contentParts.join('\n');
  const streamBytes = new TextEncoder().encode(stream);

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`
  );
  objects.push(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj;
  }
  const xrefPos = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadPdf(filename: string, lines: string[]) {
  const bytes = buildPrescriptionPdfBytes(lines);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
