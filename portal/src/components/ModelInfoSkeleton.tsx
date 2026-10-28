/** Placeholder shown by the Suspense boundary while model info streams in. */
export default function ModelInfoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[74px] animate-pulse rounded-lg border border-hairline bg-surface"
        />
      ))}
    </div>
  );
}
