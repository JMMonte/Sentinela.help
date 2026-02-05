"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const t = useTranslations("header");
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-7 sm:w-7"
            aria-label={t("toggleTheme")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="h-5 w-5 sm:h-4 sm:w-4 dark:hidden" />
            <MoonIcon className="hidden h-5 w-5 sm:h-4 sm:w-4 dark:block" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("toggleTheme")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

