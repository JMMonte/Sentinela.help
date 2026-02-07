import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-500/10 p-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">404</h1>
        <h2 className="mb-4 text-xl text-muted-foreground">Page Not Found</h2>

        <p className="mb-8 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Map
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            About Sentinela
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
        <p>
          Built by{" "}
          <a
            href="https://darkmatter.is"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Darkmatter AI Labs
          </a>
        </p>
      </footer>
    </div>
  );
}
