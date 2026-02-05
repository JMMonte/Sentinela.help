"use client";

import { useTranslations } from "next-intl";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { incidentTypeIcon, type IncidentType } from "@/lib/reports/incident-types";
import type { VariantProps } from "class-variance-authority";

type IncidentTypeBadgeProps = {
  type: IncidentType;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  className?: string;
};

export function IncidentTypeBadge({
  type,
  variant = "secondary",
  className,
}: IncidentTypeBadgeProps) {
  const t = useTranslations("incidentTypes");
  const Icon = incidentTypeIcon[type];
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {t(type)}
    </Badge>
  );
}
