"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSelector } from "@/components/layout/language-selector";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SiteHeader() {
  const t = useTranslations("header");

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-start p-3">
      <nav className="pointer-events-auto inline-flex h-12 sm:h-10 items-center gap-1 rounded-full border bg-background/80 px-1.5 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <Link
          href="/"
          className="px-3 text-sm font-semibold tracking-tight"
        >
          {t("brandName")}
        </Link>

        <ThemeToggle />
        <LanguageSelector />

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8 rounded-full" asChild>
                <Link href="/about" aria-label={t("aboutSentinela")}>
                  <Info className="h-5 w-5 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("aboutSentinela")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Portal target for page-specific actions (e.g. panel toggle, report button) */}
        <div id="header-actions" className="contents" />
      </nav>
    </header>
  );
}
