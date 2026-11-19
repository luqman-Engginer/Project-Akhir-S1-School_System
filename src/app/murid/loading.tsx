import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';

export default function MuridLoading() {
  return (
    <div className="space-y-6 animate-fade-in" aria-label="Memuat beranda murid...">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-32 h-4" />
        <Skeleton variant="text" className="w-56 h-8" />
        <Skeleton variant="text" className="w-64 h-4" />
      </div>

      {/* Main Assignment Banner Skeleton */}
      <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
        <Skeleton variant="text" className="w-48 h-5" />
        <Skeleton variant="text" className="w-full h-10" />
      </div>

      {/* 2 Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
          <Skeleton variant="text" className="w-36 h-5" />
          <ListSkeleton count={3} />
        </div>
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
          <Skeleton variant="text" className="w-36 h-5" />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
