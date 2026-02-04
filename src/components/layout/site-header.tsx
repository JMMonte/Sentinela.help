import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-start p-3">
      <nav className="pointer-events-auto inline-flex h-10 items-center gap-1 rounded-full border bg-background/80 px-1.5 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <Link
          href="/"
          className="px-3 text-sm font-semibold tracking-tight"
        >
          Kaos
        </Link>

        <ThemeToggle />

        {/* Portal target for page-specific actions (e.g. panel toggle, report button) */}
        <div id="header-actions" className="contents" />
      </nav>
    </header>
  );
}
