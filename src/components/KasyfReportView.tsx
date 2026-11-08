import React from 'react';
import { Printer, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  GradeRecord,
  SUBJECTS,
  computeTotal,
  computeAverage,
  getPredikat,
} from '../types';

interface KasyfReportViewProps {
  records: GradeRecord[];
  selectedRecordId: string | null;
  onSelectRecord: (id: string) => void;
  onEditRecord: (record: GradeRecord) => void;
}

export const KasyfReportView: React.FC<KasyfReportViewProps> = ({
  records,
  selectedRecordId,
  onSelectRecord,
  onEditRecord,
}) => {
  if (records.length === 0) {
    return (
      <div className="border border-slate-200 bg-white p-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">
          Belum Ada Data Kasyfud Darajat
        </h3>
        <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
          Tambahkan data nilai santri terlebih dahulu pada menu Input Nilai untuk mencetak kartu hasil studi (Kasyfud Darajat).
        </p>
      </div>
    );
  }

  const currentIndex = Math.max(
    0,
    records.findIndex((r) => r.id === selectedRecordId)
  );
  const activeRecord = records[currentIndex] || records[0];
  const totalScore = computeTotal(activeRecord);
  const avgScore = computeAverage(activeRecord);
  const overallPredikat = getPredikat(avgScore);

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + records.length) % records.length;
    onSelectRecord(records[prevIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % records.length;
    onSelectRecord(records[nextIdx].id);
  };

  return (
    <div className="space-y-6">
      {/* Selector & Print Toolbar (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 bg-white p-4 print:hidden">
        <div className="flex items-center gap-3">
          <label htmlFor="santri-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Pilih Santri:
          </label>
          <select
            id="santri-select"
            value={activeRecord.id}
            onChange={(e) => onSelectRecord(e.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
          >
            {records.map((rec, idx) => (
              <option key={rec.id} value={rec.id}>
                {idx + 1}. {rec.studentName} ({rec.nis}) — {rec.halaqah}
              </option>
            ))}
          </select>

          <div className="flex items-center border border-slate-200">
            <button
              type="button"
              onClick={handlePrev}
              title="Santri Sebelumnya"
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-mono tabular-nums text-slate-600">
              {currentIndex + 1} / {records.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              title="Santri Berikutnya"
              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEditRecord(activeRecord)}
            className="border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Edit Nilai Santri Ini
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak Kasyfud Darajat
          </button>
        </div>
      </div>

      {/* Printable Official Kasyfud Darajat Sheet */}
      <div className="border border-slate-300 bg-white p-8 md:p-12 print:border-0 print:p-0">
        {/* Header Institution */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              LAJNAH IMTIHAN WA TAQWIM AL-MADRASAH AD-DINIYAH
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              KASYFUD DARAJAT — LAPORAN HASIL EVALUASI DINIYAH
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Rekapitulasi Resmi Nilai Mata Pelajaran Nahwu, Shorof, Durusul Lughah, Hadis, dan Adab
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-2xl font-bold text-slate-900" dir="rtl">
              كشف الدرجات الدراسية
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              Dokumen ID: {activeRecord.id.slice(0, 10).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Student Metadata Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 border-b border-slate-200 pb-6 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Nama Lengkap Santri</span>
            <span className="font-semibold text-slate-900">{activeRecord.studentName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Semester Akademik</span>
            <span className="font-semibold text-slate-900">{activeRecord.semester}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Nomor Induk Santri (NIS)</span>
            <span className="font-mono tabular-nums font-medium text-slate-900">{activeRecord.nis}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Kategori Evaluasi</span>
            <span className="font-medium text-slate-900">{activeRecord.kategoriPenilaian}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Kelas / Halaqah</span>
            <span className="font-medium text-slate-900">{activeRecord.halaqah}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">Pengajar / Musyrif Penilai</span>
            <span className="font-medium text-slate-900">{activeRecord.ownerName}</span>
          </div>
        </div>

        {/* 5 Subjects Score Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold w-12">No</th>
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold">Mata Pelajaran (المادة الدراسية)</th>
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold">Kompetensi Inti</th>
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold text-right w-24">KKM</th>
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold text-right w-28">Nilai Angka</th>
                <th className="border-r border-slate-300 px-4 py-3 text-xs font-semibold w-40">Taqdir / Predikat</th>
                <th className="px-4 py-3 text-xs font-semibold w-36">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {SUBJECTS.map((subj, index) => {
                const score = Number(activeRecord[subj.key]);
                const pred = getPredikat(score);
                const passedKkm = score >= subj.kkm;
                return (
                  <tr key={subj.key} className="hover:bg-slate-50/80">
                    <td className="border-r border-slate-300 px-4 py-3 font-mono tabular-nums text-slate-600">
                      0{index + 1}
                    </td>
                    <td className="border-r border-slate-300 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{subj.label}</span>
                        <span className="text-base font-medium text-slate-700" dir="rtl">
                          {subj.arabic}
                        </span>
                      </div>
                    </td>
                    <td className="border-r border-slate-300 px-4 py-3 text-xs text-slate-600">
                      {subj.description}
                    </td>
                    <td className="border-r border-slate-300 px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                      {subj.kkm}
                    </td>
                    <td className="border-r border-slate-300 px-4 py-3 text-right font-mono tabular-nums font-bold text-slate-900 text-base">
                      {score}
                    </td>
                    <td className="border-r border-slate-300 px-4 py-3">
                      <span className={`font-medium ${pred.textColor}`}>
                        {pred.label} ({pred.grade})
                      </span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="text-slate-700" dir="rtl">
                        {pred.arabic}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {passedKkm ? (
                        <span className="font-medium text-emerald-700">Lulus KKM</span>
                      ) : (
                        <span className="font-medium text-rose-700">Perlu Murojaah</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                <td colSpan={4} className="border-r border-slate-300 px-4 py-3 text-right">
                  Jumlah Nilai (المجموع الكلي)
                </td>
                <td className="border-r border-slate-300 px-4 py-3 text-right font-mono tabular-nums text-base">
                  {totalScore} / 500
                </td>
                <td colSpan={2} className="px-4 py-3 text-xs text-slate-600">
                  Total dari 5 Mata Pelajaran Pokok
                </td>
              </tr>
              <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900">
                <td colSpan={4} className="border-r border-slate-300 px-4 py-3 text-right">
                  Nilai Rata-Rata (المعدل العام) & Taqdir Akhir
                </td>
                <td className="border-r border-slate-300 px-4 py-3 text-right font-mono tabular-nums text-lg text-emerald-800">
                  {avgScore.toFixed(1)}
                </td>
                <td colSpan={2} className="px-4 py-3">
                  <span className={overallPredikat.textColor}>
                    {overallPredikat.label} (Predikat {overallPredikat.grade})
                  </span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span dir="rtl">{overallPredikat.arabic}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Catatan Ustadz */}
        <div className="mt-6 border border-slate-300 p-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">
              Catatan Evaluasi & التوجيهات التربوية (Murojaah Ustadz)
            </h4>
            <span className="text-xs text-slate-500">
              Diperbarui: {activeRecord.updatedAt.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-800 leading-relaxed">
            {activeRecord.catatanUstadz || 'Tidak ada catatan khusus. Pertahankan semangat menuntut ilmu syar’i.'}
          </p>
        </div>

        {/* Signature Block */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4 text-center text-xs text-slate-700">
          <div>
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-semibold text-slate-900 mt-0.5">Wali Santri / Orang Tua</p>
            <div className="h-20" />
            <p className="border-t border-slate-300 pt-1.5 inline-block min-w-44 text-slate-600">
              ( Tanda Tangan & Nama Terang )
            </p>
          </div>
          <div>
            <p className="text-slate-500">Diperiksa Oleh,</p>
            <p className="font-semibold text-slate-900 mt-0.5">Musyrif / Pengajar Halaqah</p>
            <div className="h-20" />
            <p className="border-t border-slate-300 pt-1.5 inline-block min-w-44 font-semibold text-slate-900">
              {activeRecord.ownerName}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Disahkan Oleh,</p>
            <p className="font-semibold text-slate-900 mt-0.5">Mudir Ma’had / Kepala Madrasah</p>
            <div className="h-20" />
            <p className="border-t border-slate-300 pt-1.5 inline-block min-w-44 text-slate-600">
              ( Lajnah Imtihan Diniyah )
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
