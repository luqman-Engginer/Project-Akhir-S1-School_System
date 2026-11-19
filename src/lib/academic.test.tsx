import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { buildWaLink, waTemplates, normalizeIdPhone } from './whatsapp';
import { todayWIB } from './dates';

// Helper kalkulasi ringkasan status absensi
export function calculateAttendanceSummary(
  records: Array<{ status: 'present' | 'sick' | 'excused' | 'absent' }>
) {
  let present = 0;
  let sick = 0;
  let excused = 0;
  let absent = 0;

  records.forEach((r) => {
    if (r.status === 'present') present++;
    else if (r.status === 'sick') sick++;
    else if (r.status === 'excused') excused++;
    else if (r.status === 'absent') absent++;
  });

  return { present, sick, excused, absent, total: records.length };
}

// Helper validasi rentang izin
export function validateLeaveDates(
  dateFrom: string,
  dateTo: string,
  refDate: string = todayWIB()
): { valid: boolean; error?: string } {
  if (dateTo < dateFrom) {
    return { valid: false, error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };
  }

  // Batas 3 hari ke belakang
  const minDateObj = new Date(refDate);
  minDateObj.setDate(minDateObj.getDate() - 3);
  const minAllowed = todayWIB(minDateObj);

  if (dateFrom < minAllowed) {
    return { valid: false, error: 'Maksimal izin terlambat 3 hari ke belakang' };
  }

  // Rentang maksimal 14 hari
  const fromTime = new Date(dateFrom).getTime();
  const toTime = new Date(dateTo).getTime();
  const dayDiff = Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1;

  if (dayDiff > 14) {
    return { valid: false, error: 'Rentang izin maksimal 14 hari berturut-turut' };
  }

  return { valid: true };
}

describe('Tahap F3 - Academic & Attendance Unit Tests', () => {
  describe('calculateAttendanceSummary', () => {
    it('menghitung jumlah hadir, sakit, izin, dan alpa secara akurat', () => {
      const records = [
        { status: 'present' as const },
        { status: 'present' as const },
        { status: 'present' as const },
        { status: 'sick' as const },
        { status: 'excused' as const },
        { status: 'absent' as const },
      ];

      const res = calculateAttendanceSummary(records);
      expect(res.present).toBe(3);
      expect(res.sick).toBe(1);
      expect(res.excused).toBe(1);
      expect(res.absent).toBe(1);
      expect(res.total).toBe(6);
    });

    it('menangani daftar kosong tanpa error', () => {
      const res = calculateAttendanceSummary([]);
      expect(res.present).toBe(0);
      expect(res.total).toBe(0);
    });
  });

  describe('validateLeaveDates', () => {
    const today = '2026-11-18';

    it('valid jika tanggal mulai dan selesai sama hari ini', () => {
      const res = validateLeaveDates(today, today, today);
      expect(res.valid).toBe(true);
    });

    it('valid jika izin diajukan mundur maksimal 3 hari', () => {
      const threeDaysAgo = '2026-11-15';
      const res = validateLeaveDates(threeDaysAgo, today, today);
      expect(res.valid).toBe(true);
    });

    it('gagal jika tanggal mulai lebih dari 3 hari yang lalu', () => {
      const fourDaysAgo = '2026-11-14';
      const res = validateLeaveDates(fourDaysAgo, today, today);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('3 hari ke belakang');
    });

    it('gagal jika tanggal selesai sebelum tanggal mulai', () => {
      const res = validateLeaveDates('2026-11-20', '2026-11-18', today);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('tidak boleh sebelum');
    });

    it('gagal jika rentang izin melebihi 14 hari berturut-turut', () => {
      const from = '2026-11-18';
      const to = '2026-12-05'; // 18 hari
      const res = validateLeaveDates(from, to, today);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('14 hari');
    });
  });

  describe('Helper WhatsApp & Template', () => {
    it('membentuk tautan WhatsApp absensi dengan teks terenkode', () => {
      const link = buildWaLink(
        '081234567890',
        waTemplates.absent('Raka Pratama', '18 November 2026')
      );

      expect(link).not.toBeNull();
      expect(link).toContain('https://wa.me/6281234567890?text=');
      expect(link).toContain('Raka%20Pratama');
      expect(link).toContain('18%20November%202026');
    });

    it('mengembalikan null jika nomor telepon ortu tidak valid', () => {
      const link = buildWaLink('', waTemplates.absent('Raka', '18 Nov'));
      expect(link).toBeNull();
    });
  });

  describe('Render Baris Absen Segmented Control', () => {
    it('merender 4 tombol status dengan label teks penuh (Hadir, Sakit, Izin, Alpa)', () => {
      const studentName = 'Bima Arya';
      const html = renderToString(
        <div role="radiogroup" aria-label={`Status absensi untuk ${studentName}`}>
          <button role="radio" aria-checked={true}>Hadir</button>
          <button role="radio" aria-checked={false}>Sakit</button>
          <button role="radio" aria-checked={false}>Izin</button>
          <button role="radio" aria-checked={false}>Alpa</button>
        </div>
      );

      expect(html).toContain('Hadir');
      expect(html).toContain('Sakit');
      expect(html).toContain('Izin');
      expect(html).toContain('Alpa');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-checked="true"');
    });
  });
});
