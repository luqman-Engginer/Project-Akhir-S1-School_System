'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ChevronDown } from 'lucide-react';

export interface ChildInfo {
  id: string;
  name: string;
  className?: string;
}

export interface ChildSwitcherProps {
  childrenList: ChildInfo[];
  activeChildId: string;
}

export function ChildSwitcher({ childrenList, activeChildId }: ChildSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!childrenList || childrenList.length <= 1) {
    // Jika hanya 1 anak, tampilkan info tanpa selector dropdown
    const singleChild = childrenList?.[0];
    if (!singleChild) return null;
    return (
      <div className="px-3 py-2 bg-[#F3EFEA] rounded-[10px] text-xs text-[var(--color-text)] mb-3">
        <span className="text-[var(--color-text-muted)] block text-[11px]">Memantau:</span>
        <span className="font-semibold text-sm text-[var(--color-primary)]">
          {singleChild.name}
        </span>
        {singleChild.className && (
          <span className="text-[var(--color-text-muted)] ml-1">({singleChild.className})</span>
        )}
      </div>
    );
  }

  const handleChange = (newId: string) => {
    // Simpan ke cookie dengan path=/ dan max-age 30 hari
    document.cookie = `active_child_id=${newId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="mb-3">
      <label
        htmlFor="child-switcher-select"
        className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1"
      >
        Pilih Anak
      </label>
      <div className="relative">
        <select
          id="child-switcher-select"
          disabled={isPending}
          value={activeChildId}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full appearance-none bg-[#F3EFEA] border border-[var(--color-border)] rounded-[10px] py-2 pl-8 pr-8 text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer disabled:opacity-60"
        >
          {childrenList.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name} {child.className ? `(${child.className})` : ''}
            </option>
          ))}
        </select>
        <Users className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
      </div>
    </div>
  );
}
