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
            className="h-7 w-7"
            aria-label={t("toggleTheme")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="h-4 w-4 dark:hidden" />
            <MoonIcon className="hidden h-4 w-4 dark:block" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("toggleTheme")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

