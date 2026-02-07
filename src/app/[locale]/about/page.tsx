import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
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

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <p className="text-lg text-muted-foreground">{t("intro")}</p>

        {/* Data Sources Link */}
        <p className="mt-6">
          <Link
            href={`/${locale}/about/data-sources`}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("dataSourcesTitle")}
            <ChevronRight className="h-4 w-4" />
          </Link>
          {" "}— Learn how Sentinela collects and displays real-time data from 19+ sources.
        </p>

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
          <h2>{t("usefulLinks")}</h2>
          <ul>
            {usefulLinks.map((link) => (
              <li key={link.key}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tLinks(`${link.key}.name`)}
                </a>
                {" — "}
                <span className="text-muted-foreground">{tLinks(`${link.key}.description`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2>{t("howItWorksTitle")}</h2>
          <ul>
            <li>{t("howItWorks1")}</li>
            <li>{t("howItWorks2")}</li>
            <li>{t("howItWorks3")}</li>
            <li>{t("howItWorks4")}</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2>{t("freeTitle")}</h2>
          <p>{t("freeParagraph1")}</p>
          <p>{t("freeParagraph2")}</p>
        </section>

        <section className="mt-10">
          <h2>{t("openSourceTitle")}</h2>
          <p>{t("openSourceParagraph1")}</p>
          <p>{t("openSourceParagraph2")}</p>
          <p>
            <a
              href="https://github.com/JMMonte/Sentinela.help"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              {t("viewOnGitHub")}
            </a>
          </p>
        </section>

        <section className="mt-10">
          <h2>{t("builtByTitle")}</h2>
          <p>{t("builtByParagraph1")}</p>
          <p>{t("builtByParagraph2")}</p>
        </section>

        {/* Community Projects */}
        <section className="mt-10">
          <h2>{t("communityProjectsTitle")}</h2>
          <p>{t("communityProjectsDescription")}</p>
          <ul>
            {communityProjects.map((project) => (
              <li key={project.key}>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tCommunity(`${project.key}.name`)}
                  <ArrowUpRight className="ml-0.5 inline h-3.5 w-3.5" />
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
