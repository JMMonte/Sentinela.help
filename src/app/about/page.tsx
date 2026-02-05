import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Phone, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sentinela is a free crowdsourced emergency reporting platform built by Darkmatter AI Labs for communities in Portugal, Europe, and worldwide.",
};

const emergencyContacts = [
  {
    name: "112",
    description: "Número Europeu de Emergência",
    phone: "112",
    primary: true,
  },
  {
    name: "ANEPC",
    description: "Proteção Civil",
    url: "https://prociv.gov.pt",
  },
  {
    name: "IPMA",
    description: "Alertas Meteorológicos",
    url: "https://www.ipma.pt/pt/otempo/prev-sam/",
  },
  {
    name: "SNS 24",
    description: "Linha de Saúde",
    phone: "808 24 24 24",
  },
  {
    name: "Cruz Vermelha",
    description: "Assistência Humanitária",
    url: "https://www.cruzvermelha.pt",
    phone: "+351 213 913 900",
  },
  {
    name: "117",
    description: "Fogos Florestais",
    phone: "117",
  },
];

const usefulLinks = [
  {
    name: "Avisos IPMA",
    description: "Avisos meteorológicos em tempo real",
    url: "https://www.ipma.pt/pt/otempo/prev-sam/",
  },
  {
    name: "Fogos.pt",
    description: "Mapa de incêndios em Portugal",
    url: "https://fogos.pt",
  },
  {
    name: "Prociv Ocorrências",
    description: "Ocorrências em tempo real",
    url: "https://prociv.gov.pt/pt/ocorrencias/",
  },
  {
    name: "SNIRH",
    description: "Níveis de rios e albufeiras",
    url: "https://snirh.apambiente.pt",
  },
  {
    name: "Infraestruturas de Portugal",
    description: "Estado das estradas",
    url: "https://www.infraestruturasdeportugal.pt/pt-pt/centro-de-informacao",
  },
];

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

          {/* Emergency Contacts for Portugal */}
          <section className="mt-10 rounded-lg border-2 border-red-500/50 bg-red-500/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                Contactos de Emergência — Portugal
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Se está a enfrentar uma emergência relacionada com tempestades ou cheias, contacte
              imediatamente os serviços de emergência.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.name}
                  className={`rounded-md border p-3 ${
                    contact.primary
                      ? "border-red-500 bg-red-500/10"
                      : "border-border bg-background/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        className={`font-semibold ${contact.primary ? "text-red-600 dark:text-red-400" : ""}`}
                      >
                        {contact.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{contact.description}</p>
                    </div>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone.replace(/\s/g, "")}`}
                        className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                      >
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                  {contact.url && (
                    <a
                      href={contact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Visitar site
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Useful Links */}
          <section className="mt-8 rounded-lg border bg-muted/30 p-6">
            <h2 className="mb-4 text-lg font-semibold">Links Úteis</h2>
            <div className="space-y-3">
              {usefulLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border bg-background/50 p-3 transition-colors hover:bg-background"
                >
                  <div>
                    <h3 className="font-medium">{link.name}</h3>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>

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
