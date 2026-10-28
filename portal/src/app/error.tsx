"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary (Next.js best practice): catches runtime
 * errors in the page tree below the layout and offers a retry. Saved
 * estimates live in localStorage, so they are unaffected.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
        An unexpected error occurred while rendering this page. You can try again — your
        saved estimates are safe.
      </p>
      <button onClick={reset} className="btn-primary mt-4">
        Try again
      </button>
    </div>
  );
}
