import Link from "next/link";

/** 404 page (Next.js convention file). */
export default function NotFound() {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">Page not found</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="btn-primary mt-4 inline-flex">
        Back to the estimator
      </Link>
    </div>
  );
}
