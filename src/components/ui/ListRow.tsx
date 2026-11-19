import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface ListRowProps {
  href?: string;
  onClick?: () => void;
  leftSlot?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
  isUnread?: boolean;
  className?: string;
  showChevron?: boolean;
  ariaLabel?: string;
}

export function ListRow({
  href,
  onClick,
  leftSlot,
  title,
  subtitle,
  rightSlot,
  isUnread = false,
  className = '',
  showChevron,
  ariaLabel,
}: ListRowProps) {
  const isInteractive = Boolean(href || onClick);
  const shouldShowChevron = showChevron ?? isInteractive;

  const content = (
    <>
      {/* Unread dot indicator */}
      {isUnread && (
        <span
          className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0 mr-1"
          aria-label="Belum dibaca"
        />
      )}

      {/* Left Icon or Avatar slot */}
      {leftSlot && <div className="shrink-0 mr-3">{leftSlot}</div>}

      {/* Center content */}
      <div className="flex-1 min-w-0 py-2.5">
        <div className="text-sm sm:text-base font-medium text-[var(--color-text)] truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs sm:text-sm text-[var(--color-text-muted)] truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {/* Right slot (Badge, timestamp, status) */}
      {rightSlot && (
        <div className="shrink-0 ml-3 flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-muted)]">
          {rightSlot}
        </div>
      )}

      {/* Optional Chevron */}
      {shouldShowChevron && (
        <div className="shrink-0 ml-2 text-[#9BA5A8]">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </div>
      )}
    </>
  );

  const baseClasses = `
    group flex items-center justify-between w-full px-3.5 sm:px-4 py-1.5
    min-h-[48px] rounded-[10px] transition-colors
    border-b border-[#F0EBE1] last:border-b-0
    ${isInteractive ? 'hover:bg-[#F3EFEA] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] active:bg-[#ECE6DC]' : ''}
    ${isUnread ? 'bg-[#FCFAF7]' : 'bg-transparent'}
    ${className}
  `.trim();

  if (href) {
    return (
      <Link href={href} className={baseClasses} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClasses}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
