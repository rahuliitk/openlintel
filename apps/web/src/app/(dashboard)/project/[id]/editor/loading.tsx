import { Skeleton } from '@openlintel/ui';

export default function EditorLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-[calc(100vh-200px)] w-full rounded-lg" />
    </div>
  );
}
