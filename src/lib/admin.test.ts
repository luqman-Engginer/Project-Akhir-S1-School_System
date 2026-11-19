import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGmail, normalizeGmail } from './email';
import { isTimeOverlapping } from './dates';
import { createProfileInputSchema } from './admin/createProfile';

describe('Admin Panel Unit Tests (Tahap F6)', () => {
  describe('1. Validasi Form Pengguna', () => {
    it('menolak format email yang tidak valid', () => {
      const invalidEmails = ['budi', 'budi@', 'budi@domain', 'budi@.com', '@gmail.com'];
      for (const email of invalidEmails) {
        const res = validateGmail(email);
        expect(res.success).toBe(false);
      }
    });

    it('memberikan saran koreksi domain typo yang umum', () => {
      const typos = [
        { input: 'andi@gmai.com', expected: 'andi@gmail.com' },
        { input: 'siti@gamil.com', expected: 'siti@gmail.com' },
        { input: 'guru@gmial.com', expected: 'guru@gmail.com' },
      ];

      for (const t of typos) {
        const res = validateGmail(t.input);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.suggestion).toContain(t.expected);
        }
      }
    });

    it('menolak nomor telepon tidak valid dan menerima format Indonesia yang sah', () => {
      // Tidak valid
      const invalidPhones = ['123', '0812', 'abcdefghij', '1234567890123456'];
      for (const phone of invalidPhones) {
        const res = createProfileInputSchema.safeParse({
          email: 'test@gmail.com',
          full_name: 'Budi Santoso',
          role: 'student',
          phone,
        });
        expect(res.success).toBe(false);
      }

      // Valid
      const validPhones = ['08123456789', '+6281234567890', '085712345678'];
      for (const phone of validPhones) {
        const res = createProfileInputSchema.safeParse({
          email: 'test@gmail.com',
          full_name: 'Budi Santoso',
          role: 'student',
          phone,
        });
        expect(res.success).toBe(true);
      }
    });

    it('mendeteksi kesamaan email lewat normalize_gmail untuk mencegah trik titik/plus Gmail', () => {
      const email1 = 'andi.santoso+sekolah@gmail.com';
      const email2 = 'andisantoso@gmail.com';
      const email3 = 'a.n.d.i.s.a.n.t.o.s.o@gmail.com';

      expect(normalizeGmail(email1)).toBe('andisantoso@gmail.com');
      expect(normalizeGmail(email2)).toBe('andisantoso@gmail.com');
      expect(normalizeGmail(email3)).toBe('andisantoso@gmail.com');
      expect(normalizeGmail(email1)).toBe(normalizeGmail(email2));
      expect(normalizeGmail(email2)).toBe(normalizeGmail(email3));
    });
  });

  describe('2. Aturan Keamanan Nonaktifkan Admin', () => {
    it('admin tidak boleh menonaktifkan dirinya sendiri', () => {
      const callerId = 'admin-uuid-1';
      const targetUserId = 'admin-uuid-1';
      const isActive = false;

      // Logika guard di updateUserAction
      const canDeactivate = !(callerId === targetUserId && !isActive);
      expect(canDeactivate).toBe(false);
    });

    it('admin tidak boleh menonaktifkan admin terakhir yang aktif di sistem', () => {
      const callerId: string = 'admin-uuid-1';
      const targetUserId: string = 'admin-uuid-2';
      const targetRole = 'admin';
      const isActive = false;
      const activeAdminCount = 1; // Hanya tersisa 1 admin aktif

      let error: string | null = null;
      if (callerId === targetUserId && !isActive) {
        error = 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
      } else if (targetRole === 'admin' && !isActive && activeAdminCount <= 1) {
        error = 'Tidak dapat menonaktifkan admin terakhir yang aktif di sistem.';
      }

      expect(error).toBe('Tidak dapat menonaktifkan admin terakhir yang aktif di sistem.');
    });

    it('mengizinkan menonaktifkan admin jika masih terdapat lebih dari 1 admin aktif', () => {
      const callerId: string = 'admin-uuid-1';
      const targetUserId: string = 'admin-uuid-2';
      const targetRole = 'admin';
      const isActive = false;
      const activeAdminCount = 2; // Terdapat 2 admin aktif

      let error: string | null = null;
      if (callerId === targetUserId && !isActive) {
        error = 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
      } else if (targetRole === 'admin' && !isActive && activeAdminCount <= 1) {
        error = 'Tidak dapat menonaktifkan admin terakhir yang aktif di sistem.';
      }

      expect(error).toBeNull();
    });
  });

  describe('3. Deteksi Bentrok Jadwal KBM', () => {
    it('menolak jam selesai yang lebih awal atau sama dengan jam mulai', () => {
      const invalidTimes = [
        { start: '09:00', end: '08:00' },
        { start: '07:30', end: '07:30' },
      ];

      for (const t of invalidTimes) {
        const isValid = t.end > t.start;
        expect(isValid).toBe(false);
      }
    });

    it('mendeteksi tumpang tindih waktu (overlap) yang bentrok', () => {
      // Jadwal yang ada: 07:30 - 09:00
      const existingStart = '07:30';
      const existingEnd = '09:00';

      // Kasus tumpang tindih:
      // a. Irisan di tengah (08:00 - 09:30)
      expect(isTimeOverlapping(existingStart, existingEnd, '08:00', '09:30')).toBe(true);
      // b. Di dalam jadwal yang ada (07:45 - 08:30)
      expect(isTimeOverlapping(existingStart, existingEnd, '07:45', '08:30')).toBe(true);
      // c. Melingkupi jadwal yang ada (07:00 - 09:30)
      expect(isTimeOverlapping(existingStart, existingEnd, '07:00', '09:30')).toBe(true);
      // d. Irisan di awal (07:00 - 08:00)
      expect(isTimeOverlapping(existingStart, existingEnd, '07:00', '08:00')).toBe(true);
      // e. Jam persis sama (07:30 - 09:00)
      expect(isTimeOverlapping(existingStart, existingEnd, '07:30', '09:00')).toBe(true);
    });

    it('mengizinkan jadwal yang berdampingan (berurutan tanpa tumpang tindih)', () => {
      const existingStart = '07:30';
      const existingEnd = '09:00';

      // Sesi persis sebelumnya selesai jam 07:30 (06:00 - 07:30)
      expect(isTimeOverlapping(existingStart, existingEnd, '06:00', '07:30')).toBe(false);

      // Sesi persis berikutnya mulai jam 09:00 (09:00 - 10:30)
      expect(isTimeOverlapping(existingStart, existingEnd, '09:00', '10:30')).toBe(false);

      // Sesi jauh setelahnya (10:45 - 12:15)
      expect(isTimeOverlapping(existingStart, existingEnd, '10:45', '12:15')).toBe(false);
    });

    it('mencegah bentrok jadwal guru di dua kelas berbeda pada hari dan jam yang sama', () => {
      const teacherSchedules = [
        {
          teacher_id: 'guru-dedi',
          class_name: 'XI RPL 1',
          day_of_week: 1, // Senin
          start_time: '07:30:00',
          end_time: '09:00:00',
        },
      ];

      // Coba tambah jadwal untuk Pak Dedi di XI RPL 2 pada Senin 08:00 - 09:30
      const newSchedule = {
        teacher_id: 'guru-dedi',
        class_name: 'XI RPL 2',
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '09:30:00',
      };

      const conflict = teacherSchedules.find(
        (s) =>
          s.teacher_id === newSchedule.teacher_id &&
          s.day_of_week === newSchedule.day_of_week &&
          isTimeOverlapping(s.start_time, s.end_time, newSchedule.start_time, newSchedule.end_time)
      );

      expect(conflict).toBeDefined();
      expect(conflict?.class_name).toBe('XI RPL 1');
    });
  });
});
