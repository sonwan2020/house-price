/**
 * Route-level loading state (layout level): shown in place of the page
 * while a route's server components render (e.g. the Model page streaming
 * model info from the API, or the Market dashboard's initial data fetch).
 * Purely presentational — no client interactivity.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="animate-pulse space-y-6"
    >
      <div className="h-8 w-48 rounded-md bg-hairline" />
      <div className="h-4 w-full max-w-md rounded-md bg-hairline" />
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="h-5 w-40 rounded-md bg-hairline" />
        <div className="mt-4 h-32 rounded-md bg-hairline" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 rounded-lg border border-hairline bg-surface" />
        ))}
      </div>
    </div>
  );
}
