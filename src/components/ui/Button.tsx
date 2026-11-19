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

    // Base styles: min-h-44px touch target, rounded 10px, clear focus ring
    const baseStyle =
      'inline-flex items-center justify-center font-medium transition-colors select-none rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

    const variantStyles = {
      primary:
        'bg-[#1F5C4D] text-white hover:bg-[#184A3E] active:bg-[#133C32] focus-visible:ring-[#1F5C4D] shadow-sm',
      secondary:
        'bg-white text-[#1F2A2E] border border-[#E6E0D6] hover:bg-[#F4F0E8] active:bg-[#ECE6DC] focus-visible:ring-[#1F5C4D] shadow-sm',
      quiet:
        'bg-transparent text-[#1F5C4D] hover:bg-[#EBF3F0] active:bg-[#DDECE7] focus-visible:ring-[#1F5C4D]',
      danger:
        'bg-[#962828] text-white hover:bg-[#7D2020] active:bg-[#681919] focus-visible:ring-[#962828] shadow-sm',
    };

    const sizeStyles = {
      sm: 'min-h-[38px] px-3.5 py-1.5 text-sm gap-1.5',
      md: 'min-h-[44px] px-4 py-2.5 text-base gap-2',
      lg: 'min-h-[48px] px-6 py-3 text-lg gap-2.5',
    };

    const combinedClasses = `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    const innerContent = isBusy ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden={true} />
        <span>Memproses...</span>
      </>
    ) : (
      <>
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </>
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
