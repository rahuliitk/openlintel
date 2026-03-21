import { Skeleton } from '@openlintel/ui';

export default function FloorPlanLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  );
}
