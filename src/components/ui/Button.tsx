import React, { forwardRef } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      className = '',
      type = 'button',
      href,
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading;

    // Base styles: min-h-44px touch target, rounded 12px, single-line horizontal alignment
    const baseStyle =
      'inline-flex items-center justify-center font-bold tracking-tight transition-all select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap text-center shrink-0';

    const variantStyles = {
      primary:
        'bg-[#144D40] text-white hover:bg-[#0F3B31] active:bg-[#0A2922] focus-visible:ring-[#144D40] shadow-xs hover:shadow-sm border border-[#144D40]',
      secondary:
        'bg-white text-stone-800 border-2 border-stone-200/90 hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100 focus-visible:ring-[#144D40] shadow-2xs',
      quiet:
        'bg-transparent text-[#144D40] hover:bg-emerald-50 active:bg-emerald-100/70 focus-visible:ring-[#144D40]',
      danger:
        'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-600 shadow-xs border border-red-700',
    };

    const sizeStyles = {
      sm: 'min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm gap-2',
      md: 'min-h-[44px] px-4.5 py-2.5 text-sm sm:text-base gap-2.5',
      lg: 'min-h-[48px] px-6 py-3 text-base sm:text-lg gap-3',
    };

    const combinedClasses = `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    const innerContent = isBusy ? (
      <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden={true} />
        <span>Memproses...</span>
      </span>
    ) : (
      <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none">
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </span>
    );

    if (href) {
      return (
        <Link href={href} className={combinedClasses}>
          {innerContent}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isBusy}
        className={combinedClasses}
        {...props}
      >
        {innerContent}
      </button>
    );
  }
);

Button.displayName = 'Button';
