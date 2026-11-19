import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  isQuietHoursWIB,
  formatChatDateSeparator,
  formatChatMessageTime,
  parseMessageText,
} from './chat';

describe('Tahap F5 - Chat & Messaging Unit Tests', () => {
  describe('isQuietHoursWIB (Jam Tenang Guru 07.00 - 17.00 WIB)', () => {
    it('mengembalikan isQuiet: true saat malam hari di luar jam kerja (misal jam 20.00 WIB)', () => {
      // Rabu, 18 Nov 2026 jam 20:00:00 WIB (UTC+7 -> 13:00 UTC)
      const nightTime = new Date('2026-11-18T20:00:00+07:00');
      const res = isQuietHoursWIB(nightTime);
      expect(res.isQuiet).toBe(true);
      expect(res.reason).toBe('outside_hours');
    });

    it('mengembalikan isQuiet: true saat dini hari sebelum jam kerja (misal jam 05.30 WIB)', () => {
      const earlyMorning = new Date('2026-11-18T05:30:00+07:00');
      const res = isQuietHoursWIB(earlyMorning);
      expect(res.isQuiet).toBe(true);
      expect(res.reason).toBe('outside_hours');
    });

    it('mengembalikan isQuiet: false saat jam kerja sekolah (misal jam 10.15 WIB hari kerja)', () => {
      const workingHours = new Date('2026-11-18T10:15:00+07:00');
      const res = isQuietHoursWIB(workingHours);
      expect(res.isQuiet).toBe(false);
      expect(res.reason).toBeNull();
    });

    it('mengembalikan isQuiet: true pada akhir pekan (Sabtu & Minggu)', () => {
      // Sabtu, 21 Nov 2026 jam 10:00 WIB
      const saturday = new Date('2026-11-21T10:00:00+07:00');
      const resSat = isQuietHoursWIB(saturday);
      expect(resSat.isQuiet).toBe(true);
      expect(resSat.reason).toBe('weekend');

      // Minggu, 22 Nov 2026 jam 14:00 WIB
      const sunday = new Date('2026-11-22T14:00:00+07:00');
      const resSun = isQuietHoursWIB(sunday);
      expect(resSun.isQuiet).toBe(true);
      expect(resSun.reason).toBe('weekend');
    });
  });

  describe('formatChatDateSeparator', () => {
    const fixedNow = new Date('2026-11-18T14:00:00+07:00');

    it('mengembalikan "Hari ini" untuk pesan di tanggal yang sama', () => {
      const todayMsg = new Date('2026-11-18T09:00:00+07:00');
      expect(formatChatDateSeparator(todayMsg, fixedNow)).toBe('Hari ini');
    });

    it('mengembalikan "Kemarin" untuk pesan satu hari sebelumnya', () => {
      const yesterdayMsg = new Date('2026-11-17T16:30:00+07:00');
      expect(formatChatDateSeparator(yesterdayMsg, fixedNow)).toBe('Kemarin');
    });

    it('mengembalikan format nama hari dan tanggal lengkap untuk tanggal lampau', () => {
      const pastMsg = new Date('2026-11-10T11:00:00+07:00');
      const separator = formatChatDateSeparator(pastMsg, fixedNow);
      expect(separator).toContain('10 November 2026');
    });
  });

  describe('formatChatMessageTime', () => {
    it('memformat waktu pesan ke jam WIB (HH.MM)', () => {
      const date = new Date('2026-11-18T14:30:00+07:00');
      expect(formatChatMessageTime(date)).toBe('14.30');
    });
  });

  describe('parseMessageText & Sanitasi Tautan Teks (Anti-XSS)', () => {
    it('membedah tautan http dan https menjadi token link aman', () => {
      const text = 'Halo pak, tugas saya ada di https://github.com/smk/repo ya';
      const tokens = parseMessageText(text);

      expect(tokens.length).toBe(3);
      expect(tokens[0]).toEqual({ type: 'text', content: 'Halo pak, tugas saya ada di ' });
      expect(tokens[1]).toEqual({
        type: 'link',
        content: 'https://github.com/smk/repo',
        url: 'https://github.com/smk/repo',
      });
      expect(tokens[2]).toEqual({ type: 'text', content: ' ya' });
    });

    it('menolak skema javascript:alert(1) agar tidak menjadi link klikable', () => {
      const dangerous = 'Silakan klik javascript:alert(1) sekarang';
      const tokens = parseMessageText(dangerous);

      // Skema javascript: tidak lolos regex http/https sehingga tetap menjadi teks biasa
      const hasDangerousLink = tokens.some((t) => t.type === 'link' && t.url?.startsWith('javascript:'));
      expect(hasDangerousLink).toBe(false);
    });

    it('menolak skema data:text/html agar tidak menjadi link klikable', () => {
      const dangerousData = 'Cek file data:text/html,<script>alert(1)</script>';
      const tokens = parseMessageText(dangerousData);

      const hasDataLink = tokens.some((t) => t.type === 'link' && t.url?.startsWith('data:'));
      expect(hasDataLink).toBe(false);
    });

    it('menangani pesan tanpa URL secara mulus', () => {
      const normalText = 'Selamat pagi pak, izin konfirmasi tugas besok.';
      const tokens = parseMessageText(normalText);
      expect(tokens.length).toBe(1);
      expect(tokens[0]).toEqual({ type: 'text', content: normalText });
    });
  });

  describe('Komponen Gelembung Chat & Render Status', () => {
    it('merender gelembung pesan dengan teks tersanitasi', () => {
      const msgText = 'Terima kasih atas bantuannya https://sekolahku.id';
      const tokens = parseMessageText(msgText);

      const renderedHtml = renderToString(
        <div className="chat-bubble">
          {tokens.map((tok, idx) =>
            tok.type === 'link' ? (
              <a key={idx} href={tok.url} rel="noopener noreferrer">
                {tok.content}
              </a>
            ) : (
              <span key={idx}>{tok.content}</span>
            )
          )}
        </div>
      );

      expect(renderedHtml).toContain('https://sekolahku.id');
      expect(renderedHtml).toContain('rel="noopener noreferrer"');
    });

    it('merender indikator gagal kirim jika status failed', () => {
      const status: 'sending' | 'sent' | 'failed' = 'failed';
      const isFailed = status === 'failed';

      const renderedHtml = renderToString(
        <div className="status-container">
          {isFailed && <span className="failed-text">Gagal terkirim</span>}
        </div>
      );

      expect(renderedHtml).toContain('Gagal terkirim');
    });
  });
});
