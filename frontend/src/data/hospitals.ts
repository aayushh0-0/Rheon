import hospitalsJson from './hospitals.json';

export type CityZone =
  | 'Greater Noida'
  | 'Noida'
  | 'Ghaziabad'
  | 'Delhi'
  | 'Gurugram'
  | 'Faridabad';

export type AppointmentPurpose =
  | 'blood_sample'
  | 'medication'
  | 'consultation'
  | 'follow_up'
  | 'diagnostics'
  | 'other';

export type HospitalSortMode = 'best_match' | 'nearest' | 'rating' | 'name';

export interface DoctorSlot {
  time: string;
  available: boolean;
}

export interface HospitalDoctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  rating: number;
  slots: string[];
}

export interface HospitalInfo {
  id: string;
  name: string;
  city: CityZone;
  mapUrl: string;
  specialties: string[];
  famousFor: string;
  addressShort: string;
  distanceKm: number;
  lat: number;
  lng: number;
  type: 'multispeciality' | 'specialty' | 'government' | 'trauma';
  doctors: HospitalDoctor[];
}

export interface UserCoords {
  lat: number;
  lng: number;
}

export const HOSPITALS = hospitalsJson as HospitalInfo[];

/** Haversine distance in km between two WGS84 points */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROBLEM_KEYWORDS: Array<{ keys: string[]; specialties: string[]; weight: number }> = [
  { keys: ['heart', 'cardiac', 'chest pain', 'bp', 'blood pressure', 'cardiology'], specialties: ['Cardiology', 'Cardiac Care', 'Cardiac Sciences', 'Cardiac Surgery', 'Heart Care', 'Heart Rhythm', 'Interventional Cardiology'], weight: 10 },
  { keys: ['cancer', 'oncology', 'tumor', 'chemotherapy', 'radiation'], specialties: ['Oncology', 'Cancer', 'Cancer Care', 'Medical Oncology', 'Surgical Oncology', 'Cancer Surgery', 'Chemotherapy', 'Radiation'], weight: 10 },
  { keys: ['brain', 'neuro', 'stroke', 'seizure', 'headache'], specialties: ['Neurology', 'Neurosciences', 'Neurosurgery'], weight: 10 },
  { keys: ['bone', 'joint', 'ortho', 'fracture', 'knee', 'spine', 'back pain'], specialties: ['Orthopaedics', 'Spine', 'Spine Surgery', 'Joint Replacement'], weight: 10 },
  { keys: ['eye', 'vision', 'cataract', 'glaucoma', 'retina'], specialties: ['Eye Diseases', 'Ophthalmology', 'Cataract', 'Glaucoma', 'Retina'], weight: 10 },
  { keys: ['pregnancy', 'maternity', 'delivery', 'fertility', 'gynae', 'obstetric'], specialties: ['Pregnancy', 'Maternity', 'Obstetrics', 'Obstetrics & Gynaecology', 'Fertility', 'Childbirth', 'Newborn Care'], weight: 10 },
  { keys: ['kidney', 'renal', 'dialysis', 'nephro'], specialties: ['Kidney Care', 'Nephrology'], weight: 9 },
  { keys: ['liver', 'transplant', 'organ'], specialties: ['Organ Transplants', 'Transplants', 'Liver Transplant', 'Transplant Surgery'], weight: 9 },
  { keys: ['trauma', 'accident', 'injury', 'emergency', 'bleed'], specialties: ['Trauma', 'Emergency', 'Trauma Surgery', 'Emergency Medicine', 'Critical Care'], weight: 9 },
  { keys: ['blood', 'sample', 'lab', 'test', 'diagnostic'], specialties: ['Diagnostics', 'General Medicine', 'Outpatient'], weight: 7 },
  { keys: ['child', 'paediatric', 'pediatric', 'baby'], specialties: ['Paediatrics', 'Paediatric Cardiac', 'Newborn Care'], weight: 8 },
  { keys: ['stomach', 'gastro', 'digestion'], specialties: ['Gastroenterology'], weight: 8 },
  { keys: ['diabetes', 'fever', 'infection', 'general'], specialties: ['General Medicine', 'General Healthcare'], weight: 5 },
];

export type RankedHospital = HospitalInfo & {
  matchScore: number;
  matchReason: string;
  /** Distance used for ranking — from user GPS when available, else static NCR reference */
  effectiveDistanceKm: number;
  avgRating: number;
};

