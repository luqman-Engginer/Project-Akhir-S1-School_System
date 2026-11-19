/**
 * Rate Limiter in-memory sederhana untuk endpoint publik & cron di Next.js
 * Menggunakan pendekatan sliding window sederhana per key (misal: IP atau identifier).
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Memeriksa apakah request melebihi batas (rate limit).
 * 
 * @param key Identifier unik (misal: IP pengunjung atau route name)
 * @param limit Jumlah maksimal request dalam jendela waktu
 * @param windowMs Ukuran jendela waktu dalam milidetik (default: 60.000 ms / 1 menit)
 */
export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60_000
): { isAllowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const existing = memoryStore.get(key);

  // Bersihkan record lama sesekali jika memory store terlalu besar
  if (memoryStore.size > 1000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime < now) {
        memoryStore.delete(k);
      }
    }
  }

  if (!existing || existing.resetTime < now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, newRecord);
    return {
      isAllowed: true,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (existing.count >= limit) {
    return {
      isAllowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  existing.count += 1;
  return {
    isAllowed: true,
    remaining: limit - existing.count,
    resetTime: existing.resetTime,
  };
}
