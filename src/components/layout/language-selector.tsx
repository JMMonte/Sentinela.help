"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSelector() {
  const t = useTranslations("header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLocaleChange(newLocale: Locale) {
    if (newLocale === locale) {
      setOpen(false);
      return;
    }

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
    setOpen(false);
  }

  // Render a static button during SSR to avoid hydration mismatch from Radix IDs
  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 sm:h-7 gap-1 px-2"
        aria-label={t("language")}
      >
        <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="text-sm sm:text-xs font-medium uppercase">{locale === "pt-PT" ? "PT" : locale}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 sm:h-7 gap-1 px-2"
          aria-label={t("language")}
        >
          <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="text-sm sm:text-xs font-medium uppercase">{locale === "pt-PT" ? "PT" : locale}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="flex flex-col">
          {locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleLocaleChange(loc)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="flex-1 text-left">{localeNames[loc]}</span>
              {locale === loc && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
