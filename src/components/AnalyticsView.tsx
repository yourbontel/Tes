import React from 'react';
import {
  GradeRecord,
  SUBJECTS,
  computeAverage,
  getPredikat,
} from '../types';

interface AnalyticsViewProps {
  records: GradeRecord[];
  onSelectRecordForKasyf: (id: string) => void;
  onEditRecord: (record: GradeRecord) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  records,
  onSelectRecordForKasyf,
  onEditRecord,
}) => {
  if (records.length === 0) {
    return (
      <div className="border border-slate-200 bg-white p-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">
          Belum Ada Data untuk Dianalisis
        </h3>
        <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
          Silakan masukkan nilai santri atau muat data contoh terlebih dahulu untuk melihat analisis capaian mata pelajaran Nahwu, Shorof, Durusul Lughah, Hadis, dan Adab.
        </p>
      </div>
    );
  }

  // Compute statistics per subject
  const subjectStats = SUBJECTS.map((subj) => {
    const scores = records.map((r) => Number(r[subj.key]));
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Number((sum / scores.length).toFixed(1));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passedCount = scores.filter((s) => s >= subj.kkm).length;
    const passRate = Math.round((passedCount / scores.length) * 100);

    const mumtazCount = scores.filter((s) => s >= 90).length;
    const jayyidJiddanCount = scores.filter((s) => s >= 80 && s < 90).length;
    const jayyidCount = scores.filter((s) => s >= 70 && s < 80).length;
    const below70Count = scores.filter((s) => s < 70).length;

    return {
      ...subj,
      avg,
      max,
      min,
      passedCount,
      passRate,
      mumtazCount,
      jayyidJiddanCount,
      jayyidCount,
      below70Count,
    };
  });

  // Identify students needing Murojaah (any subject below its KKM)
  const remedialList = records
    .map((rec) => {
      const belowSubjects = SUBJECTS.filter(
        (subj) => Number(rec[subj.key]) < subj.kkm
      ).map((subj) => ({
        label: subj.label,
        score: Number(rec[subj.key]),
        kkm: subj.kkm,
      }));
      return {
        record: rec,
        belowSubjects,
        avg: computeAverage(rec),
      };
    })
    .filter((item) => item.belowSubjects.length > 0);

  // Halaqah averages
  const halaqahGroups = Array.from(new Set(records.map((r) => r.halaqah))).map(
    (halaqahName) => {
      const group = records.filter((r) => r.halaqah === halaqahName);
      const avg =
        group.reduce((acc, r) => acc + computeAverage(r), 0) / group.length;
      const avgNahwu =
        group.reduce((acc, r) => acc + Number(r.nahwu), 0) / group.length;
      const avgShorof =
        group.reduce((acc, r) => acc + Number(r.shorof), 0) / group.length;
      const avgDurus =
        group.reduce((acc, r) => acc + Number(r.durusulLughah), 0) / group.length;
      const avgHadis =
        group.reduce((acc, r) => acc + Number(r.hadis), 0) / group.length;
      const avgAdab =
        group.reduce((acc, r) => acc + Number(r.adab), 0) / group.length;

      return {
        halaqahName,
        count: group.length,
        avg: Number(avg.toFixed(1)),
        avgNahwu: Number(avgNahwu.toFixed(1)),
        avgShorof: Number(avgShorof.toFixed(1)),
        avgDurus: Number(avgDurus.toFixed(1)),
        avgHadis: Number(avgHadis.toFixed(1)),
        avgAdab: Number(avgAdab.toFixed(1)),
      };
    }
  );

  return (
    <div className="space-y-8">
      {/* Section 1: 5 Subject Deep-Dive Table */}
      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              01. Evaluasi Capaian Lima Mata Pelajaran Pokok
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan nilai rata-rata, rentang nilai, ketuntasan KKM, dan sebaran predikat pada {records.length} data santri
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Total Sampel: {records.length} Santri
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Mata Pelajaran</th>
                <th className="py-3 px-4 text-right">KKM</th>
                <th className="py-3 px-4 text-right">Rata-Rata</th>
                <th className="py-3 px-4 text-right">Tertinggi</th>
                <th className="py-3 px-4 text-right">Terendah</th>
                <th className="py-3 px-4 text-right">Ketuntasan KKM</th>
                <th className="py-3 px-6">Sebaran Predikat (Mumtaz · J.Jiddan · Jayyid · &lt;70)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {subjectStats.map((stat) => {
                const pred = getPredikat(stat.avg);
                return (
                  <tr key={stat.key} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{stat.label}</div>
                          <div className="text-xs text-slate-500">{stat.description}</div>
                        </div>
                        <span className="text-base font-medium text-slate-700 shrink-0" dir="rtl">
                          {stat.arabic}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {stat.kkm}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {stat.avg.toFixed(1)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {pred.label} ({pred.grade})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {stat.max}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {stat.min}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono tabular-nums font-semibold text-slate-900">
                        {stat.passRate}%
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {stat.passedCount}/{records.length} lulus
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      {/* Visual Bar + Clean Unboxed Text Breakdown */}
                      <div className="w-full h-2 bg-slate-100 flex overflow-hidden mb-1.5">
                        <div
                          className="bg-emerald-700 h-full"
                          style={{ width: `${(stat.mumtazCount / records.length) * 100}%` }}
                          title={`Mumtaz: ${stat.mumtazCount}`}
                        />
                        <div
                          className="bg-teal-600 h-full"
                          style={{ width: `${(stat.jayyidJiddanCount / records.length) * 100}%` }}
                          title={`Jayyid Jiddan: ${stat.jayyidJiddanCount}`}
                        />
                        <div
                          className="bg-slate-400 h-full"
                          style={{ width: `${(stat.jayyidCount / records.length) * 100}%` }}
                          title={`Jayyid: ${stat.jayyidCount}`}
                        />
                        <div
                          className="bg-rose-600 h-full"
                          style={{ width: `${(stat.below70Count / records.length) * 100}%` }}
                          title={`Di bawah 70: ${stat.below70Count}`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums">
                        <span className="text-emerald-700">{stat.mumtazCount} A</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-teal-700">{stat.jayyidJiddanCount} B</span>
                        <span aria-hidden="true">·</span>
                        <span>{stat.jayyidCount} C</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-rose-700">{stat.below70Count} D/E</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Halaqah Comparison Matrix */}
      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            02. Rekapitulasi Rata-Rata Nilai per Kelas / Halaqah
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan performa akademik antar halaqah untuk setiap mata pelajaran diniyah
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Nama Halaqah / Kelas</th>
                <th className="py-3 px-4 text-right">Jumlah Santri</th>
                <th className="py-3 px-4 text-right">Nahwu</th>
                <th className="py-3 px-4 text-right">Shorof</th>
                <th className="py-3 px-4 text-right">Durusul Lughah</th>
                <th className="py-3 px-4 text-right">Hadis</th>
                <th className="py-3 px-4 text-right">Adab</th>
                <th className="py-3 px-6 text-right">Rata-Rata Halaqah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {halaqahGroups.map((h) => {
                const pred = getPredikat(h.avg);
                return (
                  <tr key={h.halaqahName} className="hover:bg-slate-50/80">
                    <td className="py-3 px-6 font-semibold text-slate-900">
                      {h.halaqahName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {h.count} santri
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {h.avgNahwu.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {h.avgShorof.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {h.avgDurus.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {h.avgHadis.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {h.avgAdab.toFixed(1)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {h.avg.toFixed(1)}
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className={`text-xs font-medium ${pred.textColor}`}>
                        {pred.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Remedial / Murojaah Attention List */}
      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              03. Daftar Santri Prioritas Murojaah (Di Bawah KKM)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Santri yang memiliki nilai di bawah batas KKM pada satu atau lebih mata pelajaran
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {remedialList.length} Santri Teridentifikasi
          </span>
        </div>

        {remedialList.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-800">
            Alhamdulillah, seluruh santri yang terdata telah mencapai batas kelulusan KKM pada kelima mata pelajaran.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {remedialList.map(({ record, belowSubjects, avg }) => (
              <div
                key={record.id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {record.studentName}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {record.nis}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs text-slate-600">{record.halaqah}</span>
                  </div>
                  <div className="mt-1 text-xs text-rose-700">
                    Mata pelajaran perlu perbaikan:{' '}
                    {belowSubjects.map((b, i) => (
                      <React.Fragment key={b.label}>
                        {i > 0 && <span className="mx-1.5 text-slate-400">·</span>}
                        <span className="font-medium">
                          {b.label}: <strong className="font-mono tabular-nums">{b.score}</strong> (KKM {b.kkm})
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  {record.catatanUstadz && (
                    <p className="mt-1 text-xs text-slate-500">
                      Catatan: {record.catatanUstadz}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right mr-2">
                    <span className="block text-xs text-slate-500">Rata-rata</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditRecord(record)}
                    className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Perbarui Nilai
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectRecordForKasyf(record.id)}
                    className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Lihat Kasyf
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
