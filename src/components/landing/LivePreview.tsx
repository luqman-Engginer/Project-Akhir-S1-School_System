'use client';

import { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  HeartHandshake,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export function LivePreview() {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'parent'>('teacher');

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 rounded-2xl bg-white border-2 border-stone-200/90 shadow-md overflow-hidden">
      {/* Top Header bar with tabs */}
      <div className="bg-stone-100 border-b-2 border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-stone-600 ml-2">
            Pratinjau Antarmuka Sekolahku
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'teacher'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            <span>Guru & Wali</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white text-sky-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-700" />
            <span>Murid</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'parent'
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
            <span>Orang Tua</span>
          </button>
        </div>
      </div>

      {/* Screen Body */}
      <div className="p-5 sm:p-7 bg-[#FAF7F2]">
        {activeTab === 'teacher' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Wali Kelas & Guru Mapel
                </span>
                <h4 className="font-display text-lg font-bold text-stone-900">
                  Presensi Cepat: Kelas XI RPL 1
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Hari Ini: Rabu, 19 Nov</span>
              </span>
            </div>

            {/* Attendance Roster Preview */}
            <div className="bg-white border-2 border-stone-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 text-xs font-bold text-stone-500">
                <span>Daftar Murid (Semua default Hadir)</span>
                <span>Ubah hanya bila absen</span>
              </div>

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-stone-100 text-stone-800 font-bold text-xs flex items-center justify-center border border-stone-300">
                    RP
                  </span>
                  <span className="text-sm font-bold text-stone-900">Raka Pratama</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                    Hadir
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-stone-100 text-stone-500 text-xs hover:bg-stone-200 cursor-pointer">
                    Sakit
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-stone-100 text-stone-800 font-bold text-xs flex items-center justify-center border border-stone-300">
                    NP
                  </span>
                  <span className="text-sm font-bold text-stone-900">Nadia Putri</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                    Izin
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-950">
              <span>Ringkasan: 33 Hadir, 1 Izin, 0 Alpa</span>
              <span className="font-bold underline cursor-pointer">Simpan Rekapan &rarr;</span>
            </div>
          </div>
        )}

        {activeTab === 'student' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                  Beranda Murid
                </span>
                <h4 className="font-display text-lg font-bold text-stone-900">
                  Tugas yang Perlu Dikerjakan
                </h4>
              </div>
              <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">
                2 Tugas Menunggu
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-4 bg-white border-2 border-stone-200/90 rounded-xl shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-800 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      Tugas 04: Pemrograman Database Relasional
                    </div>
                    <div className="text-xs font-semibold text-stone-600 mt-0.5">
                      Basis Data &bull; Batas: <span className="text-red-700 font-bold">Besok 23.59 WIB (&lt; 24 jam)</span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 font-bold text-xs border border-red-200 shrink-0">
                  Belum Kumpul
                </span>
              </div>

              <div className="p-4 bg-white border-2 border-stone-200/90 rounded-xl shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      Praktikum 03: Desain REST API Express
                    </div>
                    <div className="text-xs font-semibold text-stone-600 mt-0.5">
                      Pemrograman Web &bull; Dinilai: <span className="text-emerald-800 font-bold">Nilai 92/100</span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200 shrink-0">
                  Sudah Dinilai
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'parent' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Pantauan Orang Tua
                </span>
                <h4 className="font-display text-lg font-bold text-stone-900">
                  Perkembangan & Kehadiran: Raka Pratama
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Presensi 98% (Bulan Ini)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-white border-2 border-stone-200/90 rounded-xl shadow-2xs">
                <div className="flex items-center gap-2 mb-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold">Kehadiran Hari Ini</span>
                </div>
                <div className="text-base font-bold text-stone-900">Tercatat Hadir</div>
                <div className="text-xs text-stone-500 mt-1">Masuk kelas pukul 07.15 WIB</div>
              </div>

              <div className="p-4 bg-white border-2 border-stone-200/90 rounded-xl shadow-2xs">
                <div className="flex items-center gap-2 mb-2 text-stone-700">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold">Pesan Wali Kelas</span>
                </div>
                <div className="text-sm font-bold text-stone-900 line-clamp-1">
                  Pak Dedi Kurniawan, S.Kom
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  &ldquo;Raka sangat aktif dalam praktikum basis data hari ini.&rdquo;
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-semibold text-amber-950">
              <span>Anak berhalangan hadir besok?</span>
              <span className="font-bold underline cursor-pointer">Ajukan Izin Sakit Sekarang &rarr;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
