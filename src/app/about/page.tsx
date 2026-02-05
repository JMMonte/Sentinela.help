import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sentinela is a free crowdsourced emergency reporting platform built by Darkmatter AI Labs for communities in Portugal, Europe, and worldwide.",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-background pt-16">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        <h1 className="mb-6 text-3xl font-bold tracking-tight">About Sentinela</h1>

        <div className="prose prose-zinc dark:prose-invert">
          <p className="text-lg text-muted-foreground">
            Sentinela is a crowdsourced emergency reporting platform that empowers communities to
            report disasters, fires, floods, and other emergencies in real-time.
          </p>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">How it works</h2>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>Citizens report incidents by pinning locations on the map</li>
              <li>The community validates reports through upvotes and comments</li>
              <li>Escalated reports can be sent directly to local government</li>
              <li>Everyone stays informed with real-time updates</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Free for everyone</h2>
            <p className="mt-4 text-muted-foreground">
              Sentinela is provided <strong className="text-foreground">completely free</strong> to
              communities in Portugal and across Europe. We believe emergency reporting
              infrastructure should be accessible to everyone, everywhere — no subscriptions, no
              hidden fees, no barriers.
            </p>
            <p className="mt-3 text-muted-foreground">
              Whether you&apos;re in Lisbon, Porto, or anywhere else in the world, Sentinela is here
              to help your community stay safe and informed.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Built by Darkmatter AI Labs</h2>
            <p className="mt-4 text-muted-foreground">
              Sentinela is developed and maintained by{" "}
              <a
                href="https://darkmatter.is"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                Darkmatter AI Labs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              , a team focused on building AI-powered tools that make a real difference in
              people&apos;s lives.
            </p>
            <p className="mt-3 text-muted-foreground">
              We&apos;re committed to keeping Sentinela open, reliable, and always improving. If you
              have feedback or want to get in touch, visit us at{" "}
              <a
                href="https://darkmatter.is"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                darkmatter.is
              </a>
              .
            </p>
          </section>

          <section className="mt-10 rounded-lg border bg-muted/50 p-6">
            <p className="text-sm text-muted-foreground">
              Sentinela uses OpenStreetMap for mapping, and integrates with weather and seismic data
              providers to give you the most complete picture of what&apos;s happening in your area.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>
              Made with care by{" "}
              <a
                href="https://darkmatter.is"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                Darkmatter AI Labs
              </a>
            </p>
            <Link href="/" className="hover:underline">
              Back to Sentinela
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
