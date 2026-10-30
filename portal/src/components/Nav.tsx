"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Estimate" },
  { href: "/history", label: "History" },
  { href: "/compare", label: "Compare" },
  { href: "/market", label: "Market" },
  { href: "/model", label: "Model" },
];

/** Top navigation; client component only for active-link highlighting. */
export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-hairline bg-surface">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-base font-semibold text-ink">
          Property Value Estimator
        </Link>
        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-ink-secondary transition-colors hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
