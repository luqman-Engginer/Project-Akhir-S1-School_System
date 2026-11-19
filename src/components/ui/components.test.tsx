import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EmptyState } from './EmptyState';
import { StatusBadge } from './StatusBadge';
import { Inbox, CheckCircle2 } from 'lucide-react';

describe('UI Components Render Tests', () => {
  it('EmptyState merender judul dan deskripsi ramah saat data kosong', () => {
    const html = renderToString(
      <EmptyState
        icon={Inbox}
        title="Belum Ada Tugas yang Menunggu!"
        description="Semua tugasmu sudah selesai dikerjakan. Santai dulu sejenak."
      />
    );

    expect(html).toContain('Belum Ada Tugas yang Menunggu!');
    expect(html).toContain('Semua tugasmu sudah selesai dikerjakan.');
  });

  it('StatusBadge merender status kehadiran ortu dan murid dengan benar', () => {
    const htmlHadir = renderToString(<StatusBadge status="hadir" />);
    expect(htmlHadir).toContain('Hadir');

    const htmlSakit = renderToString(<StatusBadge status="sakit" />);
    expect(htmlSakit).toContain('Sakit');

    const htmlIzin = renderToString(<StatusBadge status="izin" />);
    expect(htmlIzin).toContain('Izin');

    const htmlAlpa = renderToString(<StatusBadge status="alpa" />);
    expect(htmlAlpa).toContain('Alpa');

    const htmlTerlambat = renderToString(<StatusBadge status="terlambat" />);
    expect(htmlTerlambat).toContain('Terlambat');
  });

  it('Status kehadiran ortu membedakan status hadir, sakit, izin, alpa, dan belum diabsen', () => {
    const formatAttendanceStatus = (status: string) => {
      switch (status) {
        case 'present':
          return { label: 'Hadir di Sekolah', badge: 'hadir' as const };
        case 'sick':
          return { label: 'Sakit', badge: 'sakit' as const };
        case 'excused':
          return { label: 'Izin', badge: 'izin' as const };
        case 'absent':
          return { label: 'Alpa / Tanpa Keterangan', badge: 'alpa' as const };
        default:
          return { label: 'Belum Diabsen', badge: 'neutral' as const };
      }
    };

    const hadir = formatAttendanceStatus('present');
    expect(hadir.label).toBe('Hadir di Sekolah');

    const sakit = formatAttendanceStatus('sick');
    expect(sakit.label).toBe('Sakit');

    const unrecorded = formatAttendanceStatus('belum_diabsen');
    expect(unrecorded.label).toBe('Belum Diabsen');

    const html = renderToString(
      <div>
        <h3>Raka Pratama &bull; {sakit.label}</h3>
        <StatusBadge status={sakit.badge} />
      </div>
    );

    expect(html).toContain('Raka Pratama');
    expect(html).toContain('Sakit');
  });
});
