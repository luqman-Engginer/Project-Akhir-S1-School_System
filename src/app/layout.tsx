import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TextScaleProvider } from '@/components/TextScaleProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Sekolahku - Sistem Sekolah SMK',
    template: '%s | Sekolahku',
  },
  description: 'Sistem sekolah simple untuk SMK yang menghubungkan guru, murid, orang tua, dan admin.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#1F5C4D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;600;700&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('sekolahku-text-scale') === 'large') {
                  document.documentElement.classList.add('text-large');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Lewati ke konten utama
        </a>
        <OfflineBanner />
        <TextScaleProvider>
          <ToastProvider>
            <div id="main-content" tabIndex={-1} className="outline-none">
              {children}
            </div>
          </ToastProvider>
        </TextScaleProvider>
      </body>
    </html>
  );
}
