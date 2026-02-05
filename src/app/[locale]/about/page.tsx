import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Phone, AlertTriangle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tEmergency = await getTranslations("emergencyContacts");
  const tLinks = await getTranslations("usefulLinks");

  const emergencyContacts = [
    {
      key: "112",
      phone: "112",
      primary: true,
    },
    {
      key: "anepc",
      url: "https://prociv.gov.pt",
    },
    {
      key: "ipma",
      url: "https://www.ipma.pt/pt/otempo/prev-sam/",
    },
    {
      key: "sns24",
      phone: "808 24 24 24",
    },
    {
      key: "cruzVermelha",
      url: "https://www.cruzvermelha.pt",
      phone: "+351 213 913 900",
    },
    {
      key: "117",
      phone: "117",
    },
  ];

  const usefulLinks = [
    {
      key: "avisosIpma",
      url: "https://www.ipma.pt/pt/otempo/prev-sam/",
    },
    {
      key: "fogos",
      url: "https://fogos.pt",
    },
    {
      key: "prociv",
      url: "https://prociv.gov.pt/pt/ocorrencias/",
    },
    {
      key: "snirh",
      url: "https://snirh.apambiente.pt",
    },
    {
      key: "infraestruturas",
      url: "https://www.infraestruturasdeportugal.pt/pt-pt/centro-de-informacao",
    },
  ];

  return (
    <div className="min-h-dvh bg-background pt-16">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToMap")}
        </Link>

        <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>

        <div className="prose prose-zinc dark:prose-invert">
          <p className="text-lg text-muted-foreground">{t("intro")}</p>

          {/* Emergency Contacts for Portugal */}
          <section className="mt-10 rounded-lg border-2 border-red-500/50 bg-red-500/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                {t("emergencyContactsTitle")}
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("emergencyContactsDescription")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.key}
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
                        {tEmergency(`${contact.key}.name`)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {tEmergency(`${contact.key}.description`)}
                      </p>
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
                      {t("visitSite")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Useful Links */}
          <section className="mt-8 rounded-lg border bg-muted/30 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("usefulLinks")}</h2>
            <div className="space-y-3">
              {usefulLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border bg-background/50 p-3 transition-colors hover:bg-background"
                >
                  <div>
                    <h3 className="font-medium">{tLinks(`${link.key}.name`)}</h3>
                    <p className="text-xs text-muted-foreground">
                      {tLinks(`${link.key}.description`)}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">{t("howItWorksTitle")}</h2>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>{t("howItWorks1")}</li>
              <li>{t("howItWorks2")}</li>
              <li>{t("howItWorks3")}</li>
              <li>{t("howItWorks4")}</li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">{t("freeTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("freeParagraph1")}
            </p>
            <p className="mt-3 text-muted-foreground">{t("freeParagraph2")}</p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold">{t("builtByTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("builtByParagraph1")}
            </p>
            <p className="mt-3 text-muted-foreground">{t("builtByParagraph2")}</p>
          </section>

          <section className="mt-10 rounded-lg border bg-muted/50 p-6">
            <p className="text-sm text-muted-foreground">{t("technicalNote")}</p>
          </section>
        </div>

        <footer className="mt-16 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>
              {t("madeWith")}{" "}
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
              {t("backToSentinela")}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
