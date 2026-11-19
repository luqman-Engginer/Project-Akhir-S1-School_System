import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { checkRateLimit } from './rateLimit';
import { POST as demoLoginPost } from '@/app/api/demo-login/route';
import nextConfig from '../../next.config';

describe('Security & Protection Tests (Tahap F7)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. DEMO_MODE Guarding (Wajib 404 jika bukan "true")', () => {
    it('mengembalikan status 404 pada endpoint /api/demo-login saat DEMO_MODE = "false"', async () => {
      process.env.DEMO_MODE = 'false';

      const request = new Request('http://localhost:3000/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' }),
      });

      const response = await demoLoginPost(request);
      expect(response.status).toBe(404);
    });

    it('mengembalikan status 404 pada endpoint /api/demo-login saat DEMO_MODE tidak diset (undefined)', async () => {
      delete process.env.DEMO_MODE;

      const request = new Request('http://localhost:3000/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' }),
      });

      const response = await demoLoginPost(request);
      expect(response.status).toBe(404);
    });
  });

  describe('2. In-Memory Rate Limiting', () => {
    it('mengizinkan request dalam batas limit dan menolak saat melebihi limit', () => {
      const testKey = `test-ip-${Date.now()}`;
      const limit = 3;
      const windowMs = 5000;

      // Request 1: boleh
      const r1 = checkRateLimit(testKey, limit, windowMs);
      expect(r1.isAllowed).toBe(true);
      expect(r1.remaining).toBe(2);

      // Request 2: boleh
      const r2 = checkRateLimit(testKey, limit, windowMs);
      expect(r2.isAllowed).toBe(true);
      expect(r2.remaining).toBe(1);

      // Request 3: boleh (terakhir)
      const r3 = checkRateLimit(testKey, limit, windowMs);
      expect(r3.isAllowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // Request 4: ditolak (melebihi limit)
      const r4 = checkRateLimit(testKey, limit, windowMs);
      expect(r4.isAllowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });

  describe('3. Security Headers di next.config.ts', () => {
    it('mengonfigurasi header CSP, X-Frame-Options, nosniff, dan Referrer-Policy', async () => {
      expect(typeof nextConfig.headers).toBe('function');
      if (nextConfig.headers) {
        const headersConfig = await nextConfig.headers();
        expect(headersConfig.length).toBeGreaterThan(0);

        const globalHeaders = headersConfig[0].headers;
        const headerKeys = globalHeaders.map((h) => h.key);

        expect(headerKeys).toContain('Content-Security-Policy');
        expect(headerKeys).toContain('X-Frame-Options');
        expect(headerKeys).toContain('X-Content-Type-Options');
        expect(headerKeys).toContain('Referrer-Policy');
        expect(headerKeys).toContain('Permissions-Policy');

        const csp = globalHeaders.find((h) => h.key === 'Content-Security-Policy')?.value;
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain('https://*.supabase.co');
        expect(csp).toContain('wss://*.supabase.co');
        expect(csp).toContain("frame-ancestors 'none'");
      }
    });
  });

  describe('4. Sanitasi Bundle & Proteksi Rahasia Server', () => {
    it('kunci SUPABASE_SERVICE_ROLE_KEY tidak memiliki prefix NEXT_PUBLIC_', () => {
      // Pastikan variabel privat tidak salah diberi nama NEXT_PUBLIC_
      expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    });
  });
});
