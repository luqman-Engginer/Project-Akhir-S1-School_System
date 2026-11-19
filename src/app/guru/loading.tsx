import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';

export default function GuruLoading() {
  return (
    <div className="space-y-6 animate-fade-in" aria-label="Memuat beranda guru...">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-32 h-4" />
        <Skeleton variant="text" className="w-56 h-8" />
        <Skeleton variant="text" className="w-72 h-4" />
      </div>

      {/* Main Focus Card Skeleton */}
      <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
        <Skeleton variant="text" className="w-40 h-5" />
        <Skeleton variant="text" className="w-full h-12" />
      </div>

      {/* 2 Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
          <Skeleton variant="text" className="w-36 h-5" />
          <ListSkeleton count={2} />
        </div>
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
          <Skeleton variant="text" className="w-36 h-5" />
          <ListSkeleton count={2} />
        </div>
      </div>
    </div>
  );
}
