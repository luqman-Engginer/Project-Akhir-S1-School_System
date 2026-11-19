'use client';

import React from 'react';
import { Type } from 'lucide-react';
import { useTextScale } from '../TextScaleProvider';

export function TextScaleToggle({ className = '' }: { className?: string }) {
  const { isLarge, toggleTextScale } = useTextScale();

  return (
    <button
      type="button"
      onClick={toggleTextScale}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-medium border transition-colors min-h-[36px] ${
        isLarge
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-[#F5F1E9] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[#EFEAE0]'
      } ${className}`}
      aria-label={isLarge ? 'Ganti ke teks ukuran standar' : 'Ganti ke teks ukuran besar'}
      title={isLarge ? 'Teks besar aktif (klik untuk standar)' : 'Aktifkan teks besar'}
    >
      <Type className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{isLarge ? 'Teks Besar: On' : 'Teks Besar'}</span>
    </button>
  );
}
