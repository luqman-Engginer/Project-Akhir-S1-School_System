'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

const AttendanceTrendChart = dynamic(
  () => import('./AdminCharts').then((mod) => mod.AttendanceTrendChart),
  {
    ssr: false,
    loading: () => <Skeleton height={256} className="w-full rounded-[10px]" />,
  }
);

const ClassScoresChart = dynamic(
  () => import('./AdminCharts').then((mod) => mod.ClassScoresChart),
  {
    ssr: false,
    loading: () => <Skeleton height={256} className="w-full rounded-[10px]" />,
  }
);

export { AttendanceTrendChart, ClassScoresChart };
