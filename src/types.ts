export interface GradeRecord {
  id: string;
  studentName: string;
  nis: string;
  halaqah: string;
  semester: string;
  kategoriPenilaian: string;
  nahwu: number;
  shorof: number;
  durusulLughah: number;
  hadis: number;
  adab: number;
  catatanUstadz: string;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeFormInput {
  studentName: string;
  nis: string;
  halaqah: string;
  semester: string;
  kategoriPenilaian: string;
  nahwu: number;
  shorof: number;
  durusulLughah: number;
  hadis: number;
  adab: number;
  catatanUstadz: string;
}

export type ActiveTab = 'rekap' | 'input' | 'analitik' | 'kasyf';

export interface SubjectMeta {
  key: 'nahwu' | 'shorof' | 'durusulLughah' | 'hadis' | 'adab';
  label: string;
  arabic: string;
  description: string;
  kkm: number;
}

export const SUBJECTS: SubjectMeta[] = [
  {
    key: 'nahwu',
    label: 'Nahwu',
    arabic: 'النحو',
    description: 'Kaidah tata bahasa Arab, struktur kalimat, dan i’rab.',
    kkm: 70,
  },
  {
    key: 'shorof',
    label: 'Shorof',
    arabic: 'الصرف',
    description: 'Perubahan bentuk kata (tashrif lughawi & isthilahi) serta wazan.',
    kkm: 70,
  },
  {
    key: 'durusulLughah',
    label: 'Durusul Lughah',
    arabic: 'دروس اللغة',
    description: 'Kemahiran berbahasa Arab, hiwar, muthala’ah, dan mufradat.',
    kkm: 70,
  },
  {
    key: 'hadis',
    label: 'Hadis',
    arabic: 'الحديث',
    description: 'Hafalan matan hadis pilihan, sanad, dan fiqhul hadis.',
    kkm: 75,
  },
  {
    key: 'adab',
    label: 'Adab',
    arabic: 'الأدب',
    description: 'Akhlak thalibul ilmi, adab harian, dan pengamalan ilmu.',
    kkm: 75,
  },
];

export const HALAQAH_OPTIONS = [
  'Mustawa Awwal - A',
  'Mustawa Awwal - B',
  'Mustawa Tsani - A',
  'Mustawa Tsani - B',
  'Mustawa Tsalits',
  'Takmili / Takhassus',
];

export function computeTotal(record: Pick<GradeFormInput, 'nahwu' | 'shorof' | 'durusulLughah' | 'hadis' | 'adab'>): number {
  return (
    Number(record.nahwu) +
    Number(record.shorof) +
    Number(record.durusulLughah) +
    Number(record.hadis) +
    Number(record.adab)
  );
}

export function computeAverage(record: Pick<GradeFormInput, 'nahwu' | 'shorof' | 'durusulLughah' | 'hadis' | 'adab'>): number {
  return Number((computeTotal(record) / 5).toFixed(1));
}

export interface PredikatInfo {
  label: string;
  arabic: string;
  grade: string;
  textColor: string;
   passed: boolean;
}

export function getPredikat(score: number): PredikatInfo {
  if (score >= 90) {
    return {
      label: 'Mumtaz',
      arabic: 'ممتاز',
      grade: 'A',
      textColor: 'text-emerald-700',
      passed: true,
    };
  }
  if (score >= 80) {
    return {
      label: 'Jayyid Jiddan',
      arabic: 'جيد جدا',
      grade: 'B',
      textColor: 'text-teal-700',
      passed: true,
    };
  }
  if (score >= 70) {
    return {
      label: 'Jayyid',
      arabic: 'جيد',
      grade: 'C',
      textColor: 'text-slate-700',
      passed: true,
    };
  }
  if (score >= 60) {
    return {
      label: 'Maqbul',
      arabic: 'مقبول',
      grade: 'D',
      textColor: 'text-amber-700',
      passed: false,
    };
  }
  return {
    label: 'Rasib',
    arabic: 'راسب',
    grade: 'E',
    textColor: 'text-rose-700',
    passed: false,
  };
}

export const INITIAL_SAMPLE_RECORDS: GradeFormInput[] = [
  {
    studentName: 'Ahmad Fauzan Al-Farisi',
    nis: 'SANTRI-1447-001',
    halaqah: 'Mustawa Awwal - A',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 92,
    shorof: 88,
    durusulLughah: 94,
    hadis: 90,
    adab: 96,
    catatanUstadz: 'Penguasaan i’rab bab marfu’atul asma sangat baik, hafalan hadis Arba’in lancar.',
  },
  {
    studentName: 'Muhammad Zaidan Hakim',
    nis: 'SANTRI-1447-002',
    halaqah: 'Mustawa Awwal - A',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 84,
    shorof: 81,
    durusulLughah: 86,
    hadis: 88,
    adab: 92,
    catatanUstadz: 'Tashrif fi’il mu’tal cukup kuat, aktif dalam hiwar Durusul Lughah jilid 2.',
  },
  {
    studentName: 'Abdullah Azzam Syafii',
    nis: 'SANTRI-1447-003',
    halaqah: 'Mustawa Tsani - A',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 76,
    shorof: 68,
    durusulLughah: 79,
    hadis: 82,
    adab: 89,
    catatanUstadz: 'Perlu murojaah tambahan pada tashrif lughawi fi’il mahmuz dan mudha’af.',
  },
  {
    studentName: 'Salman Al-Ghifari',
    nis: 'SANTRI-1447-004',
    halaqah: 'Mustawa Tsani - A',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 95,
    shorof: 93,
    durusulLughah: 91,
    hadis: 94,
    adab: 97,
    catatanUstadz: 'Mumtaz di seluruh mata pelajaran, menjadi musyrif halaqah murojaah malam.',
  },
  {
    studentName: 'Umar Faruq Ramadhan',
    nis: 'SANTRI-1447-005',
    halaqah: 'Mustawa Awwal - B',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 65,
    shorof: 64,
    durusulLughah: 72,
    hadis: 78,
    adab: 85,
    catatanUstadz: 'Perlu bimbingan intensif kaidah dasar Jurumiyah dan wazan tsulatsi mazid.',
  },
  {
    studentName: 'Ibrahim Khalilurrahman',
    nis: 'SANTRI-1447-006',
    halaqah: 'Takmili / Takhassus',
    semester: 'Ganjil 1447 H',
    kategoriPenilaian: 'Ujian Akhir (UAS)',
    nahwu: 89,
    shorof: 87,
    durusulLughah: 90,
    hadis: 91,
    adab: 94,
    catatanUstadz: 'Mampu membaca kitab gundul tingkat mutawassith dengan syakal yang tepat.',
  },
];
