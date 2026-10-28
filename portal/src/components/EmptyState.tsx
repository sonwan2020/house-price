import Link from "next/link";

interface EmptyStateProps {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
}

/** Shared empty state for the history and compare pages. */
export default function EmptyState({ title, body, href, linkLabel }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">{body}</p>
      {href && linkLabel && (
        <Link href={href} className="btn-primary mt-4 inline-flex">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
