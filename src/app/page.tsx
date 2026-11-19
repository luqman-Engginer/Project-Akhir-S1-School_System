import Link from 'next/link';
import {
  GraduationCap,
  Clock,
  ShieldCheck,
  BookOpen,
  HeartHandshake,
  ArrowRight,
  Sparkles,
  Smartphone,
  CheckCircle2,
  FileText,
  MessageSquare,
} from 'lucide-react';

export default function LandingPage() {
  const roles = [
    {
      title: 'Guru & Wali Kelas',
      badge: 'Efisiensi Kelas',
      desc: 'Presensi murid hanya 1 menit per rombel. Berikan tugas, nilai langsung, dan terhubung dengan orang tua.',
      icon: GraduationCap,
      features: [
        'Absensi otomatis default "Hadir"',
        'Kelola tugas & penandaan terlambat',
        'Rekap kehadiran & nilai transparan',
      ],
      color: 'text-[#1F5C4D]',
      bgColor: 'bg-[#EBF3F0]',
      borderColor: 'border-[#CBE3DA]',
    },
    {
      title: 'Murid SMK',
      badge: 'Fokus Belajar',
      desc: 'Satu layar untuk tahu apa yang perlu dikerjakan hari ini. Pantau jadwal, tugas, dan nilai secara mandiri.',
      icon: BookOpen,
      features: [
        'Daftar tugas dengan batas waktu jelas',
        'Jadwal harian & riwayat nilai',
        'Pengajuan izin sakit langsung ke wali',
      ],
      color: 'text-[#2D6A4F]',
      bgColor: 'bg-[#F0F7F4]',
      borderColor: 'border-[#D1E7DD]',
    },
    {
      title: 'Orang Tua / Wali',
      badge: 'Ketenangan Hati',
      desc: 'Pantau kehadiran anak di sekolah setiap hari. Kirimkan surat izin sakit resmi dan berkonsultasi dengan wali kelas.',
      icon: HeartHandshake,
      features: [
        'Notifikasi status kehadiran anak',
        'Pengajuan izin sakit dengan foto surat',
        'Pesan pribadi aman dengan guru',
      ],
      color: 'text-[#C8643B]',
      bgColor: 'bg-[#FAECE5]',
      borderColor: 'border-[#F4D3C5]',
    },
    {
      title: 'Admin Sekolah',
      badge: 'Tertib Administrasi',
      desc: 'Kelola data master akun, rombel kelas, mapel, dan siaran pengumuman resmi tanpa kerumitan teknis.',
      icon: ShieldCheck,
      features: [
        'Manajemen akun guru, murid, dan ortu',
        'Distribusi jadwal pelajaran & mapel',
        'Siaran pengumuman tingkat sekolah',
      ],
      color: 'text-[#3E5C76]',
      bgColor: 'bg-[#EEF4F8]',
      borderColor: 'border-[#D2E2ED]',
    },
  ];

  const highlights = [
    {
      icon: Clock,
      title: 'Absensi 1 Menit',
      desc: 'Semua murid otomatis diset hadir, guru cukup mengubah yang sakit, izin, atau alpa.',
    },
    {
      icon: Smartphone,
      title: 'Ramah Layar Ponsel',
      desc: 'Desain ringkas, nyaman dibaca di layar HP 360px tanpa geser kanan-kiri yang melelahkan.',
    },
    {
      icon: ShieldCheck,
      title: 'Privasi Terjamin',
      desc: 'Komunikasi guru, murid, dan orang tua terlindungi secara ketat sesuai peran masing-masing.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F2A2E] flex flex-col font-sans">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E6E0D6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-lg bg-[#1F5C4D] text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-[#1F2A2E] leading-tight group-hover:text-[#1F5C4D] transition-colors">
                Sekolahku
              </span>
              <span className="text-[11px] text-[#5B676B] font-medium tracking-tight">
                Sistem Sekolah Sederhana SMK
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1F5C4D] hover:bg-[#EBF3F0] rounded-[10px] transition-colors min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 text-[#C8643B]" />
              <span>Coba Demo</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1F5C4D] hover:bg-[#184A3E] rounded-[10px] shadow-sm transition-colors min-h-[44px]"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 border-b border-[#E6E0D6] bg-gradient-to-b from-[#FAF7F2] to-white/60">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EBF3F0] border border-[#CBE3DA] text-[#1F5C4D] text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-[#1F5C4D] animate-pulse" />
              <span>SMK Terbuka, Ramah, & Bersahabat</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-[#1F2A2E] tracking-tight leading-[1.15]">
              Satu Tempat untuk Semua Kebutuhan Sekolah Anda
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-[#5B676B] max-w-2xl mx-auto leading-relaxed">
              Dirancang khusus untuk SMK agar guru, murid, dan orang tua dapat berinteraksi secara mudah, cepat, dan transparan tanpa kerumitan aplikasi yang membingungkan.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-[#1F5C4D] hover:bg-[#184A3E] rounded-[10px] shadow-sm transition-all min-h-[48px]"
              >
                <span>Masuk dengan Akun Resmi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-[#1F2A2E] bg-white hover:bg-stone-50 border border-[#E6E0D6] rounded-[10px] shadow-xs transition-all min-h-[48px]"
              >
                <Sparkles className="w-4 h-4 text-[#C8643B]" />
                <span>Coba Mode Demo</span>
              </Link>
            </div>

            <p className="mt-4 text-xs text-[#5B676B]">
              Tersedia akun evaluasi instan untuk Admin, Guru, Murid, dan Orang Tua.
            </p>
          </div>
        </section>

        {/* 3. Nilai Unggulan (Highlights) */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E6E0D6]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {highlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-[14px] bg-white border border-[#E6E0D6] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#EBF3F0] text-[#1F5C4D] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#1F2A2E]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#5B676B] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Fitur Berdasarkan Peran */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white border-b border-[#E6E0D6]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-semibold text-[#C8643B] uppercase tracking-wider">
                Terintegrasi untuk Seluruh Civitas
              </span>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#1F2A2E] mt-2">
                Dibuat Sesuai Kebutuhan Nyata di Sekolah
              </h2>
              <p className="text-sm sm:text-base text-[#5B676B] mt-3">
                Tidak ada menu berlebihan. Setiap peran mendapatkan tampilan yang terfokus pada tugas utamanya.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {roles.map((role, idx) => {
                const Icon = role.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 sm:p-8 rounded-[16px] bg-[#FAF7F2] border border-[#E6E0D6] flex flex-col justify-between hover:border-[#1F5C4D]/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-[10px] ${role.bgColor} ${role.color} flex items-center justify-center border ${role.borderColor}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-[#E6E0D6] text-[#5B676B]">
                          {role.badge}
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-bold text-[#1F2A2E]">
                        {role.title}
                      </h3>
                      <p className="text-sm text-[#5B676B] mt-2 leading-relaxed">
                        {role.desc}
                      </p>

                      <ul className="mt-6 space-y-2.5">
                        {role.features.map((feature, fIdx) => (
                          <li
                            key={fIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-[#1F2A2E]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#1F5C4D] shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Alur Kerja Sederhana */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E6E0D6]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1F2A2E]">
              Hari Ini Ada Apa?
            </h2>
            <p className="text-sm sm:text-base text-[#5B676B] mt-2 mb-10 max-w-xl mx-auto">
              Setiap kali masuk, pengguna langsung melihat informasi yang paling mendesak hari ini tanpa perlu mencari-cari.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-5 rounded-[12px] bg-white border border-[#E6E0D6]">
                <div className="flex items-center gap-2 mb-2 text-[#1F5C4D]">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tugas</span>
                </div>
                <h4 className="font-display font-semibold text-sm text-[#1F2A2E]">
                  Tenggat Waktu Terdekat
                </h4>
                <p className="text-xs text-[#5B676B] mt-1">
                  Murid langsung tahu tugas apa yang harus dikumpulkan hari ini dan besok.
                </p>
              </div>

              <div className="p-5 rounded-[12px] bg-white border border-[#E6E0D6]">
                <div className="flex items-center gap-2 mb-2 text-[#C8643B]">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Presensi</span>
                </div>
                <h4 className="font-display font-semibold text-sm text-[#1F2A2E]">
                  Status Hadir & Izin
                </h4>
                <p className="text-xs text-[#5B676B] mt-1">
                  Guru mengisi absen dalam satu ketukan, orang tua langsung mendapat kabar.
                </p>
              </div>

              <div className="p-5 rounded-[12px] bg-white border border-[#E6E0D6]">
                <div className="flex items-center gap-2 mb-2 text-[#3E5C76]">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Pesan</span>
                </div>
                <h4 className="font-display font-semibold text-sm text-[#1F2A2E]">
                  Komunikasi Terarah
                </h4>
                <p className="text-xs text-[#5B676B] mt-1">
                  Tanya jawab wali kelas dan orang tua tersimpan rapi per topik bahasan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Bottom Call to Action Card */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-12 rounded-[20px] bg-[#1F5C4D] text-white text-center shadow-lg relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/90 mb-4 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#F4D3C5]" />
                  <span>Siap Memulai Sekarang</span>
                </span>
                <h2 className="font-display text-2xl sm:text-4xl font-bold leading-tight">
                  Coba Kemudahan Sekolahku Hari Ini
                </h2>
                <p className="text-sm sm:text-base text-white/80 mt-3 mb-8 leading-relaxed">
                  Gunakan mode demo untuk merasakan langsung alur kerja guru, murid, orang tua, dan admin tanpa perlu registrasi.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/demo"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#1F5C4D] bg-white hover:bg-stone-100 rounded-[10px] shadow-sm transition-all min-h-[48px]"
                  >
                    <Sparkles className="w-4 h-4 text-[#C8643B]" />
                    <span>Buka Mode Demo</span>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/25 rounded-[10px] transition-all min-h-[48px]"
                  >
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="bg-white border-t border-[#E6E0D6] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#1F5C4D] text-white flex items-center justify-center font-display font-bold text-xs">
              S
            </span>
            <span className="font-display font-bold text-sm text-[#1F2A2E]">
              SMK Sekolahku
            </span>
            <span className="text-xs text-[#5B676B]">
              • Terbuka, Ramah, & Bersahabat
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#5B676B]">
            <Link href="/demo" className="hover:text-[#1F5C4D] transition-colors p-1">
              Mode Demo
            </Link>
            <Link href="/login" className="hover:text-[#1F5C4D] transition-colors p-1">
              Halaman Masuk
            </Link>
            <span className="text-stone-300">|</span>
            <span>© 2026 Proyek Akhir S1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
