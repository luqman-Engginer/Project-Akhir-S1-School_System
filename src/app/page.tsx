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
  School,
  Lock,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { LivePreview } from '@/components/landing/LivePreview';

export default function LandingPage() {
  const roles = [
    {
      title: 'Guru & Wali Kelas',
      badge: 'Efisiensi Kelas',
      desc: 'Presensi murid hanya 1 menit per rombel. Berikan tugas, nilai langsung, dan terhubung dengan orang tua.',
      icon: GraduationCap,
      features: [
        'Absensi otomatis default "Hadir" (cukup ubah yang absen)',
        'Unggah tugas dan batasi batas waktu penyerahan',
        'Rekap kehadiran kelas dan riwayat nilai transparan',
      ],
      color: 'text-emerald-950',
      bgColor: 'bg-emerald-100',
      borderColor: 'border-emerald-300',
      cardBorder: 'border-emerald-200/90',
    },
    {
      title: 'Murid SMK',
      badge: 'Fokus Belajar',
      desc: 'Satu layar untuk tahu apa yang perlu dikerjakan hari ini. Pantau jadwal, tugas, dan nilai secara mandiri.',
      icon: BookOpen,
      features: [
        'Daftar tugas terurut batas waktu (< 24 jam bertanda jelas)',
        'Jadwal pelajaran harian dan rekap nilai per mata pelajaran',
        'Pengajuan izin sakit dokter langsung dari HP',
      ],
      color: 'text-sky-950',
      bgColor: 'bg-sky-100',
      borderColor: 'border-sky-300',
      cardBorder: 'border-sky-200/90',
    },
    {
      title: 'Orang Tua / Wali',
      badge: 'Ketenangan Hati',
      desc: 'Pantau kehadiran anak di sekolah setiap hari. Kirimkan surat izin sakit resmi dan berkonsultasi dengan wali kelas.',
      icon: HeartHandshake,
      features: [
        'Kabar langsung status kehadiran anak jam pertama',
        'Pengajuan surat izin sakit berlampiran foto surat',
        'Konsultasi privat dengan wali kelas tanpa grup WA ramai',
      ],
      color: 'text-amber-950',
      bgColor: 'bg-amber-100',
      borderColor: 'border-amber-300',
      cardBorder: 'border-amber-200/90',
    },
    {
      title: 'Admin Sekolah',
      badge: 'Tertib Administrasi',
      desc: 'Kelola data master akun, rombel kelas, mapel, dan siaran pengumuman resmi tanpa kerumitan teknis.',
      icon: ShieldCheck,
      features: [
        'Pendaftaran dan manajemen akun guru, murid, dan ortu',
        'Distribusi jadwal pelajaran, rombel kelas, dan mapel',
        'Siaran pengumuman sekolah terpusat',
      ],
      color: 'text-indigo-950',
      bgColor: 'bg-indigo-100',
      borderColor: 'border-indigo-300',
      cardBorder: 'border-indigo-200/90',
    },
  ];

  const highlights = [
    {
      icon: Clock,
      title: 'Absensi Cepat 1 Menit',
      desc: 'Semua murid otomatis diset hadir. Guru tinggal klik murid yang izin atau sakit tanpa pusing menghitung manual.',
      tag: 'Hemat Waktu Guru',
    },
    {
      icon: Smartphone,
      title: 'Ramah Layar Ponsel 360px',
      desc: 'Tampilan bersih, teks jelas, tombol besar, dan tidak ada geser kanan-kiri yang melelahkan di layar smartphone.',
      tag: 'Responsif & Nyaman',
    },
    {
      icon: Lock,
      title: 'Privasi Terjamin & RLS',
      desc: 'Komunikasi guru, murid, dan orang tua terlindungi secara ketat. Orang tua tidak melihat chat murid dan sebaliknya.',
      tag: 'Aman & Terisolasi',
    },
  ];

  const faqs = [
    {
      q: 'Apakah guru perlu waktu lama untuk mengisi absensi harian?',
      a: 'Tidak. Sistem menggunakan prinsip absen cepat: seluruh murid otomatis diset "Hadir", guru hanya perlu mengubah murid yang sakit, izin, atau alpa. Selesai dalam 1 menit.',
    },
    {
      q: 'Bagaimana cara orang tua memantau nilai dan kehadiran anaknya?',
      a: 'Orang tua cukup masuk ke akunnya untuk melihat rekap kehadiran harian dan riwayat nilai tugas anaknya secara langsung tanpa perlu bertanya manual ke wali kelas.',
    },
    {
      q: 'Bagaimana cara mencoba sistem jika belum memiliki akun resmi?',
      a: 'Klik tombol "Coba Mode Demo". Anda dapat langsung masuk sebagai Guru, Murid, Orang Tua, atau Admin menggunakan data dummy sekolah yang sudah kami siapkan.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col font-sans">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b-2 border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="w-10 h-10 rounded-xl bg-[#144D40] text-white flex items-center justify-center font-display font-bold text-xl shadow-sm ring-2 ring-[#144D40]/20">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl text-stone-900 leading-tight group-hover:text-[#144D40] transition-colors">
                Sekolahku
              </span>
              <span className="text-xs text-stone-600 font-semibold tracking-tight">
                Sistem Sekolah Sederhana SMK
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-xl transition-all min-h-[44px] shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Coba Demo</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#144D40] hover:bg-[#0F3B31] rounded-xl shadow-xs transition-all min-h-[44px]"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="pt-12 sm:pt-18 pb-16 px-4 sm:px-6 border-b-2 border-stone-200 bg-gradient-to-b from-[#FAF7F2] via-white/80 to-[#FAF7F2]">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-950 text-xs font-bold mb-6 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>SMK Terbuka, Ramah, & Bersahabat</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.15]">
              Sistem Informasi Sekolah yang Nyaman, Tanpa Kerumitan.
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-xl text-stone-700 max-w-2xl mx-auto leading-relaxed font-medium">
              Menghubungkan guru, murid, dan orang tua dalam satu alur yang sederhana: presensi 1 menit, tugas & nilai transparan, serta komunikasi yang hangat.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
              <Link
                href="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-bold text-amber-950 bg-amber-100 hover:bg-amber-200/90 border-2 border-amber-300 rounded-xl shadow-xs transition-all min-h-[50px] group"
              >
                <Sparkles className="w-5 h-5 text-amber-700 group-hover:rotate-12 transition-transform" />
                <span>Coba Mode Demo Instan</span>
                <ArrowRight className="w-4 h-4 text-amber-800" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-stone-900 bg-white hover:bg-stone-50 border-2 border-stone-300 hover:border-stone-400 rounded-xl shadow-xs transition-all min-h-[50px]"
              >
                <span>Masuk dengan Google</span>
              </Link>
            </div>

            <p className="mt-4 text-xs text-stone-600 font-semibold">
              Tersedia 4 akun evaluasi instan: Admin, Guru, Murid, dan Orang Tua.
            </p>

            {/* Live Interactive UI Showcase */}
            <LivePreview />
          </div>
        </section>

        {/* 3. Nilai Unggulan */}
        <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#FAF7F2] border-b-2 border-stone-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Keunggulan Utama
              </span>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-stone-900 mt-2">
                Dirancang untuk Kebutuhan Nyata Sekolah
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {highlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-stone-200/90 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-200 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {item.tag}
                      </span>
                      <h3 className="font-display text-xl font-bold text-stone-900 mt-3">
                        {item.title}
                      </h3>
                      <p className="text-sm text-stone-600 font-medium leading-relaxed mt-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Fitur per Peran */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white border-b-2 border-stone-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Terpadu & Tertata
              </span>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-stone-900 mt-2">
                Setiap Peran Memiliki Fokusnya Sendiri
              </h2>
              <p className="text-sm sm:text-base text-stone-600 font-medium mt-3">
                Tidak ada menu berlebihan atau fitur yang membingungkan. Setiap pengguna langsung melihat apa yang relevan baginya.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {roles.map((role, idx) => {
                const Icon = role.icon;
                return (
                  <div
                    key={idx}
                    className={`p-6 sm:p-8 rounded-2xl bg-[#FAF7F2] border-2 ${role.cardBorder} flex flex-col justify-between hover:shadow-sm transition-all`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl ${role.bgColor} ${role.color} flex items-center justify-center border-2 ${role.borderColor}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border-2 border-stone-200 text-stone-700">
                          {role.badge}
                        </span>
                      </div>

                      <h3 className="font-display text-2xl font-bold text-stone-900">
                        {role.title}
                      </h3>
                      <p className="text-sm text-stone-600 font-medium mt-2 leading-relaxed">
                        {role.desc}
                      </p>

                      <ul className="mt-6 space-y-3">
                        {role.features.map((feature, fIdx) => (
                          <li
                            key={fIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800 font-medium"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
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

        {/* 5. FAQ Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FAF7F2] border-b-2 border-stone-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Tanya Jawab
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-stone-200/90 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-[#144D40] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-bold text-base text-stone-900">
                        {faq.q}
                      </h4>
                      <p className="text-sm text-stone-600 font-medium mt-2 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Bottom Call to Action Card */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 sm:p-14 rounded-3xl bg-[#144D40] text-white text-center shadow-lg relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-bold text-amber-200 mb-5 border border-white/20">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Siap Evaluasi Aplikasi</span>
                </span>
                <h2 className="font-display text-3xl sm:text-5xl font-black leading-tight tracking-tight">
                  Coba Kemudahan Sekolahku Sekarang
                </h2>
                <p className="text-sm sm:text-base text-white/90 font-medium mt-4 mb-8 leading-relaxed max-w-xl mx-auto">
                  Gunakan mode demo untuk mencoba alur kerja Guru, Murid, Orang Tua, dan Admin secara instan.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <Link
                    href="/demo"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-stone-900 bg-amber-300 hover:bg-amber-400 rounded-xl shadow-md transition-all min-h-[50px]"
                  >
                    <Sparkles className="w-4 h-4 text-stone-900" />
                    <span>Buka Mode Demo</span>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-white/15 hover:bg-white/20 border-2 border-white/30 rounded-xl transition-all min-h-[50px]"
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
      <footer className="bg-white border-t-2 border-stone-200 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#144D40] text-white flex items-center justify-center font-display font-bold text-sm shadow-xs">
              S
            </span>
            <div>
              <span className="font-display font-bold text-base text-stone-900">
                SMK Sekolahku
              </span>
              <p className="text-xs text-stone-500 font-medium">
                Sistem Informasi Sekolah Sederhana untuk SMK &bull; Terbuka, Ramah, & Bersahabat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold text-stone-600">
            <Link href="/demo" className="hover:text-[#144D40] transition-colors p-1">
              Mode Demo
            </Link>
            <Link href="/login" className="hover:text-[#144D40] transition-colors p-1">
              Halaman Masuk
            </Link>
            <span className="text-stone-300">|</span>
            <span className="text-stone-500 font-medium">© 2026 Proyek Akhir S1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
