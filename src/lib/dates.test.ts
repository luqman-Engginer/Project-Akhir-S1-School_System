import { describe, it, expect } from 'vitest';
import {
  todayWIB,
  formatWIB,
  formatDateTimeWIB,
  getGreetingWIB,
  formatRelativeTime,
  formatRelativeDeadline,
  formatTimeSpan,
} from './dates';

describe('dates.ts Helper Unit Tests', () => {
  it('pergantian hari: 23:30 UTC sudah menjadi hari berikutnya di WIB (UTC+7)', () => {
    const utcDate = new Date('2026-03-10T23:30:00.000Z');
    expect(todayWIB(utcDate)).toBe('2026-03-11');
    const formatted = formatWIB(utcDate);
    expect(formatted).toContain('11');
    expect(formatted.toLowerCase()).toContain('maret');
    expect(formatted).toContain('2026');
  });

  it('batas pergantian hari: 16:59 UTC (masih hari yang sama) vs 17:00 UTC (sudah hari berikutnya)', () => {
    const beforeMidnight = new Date('2026-03-10T16:59:59.000Z');
    expect(todayWIB(beforeMidnight)).toBe('2026-03-10');
    const atMidnight = new Date('2026-03-10T17:00:00.000Z');
    expect(todayWIB(atMidnight)).toBe('2026-03-11');
  });

  it('formatWIB menghasilkan nama hari dan bulan bahasa Indonesia', () => {
    const date = new Date('2026-11-18T05:00:00.000Z');
    const result = formatWIB(date);
    expect(result.toLowerCase()).toContain('rabu');
    expect(result.toLowerCase()).toContain('november');
    expect(result).toContain('2026');
  });

  it('formatDateTimeWIB menyertakan jam dan suffix WIB', () => {
    const date = new Date('2026-11-18T03:00:00.000Z');
    const result = formatDateTimeWIB(date);
    expect(result).toContain('10.00');
    expect(result).toContain('WIB');
  });

  describe('getGreetingWIB', () => {
    it('mengembalikan "Selamat pagi" sebelum jam 11 WIB', () => {
      // 08:00 WIB = 01:00 UTC
      const date = new Date('2026-11-18T01:00:00.000Z');
      expect(getGreetingWIB(date)).toBe('Selamat pagi');
    });

    it('mengembalikan "Selamat siang" antara jam 11:00 - 14:59 WIB', () => {
      // 12:30 WIB = 05:30 UTC
      const date = new Date('2026-11-18T05:30:00.000Z');
      expect(getGreetingWIB(date)).toBe('Selamat siang');
    });

    it('mengembalikan "Selamat sore" antara jam 15:00 - 17:59 WIB', () => {
      // 16:00 WIB = 09:00 UTC
      const date = new Date('2026-11-18T09:00:00.000Z');
      expect(getGreetingWIB(date)).toBe('Selamat sore');
    });

    it('mengembalikan "Selamat malam" setelah jam 18:00 WIB', () => {
      // 19:30 WIB = 12:30 UTC
      const date = new Date('2026-11-18T12:30:00.000Z');
      expect(getGreetingWIB(date)).toBe('Selamat malam');
    });
  });

  describe('formatRelativeTime', () => {
    it('mengembalikan "baru saja" untuk selisih < 1 menit', () => {
      const ref = new Date('2026-11-18T10:00:30.000Z');
      const target = new Date('2026-11-18T10:00:00.000Z');
      expect(formatRelativeTime(target, ref)).toBe('baru saja');
    });

    it('mengembalikan "X menit lalu" untuk selisih beberapa menit', () => {
      const ref = new Date('2026-11-18T10:15:00.000Z');
      const target = new Date('2026-11-18T10:00:00.000Z');
      expect(formatRelativeTime(target, ref)).toBe('15 menit lalu');
    });

    it('mengembalikan "X jam lalu" untuk selisih beberapa jam', () => {
      const ref = new Date('2026-11-18T14:00:00.000Z');
      const target = new Date('2026-11-18T10:00:00.000Z');
      expect(formatRelativeTime(target, ref)).toBe('4 jam lalu');
    });
  });

  describe('formatRelativeDeadline', () => {
    it('menandai isUrgent jika deadline < 24 jam ke depan', () => {
      const ref = new Date('2026-11-18T01:00:00.000Z'); // 08:00 WIB
      const deadline = new Date('2026-11-18T16:59:00.000Z'); // 23:59 WIB hari ini (selisih ~16 jam)
      const res = formatRelativeDeadline(deadline, ref);
      expect(res.isUrgent).toBe(true);
      expect(res.isOverdue).toBe(false);
      expect(res.label).toContain('hari ini');
    });

    it('menandai isOverdue jika deadline sudah lewat', () => {
      const ref = new Date('2026-11-18T05:00:00.000Z');
      const deadline = new Date('2026-11-17T16:59:00.000Z');
      const res = formatRelativeDeadline(deadline, ref);
      expect(res.isOverdue).toBe(true);
      expect(res.isUrgent).toBe(false);
      expect(res.label).toContain('terlewat');
    });
  });

  describe('formatTimeSpan', () => {
    it('memformat rentang jam HH:MM:SS menjadi HH.MM - HH.MM', () => {
      expect(formatTimeSpan('07:30:00', '09:00:00')).toBe('07.30 - 09.00');
    });
  });
});
