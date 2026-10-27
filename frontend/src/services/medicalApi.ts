import { apiClient } from './apiClient';
import {
  parseLabReportText,
  summarizeStatuses,
  buildGroundedExplanations,
  ParsedLabMeasurement,
} from '../utils/labReportParser';

export interface MedicalMeasurement {
  id: string;
  report_id: string;
  parameter_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status: string;
  is_verified: boolean;
  notes?: string;
  created_at: string;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  filename: string;
  file_path?: string;
  report_type: string;
  status: string;
  summary?: string;
  extracted_data?: string;
  created_at: string;
  measurements: MedicalMeasurement[];
  explanations?: Array<{ title: string; body: string; tone: 'ok' | 'warn' | 'bad' }>;
  status_counts?: { NORMAL: number; LOW: number; HIGH: number; CRITICAL: number; UNKNOWN: number };
}

export interface ReportUploadPayload {
  patient_id: string;
  filename: string;
  report_type?: string;
  content_text?: string;
}

const LOCAL_STORAGE_KEY = 'rheon_ai_medical_reports_v1';

export const getLocalReports = (): MedicalReport[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  return [];
};

const saveLocalReport = (report: MedicalReport) => {
  try {
    const reports = getLocalReports().filter((r) => r.id !== report.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([report, ...reports]));
  } catch { /* ignore */ }
};

function deleteLocalReport(reportId: string) {
  try {
    const reports = getLocalReports().filter((r) => r.id !== reportId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch { /* ignore */ }
}

function measurementsFromParsed(reportId: string, parsed: ParsedLabMeasurement[]): MedicalMeasurement[] {
  const now = new Date().toISOString();
  return parsed.map((p, i) => ({
    id: `m-${reportId}-${i}`,
    report_id: reportId,
    parameter_name: p.parameter_name,
    value: p.value,
    unit: p.unit,
    reference_range: p.reference_range,
    status: p.status,
    is_verified: true,
    notes: p.notes,
    created_at: now,
  }));
}

export function buildReportFromText(payload: ReportUploadPayload, text: string): MedicalReport {
  const reportId = `rep-${Date.now()}`;
  const parsed = parseLabReportText(text);
  const counts = summarizeStatuses(parsed);
  const explanations = buildGroundedExplanations(parsed);
  const measurements = measurementsFromParsed(reportId, parsed);
  const abnormal = counts.LOW + counts.HIGH + counts.CRITICAL;
  const summary =
    parsed.length === 0
      ? `Could not detect structured lab parameters in '${payload.filename}'.`
      : `Extracted ${parsed.length} parameter(s) from '${payload.filename}'. ${counts.NORMAL} normal, ${counts.LOW} low, ${counts.HIGH} high, ${counts.CRITICAL} critical` +
        (abnormal ? ` — ${abnormal} outside reference intervals.` : '.');

  return {
    id: reportId,
    patient_id: payload.patient_id,
    filename: payload.filename,
    report_type: payload.report_type || 'BLOOD_WORK',
    status: parsed.length ? 'EXTRACTED' : 'NEEDS_REVIEW',
    summary,
    extracted_data: text.slice(0, 4000),
    created_at: new Date().toISOString(),
    measurements,
    explanations,
    status_counts: counts,
  };
}

function simulateLocalUpload(payload: ReportUploadPayload): MedicalReport {
  const report = buildReportFromText(payload, payload.content_text || '');
  saveLocalReport(report);
  return report;
}

const updateLocalMeasurement = (
  measId: string,
  updates: Partial<MedicalMeasurement>
): MedicalMeasurement => {
  const reports = getLocalReports();
  let updated: MedicalMeasurement | null = null;
  const next = reports.map((r) => {
    const measurements = r.measurements.map((m) => {
      if (m.id !== measId) return m;
      updated = { ...m, ...updates };
      return updated!;
    });
    if (updated && measurements.some((m) => m.id === measId)) {
      const asParsed: ParsedLabMeasurement[] = measurements.map((m) => ({
        parameter_name: m.parameter_name,
        value: m.value,
        unit: m.unit || '',
        reference_range: m.reference_range || '',
        status: (m.status as ParsedLabMeasurement['status']) || 'UNKNOWN',
      }));
      return {
        ...r,
        measurements,
        explanations: buildGroundedExplanations(asParsed),
        status_counts: summarizeStatuses(asParsed),
      };
    }
    return { ...r, measurements };
  });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  if (!updated) throw new Error('Measurement not found');
  return updated;
};

export const medicalApi = {
  listReports: async (patientId?: string): Promise<MedicalReport[]> => {
    try {
      const url = patientId ? `/medical/reports?patient_id=${patientId}` : '/medical/reports';
      return await apiClient.get<MedicalReport[]>(url);
    } catch {
      return getLocalReports();
    }
  },

  uploadReport: async (payload: ReportUploadPayload): Promise<MedicalReport> => {
    try {
      const res = await apiClient.post<MedicalReport>('/medical/reports/upload', payload);
      saveLocalReport(res);
      return res;
    } catch {
      return simulateLocalUpload(payload);
    }
  },

  getReport: async (reportId: string): Promise<MedicalReport> => {
    try {
      return await apiClient.get<MedicalReport>(`/medical/reports/${reportId}`);
    } catch {
      const local = getLocalReports().find((r) => r.id === reportId);
      if (local) return local;
      throw new Error('Report not found');
    }
  },

  updateMeasurement: async (
    measId: string,
    updates: Partial<MedicalMeasurement>
  ): Promise<MedicalMeasurement> => {
    try {
      return await apiClient.post<MedicalMeasurement>(`/medical/measurements/${measId}`, updates);
    } catch {
      return updateLocalMeasurement(measId, updates);
    }
  },

  deleteReport: async (reportId: string): Promise<void> => {
    try {
      await apiClient.post(`/medical/reports/${reportId}/delete`, {});
    } catch {
      /* offline */
    }
    deleteLocalReport(reportId);
  },
};
