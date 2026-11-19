'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Heart,
  Phone,
  Filter,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types/database';

export interface AdminUserListItem {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  has_logged_in: boolean;
  class_name?: string | null;
  parent_count?: number;
  child_count?: number;
  teaching_count?: number;
}

export interface NeedsAttentionCounts {
  studentsWithoutClass: number;
  studentsWithoutParent: number;
  parentsWithoutChild: number;
  teachersWithoutTeaching: number;
  usersWithoutPhone: number;
}

interface UserListClientProps {
  users: AdminUserListItem[];
  counts: NeedsAttentionCounts;
}

const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string }> = {
  admin: { label: 'Admin', badgeClass: 'bg-stone-800 text-stone-100' },
  teacher: { label: 'Guru', badgeClass: 'bg-[var(--color-primary)] text-white' },
  student: { label: 'Murid', badgeClass: 'bg-emerald-700 text-white' },
  parent: { label: 'Orang Tua', badgeClass: 'bg-[#C8643B] text-white' },
};

export function UserListClient({ users, counts }: UserListClientProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter logika
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Filter Pencarian Nama / Email
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.full_name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }

      // 2. Filter Peran
      if (roleFilter === 'inactive') {
        if (u.is_active) return false;
      } else if (roleFilter !== 'all') {
        if (u.role !== roleFilter) return false;
      }

      // 3. Filter "Perlu Dilengkapi"
      if (attentionFilter === 'student_no_class') {
        if (u.role !== 'student' || u.class_name) return false;
      } else if (attentionFilter === 'student_no_parent') {
        if (u.role !== 'student' || (u.parent_count || 0) > 0) return false;
      } else if (attentionFilter === 'parent_no_child') {
        if (u.role !== 'parent' || (u.child_count || 0) > 0) return false;
      } else if (attentionFilter === 'teacher_no_teaching') {
        if (u.role !== 'teacher' || (u.teaching_count || 0) > 0) return false;
      } else if (attentionFilter === 'no_phone') {
        if (u.phone) return false;
      }

      return true;
    });
  }, [users, search, roleFilter, attentionFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleCardFilterClick = (key: string) => {
    if (attentionFilter === key) {
      setAttentionFilter(null);
    } else {
      setAttentionFilter(key);
      setRoleFilter('all');
      setPage(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--color-text)]">
            Manajemen Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Kelola data akun Guru, Murid, Orang Tua, dan Administrator sekolah.
          </p>
        </div>

        <Button href="/admin/pengguna/baru" variant="primary" className="self-start sm:self-auto min-h-[44px]">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Tambah Pengguna</span>
        </Button>
      </div>

      {/* ============================================================ */}
      {/* KARTU: DATA YANG PERLU DILENGKAPI (FAST FILTER)              */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Data yang Perlu Dilengkapi
          </h2>
          {attentionFilter && (
            <button
              type="button"
              onClick={() => setAttentionFilter(null)}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Reset Filter Khusus
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => handleCardFilterClick('student_no_class')}
            className={`p-3 rounded-[10px] border text-left transition-all ${
              attentionFilter === 'student_no_class'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:border-stone-400'
            }`}
          >
            <span className="text-[11px] text-[var(--color-text-muted)] block">Murid Tanpa Kelas</span>
            <span className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)]">
              {counts.studentsWithoutClass}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCardFilterClick('student_no_parent')}
            className={`p-3 rounded-[10px] border text-left transition-all ${
              attentionFilter === 'student_no_parent'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:border-stone-400'
            }`}
          >
            <span className="text-[11px] text-[var(--color-text-muted)] block">Murid Tanpa Ortu</span>
            <span className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)]">
              {counts.studentsWithoutParent}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCardFilterClick('parent_no_child')}
            className={`p-3 rounded-[10px] border text-left transition-all ${
              attentionFilter === 'parent_no_child'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:border-stone-400'
            }`}
          >
            <span className="text-[11px] text-[var(--color-text-muted)] block">Ortu Tanpa Anak</span>
            <span className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)]">
              {counts.parentsWithoutChild}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCardFilterClick('teacher_no_teaching')}
            className={`p-3 rounded-[10px] border text-left transition-all ${
              attentionFilter === 'teacher_no_teaching'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:border-stone-400'
            }`}
          >
            <span className="text-[11px] text-[var(--color-text-muted)] block">Guru Belum Mengajar</span>
            <span className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)]">
              {counts.teachersWithoutTeaching}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCardFilterClick('no_phone')}
            className={`p-3 rounded-[10px] border text-left transition-all col-span-2 sm:col-span-1 ${
              attentionFilter === 'no_phone'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:border-stone-400'
            }`}
          >
            <span className="text-[11px] text-[var(--color-text-muted)] block">Tanpa Nomor HP</span>
            <span className="text-lg sm:text-xl font-bold font-display text-[var(--color-text)]">
              {counts.usersWithoutPhone}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER & PENCARIAN                                           */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Input Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama atau email pengguna..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[10px] border border-[var(--color-border)] bg-white text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] min-h-[44px]"
          />
        </div>

        {/* Filter Peran Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'teacher', label: 'Guru' },
            { id: 'student', label: 'Murid' },
            { id: 'parent', label: 'Orang Tua' },
            { id: 'admin', label: 'Admin' },
            { id: 'inactive', label: 'Nonaktif' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setRoleFilter(tab.id);
                setAttentionFilter(null);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap min-h-[38px] transition-colors ${
                roleFilter === tab.id && !attentionFilter
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* DAFTAR BARIS PENGGUNA                                        */}
      {/* ============================================================ */}
      <div className="bg-white border border-[var(--color-border)] rounded-[14px] shadow-xs divide-y divide-[#F0EBE1] overflow-hidden">
        {paginatedUsers.length === 0 ? (
          <div className="p-8 text-center text-xs sm:text-sm text-[var(--color-text-muted)]">
            Tidak ada pengguna yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          paginatedUsers.map((u) => {
            const roleMeta = ROLE_LABELS[u.role] || ROLE_LABELS.admin;

            return (
              <Link
                key={u.id}
                href={`/admin/pengguna/${u.id}`}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF7F2] transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={u.full_name} size="md" />

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                        {u.full_name}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                      {!u.is_active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-wrap">
                      <span>{u.email}</span>
                      {u.phone && (
                        <>
                          <span>&bull;</span>
                          <span>{u.phone}</span>
                        </>
                      )}
                      {u.class_name && (
                        <>
                          <span>&bull;</span>
                          <span className="font-medium text-stone-700">Kelas {u.class_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`hidden sm:inline-block text-[11px] px-2.5 py-1 rounded-full font-medium ${
                      u.has_logged_in
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {u.has_logged_in ? 'Sudah pernah masuk' : 'Belum pernah masuk'}
                  </span>

                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[var(--color-text)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Paginasi Sederhana */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2">
          <span>
            Menampilkan {(page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, filteredUsers.length)} dari {filteredUsers.length} pengguna
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Sebelumnya
            </Button>
            <span className="px-2 font-semibold text-[var(--color-text)]">
              Hal {page} dari {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
