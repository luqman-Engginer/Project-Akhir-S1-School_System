import React from 'react';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_COLORS = [
  'bg-[#2A6B5B] text-white',
  'bg-[#7A4B3A] text-white',
  'bg-[#3D5A80] text-white',
  'bg-[#8D5B4C] text-white',
  'bg-[#4A6B6C] text-white',
  'bg-[#6B5B7B] text-white',
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getBgColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getBgColor(name);

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
  }[size];

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center select-none font-display tracking-wider ${colorClass} ${sizeStyles} ${className}`}
      aria-label={`Avatar ${name}`}
      title={name}
    >
      {initials}
    </div>
  );
}