export function rankHospitalsByProblem(
  problem: string,
  cityFilter: CityZone | 'ALL' = 'ALL',
  userCoords: UserCoords | null = null,
  sortMode: HospitalSortMode = 'best_match'
): RankedHospital[] {
  const q = problem.toLowerCase().trim();
  const list = HOSPITALS.filter((h) => cityFilter === 'ALL' || h.city === cityFilter);

  const scored: RankedHospital[] = list.map((h) => {
    let specialtyScore = 0;
    const matched: string[] = [];
    if (q) {
      for (const rule of PROBLEM_KEYWORDS) {
        if (rule.keys.some((k) => q.includes(k))) {
          for (const sp of h.specialties) {
            if (
              rule.specialties.some(
                (s) =>
                  sp.toLowerCase().includes(s.toLowerCase()) ||
                  s.toLowerCase().includes(sp.toLowerCase())
              )
            ) {
              specialtyScore += rule.weight;
              matched.push(sp);
            }
          }
          if (rule.keys.some((k) => h.famousFor.toLowerCase().includes(k))) {
            specialtyScore += rule.weight * 0.5;
          }
        }
      }
      for (const sp of h.specialties) {
        if (q.includes(sp.toLowerCase()) || sp.toLowerCase().includes(q)) {
          specialtyScore += 6;
          matched.push(sp);
        }
      }
    }

    const effectiveDistanceKm =
      userCoords && h.lat != null && h.lng != null
        ? Math.round(haversineKm(userCoords.lat, userCoords.lng, h.lat, h.lng) * 10) / 10
        : h.distanceKm;

    const distanceScore = Math.max(0, 50 - effectiveDistanceKm) * 0.4;
    const avgRating =
      h.doctors.length > 0
        ? h.doctors.reduce((s, d) => s + d.rating, 0) / h.doctors.length
        : 4.0;
    const ratingScore = avgRating * 2;

    // Best-match score blends specialty + proximity + rating
    const matchScore = specialtyScore + distanceScore + ratingScore * 0.5;

    const uniqueMatched = [...new Set(matched)].slice(0, 3);
    const distLabel = userCoords
      ? `${effectiveDistanceKm} km from you`
      : `${effectiveDistanceKm} km (NCR ref)`;
    const matchReason = q
      ? uniqueMatched.length
        ? `Agent AI matched: ${uniqueMatched.join(', ')} · ${distLabel}`
        : `Viable option · ${distLabel}`
      : distLabel;

    return {
      ...h,
      matchScore,
      matchReason,
      effectiveDistanceKm,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  });

  scored.sort((a, b) => {
    switch (sortMode) {
      case 'nearest':
        return a.effectiveDistanceKm - b.effectiveDistanceKm || b.matchScore - a.matchScore;
      case 'rating':
        return b.avgRating - a.avgRating || a.effectiveDistanceKm - b.effectiveDistanceKm;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'best_match':
      default:
        return b.matchScore - a.matchScore || a.effectiveDistanceKm - b.effectiveDistanceKm;
    }
  });

  return scored;
}

export function getAvailableSlots(
  doctorId: string,
  date: string,
  bookedKeys: Set<string>
): DoctorSlot[] {
  const doctor = HOSPITALS.flatMap((h) => h.doctors).find((d) => d.id === doctorId);
  if (!doctor) return [];
  return doctor.slots.map((time) => ({
    time,
    available: !bookedKeys.has(`${doctorId}|${date}|${time}`),
  }));
}

export const PURPOSE_LABELS: Record<AppointmentPurpose, string> = {
  blood_sample: 'Blood Sample / Lab Test',
  medication: 'Medication Consultation',
  consultation: 'Specialist Consultation',
  follow_up: 'Follow-up Visit',
  diagnostics: 'Diagnostics / Imaging',
  other: 'Other Medical Need',
};

export const CITIES: Array<CityZone | 'ALL'> = [
  'ALL',
  'Greater Noida',
  'Noida',
  'Ghaziabad',
  'Delhi',
  'Gurugram',
  'Faridabad',
];

export const SORT_OPTIONS: Array<{ id: HospitalSortMode; label: string }> = [
  { id: 'best_match', label: 'Best match' },
  { id: 'nearest', label: 'Nearest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'name', label: 'Name A–Z' },
];
