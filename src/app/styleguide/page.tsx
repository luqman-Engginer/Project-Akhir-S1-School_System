'use client';

import React, { useState } from 'react';
import { notFound } from 'next/navigation';
import {
  Button,
  Input,
  Textarea,
  Select,
  StatusBadge,
  ListRow,
  Panel,
  EmptyState,
  Skeleton,
  ListSkeleton,
  useToast,
  ConfirmDialog,
  Avatar,
  TextScaleToggle,
  StatusVariant,
} from '@/components/ui';
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  GraduationCap,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';

export default function StyleguidePage() {
  // Hanya aktif di environment non-production
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { success, error, info } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [hasInputError, setHasInputError] = useState(false);

  const statuses: StatusVariant[] = [
    'hadir',
    'sakit',
    'izin',
    'alpa',
    'belum dikumpulkan',
    'dikumpulkan',
    'terlambat',
    'dinilai',
    'menunggu',
    'disetujui',
    'ditolak',
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4 sm:px-8 text-[var(--color-text)]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F1EE] text-[var(--color-primary)]">
              Katalog Komponen
            </span>
            <TextScaleToggle />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-text)]">
            Design System Sekolahku
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 max-w-xl">
            Sistem visual hangat, tenang, dan mudah dibaca oleh semua generasi. Sesuai prinsip WCAG AA dengan target sentuh minimal 44px.
          </p>
        </div>

        {/* 1. PALET WARNA */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">1. Palet Warna & Token</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-[12px] bg-[#FAF7F2] border border-[#E6E0D6]">
              <div className="h-10 rounded-md bg-[#FAF7F2] border border-[#DDD7CD] mb-2" />
              <div className="text-xs font-semibold">Background</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">#FAF7F2 (Gading)</div>
            </div>
            <div className="p-3 rounded-[12px] bg-white border border-[#E6E0D6]">
              <div className="h-10 rounded-md bg-white border border-[#DDD7CD] mb-2" />
              <div className="text-xs font-semibold">Permukaan</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">#FFFFFF (Putih)</div>
            </div>
            <div className="p-3 rounded-[12px] bg-white border border-[#E6E0D6]">
              <div className="h-10 rounded-md bg-[#1F5C4D] mb-2" />
              <div className="text-xs font-semibold">Warna Utama</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">#1F5C4D (Hijau Tua)</div>
            </div>
            <div className="p-3 rounded-[12px] bg-white border border-[#E6E0D6]">
              <div className="h-10 rounded-md bg-[#C8643B] mb-2" />
              <div className="text-xs font-semibold">Aksen Perhatian</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">#C8643B (Terakota)</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-[12px] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success-text)]">
              <div className="text-xs font-bold">Status Sukses</div>
              <div className="text-[11px] opacity-80">Hadir / Dinilai</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] text-[var(--status-warning-text)]">
              <div className="text-xs font-bold">Status Perhatian</div>
              <div className="text-[11px] opacity-80">Sakit / Menunggu</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)]">
              <div className="text-xs font-bold">Status Bahaya</div>
              <div className="text-[11px] opacity-80">Alpa / Ditolak / Telat</div>
            </div>
            <div className="p-3 rounded-[12px] bg-[var(--status-info-bg)] border border-[var(--status-info-border)] text-[var(--status-info-text)]">
              <div className="text-xs font-bold">Status Info</div>
              <div className="text-[11px] opacity-80">Izin / Terkumpul</div>
            </div>
          </div>
        </section>

        {/* 2. TIPOGRAFI */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">2. Skala Tipografi</h2>
          <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-4">
            <div>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">Heading Display (Bricolage Grotesque)</span>
              <p className="text-2xl sm:text-3xl font-bold font-display tracking-tight mt-1">
                SMK Negeri 1 Sekolahku Digital
              </p>
            </div>
            <div className="border-t border-[#F0EBE1] pt-3">
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">Teks Bacaan Body (Figtree - Ukuran Dasar 16px)</span>
              <p className="text-base text-[var(--color-text)] mt-1 leading-relaxed">
                Antarmuka ini dirancang agar tidak melelahkan mata bagi guru yang memeriksa absensi di komputer,
                sekaligus ramah dibaca di layar ponsel orang tua tanpa harus memperbesar layar manual.
              </p>
            </div>
          </div>
        </section>

        {/* 3. BUTTONS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">3. Tombol & Sentuhan (Min. 44px)</h2>
          <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Tombol Utama</Button>
              <Button variant="secondary">Tombol Kedua</Button>
              <Button variant="quiet">Tombol Sunyi</Button>
              <Button variant="danger">Tombol Bahaya</Button>
              <Button variant="primary" loading>Memuat...</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F0EBE1]">
              <Button variant="primary" size="sm">Ukuran Kecil (sm)</Button>
              <Button variant="primary" size="md">Ukuran Standar (md)</Button>
              <Button variant="primary" size="lg">Ukuran Besar (lg)</Button>
            </div>
          </div>
        </section>

        {/* 4. STATUS BADGES */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">4. Status Badges (Selalu Ada Ikon + Teks)</h2>
          <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)]">
            <div className="flex flex-wrap gap-2.5">
              {statuses.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </div>
        </section>

        {/* 5. FORM CONTROLS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">5. Kontrol Formulir</h2>
          <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-4 max-w-lg">
            <Input
              label="Nama Lengkap Siswa"
              placeholder="Contoh: Raka Pratama"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (hasInputError) setHasInputError(false);
              }}
              error={hasInputError ? 'Nama wajib diisi minimal 3 huruf' : undefined}
              hint="Masukkan nama lengkap sesuai data kesiswaan"
            />

            <Select
              label="Pilih Kelas"
              options={[
                { value: 'rpl1', label: 'XI Rekayasa Perangkat Lunak 1' },
                { value: 'rpl2', label: 'XI Rekayasa Perangkat Lunak 2' },
                { value: 'tkj1', label: 'XI Teknik Komputer Jaringan 1' },
              ]}
            />

            <Textarea
              label="Alasan Izin Tidak Masuk"
              placeholder="Jelaskan alasan izin sakit atau keperluan keluarga..."
              rows={3}
            />

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setHasInputError(!hasInputError)}
              >
                {hasInputError ? 'Hilangkan Error' : 'Simulasi Pesan Error'}
              </Button>
            </div>
          </div>
        </section>

        {/* 6. LIST ROWS & GROUPS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">6. Baris Daftar (List Rows)</h2>
          <Panel
            title="Riwayat Kehadiran Terakhir"
            subtitle="Menampilkan baris dengan status dan indikator belum dibaca"
          >
            <div className="space-y-1">
              <ListRow
                isUnread
                leftSlot={<Avatar name="Raka Pratama" size="sm" />}
                title="Raka Pratama"
                subtitle="Senin, 17 Nov 2026 &bull; Jam 07:15 WIB"
                rightSlot={<StatusBadge status="hadir" size="sm" />}
                href="#styleguide-row"
              />
              <ListRow
                leftSlot={<Avatar name="Nadia Putri" size="sm" />}
                title="Nadia Putri"
                subtitle="Senin, 17 Nov 2026 &bull; Izin Dokter"
                rightSlot={<StatusBadge status="izin" size="sm" />}
                href="#styleguide-row"
              />
              <ListRow
                leftSlot={<Avatar name="Bima Arya" size="sm" />}
                title="Bima Arya"
                subtitle="Senin, 17 Nov 2026 &bull; Tanpa Keterangan"
                rightSlot={<StatusBadge status="alpa" size="sm" />}
                href="#styleguide-row"
              />
            </div>
          </Panel>
        </section>

        {/* 7. AVATAR & SKELETON */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">7. Avatar & Skeleton Loading</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Panel title="Avatar Inisial Deterministik">
              <div className="flex items-center gap-3">
                <Avatar name="Siti Aminah" size="lg" />
                <Avatar name="Dedi Kurniawan" size="md" />
                <Avatar name="Hendra Wijaya" size="md" />
                <Avatar name="Wati Susanti" size="sm" />
                <Avatar name="Bima Arya" size="sm" />
              </div>
            </Panel>

            <Panel title="Skeleton Loading State">
              <ListSkeleton count={2} />
            </Panel>
          </div>
        </section>

        {/* 8. EMPTY STATE & INTERACTIVE DEMO */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display">8. Empty State, Dialog, & Toast</h2>
          <EmptyState
            icon={Sparkles}
            title="Belum Ada Tugas Aktif Hari Ini"
            description="Semua materi pelajaran telah terselesaikan dengan baik. Anda dapat beristirahat sejenak."
            actionLabel="Lihat Jadwal Besok"
            onAction={() => info('Membuka jadwal mata pelajaran...')}
          />

          <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => success('Data absensi berhasil disimpan!')}
            >
              Trigger Toast Sukses
            </Button>
            <Button
              variant="secondary"
              onClick={() => error('Gagal menghubungkan ke server')}
            >
              Trigger Toast Error
            </Button>
            <Button
              variant="danger"
              onClick={() => setIsDialogOpen(true)}
            >
              Buka Dialog Konfirmasi
            </Button>
          </div>
        </section>

        {/* Modal Dialog */}
        <ConfirmDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={() => {
            setIsDialogOpen(false);
            success('Tindakan berhasil dikonfirmasi');
          }}
          title="Hapus Data Pengguna?"
          description="Tindakan ini akan menonaktifkan akun siswa dan menghapus akses ke ruang belajar. Anda yakin?"
          confirmLabel="Ya, Hapus Data"
          cancelLabel="Batal"
          isDestructive
        />
      </div>
    </div>
  );
}
