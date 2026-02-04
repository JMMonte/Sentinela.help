import { Badge, type badgeVariants } from "@/components/ui/badge";
import {
  incidentTypeIcon,
  incidentTypeLabel,
  type IncidentType,
} from "@/lib/reports/incident-types";
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
  const Icon = incidentTypeIcon[type];
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {incidentTypeLabel[type]}
    </Badge>
  );
}
