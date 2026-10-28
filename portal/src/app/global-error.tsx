"use client";

/**
 * Error boundary for the root layout. Must render its own <html>/<body>
 * because it replaces the whole document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-page text-ink antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 text-center">
          <p className="text-base font-medium text-ink">Something went wrong</p>
          <p className="mt-1 text-sm text-ink-secondary">
            The portal hit an unexpected error ({error.message || "unknown"}). Reloading
            usually fixes it.
          </p>
          <button onClick={reset} className="btn-primary mt-4">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
