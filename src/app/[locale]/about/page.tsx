import type { Metadata } from "next";
import Link from "next/link";
import {
  ExternalLink,
  Phone,
  AlertTriangle,
  Github,
  ChevronRight,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  const title = t("title");
  const description = t("intro");

  return {
    title,
    description,
    keywords: [
      "Sentinela",
      "about",
      "emergency monitoring",
      "data sources",
      "real-time alerts",
      "Portugal",
      "disaster awareness",
    ],
    openGraph: {
      title: `${title} | Sentinela`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | Sentinela`,
      description,
    },
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        en: "/en/about",
        "pt-PT": "/pt-PT/about",
        es: "/es/about",
      },
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tEmergency = await getTranslations("emergencyContacts");
  const tLinks = await getTranslations("usefulLinks");
  const tCommunity = await getTranslations("communityProjects");

  const emergencyContacts = [
    { key: "112", phone: "112", primary: true },
    { key: "anepc", url: "https://prociv.gov.pt" },
    { key: "ipma", url: "https://www.ipma.pt/pt/otempo/prev-sam/" },
    { key: "sns24", phone: "808 24 24 24" },
    { key: "cruzVermelha", url: "https://www.cruzvermelha.pt", phone: "+351 213 913 900" },
    { key: "117", phone: "117" },
  ];

  const communityProjects = [
    { key: "vostpt", url: "https://vost.pt" },
    { key: "fogos", url: "https://fogos.pt" },
    { key: "sosleiria", url: "https://sosleiria.pt" },
    { key: "safecommunities", url: "https://www.safecommunitiesportugal.com" },
  ];

  const usefulLinks = [
    { key: "avisosIpma", url: "https://www.ipma.pt/pt/otempo/prev-sam/" },
    { key: "fogos", url: "https://fogos.pt" },
    { key: "prociv", url: "https://prociv.gov.pt/pt/ocorrencias/" },
    { key: "snirh", url: "https://snirh.apambiente.pt" },
    { key: "infraestruturas", url: "https://www.infraestruturasdeportugal.pt/pt-pt/centro-de-informacao" },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">Sentinela</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{t("title")}</span>
      </nav>

      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>

      <div className="prose prose-zinc dark:prose-invert max-w-none prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:text-xl prose-h2:font-semibold">
        <p className="text-lg text-muted-foreground">{t("intro")}</p>

        {/* Data Sources Link */}
        <Link
          href={`/${locale}/about/data-sources`}
          className="not-prose mt-8 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <div>
            <h2 className="text-lg font-semibold">{t("dataSourcesTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("dataSourcesLinkDescription")}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        {/* Emergency Contacts for Portugal */}
        <section className="mt-10 rounded-lg border-2 border-red-500/50 bg-red-500/5 p-6 not-prose">
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
                <h3
                  className={`font-semibold ${contact.primary ? "text-red-600 dark:text-red-400" : ""}`}
                >
                  {tEmergency(`${contact.key}.name`)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tEmergency(`${contact.key}.description`)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.url && (
                    <a
                      href={contact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t("visitSite")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Useful Links */}
        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("usefulLinks")}</h2>
          <ul>
            {usefulLinks.map((link) => (
              <li key={link.key}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {tLinks(`${link.key}.name`)}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {" — "}
                <span className="text-muted-foreground">{tLinks(`${link.key}.description`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("howItWorksTitle")}</h2>
          <ul>
            <li>{t("howItWorks1")}</li>
            <li>{t("howItWorks2")}</li>
            <li>{t("howItWorks3")}</li>
            <li>{t("howItWorks4")}</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("freeTitle")}</h2>
          <p>{t("freeParagraph1")}</p>
          <p>{t("freeParagraph2")}</p>
        </section>

        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("openSourceTitle")}</h2>
          <p>{t("openSourceParagraph1")}</p>
          <p>{t("openSourceParagraph2")}</p>
          <p className="not-prose mt-4">
            <a
              href="https://github.com/JMMonte/Sentinela.help"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Github className="h-4 w-4" />
              {t("viewOnGitHub")}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("builtByTitle")}</h2>
          <p>{t("builtByParagraph1")}</p>
          <p>{t("builtByParagraph2")}</p>
        </section>

        {/* Community Projects */}
        <section className="mt-10">
          <h2 className="!mb-4 !border-b !border-border !pb-2 !text-xl !font-bold">{t("communityProjectsTitle")}</h2>
          <p>{t("communityProjectsDescription")}</p>
          <ul>
            {communityProjects.map((project) => (
              <li key={project.key}>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {tCommunity(`${project.key}.name`)}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {" — "}
                <span className="text-muted-foreground">{tCommunity(`${project.key}.description`)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
