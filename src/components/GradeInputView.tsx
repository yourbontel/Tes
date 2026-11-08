import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import {
  GradeFormInput,
  GradeRecord,
  SUBJECTS,
  HALAQAH_OPTIONS,
  computeTotal,
  computeAverage,
  getPredikat,
} from '../types';
import { SCHEMA_CONSTRAINTS } from '../firebase';

interface GradeInputViewProps {
  editingRecord: GradeRecord | null;
  onSaveSingle: (input: GradeFormInput, existingId?: string) => Promise<void>;
  onSaveBatch: (inputs: GradeFormInput[]) => Promise<void>;
  onCancelEdit: () => void;
  isSubmitting: boolean;
}

const DEFAULT_FORM: GradeFormInput = {
  studentName: '',
  nis: 'SANTRI-1447-',
  halaqah: HALAQAH_OPTIONS[0],
  semester: SCHEMA_CONSTRAINTS.semesterEnum[0],
  kategoriPenilaian: SCHEMA_CONSTRAINTS.kategoriEnum[0],
  nahwu: 80,
  shorof: 80,
  durusulLughah: 80,
  hadis: 85,
  adab: 90,
  catatanUstadz: '',
};

export const GradeInputView: React.FC<GradeInputViewProps> = ({
  editingRecord,
  onSaveSingle,
  onSaveBatch,
  onCancelEdit,
  isSubmitting,
}) => {
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [form, setForm] = useState<GradeFormInput>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Batch spreadsheet state
  const [batchSemester, setBatchSemester] = useState<string>(
    SCHEMA_CONSTRAINTS.semesterEnum[0]
  );
  const [batchHalaqah, setBatchHalaqah] = useState<string>(HALAQAH_OPTIONS[0]);
  const [batchKategori, setBatchKategori] = useState<string>(
    SCHEMA_CONSTRAINTS.kategoriEnum[0]
  );
  const [batchRows, setBatchRows] = useState<
    Array<{
      studentName: string;
      nis: string;
      nahwu: number;
      shorof: number;
      durusulLughah: number;
      hadis: number;
      adab: number;
      catatanUstadz: string;
    }>
  >([
    {
      studentName: '',
      nis: 'SANTRI-1447-007',
      nahwu: 85,
      shorof: 82,
      durusulLughah: 88,
      hadis: 90,
      adab: 92,
      catatanUstadz: '',
    },
    {
      studentName: '',
      nis: 'SANTRI-1447-008',
      nahwu: 80,
      shorof: 78,
      durusulLughah: 84,
      hadis: 86,
      adab: 90,
      catatanUstadz: '',
    },
  ]);

  useEffect(() => {
    if (editingRecord) {
      setInputMode('single');
      setForm({
        studentName: editingRecord.studentName,
        nis: editingRecord.nis,
        halaqah: editingRecord.halaqah,
        semester: editingRecord.semester,
        kategoriPenilaian: editingRecord.kategoriPenilaian,
        nahwu: editingRecord.nahwu,
        shorof: editingRecord.shorof,
        durusulLughah: editingRecord.durusulLughah,
        hadis: editingRecord.hadis,
        adab: editingRecord.adab,
        catatanUstadz: editingRecord.catatanUstadz,
      });
      setValidationError(null);
    }
  }, [editingRecord]);

  const validateSingleInput = (data: GradeFormInput): string | null => {
    const trimmedName = data.studentName.trim();
    const trimmedNis = data.nis.trim();
    const trimmedHalaqah = data.halaqah.trim();

    if (
      trimmedName.length < 1 ||
      trimmedName.length > SCHEMA_CONSTRAINTS.studentNameMax
    ) {
      return `Nama santri wajib diisi (maksimal ${SCHEMA_CONSTRAINTS.studentNameMax} karakter).`;
    }
    if (
      trimmedNis.length < 1 ||
      trimmedNis.length > SCHEMA_CONSTRAINTS.nisMax ||
      !SCHEMA_CONSTRAINTS.nisPattern.test(trimmedNis)
    ) {
      return `NIS wajib diisi (1-${SCHEMA_CONSTRAINTS.nisMax} karakter, hanya huruf, angka, garis bawah, atau tanda hubung).`;
    }
    if (
      trimmedHalaqah.length < 1 ||
      trimmedHalaqah.length > SCHEMA_CONSTRAINTS.halaqahMax
    ) {
      return `Nama halaqah wajib diisi (maksimal ${SCHEMA_CONSTRAINTS.halaqahMax} karakter).`;
    }
    if (!SCHEMA_CONSTRAINTS.semesterEnum.includes(data.semester)) {
      return 'Semester tidak valid.';
    }
    if (!SCHEMA_CONSTRAINTS.kategoriEnum.includes(data.kategoriPenilaian)) {
      return 'Kategori penilaian tidak valid.';
    }
    for (const subj of SUBJECTS) {
      const val = Number(data[subj.key]);
      if (Number.isNaN(val) || val < 0 || val > 100) {
        return `Nilai ${subj.label} harus berupa angka antara 0 hingga 100.`;
      }
    }
    if (data.catatanUstadz.length > SCHEMA_CONSTRAINTS.catatanMax) {
      return `Catatan ustadz maksimal ${SCHEMA_CONSTRAINTS.catatanMax} karakter.`;
    }
    return null;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const sanitized: GradeFormInput = {
      studentName: form.studentName.trim().slice(0, SCHEMA_CONSTRAINTS.studentNameMax),
      nis: form.nis.trim().slice(0, SCHEMA_CONSTRAINTS.nisMax),
      halaqah: form.halaqah.trim().slice(0, SCHEMA_CONSTRAINTS.halaqahMax),
      semester: form.semester,
      kategoriPenilaian: form.kategoriPenilaian,
      nahwu: Math.min(100, Math.max(0, Math.round(Number(form.nahwu)))),
      shorof: Math.min(100, Math.max(0, Math.round(Number(form.shorof)))),
      durusulLughah: Math.min(
        100,
        Math.max(0, Math.round(Number(form.durusulLughah)))
      ),
      hadis: Math.min(100, Math.max(0, Math.round(Number(form.hadis)))),
      adab: Math.min(100, Math.max(0, Math.round(Number(form.adab)))),
      catatanUstadz: form.catatanUstadz
        .trim()
        .slice(0, SCHEMA_CONSTRAINTS.catatanMax),
    };

    const err = validateSingleInput(sanitized);
    if (err) {
      setValidationError(err);
      return;
    }

    await onSaveSingle(sanitized, editingRecord?.id);
    if (!editingRecord) {
      setForm(DEFAULT_FORM);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const prepared: GradeFormInput[] = [];
    for (let i = 0; i < batchRows.length; i++) {
      const row = batchRows[i];
      const item: GradeFormInput = {
        studentName: row.studentName
          .trim()
          .slice(0, SCHEMA_CONSTRAINTS.studentNameMax),
        nis: row.nis.trim().slice(0, SCHEMA_CONSTRAINTS.nisMax),
        halaqah: batchHalaqah,
        semester: batchSemester,
        kategoriPenilaian: batchKategori,
        nahwu: Math.min(100, Math.max(0, Math.round(Number(row.nahwu)))),
        shorof: Math.min(100, Math.max(0, Math.round(Number(row.shorof)))),
        durusulLughah: Math.min(
          100,
          Math.max(0, Math.round(Number(row.durusulLughah)))
        ),
        hadis: Math.min(100, Math.max(0, Math.round(Number(row.hadis)))),
        adab: Math.min(100, Math.max(0, Math.round(Number(row.adab)))),
        catatanUstadz: row.catatanUstadz
          .trim()
          .slice(0, SCHEMA_CONSTRAINTS.catatanMax),
      };
      const err = validateSingleInput(item);
      if (err) {
        setValidationError(`Baris #${i + 1}: ${err}`);
        return;
      }
      prepared.push(item);
    }

    await onSaveBatch(prepared);
  };

  const currentTotal = computeTotal(form);
  const currentAvg = computeAverage(form);
  const currentPredikat = getPredikat(currentAvg);

  return (
    <div className="space-y-6">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {editingRecord
              ? `Perbarui Data Nilai: ${editingRecord.studentName}`
              : 'Formulir Pengumpulan Nilai Santri'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Masukkan nilai skala 0–100 untuk mata pelajaran Nahwu, Shorof, Durusul Lughah, Hadis, dan Adab
          </p>
        </div>

        {!editingRecord && (
          <div className="flex items-center gap-1 p-1 bg-slate-100">
            <button
              type="button"
              onClick={() => {
                setInputMode('single');
                setValidationError(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                inputMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Input Santri Tunggal
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('batch');
                setValidationError(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                inputMode === 'batch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Input Cepat Kolektif (Tabel Massal)
            </button>
          </div>
        )}
      </div>

      {validationError && (
        <div className="border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          Perhatian Validasi: {validationError}
        </div>
      )}

      {inputMode === 'single' ? (
        <form
          onSubmit={handleSingleSubmit}
          className="border border-slate-200 bg-white divide-y divide-slate-200"
        >
          {/* Section A: Identitas Santri & Periode */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              01. Identitas Santri & Periode Akademik
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Lengkap Santri *
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_CONSTRAINTS.studentNameMax}
                  value={form.studentName}
                  onChange={(e) =>
                    setForm({ ...form, studentName: e.target.value })
                  }
                  placeholder="Contoh: Ahmad Fauzan Al-Farisi"
                  className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nomor Induk Santri (NIS) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_CONSTRAINTS.nisMax}
                  value={form.nis}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nis: e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''),
                    })
                  }
                  placeholder="Contoh: SANTRI-1447-001"
                  className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Format alfanumerik dan tanda hubung (-).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Kelas / Halaqah *
                </label>
                <select
                  value={form.halaqah}
                  onChange={(e) => setForm({ ...form, halaqah: e.target.value })}
                  className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                >
                  {HALAQAH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Semester Akademik *
                </label>
                <select
                  value={form.semester}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value })
                  }
                  className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                >
                  {SCHEMA_CONSTRAINTS.semesterEnum.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Kategori Penilaian *
                </label>
                <select
                  value={form.kategoriPenilaian}
                  onChange={(e) =>
                    setForm({ ...form, kategoriPenilaian: e.target.value })
                  }
                  className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                >
                  {SCHEMA_CONSTRAINTS.kategoriEnum.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section B: Input Nilai 5 Mata Pelajaran */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  02. Pengisian Nilai Lima Mata Pelajaran (Skala 0–100)
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap mata pelajaran memiliki bobot setara dalam perhitungan rata-rata akhir
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Set Cepat Semua Mapel:</span>
                {[75, 85, 95].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        nahwu: preset,
                        shorof: preset,
                        durusulLughah: preset,
                        hadis: preset,
                        adab: preset,
                      })
                    }
                    className="border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono tabular-nums text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {SUBJECTS.map((subj) => {
                const scoreVal = Number(form[subj.key]);
                const pred = getPredikat(scoreVal);
                return (
                  <div
                    key={subj.key}
                    className="border border-slate-200 p-4 flex flex-col justify-between bg-slate-50/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`score-${subj.key}`}
                          className="text-sm font-semibold text-slate-900"
                        >
                          {subj.label}
                        </label>
                        <span className="text-base font-medium text-slate-700" dir="rtl">
                          {subj.arabic}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {subj.description}
                      </p>
                    </div>

                    <div className="mt-4">
                      <input
                        id={`score-${subj.key}`}
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={form[subj.key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [subj.key]: Number(e.target.value),
                          })
                        }
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-right font-mono tabular-nums text-lg font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono tabular-nums">
                          KKM: {subj.kkm}
                        </span>
                        <span className={`font-medium ${pred.textColor}`}>
                          {pred.label} ({pred.grade})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Calculation Strip */}
            <div className="mt-6 border border-slate-200 bg-slate-50 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span>Ringkasan Kalkulasi Otomatis</span>
                <span className="mx-2 text-slate-300">·</span>
                <span>5 Mata Pelajaran Terhitung</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-500 text-xs mr-2">Jumlah Nilai:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {currentTotal} / 500
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs mr-2">Rata-Rata:</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-800 text-base">
                    {currentAvg.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs mr-2">Taqdir Akhir:</span>
                  <span className={`font-semibold ${currentPredikat.textColor}`}>
                    {currentPredikat.label} ({currentPredikat.grade}) · {currentPredikat.arabic}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Catatan Ustadz & Submit */}
          <div className="p-6">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              03. Catatan Evaluasi / Murojaah Pengajar (Opsional, Maks. {SCHEMA_CONSTRAINTS.catatanMax} Karakter)
            </label>
            <textarea
              rows={3}
              maxLength={SCHEMA_CONSTRAINTS.catatanMax}
              value={form.catatanUstadz}
              onChange={(e) =>
                setForm({ ...form, catatanUstadz: e.target.value })
              }
              placeholder="Tuliskan catatan perkembangan santri dalam penguasaan kaidah Nahwu, tashrif Shorof, hiwar Durusul Lughah, hafalan Hadis, atau pengamalan Adab..."
              className="w-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            <div className="mt-1 text-right text-xs font-mono tabular-nums text-slate-400">
              {form.catatanUstadz.length} / {SCHEMA_CONSTRAINTS.catatanMax}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              {editingRecord ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Batal Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    setValidationError(null);
                  }}
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Formulir
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-emerald-800 px-5 py-2 text-xs font-medium text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-4 h-4" />
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingRecord
                  ? 'Simpan Perubahan Nilai'
                  : 'Simpan Nilai Santri'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Batch Spreadsheet Input Mode */
        <form
          onSubmit={handleBatchSubmit}
          className="border border-slate-200 bg-white divide-y divide-slate-200"
        >
          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Pengaturan Kelas & Periode untuk Input Kolektif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kelas / Halaqah
                </label>
                <select
                  value={batchHalaqah}
                  onChange={(e) => setBatchHalaqah(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {HALAQAH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Semester Akademik
                </label>
                <select
                  value={batchSemester}
                  onChange={(e) => setBatchSemester(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {SCHEMA_CONSTRAINTS.semesterEnum.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kategori Penilaian
                </label>
                <select
                  value={batchKategori}
                  onChange={(e) => setBatchKategori(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {SCHEMA_CONSTRAINTS.kategoriEnum.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-10">#</th>
                  <th className="py-3 px-3 min-w-48">Nama Santri *</th>
                  <th className="py-3 px-3 w-40">NIS *</th>
                  <th className="py-3 px-2 w-24 text-right">Nahwu</th>
                  <th className="py-3 px-2 w-24 text-right">Shorof</th>
                  <th className="py-3 px-2 w-24 text-right">Durus. L</th>
                  <th className="py-3 px-2 w-24 text-right">Hadis</th>
                  <th className="py-3 px-2 w-24 text-right">Adab</th>
                  <th className="py-3 px-3 w-24 text-right">Rata-rata</th>
                  <th className="py-3 px-3 min-w-44">Catatan Singkat</th>
                  <th className="py-3 px-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {batchRows.map((row, idx) => {
                  const rowAvg = computeAverage(row);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap santri..."
                          value={row.studentName}
                          onChange={(e) => {
                            const next = [...batchRows];
                            next[idx].studentName = e.target.value;
                            setBatchRows(next);
                          }}
                          className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          required
                          value={row.nis}
                          onChange={(e) => {
                            const next = [...batchRows];
                            next[idx].nis = e.target.value.replace(
                              /[^a-zA-Z0-9_\-]/g,
                              ''
                            );
                            setBatchRows(next);
                          }}
                          className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900"
                        />
                      </td>
                      {(['nahwu', 'shorof', 'durusulLughah', 'hadis', 'adab'] as const).map(
                        (field) => (
                          <td key={field} className="py-2.5 px-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              required
                              value={row[field]}
                              onChange={(e) => {
                                const next = [...batchRows];
                                next[idx][field] = Number(e.target.value);
                                setBatchRows(next);
                              }}
                              className="w-full border border-slate-300 bg-white px-2 py-1.5 text-right font-mono tabular-nums text-sm font-semibold text-slate-900"
                            />
                          </td>
                        )
                      )}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-800">
                        {rowAvg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={row.catatanUstadz}
                          onChange={(e) => {
                            const next = [...batchRows];
                            next[idx].catatanUstadz = e.target.value;
                            setBatchRows(next);
                          }}
                          className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {batchRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBatchRows(batchRows.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                setBatchRows([
                  ...batchRows,
                  {
                    studentName: '',
                    nis: `SANTRI-1447-0${batchRows.length + 7}`,
                    nahwu: 80,
                    shorof: 80,
                    durusulLughah: 80,
                    hadis: 85,
                    adab: 90,
                    catatanUstadz: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Baris Santri
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-emerald-800 px-5 py-2 text-xs font-medium text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              {isSubmitting
                ? 'Menyimpan Semua...'
                : `Simpan Kolektif (${batchRows.length} Santri)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
