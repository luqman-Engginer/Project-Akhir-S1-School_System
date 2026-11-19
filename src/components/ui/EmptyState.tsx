import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[14px] bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F3EFEA] text-[var(--color-primary)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" aria-hidden={true} />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-[var(--color-text)] max-w-sm">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {(actionLabel && (onAction || actionHref)) && (
        <div className="mt-5">
          {actionHref ? (
            <Button href={actionHref} variant="secondary" size="sm">
              {actionLabel}
            </Button>
          ) : (
            <Button onClick={onAction} variant="secondary" size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
