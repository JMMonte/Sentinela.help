"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSelector() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleLocaleChange() {
    // Toggle between locales
    const newLocale = locale === "en" ? "pt-PT" : "en";

    // Store preference as cookie (accessible by middleware)
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    // Navigate to the same page with new locale
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join("/") || "/");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-7 sm:w-7"
            aria-label={t("language")}
            onClick={handleLocaleChange}
          >
            <span className="text-sm sm:text-xs font-medium">
              {locale === "en" ? "EN" : "PT"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {locale === "en"
              ? localeNames["pt-PT"]
              : localeNames["en"]}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
