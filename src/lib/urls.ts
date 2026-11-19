/**
 * Modul utilitas validasi dan pembersihan URL untrusted (tautan pengumpulan tugas siswa).
 */

/**
 * Memvalidasi apakah string merupakan URL aman yang hanya menggunakan protokol http: atau https:.
 * Menolak skema berbahaya seperti javascript:, data:, vbscript:, file:, dll.
 */
export function isValidHttpUrl(input: string | null | undefined): boolean {
  if (!input || typeof input !== 'string') return false;

  const trimmed = input.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Mengembalikan URL aman yang terformat atau null jika tidak lolos validasi protokol http/https.
 */
export function sanitizeHttpUrl(input: string | null | undefined): string | null {
  if (!isValidHttpUrl(input)) return null;
  return input!.trim();
}
