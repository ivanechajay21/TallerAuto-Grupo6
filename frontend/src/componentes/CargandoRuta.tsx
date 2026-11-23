import { useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { cn } from '../lib/utilidades';
import { navStart, navFinish } from './progresoNavegacion';

function SkeletonRow({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-700/60', className)} />;
}

export default function RouteLoading({ fullscreen = false }: { fullscreen?: boolean }) {
  useEffect(() => {
    navStart();
    return () => navFinish();
  }, []);

  if (fullscreen) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-5 bg-slate-50 dark:bg-slate-950">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
          <Wrench className="h-7 w-7 text-white" strokeWidth={2.2} />
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <SkeletonRow className="h-7 w-48" />
          <SkeletonRow className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <SkeletonRow className="h-9 w-28 rounded-lg" />
          <SkeletonRow className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <SkeletonRow className="h-11 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonRow className="h-40 rounded-2xl" />
        <SkeletonRow className="h-40 rounded-2xl" />
        <SkeletonRow className="h-40 rounded-2xl" />
      </div>
      <SkeletonRow className="h-64 w-full rounded-2xl" />
    </div>
  );
}