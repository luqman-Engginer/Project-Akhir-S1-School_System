import React from 'react';

export interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'default' | 'subtle' | 'featured';
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
  bodyClassName = '',
  variant = 'default',
}: PanelProps) {
  const variantStyles = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
    subtle: 'bg-[#F5F1E9] border-transparent',
    featured: 'bg-[var(--color-surface)] border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/10',
  }[variant];

  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section
      className={`rounded-[14px] border ${variantStyles} overflow-hidden ${className}`}
    >
      {hasHeader && (
        <div className="px-5 py-4 border-b border-[#F0EBE1] flex items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>

      {footer && (
        <div className="px-5 py-3 bg-[#FAF7F2] border-t border-[#F0EBE1] text-xs sm:text-sm text-[var(--color-text-muted)] flex items-center justify-between">
          {footer}
        </div>
      )}
    </section>
  );
}
