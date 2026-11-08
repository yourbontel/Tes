/**
 * Security Rules Verification Suite (Phase 0 & Phase 5 Red Team Audit)
 * Verifies all 12 Dirty Dozen payloads against the Firestore Security Rules.
 */

export interface DirtyDozenPayloadTest {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  expectedOutcome: 'PERMISSION_DENIED';
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenPayloadTest[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Create (ownerId mismatch)',
    collection: 'gradeRecords/rec_01',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      studentName: 'Ahmad Fauzan',
      nis: 'SANTRI-001',
      halaqah: 'Mustawa Awwal - A',
      semester: 'Ganjil 1447 H',
      kategoriPenilaian: 'Ujian Akhir (UAS)',
      nahwu: 88,
      shorof: 85,
      durusulLughah: 90,
      hadis: 92,
      adab: 95,
      catatanUstadz: 'Baik',
      ownerId: 'spoofed_other_uid',
      ownerName: 'Ustadz Spoof',
    },
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    collection: 'gradeRecords/rec_02',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      email_verified: false,
    },
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Create (isVerified: true)',
    collection: 'gradeRecords/rec_03',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      studentName: 'Ahmad Fauzan',
      nis: 'SANTRI-001',
      isVerified: true,
    },
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Update (bonusPoints: 50)',
    collection: 'gradeRecords/rec_04',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      bonusPoints: 50,
    },
  },
  {
    id: 5,
    name: 'Score Out-of-Bounds High (nahwu: 105)',
    collection: 'gradeRecords/rec_05',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      nahwu: 105,
    },
  },
  {
    id: 6,
    name: 'Score Out-of-Bounds Negative (shorof: -5)',
    collection: 'gradeRecords/rec_06',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      shorof: -5,
    },
  },
  {
    id: 7,
    name: 'Type Poisoning on Score (durusulLughah as string)',
    collection: 'gradeRecords/rec_07',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      durusulLughah: '100',
    },
  },
  {
    id: 8,
    name: 'String Size Overflow on catatanUstadz (> 500 chars)',
    collection: 'gradeRecords/rec_08',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      catatanUstadz: 'A'.repeat(1000),
    },
  },
  {
    id: 9,
    name: 'NIS Regex Bypass (special characters)',
    collection: 'gradeRecords/rec_09',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      nis: 'NIS/2026;<script>',
    },
  },
  {
    id: 10,
    name: 'Immutable createdAt Tampering on Update',
    collection: 'gradeRecords/rec_10',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
  },
  {
    id: 11,
    name: 'Forged Client Timestamp (updatedAt != request.time)',
    collection: 'gradeRecords/rec_11',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      updatedAt: '2099-01-01T00:00:00Z',
    },
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Privilege Escalation',
    collection: 'admins/attacker_uid_111',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payload: {
      uid: 'attacker_uid_111',
      role: 'admin',
    },
  },
];
