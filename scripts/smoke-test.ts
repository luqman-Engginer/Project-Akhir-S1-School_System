/**
 * Smoke Test Otomatis Sederhana untuk Verifikasi Pasca-Deploy Sekolahku
 * Mengetes rute-rute publik dan proteksi redirect pada URL target.
 * 
 * Penggunaan:
 *   npx tsx scripts/smoke-test.ts [BASE_URL]
 *   node --experimental-strip-types scripts/smoke-test.ts https://sekolahku.vercel.app
 */

const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

interface CheckItem {
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: string;
  expectedStatus: number | number[];
}

const checks: CheckItem[] = [
  {
    name: 'Halaman Masuk (/login)',
    path: '/login',
    expectedStatus: 200,
  },
  {
    name: 'Proteksi Area Admin Tanpa Auth (/admin -> Redirect)',
    path: '/admin',
    expectedStatus: [307, 308, 302],
  },
  {
    name: 'Proteksi Area Guru Tanpa Auth (/guru -> Redirect)',
    path: '/guru',
    expectedStatus: [307, 308, 302],
  },
  {
    name: 'Proteksi Area Murid Tanpa Auth (/murid -> Redirect)',
    path: '/murid',
    expectedStatus: [307, 308, 302],
  },
  {
    name: 'Proteksi Area Ortu Tanpa Auth (/ortu -> Redirect)',
    path: '/ortu',
    expectedStatus: [307, 308, 302],
  },
  {
    name: 'Halaman Not Found 404 (/halaman-tidak-ada)',
    path: '/halaman-tidak-ada-sekolahku',
    expectedStatus: 404,
  },
  {
    name: 'Manifest Web App (/manifest.json)',
    path: '/manifest.json',
    expectedStatus: 200,
  },
  {
    name: 'Favicon SVG (/favicon.svg)',
    path: '/favicon.svg',
    expectedStatus: 200,
  },
];

async function runSmokeTest() {
  console.log('====================================================');
  console.log(` Memulai Smoke Test Sekolahku: ${baseUrl}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    try {
      const response = await fetch(url, {
        method: check.method || 'GET',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sekolahku-SmokeTest/1.0',
        },
        body: check.body,
      });

      const allowedStatuses = Array.isArray(check.expectedStatus)
        ? check.expectedStatus
        : [check.expectedStatus];

      const isOk = allowedStatuses.includes(response.status);

      if (isOk) {
        console.log(`[PASS] ${check.name}`);
        console.log(`       URL: ${url} | HTTP ${response.status}`);
        passed++;
      } else {
        console.log(`[FAIL] ${check.name}`);
        console.log(
          `       URL: ${url} | Diterima: HTTP ${response.status} (Diharapkan: ${allowedStatuses.join(', ')})`
        );
        failed++;
      }
    } catch (err: unknown) {
      console.log(`[ERROR] ${check.name}`);
      console.log(`        Gagal menghubungi: ${url}`);
      console.log(`        Pesan error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
    console.log('----------------------------------------------------');
  }

  console.log(`\nHasil Smoke Test: ${passed} Lulus, ${failed} Gagal.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('Semua endpoint dasar berfungsi normal!\n');
  }
}

runSmokeTest();
