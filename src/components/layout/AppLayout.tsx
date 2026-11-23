'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Users,
  GraduationCap,
  Megaphone,
  CheckSquare,
  Calendar,
  MessageSquare,
  TrendingUp,
  LogOut,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { TextScaleToggle } from '../ui/TextScaleToggle';
import { NotificationPanel } from './NotificationPanel';
import { ChildSwitcher, ChildInfo } from './ChildSwitcher';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export interface AppLayoutProps {
  role: UserRole;
  user: {
    id?: string;
    fullName: string;
    email: string;
  };
  childrenList?: ChildInfo[];
  activeChildId?: string;
  unreadCount?: number;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<UserRole, { title: string; badge: string; badgeClass: string }> = {
  admin: {
    title: 'Admin Sekolah',
    badge: 'Admin',
    badgeClass: 'bg-stone-900 text-white',
  },
  teacher: {
    title: 'Ruang Guru & Wali Kelas',
    badge: 'Guru',
    badgeClass: 'bg-[#144D40] text-white',
  },
  student: {
    title: 'Ruang Murid SMK',
    badge: 'Murid',
    badgeClass: 'bg-[#0E5A8A] text-white',
  },
  parent: {
    title: 'Ruang Orang Tua / Wali',
    badge: 'Orang Tua',
    badgeClass: 'bg-[#A8481D] text-white',
  },
};

const ROLE_NAV_ITEMS: Record<UserRole, NavItemConfig[]> = {
  admin: [
    { label: 'Beranda', href: '/admin', icon: LayoutDashboard },
    { label: 'Pengguna', href: '/admin/pengguna', icon: Users },
    { label: 'Kelas & Mapel', href: '/admin/kelas-mapel', icon: GraduationCap },
    { label: 'Pengumuman', href: '/admin/pengumuman', icon: Megaphone },
  ],
  teacher: [
    { label: 'Beranda', href: '/guru', icon: Home },
    { label: 'Kelas & Absensi', href: '/guru/kelas', icon: Users },
    { label: 'Pesan', href: '/guru/pesan', icon: MessageSquare },
    { label: 'Pengumuman', href: '/guru/pengumuman', icon: Megaphone },
  ],
  student: [
    { label: 'Beranda', href: '/murid', icon: Home },
    { label: 'Tugas', href: '/murid/tugas', icon: CheckSquare },
    { label: 'Jadwal & Nilai', href: '/murid/jadwal-nilai', icon: Calendar },
    { label: 'Pesan', href: '/murid/pesan', icon: MessageSquare },
  ],
  parent: [
    { label: 'Beranda', href: '/ortu', icon: Home },
    { label: 'Perkembangan Anak', href: '/ortu/perkembangan', icon: TrendingUp },
    { label: 'Pesan Guru', href: '/ortu/pesan', icon: MessageSquare },
    { label: 'Pengumuman', href: '/ortu/pengumuman', icon: Megaphone },
  ],
};

export function AppLayout({
  role,
  user,
  childrenList = [],
  activeChildId = '',
  unreadCount = 0,
  children,
}: AppLayoutProps) {
  const pathname = usePathname();
  const navItems = ROLE_NAV_ITEMS[role] || [];
  const roleMeta = ROLE_LABELS[role];

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col md:flex-row text-stone-900 font-sans">
      {/* ============================================================ */}
      {/* 1. DESKTOP SIDEBAR (>= 768px)                                */}
      {/* ============================================================ */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-white border-r border-stone-200/90 min-h-screen sticky top-0 h-screen p-5 justify-between shadow-2xs z-20">
        <div className="flex flex-col">
          {/* Logo Brand */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-200/80">
            <Link
              href={`/${role === 'teacher' ? 'guru' : role === 'student' ? 'murid' : role === 'parent' ? 'ortu' : 'admin'}`}
              className="flex items-center gap-2.5 group"
            >
              <span className="w-9 h-9 rounded-xl bg-[#144D40] text-white flex items-center justify-center font-display font-extrabold text-lg shadow-xs ring-2 ring-[#144D40]/15">
                S
              </span>
              <span className="font-display font-extrabold text-xl text-stone-900 tracking-tight group-hover:text-[#144D40] transition-colors">
                Sekolahku
              </span>
            </Link>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${roleMeta.badgeClass}`}
            >
              {roleMeta.badge}
            </span>
          </div>

          {/* Child Switcher (Khusus Orang Tua dengan banyak anak) */}
          {role === 'parent' && (
            <div className="mb-4">
              <ChildSwitcher
                childrenList={childrenList}
                activeChildId={activeChildId}
              />
            </div>
          )}

          {/* Navigasi Utama */}
          <nav className="space-y-1.5" aria-label="Navigasi Utama">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== `/${role === 'teacher' ? 'guru' : role === 'student' ? 'murid' : role === 'parent' ? 'ortu' : 'admin'}` &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-50 text-[#144D40] border-2 border-emerald-200 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 border-2 border-transparent'
                  }`}
                >
                  <Icon
                    aria-hidden={true}
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#144D40]' : 'text-stone-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: User Profile Card & Logout */}
        <div className="pt-4 border-t border-stone-200/80">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-stone-200/90 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={user.fullName || 'Pengguna'} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate max-w-[125px]">
                  {user.fullName || 'Pengguna'}
                </div>
                <div className="text-[11px] font-medium text-stone-500 truncate max-w-[125px]">
                  {user.email}
                </div>
              </div>
            </div>

            <form action="/auth/sign-out" method="POST">
              <button
                type="submit"
                className="p-2 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. AREA KONTEN UTAMA DENGAN TOP BAR TERPADU                 */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Bilah Header Atas (Responsif Desktop & Mobile) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/90 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-2xs">
          {/* Sisi Kiri Header */}
          <div className="flex items-center gap-3">
            {/* Logo Mobile */}
            <div className="md:hidden flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#144D40] text-white flex items-center justify-center font-display font-bold text-sm shadow-xs">
                S
              </span>
              <span className="font-display font-extrabold text-lg text-stone-900">
                Sekolahku
              </span>
            </div>

            {/* Breadcrumb Info Desktop */}
            <div className="hidden md:flex items-center gap-2.5">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${roleMeta.badgeClass}`}>
                {roleMeta.title}
              </span>
              <span className="text-stone-300 font-bold">&bull;</span>
              <span className="text-xs font-semibold text-stone-500">
                SMK Sekolahku &bull; Semester Genap 2025/2026
              </span>
            </div>
          </div>

          {/* Sisi Kanan Header: Kontrol Teks, Lonceng Notifikasi & Logout Mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <TextScaleToggle />
            
            {/* Lonceng Notifikasi Tunggal yang Terbuka ke Bawah Secara Sempurna */}
            <NotificationPanel
              profileId={user.id}
              initialUnreadCount={unreadCount}
            />

            {/* Tombol Logout Cepat Khusus Mobile */}
            <div className="md:hidden pl-1">
              <form action="/auth/sign-out" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-xl text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Keluar dari akun"
                  aria-label="Keluar dari akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 pb-24 md:pb-12">
          <div className="w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (< 768px)                    */}
      {/* ============================================================ */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-stone-200/90 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== `/${role === 'teacher' ? 'guru' : role === 'student' ? 'murid' : role === 'parent' ? 'ortu' : 'admin'}` &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#144D40] font-bold bg-emerald-50'
                    : 'text-stone-500 hover:text-stone-900 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? 'text-[#144D40]' : 'text-stone-400'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden={true} />
                </div>
                <span className="text-[11px] tracking-tight leading-tight mt-0.5 truncate max-w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
