/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  Search,
  Download,
  Plus,
  Edit3,
  Trash2,
  FileText,
  LogIn,
  LogOut,
  Database,
  ArrowUpDown,
} from 'lucide-react';
import {
  auth,
  db,
  loginWithGoogle,
  logoutUser,
  handleFirestoreError,
  OperationType,
  SCHEMA_CONSTRAINTS,
} from './firebase';
import {
  GradeRecord,
  GradeFormInput,
  ActiveTab,
  SUBJECTS,
  HALAQAH_OPTIONS,
  INITIAL_SAMPLE_RECORDS,
  computeTotal,
  computeAverage,
  getPredikat,
} from './types';
import { GradeInputView } from './components/GradeInputView';
import { AnalyticsView } from './components/AnalyticsView';
import { KasyfReportView } from './components/KasyfReportView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firestoreRecords, setFirestoreRecords] = useState<GradeRecord[]>([]);
  const [localPreviewRecords, setLocalPreviewRecords] = useState<GradeRecord[]>(
    () =>
      INITIAL_SAMPLE_RECORDS.map((item, idx) => ({
        ...item,
        id: `preview_rec_${idx + 1}`,
        ownerId: 'preview_user',
        ownerName: 'Ustadz Ahmad Fauzi, Lc.',
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
  );
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Navigation & Editing states
  const [activeTab, setActiveTab] = useState<ActiveTab>('rekap');
  const [editingRecord, setEditingRecord] = useState<GradeRecord | null>(null);
  const [selectedKasyfId, setSelectedKasyfId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtering & Sorting states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'avg_desc' | 'avg_asc' | 'recent'>('avg_desc');

  // 1. Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Firestore `/gradeRecords` owned by the authenticated user
  useEffect(() => {
    if (!authReady || !user) {
      setFirestoreRecords([]);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const path = 'gradeRecords';
    const q = query(collection(db, path), where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: GradeRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdAt =
            d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date();
          const updatedAt =
            d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date();
          return {
            id: docSnap.id,
            studentName: String(d.studentName || ''),
            nis: String(d.nis || ''),
            halaqah: String(d.halaqah || ''),
            semester: String(d.semester || ''),
            kategoriPenilaian: String(d.kategoriPenilaian || ''),
            nahwu: Number(d.nahwu ?? 0),
            shorof: Number(d.shorof ?? 0),
            durusulLughah: Number(d.durusulLughah ?? 0),
            hadis: Number(d.hadis ?? 0),
            adab: Number(d.adab ?? 0),
            catatanUstadz: String(d.catatanUstadz || ''),
            ownerId: String(d.ownerId || ''),
            ownerName: String(d.ownerName || ''),
            createdAt,
            updatedAt,
          };
        });
        setFirestoreRecords(loaded);
        setIsLoadingData(false);
      },
      (error) => {
        setIsLoadingData(false);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Active data source: Firestore when logged in, Local Preview when signed out
  const activeRecords = user ? firestoreRecords : localPreviewRecords;

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = activeRecords.filter((rec) => {
      const matchesSearch =
        !q ||
        rec.studentName.toLowerCase().includes(q) ||
        rec.nis.toLowerCase().includes(q) ||
        rec.halaqah.toLowerCase().includes(q);
      const matchesHalaqah =
        selectedHalaqah === 'ALL' || rec.halaqah === selectedHalaqah;
      const matchesSemester =
        selectedSemester === 'ALL' || rec.semester === selectedSemester;
      const matchesKategori =
        selectedKategori === 'ALL' || rec.kategoriPenilaian === selectedKategori;
      return (
        matchesSearch && matchesHalaqah && matchesSemester && matchesKategori
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.studentName.localeCompare(b.studentName, 'id');
      }
      if (sortBy === 'avg_desc') {
        return computeAverage(b) - computeAverage(a);
      }
      if (sortBy === 'avg_asc') {
        return computeAverage(a) - computeAverage(b);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [
    activeRecords,
    searchQuery,
    selectedHalaqah,
    selectedSemester,
    selectedKategori,
    sortBy,
  ]);

  // Overall Summary KPIs
  const summaryMetrics = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        count: 0,
        overallAvg: 0,
        passCount: 0,
        passRate: 0,
        topStudent: null as GradeRecord | null,
        subjectAverages: {
          nahwu: 0,
          shorof: 0,
          durusulLughah: 0,
          hadis: 0,
          adab: 0,
        },
      };
    }

    const count = filteredRecords.length;
    const sumAvg = filteredRecords.reduce(
      (acc, r) => acc + computeAverage(r),
      0
    );
    const overallAvg = Number((sumAvg / count).toFixed(1));

    const passCount = filteredRecords.filter(
      (r) =>
        r.nahwu >= 70 &&
        r.shorof >= 70 &&
        r.durusulLughah >= 70 &&
        r.hadis >= 75 &&
        r.adab >= 75
    ).length;
    const passRate = Math.round((passCount / count) * 100);

    const sortedByScore = [...filteredRecords].sort(
      (a, b) => computeAverage(b) - computeAverage(a)
    );

    const subjectAverages = {
      nahwu: Number(
        (
          filteredRecords.reduce((a, r) => a + r.nahwu, 0) / count
        ).toFixed(1)
      ),
      shorof: Number(
        (
          filteredRecords.reduce((a, r) => a + r.shorof, 0) / count
        ).toFixed(1)
      ),
      durusulLughah: Number(
        (
          filteredRecords.reduce((a, r) => a + r.durusulLughah, 0) / count
        ).toFixed(1)
      ),
      hadis: Number(
        (
          filteredRecords.reduce((a, r) => a + r.hadis, 0) / count
        ).toFixed(1)
      ),
      adab: Number(
        (filteredRecords.reduce((a, r) => a + r.adab, 0) / count).toFixed(
          1
        )
      ),
    };

    return {
      count,
      overallAvg,
      passCount,
      passRate,
      topStudent: sortedByScore[0],
      subjectAverages,
    };
  }, [filteredRecords]);

  // Handlers
  const handleGoogleSignIn = async () => {
    try {
      setStatusBanner(null);
      await loginWithGoogle();
      setStatusBanner({
        type: 'success',
        message: 'Berhasil masuk dengan akun Google. Data nilai Anda kini tersinkronisasi ke database.',
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message:
          err instanceof Error
            ? `Gagal masuk: ${err.message}`
            : 'Gagal melakukan autentikasi Google.',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setStatusBanner({
        type: 'info',
        message: 'Anda telah keluar. Menampilkan mode pratinjau lokal.',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSingle = async (
    input: GradeFormInput,
    existingId?: string
  ) => {
    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      if (!user) {
        // Save in local preview state
        if (existingId) {
          setLocalPreviewRecords((prev) =>
            prev.map((r) =>
              r.id === existingId
                ? { ...r, ...input, updatedAt: new Date() }
                : r
            )
          );
          setStatusBanner({
            type: 'success',
            message: `Data nilai ${input.studentName} diperbarui (Mode Pratinjau). Masuk dengan Google untuk menyimpan permanen.`,
          });
        } else {
          const newRec: GradeRecord = {
            ...input,
            id: `preview_rec_${Date.now()}`,
            ownerId: 'preview_user',
            ownerName: 'Ustadz Pengajar (Pratinjau)',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setLocalPreviewRecords((prev) => [newRec, ...prev]);
          setStatusBanner({
            type: 'success',
            message: `Data nilai ${input.studentName} ditambahkan (Mode Pratinjau). Masuk dengan Google untuk menyimpan permanen.`,
          });
        }
        setEditingRecord(null);
        setActiveTab('rekap');
        return;
      }

      const ownerName = (
        user.displayName ||
        user.email?.split('@')[0] ||
        'Ustadz Pengajar'
      ).slice(0, SCHEMA_CONSTRAINTS.ownerNameMax);

      if (existingId) {
        const docRef = doc(db, 'gradeRecords', existingId);
        try {
          await updateDoc(docRef, {
            studentName: input.studentName,
            nis: input.nis,
            halaqah: input.halaqah,
            semester: input.semester,
            kategoriPenilaian: input.kategoriPenilaian,
            nahwu: input.nahwu,
            shorof: input.shorof,
            durusulLughah: input.durusulLughah,
            hadis: input.hadis,
            adab: input.adab,
            catatanUstadz: input.catatanUstadz,
            ownerName,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.UPDATE,
            `gradeRecords/${existingId}`
          );
        }
        setStatusBanner({
          type: 'success',
          message: `Nilai santri ${input.studentName} berhasil diperbarui di database.`,
        });
      } else {
        const newDocRef = doc(collection(db, 'gradeRecords'));
        try {
          await setDoc(newDocRef, {
            studentName: input.studentName,
            nis: input.nis,
            halaqah: input.halaqah,
            semester: input.semester,
            kategoriPenilaian: input.kategoriPenilaian,
            nahwu: input.nahwu,
            shorof: input.shorof,
            durusulLughah: input.durusulLughah,
            hadis: input.hadis,
            adab: input.adab,
            catatanUstadz: input.catatanUstadz,
            ownerId: user.uid,
            ownerName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.CREATE,
            `gradeRecords/${newDocRef.id}`
          );
        }
        setStatusBanner({
          type: 'success',
          message: `Nilai santri ${input.studentName} berhasil disimpan ke database.`,
        });
      }

      setEditingRecord(null);
      setActiveTab('rekap');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBatch = async (inputs: GradeFormInput[]) => {
    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      if (!user) {
        const newRecs: GradeRecord[] = inputs.map((item, idx) => ({
          ...item,
          id: `preview_batch_${Date.now()}_${idx}`,
          ownerId: 'preview_user',
          ownerName: 'Ustadz Pengajar (Pratinjau)',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setLocalPreviewRecords((prev) => [...newRecs, ...prev]);
        setStatusBanner({
          type: 'success',
          message: `${inputs.length} data nilai santri berhasil ditambahkan pada Mode Pratinjau.`,
        });
        setActiveTab('rekap');
        return;
      }

      const ownerName = (
        user.displayName ||
        user.email?.split('@')[0] ||
        'Ustadz Pengajar'
      ).slice(0, SCHEMA_CONSTRAINTS.ownerNameMax);

      const batch = writeBatch(db);
      for (const item of inputs) {
        const ref = doc(collection(db, 'gradeRecords'));
        batch.set(ref, {
          studentName: item.studentName,
          nis: item.nis,
          halaqah: item.halaqah,
          semester: item.semester,
          kategoriPenilaian: item.kategoriPenilaian,
          nahwu: item.nahwu,
          shorof: item.shorof,
          durusulLughah: item.durusulLughah,
          hadis: item.hadis,
          adab: item.adab,
          catatanUstadz: item.catatanUstadz,
          ownerId: user.uid,
          ownerName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'gradeRecords');
      }

      setStatusBanner({
        type: 'success',
        message: `${inputs.length} data nilai santri berhasil disimpan secara kolektif ke database.`,
      });
      setActiveTab('rekap');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedSampleToFirestore = async () => {
    if (!user) {
      setLocalPreviewRecords(
        INITIAL_SAMPLE_RECORDS.map((item, idx) => ({
          ...item,
          id: `preview_rec_${idx + 1}`,
          ownerId: 'preview_user',
          ownerName: 'Ustadz Ahmad Fauzi, Lc.',
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
      setStatusBanner({
        type: 'info',
        message: 'Data contoh santri telah dimuat ulang pada Mode Pratinjau.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerName = (
        user.displayName ||
        user.email?.split('@')[0] ||
        'Ustadz Pengajar'
      ).slice(0, SCHEMA_CONSTRAINTS.ownerNameMax);

      const batch = writeBatch(db);
      for (const item of INITIAL_SAMPLE_RECORDS) {
        const ref = doc(collection(db, 'gradeRecords'));
        batch.set(ref, {
          ...item,
          ownerId: user.uid,
          ownerName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'gradeRecords');
      }

      setStatusBanner({
        type: 'success',
        message: '6 data nilai santri contoh berhasil dimuat ke database Anda.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(null);
    if (!user) {
      setLocalPreviewRecords((prev) => prev.filter((r) => r.id !== id));
      setStatusBanner({
        type: 'info',
        message: 'Data nilai santri dihapus dari Mode Pratinjau.',
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'gradeRecords', id));
      setStatusBanner({
        type: 'info',
        message: 'Data nilai santri berhasil dihapus dari database.',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gradeRecords/${id}`);
    }
  };

  const handleDownloadCsv = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'Nama Santri',
      'NIS',
      'Halaqah',
      'Semester',
      'Kategori Penilaian',
      'Nahwu',
      'Shorof',
      'Durusul Lughah',
      'Hadis',
      'Adab',
      'Jumlah Nilai',
      'Rata-Rata',
      'Predikat',
      'Catatan Ustadz',
    ];

    const rows = filteredRecords.map((rec) => {
      const total = computeTotal(rec);
      const avg = computeAverage(rec);
      const pred = getPredikat(avg);
      return [
        `"${rec.studentName.replace(/"/g, '""')}"`,
        `"${rec.nis}"`,
        `"${rec.halaqah}"`,
        `"${rec.semester}"`,
        `"${rec.kategoriPenilaian}"`,
        rec.nahwu,
        rec.shorof,
        rec.durusulLughah,
        rec.hadis,
        rec.adab,
        total,
        avg.toFixed(1),
        `"${pred.label} (${pred.grade})"`,
        `"${rec.catatanUstadz.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `rekap_nilai_diniyah_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 print:hidden">
        {/* Zone 1: Brand Wordmark (single text element) */}
        <a
          href="#rekap"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('rekap');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          Al-Qalam Diniyah
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setActiveTab('rekap');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'rekap'
                ? 'border-emerald-800 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Rekap Nilai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'input'
                ? 'border-emerald-800 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Input Nilai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analitik')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'analitik'
                ? 'border-emerald-800 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Analitik Mapel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kasyf')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'kasyf'
                ? 'border-emerald-800 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Kartu Kasyf
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk Google
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setActiveTab('input');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Nilai Baru
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Workspace Context & Account Strip (Hidden on Print) */}
        <div className="border border-slate-200 bg-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Sistem Rekapitulasi Akademik Diniyah</span>
              <span aria-hidden="true">·</span>
              <span>Nahwu</span>
              <span aria-hidden="true">·</span>
              <span>Shorof</span>
              <span aria-hidden="true">·</span>
              <span>Durusul Lughah</span>
              <span aria-hidden="true">·</span>
              <span>Hadis</span>
              <span aria-hidden="true">·</span>
              <span>Adab</span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
              Pengumpulan & Evaluasi Nilai Mata Pelajaran Diniyah
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 text-xs text-slate-600 mr-2">
                <span>
                  Pengajar: <strong className="text-slate-900">{user.displayName || user.email}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-700 underline underline-offset-2 whitespace-nowrap"
                >
                  <LogOut className="w-3 h-3" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5">
                Mode Pratinjau Lokal · Masuk dengan Google untuk menyimpan ke database Cloud
              </div>
            )}

            <button
              type="button"
              onClick={handleSeedSampleToFirestore}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              Muat Contoh Santri
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusBanner && (
          <div
            className={`border px-4 py-3 text-xs font-medium flex items-center justify-between gap-4 print:hidden ${
              statusBanner.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : statusBanner.type === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-900'
                : 'border-slate-300 bg-slate-100 text-slate-800'
            }`}
          >
            <span>{statusBanner.message}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs underline whitespace-nowrap"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Active View Content */}
        {activeTab === 'rekap' && (
          <div className="space-y-6">
            {/* 4-Column Summary KPI Strip (Single-Elevation, Hairline Divided) */}
            <section className="border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-5">
                <p className="text-xs text-slate-500">Total Santri Terdata</p>
                <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {summaryMetrics.count}{' '}
                  <span className="text-sm font-normal font-sans text-slate-500">
                    santri
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {user ? 'Tersimpan di database Cloud' : 'Data pratinjau aktif'}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs text-slate-500">Rata-Rata 5 Mata Pelajaran</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
                    {summaryMetrics.overallAvg.toFixed(1)}
                  </span>
                  {summaryMetrics.count > 0 && (
                    <span className="text-xs font-medium text-slate-600">
                      · {getPredikat(summaryMetrics.overallAvg).label} (
                      {getPredikat(summaryMetrics.overallAvg).grade})
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
                  N:{summaryMetrics.subjectAverages.nahwu} · S:{summaryMetrics.subjectAverages.shorof} · DL:{summaryMetrics.subjectAverages.durusulLughah} · H:{summaryMetrics.subjectAverages.hadis} · A:{summaryMetrics.subjectAverages.adab}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs text-slate-500">Ketuntasan Seluruh KKM</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {summaryMetrics.passRate}%
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    ({summaryMetrics.passCount}/{summaryMetrics.count} santri)
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Batas KKM: Lughah 70 · Hadis & Adab 75
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs text-slate-500">Capaian Nilai Tertinggi</p>
                {summaryMetrics.topStudent ? (
                  <>
                    <p className="mt-1.5 text-base font-bold text-slate-900 truncate">
                      {summaryMetrics.topStudent.studentName}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 font-mono tabular-nums">
                      Rata-rata {computeAverage(summaryMetrics.topStudent).toFixed(1)} · Total{' '}
                      {computeTotal(summaryMetrics.topStudent)}/500
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">Belum ada data</p>
                )}
              </div>
            </section>

            {/* Filter & Search Bar */}
            <section className="border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama santri, NIS, atau halaqah..."
                  className="w-full border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filter Halaqah"
                  value={selectedHalaqah}
                  onChange={(e) => setSelectedHalaqah(e.target.value)}
                  className="border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
                >
                  <option value="ALL">Semua Halaqah</option>
                  {HALAQAH_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter Semester"
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
                >
                  <option value="ALL">Semua Semester</option>
                  {SCHEMA_CONSTRAINTS.semesterEnum.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter Kategori Penilaian"
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
                >
                  <option value="ALL">Semua Kategori</option>
                  {SCHEMA_CONSTRAINTS.kategoriEnum.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 border border-slate-300 bg-slate-50 px-2.5 py-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    aria-label="Urutkan Data"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as 'name' | 'avg_desc' | 'avg_asc' | 'recent'
                      )
                    }
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="avg_desc">Rata-Rata Tertinggi</option>
                    <option value="avg_asc">Rata-Rata Terendah</option>
                    <option value="name">Nama Santri (A-Z)</option>
                    <option value="recent">Terbaru Diperbarui</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Main High-Density Grade Table */}
            <section className="border border-slate-200 bg-white">
              {isLoadingData ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3, 4].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="h-10 bg-slate-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-12 text-center">
                  <h3 className="text-base font-semibold text-slate-900">
                    Belum Ada Data Nilai Santri yang Sesuai
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                    Tambahkan data nilai santri baru untuk mata pelajaran Nahwu, Shorof, Durusul Lughah, Hadis, dan Adab atau muat data contoh santri.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecord(null);
                        setActiveTab('input');
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-900 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Input Nilai Santri Pertama
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedSampleToFirestore}
                      className="border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Muat 6 Data Santri Contoh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4 w-10">#</th>
                        <th className="py-3 px-4">Santri & NIS</th>
                        <th className="py-3 px-4">Halaqah & Periode</th>
                        {SUBJECTS.map((subj) => (
                          <th
                            key={subj.key}
                            className="py-3 px-3 text-right whitespace-nowrap"
                          >
                            <span className="block text-slate-800">{subj.label}</span>
                            <span className="block text-[11px] font-normal text-slate-500" dir="rtl">
                              {subj.arabic}
                            </span>
                          </th>
                        ))}
                        <th className="py-3 px-3 text-right whitespace-nowrap">
                          Jumlah
                        </th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">
                          Rata-Rata
                        </th>
                        <th className="py-3 px-4">Taqdir / Predikat</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredRecords.map((rec, index) => {
                        const total = computeTotal(rec);
                        const avg = computeAverage(rec);
                        const pred = getPredikat(avg);

                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50/90 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                              {String(index + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {rec.studentName}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="font-mono tabular-nums">
                                  {rec.nis}
                                </span>
                                {rec.catatanUstadz && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate max-w-48" title={rec.catatanUstadz}>
                                      {rec.catatanUstadz}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-xs font-medium text-slate-800">
                                {rec.halaqah}
                              </div>
                              <div className="text-xs text-slate-500">
                                {rec.semester} · {rec.kategoriPenilaian}
                              </div>
                            </td>

                            {/* 5 Subject Columns */}
                            {SUBJECTS.map((subj) => {
                              const val = Number(rec[subj.key]);
                              const belowKkm = val < subj.kkm;
                              return (
                                <td
                                  key={subj.key}
                                  className={`py-3 px-3 text-right font-mono tabular-nums ${
                                    belowKkm
                                      ? 'text-rose-700 font-semibold'
                                      : 'text-slate-800'
                                  }`}
                                  title={
                                    belowKkm
                                      ? `Di bawah KKM (${subj.kkm})`
                                      : `${subj.label}: ${val}`
                                  }
                                >
                                  {val}
                                  {belowKkm && (
                                    <span className="ml-0.5 text-[10px] text-rose-600">
                                      *
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-700">
                              {total}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                              {avg.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`text-xs font-semibold ${pred.textColor}`}>
                                {pred.label} ({pred.grade})
                              </span>
                              <span className="mx-1.5 text-slate-300">·</span>
                              <span className="text-xs text-slate-600" dir="rtl">
                                {pred.arabic}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {deletingId === rec.id ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDelete(rec.id)}
                                    className="bg-rose-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-800"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(null)}
                                    className="border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedKasyfId(rec.id);
                                      setActiveTab('kasyf');
                                    }}
                                    title="Lihat Kartu Kasyfud Darajat"
                                    className="inline-flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Kasyf
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRecord(rec);
                                      setActiveTab('input');
                                    }}
                                    title="Edit Nilai Santri"
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(rec.id)}
                                    title="Hapus Data"
                                    className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer Note */}
              {filteredRecords.length > 0 && (
                <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Menampilkan <strong className="font-mono tabular-nums text-slate-800">{filteredRecords.length}</strong> data santri · Tanda (*) menunjukkan nilai mata pelajaran di bawah batas KKM.
                  </span>
                  <span>
                    Skala Taqdir: Mumtaz (90–100) · Jayyid Jiddan (80–89) · Jayyid (70–79) · Maqbul (60–69) · Rasib (&lt;60)
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'input' && (
          <GradeInputView
            editingRecord={editingRecord}
            onSaveSingle={handleSaveSingle}
            onSaveBatch={handleSaveBatch}
            onCancelEdit={() => {
              setEditingRecord(null);
              setActiveTab('rekap');
            }}
            isSubmitting={isSubmitting}
          />
        )}

        {activeTab === 'analitik' && (
          <AnalyticsView
            records={filteredRecords}
            onSelectRecordForKasyf={(id) => {
              setSelectedKasyfId(id);
              setActiveTab('kasyf');
            }}
            onEditRecord={(rec) => {
              setEditingRecord(rec);
              setActiveTab('input');
            }}
          />
        )}

        {activeTab === 'kasyf' && (
          <KasyfReportView
            records={filteredRecords}
            selectedRecordId={selectedKasyfId}
            onSelectRecord={(id) => setSelectedKasyfId(id)}
            onEditRecord={(rec) => {
              setEditingRecord(rec);
              setActiveTab('input');
            }}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Al-Qalam Diniyah — Sistem Rekapitulasi Nilai Nahwu, Shorof, Durusul Lughah, Hadis & Adab</span>
          <span>Lajnah Imtihan wa Taqwim Madrasah Diniyah</span>
        </div>
      </footer>
    </div>
  );
}
