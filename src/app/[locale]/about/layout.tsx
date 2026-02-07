import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AboutLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="min-h-dvh bg-background pt-16">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {children}

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
