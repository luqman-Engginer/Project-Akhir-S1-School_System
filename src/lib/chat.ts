import { todayWIB, formatWIB } from './dates';

/**
 * Menentukan apakah waktu saat ini berada di luar jam kerja guru (07.00 - 17.00 WIB, Senin-Jumat).
 */
export function isQuietHoursWIB(referenceDate: Date = new Date()): {
  isQuiet: boolean;
  reason: 'weekend' | 'outside_hours' | null;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(referenceDate);
  let weekday = '';
  let hour = 0;

  for (const p of parts) {
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
  }

  // Akhir pekan (Sabtu / Minggu)
  if (weekday === 'Sat' || weekday === 'Sun') {
    return { isQuiet: true, reason: 'weekend' };
  }

  // Di luar jam 07.00 - 16.59 WIB
  if (hour < 7 || hour >= 17) {
    return { isQuiet: true, reason: 'outside_hours' };
  }

  return { isQuiet: false, reason: null };
}

/**
 * Format tanggal pemisah gelembung chat:
 * - "Hari ini"
 * - "Kemarin"
 * - "Rabu, 18 November 2026"
 */
export function formatChatDateSeparator(
  dateString: string | Date,
  referenceDate: Date = new Date()
): string {
  const target = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const targetDateStr = todayWIB(target);
  const refDateStr = todayWIB(referenceDate);

  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = todayWIB(yesterday);

  if (targetDateStr === refDateStr) {
    return 'Hari ini';
  }
  if (targetDateStr === yesterdayDateStr) {
    return 'Kemarin';
  }

  return formatWIB(target, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Memformat waktu pesan (misal "14.30").
 */
export function formatChatMessageTime(dateString: string | Date): string {
  const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(d)
    .replace(':', '.');
}

/**
 * Token teks pesan yang memisahkan teks biasa dan URL web http/https yang aman.
 * Menghindari render HTML mentah untuk mencegah XSS.
 */
export interface TextToken {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

export function parseMessageText(text: string): TextToken[] {
  if (!text) return [];

  // Regex pencocokan URL http/https yang valid
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    // Teks sebelum URL
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const matchedUrl = match[0];
    try {
      const parsed = new URL(matchedUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        tokens.push({
          type: 'link',
          content: matchedUrl,
          url: matchedUrl,
        });
      } else {
        tokens.push({
          type: 'text',
          content: matchedUrl,
        });
      }
    } catch {
      tokens.push({
        type: 'text',
        content: matchedUrl,
      });
    }

    lastIndex = urlRegex.lastIndex;
  }

  // Teks sisa setelah URL terakhir
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}
