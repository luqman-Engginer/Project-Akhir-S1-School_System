import { describe, it, expect } from 'vitest';
import { isValidHttpUrl, sanitizeHttpUrl } from './urls';
import { formatRelativeDeadline } from './dates';

// Helper perhitungan rata-rata nilai aman
export function calculateAverageScore(scores: Array<number | null | undefined>): {
  average: number | null;
  count: number;
} {
  const validScores = scores.filter((s): s is number => typeof s === 'number' && !isNaN(s));
  if (validScores.length === 0) {
    return { average: null, count: 0 };
  }

  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  const avg = Math.round((sum / validScores.length) * 10) / 10;
  return { average: avg, count: validScores.length };
}

describe('Tahap F4 - Tugas dan Nilai Unit Tests', () => {
  describe('isValidHttpUrl & sanitizeHttpUrl (XSS & Protocol Guard)', () => {
    it('menerima tautan valid dengan protokol https dan http', () => {
      expect(isValidHttpUrl('https://drive.google.com/file/d/123')).toBe(true);
      expect(isValidHttpUrl('http://github.com/smk-student/repo')).toBe(true);
      expect(isValidHttpUrl('https://figma.com/@project')).toBe(true);
      expect(sanitizeHttpUrl('https://drive.google.com/test')).toBe('https://drive.google.com/test');
    });

    it('menolak keras skema javascript: atau data: yang berpotensi XSS', () => {
      expect(isValidHttpUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidHttpUrl('vbscript:msgbox(1)')).toBe(false);
      expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeHttpUrl('data:text/plain;base64,SGVsbG8=')).toBeNull();
    });

    it('menolak protokol non-web seperti ftp, file, tel', () => {
      expect(isValidHttpUrl('ftp://ftp.example.com')).toBe(false);
      expect(isValidHttpUrl('file:///etc/passwd')).toBe(false);
      expect(isValidHttpUrl('tel:+62812345678')).toBe(false);
      expect(sanitizeHttpUrl('file:///C:/Windows')).toBeNull();
    });

    it('menangani string kosong, spasi, atau bukan url', () => {
      expect(isValidHttpUrl('')).toBe(false);
      expect(isValidHttpUrl('   ')).toBe(false);
      expect(isValidHttpUrl('hanya teks biasa')).toBe(false);
      expect(sanitizeHttpUrl(null)).toBeNull();
      expect(sanitizeHttpUrl(undefined)).toBeNull();
    });
  });

  describe('calculateAverageScore (Perhitungan Nilai Aman & Nilai 0)', () => {
    it('memperhitungkan nilai 0 sebagai nilai valid (bukan dianggap kosong)', () => {
      // 0 dan 100 harus menghasilkan 50
      const res = calculateAverageScore([0, 100]);
      expect(res.count).toBe(2);
      expect(res.average).toBe(50);
    });

    it('mengabaikan nilai null atau undefined tanpa menghasilkan NaN', () => {
      const res = calculateAverageScore([80, null, 90, undefined, 100]);
      expect(res.count).toBe(3);
      expect(res.average).toBe(90);
    });

    it('mengembalikan null ketika daftar nilai kosong (tidak division by zero)', () => {
      const res = calculateAverageScore([]);
      expect(res.count).toBe(0);
      expect(res.average).toBeNull();

      const resAllNull = calculateAverageScore([null, undefined]);
      expect(resAllNull.count).toBe(0);
      expect(resAllNull.average).toBeNull();
    });

    it('membulatkan rata-rata ke 1 angka di belakang desimal', () => {
      // (85 + 90 + 92) / 3 = 89.0
      const res = calculateAverageScore([85, 90, 92]);
      expect(res.average).toBe(89);

      // (70 + 85) / 2 = 77.5
      const res2 = calculateAverageScore([70, 85]);
      expect(res2.average).toBe(77.5);
    });
  });

  describe('formatRelativeDeadline', () => {
    const fixedNow = new Date('2026-11-18T10:00:00+07:00');

    it('menandai isUrgent jika batas waktu kurang dari 24 jam', () => {
      // 5 jam ke depan
      const fiveHoursAhead = new Date('2026-11-18T15:00:00+07:00');
      const res = formatRelativeDeadline(fiveHoursAhead, fixedNow);
      expect(res.isUrgent).toBe(true);
      expect(res.isOverdue).toBe(false);
    });

    it('menandai isOverdue jika tenggat waktu sudah lewat', () => {
      // 2 jam yang lalu
      const twoHoursAgo = new Date('2026-11-18T08:00:00+07:00');
      const res = formatRelativeDeadline(twoHoursAgo, fixedNow);
      expect(res.isOverdue).toBe(true);
      expect(res.isUrgent).toBe(false);
      expect(res.label).toContain('terlewat');
    });

    it('tidak isUrgent dan tidak isOverdue jika batas waktu masih 3 hari lagi', () => {
      const threeDaysLater = new Date('2026-11-21T10:00:00+07:00');
      const res = formatRelativeDeadline(threeDaysLater, fixedNow);
      expect(res.isUrgent).toBe(false);
      expect(res.isOverdue).toBe(false);
    });
  });
});
