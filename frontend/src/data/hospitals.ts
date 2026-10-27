export type CityZone = 'Greater Noida' | 'Noida' | 'Ghaziabad' | 'Delhi' | 'Gurugram' | 'Faridabad';
export type AppointmentPurpose = 'consultation' | 'diagnostics' | 'blood_test' | 'follow_up' | 'medication';
export type HospitalSortMode = 'nearest' | 'best' | 'rating';

export interface UserCoords { lat: number; lng: number }

export interface HospitalDoctor {
  id: string;
  name: string;
  specialty: string;
  slots: string[]; // HH:mm
}

export interface HospitalInfo {
  id: string;
  name: string;
  city: CityZone;
  lat: number;
  lng: number;
  map_url: string;
  famous_for: string[];
  rating: number;
  doctors: HospitalDoctor[];
}

export const CITIES: CityZone[] = ['Greater Noida', 'Noida', 'Ghaziabad', 'Delhi', 'Gurugram', 'Faridabad'];

export const PURPOSE_LABELS: Record<AppointmentPurpose, string> = {
  consultation: 'Specialist Consultation',
  diagnostics: 'Diagnostics / Imaging',
  blood_test: 'Blood Sample Test',
  follow_up: 'Follow-up Visit',
  medication: 'Medication Review',
};

export const SORT_OPTIONS: { id: HospitalSortMode; label: string }[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'best', label: 'Best match' },
  { id: 'rating', label: 'Top rated' },
];

const DEFAULT_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

function docs(prefix: string, specs: string[]): HospitalDoctor[] {
  return specs.map((specialty, i) => ({
    id: `${prefix}-d${i + 1}`,
    name: ['Dr. Vivek Sharma', 'Dr. Kavita Singh', 'Dr. Suresh Yadav', 'Dr. Ananya Mehta', 'Dr. Rohan Gupta'][i % 5],
    specialty,
    slots: DEFAULT_SLOTS,
  }));
}

/** Compact NCR hospital catalogue — kept small to avoid UI freezes */
export const HOSPITALS: HospitalInfo[] = [
  {
    id: 'gn-kailash',
    name: 'Kailash Hospital & Heart Institute',
    city: 'Greater Noida',
    lat: 28.4744,
    lng: 77.5040,
    map_url: 'https://www.google.com/maps/search/?api=1&query=Kailash+Hospital+Greater+Noida',
    famous_for: ['Cardiology', 'Emergency', 'Orthopaedics'],
    rating: 4.5,
    doctors: docs('gn-kailash', ['Cardiology', 'General Medicine']),
  },
  {
    id: 'noid-sharda',
    name: 'Sharda Hospital',
    city: 'Greater Noida',
    lat: 28.4730,
    lng: 77.4830,
    map_url: 'https://www.google.com/maps/search/?api=1&query=Sharda+Hospital+Greater+Noida',
    famous_for: ['Multispeciality', 'Neurosciences', 'Oncology'],
    rating: 4.3,
    doctors: docs('noid-sharda', ['Neurology', 'Oncology']),
  },
  {
    id: 'noid-jaypee',
    name: 'Jaypee Hospital',
    city: 'Noida',
    lat: 28.5355,
    lng: 77.3910,
    map_url: 'https://www.google.com/maps/search/?api=1&query=Jaypee+Hospital+Noida',
    famous_for: ['Cardiac care', 'Transplants', 'Critical care'],
    rating: 4.6,
    doctors: docs('noid-jaypee', ['Cardiology', 'Orthopaedics']),
  },
  {
    id: 'del-aiims',
    name: 'AIIMS New Delhi',
    city: 'Delhi',
    lat: 28.5672,
    lng: 77.2100,
    map_url: 'https://www.google.com/maps/search/?api=1&query=AIIMS+New+Delhi',
    famous_for: ['Trauma', 'Cardiology', 'Neurosciences'],
    rating: 4.8,
    doctors: docs('del-aiims', ['Trauma', 'Cardiology']),
  },
  {
    id: 'ggn-medanta',
    name: 'Medanta – The Medicity',
    city: 'Gurugram',
    lat: 28.4395,
    lng: 77.0405,
    map_url: 'https://www.google.com/maps/search/?api=1&query=Medanta+The+Medicity+Gurugram',
    famous_for: ['Cardiac surgery', 'Oncology', 'Transplants'],
    rating: 4.7,
    doctors: docs('ggn-medanta', ['Cardiac Surgery', 'Oncology']),
  },
  {
    id: 'far-asian',
    name: 'Asian Institute of Medical Sciences',
    city: 'Faridabad',
    lat: 28.4089,
    lng: 77.3178,
    map_url: 'https://www.google.com/maps/search/?api=1&query=Asian+Institute+of+Medical+Sciences+Faridabad',
    famous_for: ['Cardiology', 'Neurosciences', 'Critical care'],
    rating: 4.4,
    doctors: docs('far-asian', ['Cardiology', 'Neurology']),
  },
];

function haversineKm(a: UserCoords, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RankedHospital extends HospitalInfo {
  distance_km?: number;
  match_score: number;
}

export function rankHospitalsByProblem(
  problem: string,
  city: CityZone | 'ALL',
  sort: HospitalSortMode,
  coords?: UserCoords | null
): RankedHospital[] {
  const q = (problem || '').toLowerCase().trim();
  let list: RankedHospital[] = HOSPITALS.filter((h) => city === 'ALL' || h.city === city).map((h) => {
    let match = h.rating;
    if (q) {
      const blob = `${h.name} ${h.famous_for.join(' ')} ${h.doctors.map((d) => d.specialty).join(' ')}`.toLowerCase();
      if (blob.includes(q)) match += 5;
      for (const token of q.split(/\s+/)) {
        if (token.length > 2 && blob.includes(token)) match += 1.5;
      }
    }
    const distance_km = coords ? haversineKm(coords, h) : undefined;
    return { ...h, match_score: match, distance_km };
  });

  if (sort === 'nearest' && coords) {
    list = [...list].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  } else if (sort === 'rating') {
    list = [...list].sort((a, b) => b.rating - a.rating);
  } else {
    list = [...list].sort((a, b) => b.match_score - a.match_score);
  }
  return list;
}

export function getAvailableSlots(doctor: HospitalDoctor, bookedKeys: Set<string>, hospitalId: string, date: string) {
  return doctor.slots.map((time) => {
    const key = `${hospitalId}|${doctor.id}|${date}|${time}`;
    const booked = bookedKeys.has(key);
    return { time, booked };
  });
}
