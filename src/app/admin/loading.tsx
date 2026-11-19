import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-fade-in" aria-label="Memuat beranda admin...">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-32 h-4" />
        <Skeleton variant="text" className="w-64 h-8" />
        <Skeleton variant="text" className="w-80 h-4" />
      </div>

      {/* 4 Cards Skeleton */}
      <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 p-2">
            <Skeleton variant="text" className="w-20 h-3" />
            <Skeleton variant="text" className="w-16 h-7" />
          </div>
        ))}
      </div>

      {/* 2 Panels Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-4">
          <Skeleton variant="text" className="w-48 h-5" />
          <Skeleton variant="rectangular" className="w-full h-48" />
        </div>
        <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-4">
          <Skeleton variant="text" className="w-48 h-5" />
          <Skeleton variant="rectangular" className="w-full h-48" />
        </div>
      </div>

      {/* List Rows Skeleton */}
      <div className="p-5 rounded-[14px] bg-white border border-[var(--color-border)] space-y-3">
        <Skeleton variant="text" className="w-40 h-5" />
        <ListSkeleton count={3} />
      </div>
    </div>
  );
}
