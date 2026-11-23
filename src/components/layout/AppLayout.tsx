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
  Sparkles,
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
    badgeClass: 'bg-stone-800 text-stone-100',
  },
  teacher: {
    title: 'Ruang Guru',
    badge: 'Guru',
    badgeClass: 'bg-[var(--color-primary)] text-white',
  },
  student: {
    title: 'Ruang Murid',
    badge: 'Murid',
    badgeClass: 'bg-[#2A6B5B] text-white',
  },
  parent: {
    title: 'Ruang Orang Tua',
    badge: 'Orang Tua',
    badgeClass: 'bg-[#C8643B] text-white',
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
    { label: 'Kelas', href: '/guru/kelas', icon: Users },
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
    { label: 'Perkembangan', href: '/ortu/perkembangan', icon: TrendingUp },
    { label: 'Pesan Guru', href: '/ortu/pesan', icon: MessageSquare },
    { label: 'Pengumuman', href: '/ortu/pengumuman', icon: Megaphone },
  ],
};

const ROLE_NOTIFICATION_HREF: Record<UserRole, string> = {
  admin: '/admin/pengumuman',
  teacher: '/guru/pesan',
  student: '/murid/pesan',
  parent: '/ortu/pesan',
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
  const notificationHref = ROLE_NOTIFICATION_HREF[role];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col md:flex-row text-[var(--color-text)]">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR (>= 768px)                                   */}
      {/* ============================================================ */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] min-h-screen sticky top-0 h-screen p-4.5 justify-between">
        <div className="flex flex-col">
          {/* Logo Brand */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F0EBE1]">
            <Link href={`/${role === 'teacher' ? 'guru' : role === 'student' ? 'murid' : role === 'parent' ? 'ortu' : 'admin'}`} className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center font-display font-bold text-base shadow-xs">
                S
              </span>
              <span className="font-display font-bold text-xl text-[var(--color-primary)] tracking-tight">
                Sekolahku
              </span>
            </Link>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${roleMeta.badgeClass}`}
            >
              {roleMeta.badge}
            </span>
          </div>

          {/* Child Switcher (Parent with multiple children) */}
          {role === 'parent' && (
            <ChildSwitcher
              childrenList={childrenList}
              activeChildId={activeChildId}
            />
          )}

          {/* Desktop Navigation Links */}
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-[#E8F1EE] text-[var(--color-primary)] font-bold shadow-xs ring-1 ring-[#144D40]/10'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[#F5F1E9]'
                  }`}
                >
                  <Icon aria-hidden={true} className={`w-5 h-5 shrink-0 ${isActive ? 'text-[var(--color-primary)]' : 'text-[#859296]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: TextScale & Profile */}
        <div className="pt-4 border-t border-[#F0EBE1] space-y-3">
          <div className="flex items-center justify-between px-1">
            <TextScaleToggle />
            <NotificationPanel
              profileId={user.id}
              initialUnreadCount={unreadCount}
            />
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#F0EBE1] shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.fullName || 'Pengguna'} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--color-text)] truncate max-w-[120px]">
                  {user.fullName || 'Pengguna'}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                  {user.email}
                </div>
              </div>
            </div>

            <form action="/auth/sign-out" method="POST">
              <button
                type="submit"
                className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Keluar Akun"
                aria-label="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE TOP BAR (< 768px)                                     */}
      {/* ============================================================ */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center font-display font-bold text-sm shadow-xs">
            S
          </span>
          <span className="font-display font-bold text-lg text-[var(--color-primary)]">
            Sekolahku
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleMeta.badgeClass}`}
          >
            {roleMeta.badge}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TextScaleToggle />
          <NotificationPanel
            profileId={user.id}
            initialUnreadCount={unreadCount}
          />
          <form action="/auth/sign-out" method="POST">
            <button
              type="submit"
              className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Keluar Akun"
              aria-label="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA                                            */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        <div className="w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
          {children}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px)                        */}
      {/* ============================================================ */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
        style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))' }}
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
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-[8px] transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`p-1 rounded-full ${
                    isActive ? 'bg-[#E8F1EE]' : 'bg-transparent'
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
