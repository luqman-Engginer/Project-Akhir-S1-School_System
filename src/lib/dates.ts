/**
 * Modul utilitas tanggal dan waktu untuk zona WIB (Asia/Jakarta, UTC+7).
 */

/**
 * Mengembalikan tanggal dalam format string YYYY-MM-DD sesuai zona waktu WIB.
 * Parameter referenceDate bersifat opsional (default: waktu sekarang)
 * untuk mempermudah unit testing perpindahan hari.
 */
export function todayWIB(referenceDate: Date = new Date()): string {
  // 'en-CA' menghasilkan format standar ISO YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

/**
 * Mengembalikan sapaan waktu Indonesia berdasarkan jam di zona WIB:
 * - < 11: "Selamat pagi"
 * - 11:00 - 14:59: "Selamat siang"
 * - 15:00 - 17:59: "Selamat sore"
 * - >= 18:00: "Selamat malam"
 */
export function getGreetingWIB(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const hour = parseInt(formatter.format(referenceDate), 10);

  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Memformat tanggal ke teks representasi lokal Indonesia dalam zona waktu WIB.
 * Contoh default: "Rabu, 18 November 2026"
 */
export function formatWIB(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  }).format(d);
}

/**
 * Memformat tanggal dan jam dalam zona waktu WIB.
 * Contoh: "18 November 2026, 14:30 WIB"
 */
export function formatDateTimeWIB(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);

  return `${formatted.replace(':', '.')} WIB`;
}

/**
 * Memformat waktu jam WIB saja.
 * Contoh: "jam 14.00" atau "14.00"
 */
export function formatTimeWIB(date: string | Date, prefixJam = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(d)
    .replace(':', '.');

  return prefixJam ? `jam ${timeStr}` : timeStr;
}

/**
 * Memformat rentang jam "HH:MM:SS" atau "HH:MM" menjadi "07.00 - 08.30".
 */
export function formatTimeSpan(startTime: string, endTime: string): string {
  const cleanStart = startTime.slice(0, 5).replace(':', '.');
  const cleanEnd = endTime.slice(0, 5).replace(':', '.');
  return `${cleanStart} - ${cleanEnd}`;
}

/**
 * Memformat waktu lampau secara relatif ("5 menit lalu", "2 jam lalu", "kemarin", dsb.)
 */
export function formatRelativeTime(
  date: string | Date,
  referenceDate: Date = new Date()
): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = referenceDate.getTime() - target.getTime();

  if (diffMs < 0) {
    return 'baru saja';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return formatWIB(target, { day: 'numeric', month: 'short' });
}

/**
 * Memformat deadline tugas relatif:
 * - "hari ini jam 23.59"
 * - "besok jam 23.59"
 * - "Jumat, 20 Nov 23.59"
 * Memberikan info isUrgent jika batas waktu < 24 jam ke depan.
 */
export function formatRelativeDeadline(
  deadline: string | Date,
  referenceDate: Date = new Date()
): { label: string; isUrgent: boolean; isOverdue: boolean } {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const diffMs = target.getTime() - referenceDate.getTime();
  const isOverdue = diffMs < 0;

  // Deadline < 24 jam dan belum lewat
  const isUrgent = !isOverdue && diffMs <= 24 * 60 * 60 * 1000;

  const targetDateStr = todayWIB(target);
  const refDateStr = todayWIB(referenceDate);

  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = todayWIB(tomorrow);

  const timeFormatted = formatTimeWIB(target, false);

  let label: string;
  if (isOverdue) {
    label = `terlewat (${formatWIB(target, { day: 'numeric', month: 'short' })} ${timeFormatted})`;
  } else if (targetDateStr === refDateStr) {
    label = `hari ini ${timeFormatted}`;
  } else if (targetDateStr === tomorrowDateStr) {
    label = `besok ${timeFormatted}`;
  } else {
    label = `${formatWIB(target, { weekday: 'short', day: 'numeric', month: 'short' })} ${timeFormatted}`;
  }

  return { label, isUrgent, isOverdue };
}

/**
 * Memeriksa apakah dua rentang waktu tumpang tindih (overlap).
 * Waktu dalam format HH:mm atau HH:mm:ss.
 * Contoh: 07:30 - 09:00 dan 09:00 - 10:30 TIDAK tumpang tindih (berurutan).
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = startA.slice(0, 5);
  const eA = endA.slice(0, 5);
  const sB = startB.slice(0, 5);
  const eB = endB.slice(0, 5);

  return !(eB <= sA || sB >= eA);
}
