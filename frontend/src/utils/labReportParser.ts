export type LabStatus = 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export interface ParsedLabMeasurement {
  parameter_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: LabStatus;
  notes?: string;
  section?: string;
}

const PARAM_DEFS: Array<{
  name: string;
  aliases: RegExp;
  unitHints: string[];
  range?: { low?: number; high?: number; highExclusive?: boolean };
  section: string;
}> = [
  { name: 'Hemoglobin', aliases: /\b(h(?:ae|e)moglobin|hb(?!\s*a1c))\b/i, unitHints: ['g/dL', 'g/dl'], range: { low: 13.5, high: 17.5 }, section: 'CBC' },
  { name: 'RBC Count', aliases: /\b(rbc\s*count|red\s*blood\s*cells?|erythrocytes?)\b/i, unitHints: ['million/µL', 'million/uL'], range: { low: 4.5, high: 5.9 }, section: 'CBC' },
  { name: 'WBC Count', aliases: /\b(wbc\s*count|white\s*blood\s*cells?|leukocytes?)\b/i, unitHints: ['K/µL', 'K/uL'], range: { low: 4.0, high: 11.0 }, section: 'CBC' },
  { name: 'Platelet Count', aliases: /\b(platelet\s*count|platelets|plt)\b/i, unitHints: ['K/µL', 'K/uL'], range: { low: 150, high: 450 }, section: 'CBC' },
  { name: 'Hematocrit', aliases: /\b(hematocrit|haematocrit|hct|pcv)\b/i, unitHints: ['%'], range: { low: 41, high: 53 }, section: 'CBC' },
  { name: 'MCV', aliases: /\b(mcv|mean\s*corpuscular\s*volume)\b/i, unitHints: ['fL', 'fl'], range: { low: 80, high: 100 }, section: 'CBC' },
  { name: 'Fasting Blood Glucose', aliases: /\b(fasting\s*(blood\s*)?(glucose|sugar)|fbs|fbg)\b/i, unitHints: ['mg/dL', 'mg/dl'], range: { low: 70, high: 99 }, section: 'Glucose' },
  { name: 'HbA1c', aliases: /\b(hba1c|glycated\s*h(?:ae|e)moglobin|a1c)\b/i, unitHints: ['%'], range: { high: 5.7, highExclusive: true }, section: 'Glucose' },
  { name: 'Total Cholesterol', aliases: /\b(total\s*cholesterol)\b/i, unitHints: ['mg/dL'], range: { high: 200, highExclusive: true }, section: 'Lipid' },
  { name: 'LDL Cholesterol', aliases: /\b(ldl\s*cholesterol|ldl[- ]?c)\b/i, unitHints: ['mg/dL'], range: { high: 100, highExclusive: true }, section: 'Lipid' },
  { name: 'HDL Cholesterol', aliases: /\b(hdl\s*cholesterol|hdl[- ]?c)\b/i, unitHints: ['mg/dL'], range: { low: 40 }, section: 'Lipid' },
  { name: 'Triglycerides', aliases: /\b(triglycerides?|tg)\b/i, unitHints: ['mg/dL'], range: { high: 150, highExclusive: true }, section: 'Lipid' },
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function cleanNumber(s: string) {
  return s.replace(/,/g, '').trim();
}
function normalizeStatus(raw: string): LabStatus {
  const s = raw.toUpperCase().replace(/\s+/g, '');
  if (s.includes('CRIT')) return 'CRITICAL';
  if (s.includes('LOW') || s.includes('BELOW')) return 'LOW';
  if (s.includes('HIGH') || s.includes('ELEVAT') || s.includes('ABOVE')) return 'HIGH';
  if (s.includes('NORM')) return 'NORMAL';
  return 'UNKNOWN';
}
function inferStatus(value: number, range?: { low?: number; high?: number; highExclusive?: boolean }): LabStatus {
  if (!range) return 'UNKNOWN';
  if (range.low != null && value < range.low) return 'LOW';
  if (range.high != null) {
    if (range.highExclusive ? value >= range.high : value > range.high) return 'HIGH';
  }
  return 'NORMAL';
}

export function parseLabReportText(text: string): ParsedLabMeasurement[] {
  if (!text || !text.trim()) return [];
  const normalized = text.replace(/\u00a0/g, ' ').replace(/[–—−]/g, '-').replace(/\r\n/g, '\n');
  const found = new Map<string, ParsedLabMeasurement>();

  for (const def of PARAM_DEFS) {
    const aliasMatch = normalized.match(def.aliases);
    if (!aliasMatch || aliasMatch.index == null) continue;
    const window = normalized.slice(aliasMatch.index, aliasMatch.index + 220);
    const unitAlt = [...def.unitHints, '%', 'g/dL', 'mg/dL', 'K/uL', 'K/µL', 'fL', 'million/µL', 'million/uL']
      .map(escapeRegex)
      .join('|');
    let valueMatch =
      window.match(new RegExp(String.raw`([\d]+(?:\.\d+)?)\s*(${unitAlt})`, 'i')) ||
      window.match(new RegExp(String.raw`(?:${def.aliases.source})[^\d]{0,48}?([\d]+(?:\.\d+)?)`, 'i'));
    if (!valueMatch) continue;
    let value = cleanNumber(valueMatch[1]);
    let unit = (valueMatch[2] || '').replace('uL', 'µL');
    if (!valueMatch[2] && /^\d{1,2}$/.test(value) && parseFloat(value) < 30) {
      const rest = window.slice((valueMatch.index || 0) + valueMatch[0].length);
      const next = rest.match(new RegExp(String.raw`([\d]+(?:\.\d+)?)\s*(${unitAlt})?`, 'i'));
      if (next) {
        value = cleanNumber(next[1]);
        unit = (next[2] || unit || def.unitHints[0] || '').replace('uL', 'µL');
      }
    }
    if (!unit) unit = def.unitHints[0] || '';

    let reference_range = '';
    const rangeMatch = window.match(
      /((?:below|above)?\s*[\d]+(?:\.\d+)?\s*-\s*[\d]+(?:\.\d+)?|(?:below|under|<)\s*[\d]+(?:\.\d+)?|[\d]+(?:\.\d+)?\s*(?:or above|or more))/i
    );
    if (rangeMatch) reference_range = rangeMatch[1].replace(/\s+/g, ' ').trim();
    else if (def.range) {
      if (def.range.low != null && def.range.high != null) reference_range = `${def.range.low} - ${def.range.high}`;
      else if (def.range.high != null) reference_range = def.range.highExclusive ? `Below ${def.range.high}` : `≤ ${def.range.high}`;
      else if (def.range.low != null) reference_range = `${def.range.low} or above`;
    }

    let status: LabStatus = 'UNKNOWN';
    const statusMatch = window.match(/\b(CRITICAL|HIGH|LOW|NORMAL)\b/i);
    if (statusMatch) status = normalizeStatus(statusMatch[1]);
    if (status === 'UNKNOWN') {
      const num = parseFloat(value);
      if (!Number.isNaN(num)) status = inferStatus(num, def.range);
    }

    found.set(def.name, {
      parameter_name: def.name,
      value,
      unit,
      reference_range,
      status,
      section: def.section,
      notes: `Extracted from report text · ${def.section}`,
    });
  }
  return Array.from(found.values());
}

export function summarizeStatuses(items: ParsedLabMeasurement[]) {
  const counts = { NORMAL: 0, LOW: 0, HIGH: 0, CRITICAL: 0, UNKNOWN: 0 };
  for (const m of items) {
    if (m.status in counts) counts[m.status as keyof typeof counts]++;
    else counts.UNKNOWN++;
  }
  return counts;
}

export function buildGroundedExplanations(items: ParsedLabMeasurement[]): Array<{
  title: string;
  body: string;
  tone: 'ok' | 'warn' | 'bad';
}> {
  const byName = Object.fromEntries(items.map((m) => [m.parameter_name, m]));
  const out: Array<{ title: string; body: string; tone: 'ok' | 'warn' | 'bad' }> = [];
  const hb = byName['Hemoglobin'];
  if (hb) {
    const tone = hb.status === 'NORMAL' ? 'ok' : hb.status === 'CRITICAL' ? 'bad' : 'warn';
    out.push({
      title: 'Hemoglobin & Oxygen Capacity',
      body: `Measured at ${hb.value} ${hb.unit} (Reference: ${hb.reference_range}). Status: ${hb.status}. ${
        hb.status === 'NORMAL'
          ? 'Adequate red blood cell mass for tissue oxygenation.'
          : hb.status === 'LOW'
          ? 'Below reference interval — may indicate anemia; clinical correlation advised.'
          : 'Outside expected interval — review with treating physician.'
      }`,
      tone,
    });
  }
  const glu = byName['Fasting Blood Glucose'];
  const a1c = byName['HbA1c'];
  if (glu || a1c) {
    const parts: string[] = [];
    if (glu) parts.push(`Fasting glucose ${glu.value} ${glu.unit} (${glu.status})`);
    if (a1c) parts.push(`HbA1c ${a1c.value}${a1c.unit || '%'} (${a1c.status})`);
    const anyBad = [glu, a1c].some((m) => m && m.status !== 'NORMAL' && m.status !== 'UNKNOWN');
    out.push({
      title: 'Glycemic Control (Glucose & HbA1c)',
      body: `${parts.join(' and ')}. ${
        anyBad
          ? 'One or more values are outside non-diabetic reference intervals.'
          : 'Values are within typical non-diabetic reference intervals.'
      }`,
      tone: anyBad ? 'warn' : 'ok',
    });
  }
  const lipidKeys = ['Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides'];
  const lipids = lipidKeys.map((k) => byName[k]).filter(Boolean) as ParsedLabMeasurement[];
  if (lipids.length) {
    const anyBad = lipids.some((m) => m.status !== 'NORMAL' && m.status !== 'UNKNOWN');
    out.push({
      title: 'Lipid Profile',
      body:
        lipids.map((m) => `${m.parameter_name}: ${m.value} ${m.unit} (${m.status})`).join('; ') +
        '. ' +
        (anyBad ? 'Lipid parameters deviate from desirable ranges.' : 'Lipid values within desirable ranges.'),
      tone: anyBad ? 'warn' : 'ok',
    });
  }
  const plt = byName['Platelet Count'];
  const wbc = byName['WBC Count'];
  if (plt || wbc) {
    const parts: string[] = [];
    if (plt) parts.push(`Platelets ${plt.value} ${plt.unit} (${plt.status})`);
    if (wbc) parts.push(`WBC ${wbc.value} ${wbc.unit} (${wbc.status})`);
    const anyBad = [plt, wbc].some((m) => m && m.status !== 'NORMAL' && m.status !== 'UNKNOWN');
    out.push({
      title: 'CBC — Cells & Clotting',
      body: parts.join('; ') + '. ' + (anyBad ? 'Abnormal counts on CBC — medical review recommended.' : 'Cell counts within reference intervals.'),
      tone: anyBad ? 'warn' : 'ok',
    });
  }
  return out;
}
