import { env } from "@/lib/env";
import { incidentTypeLabel, type IncidentType } from "@/lib/reports/incident-types";

export type NotificationDraft = {
  to: string | null;
  subject: string;
  body: string;
  mailto: string | null;
};

export function composeNotificationDraft(report: {
  id: string;
  createdAt: Date | string;
  type: IncidentType;
  latitude: number;
  longitude: number;
  address: string | null;
  description: string | null;
  reporterEmail: string | null;
  images: Array<{ url: string }>;
}, options?: { to?: string | null }): NotificationDraft {
  const to = options?.to ?? env.GOV_CONTACT_EMAIL ?? null;

  const createdAtIso =
    typeof report.createdAt === "string"
      ? report.createdAt
      : report.createdAt.toISOString();

  const osmUrl = new URL("https://www.openstreetmap.org/");
  osmUrl.search = new URLSearchParams({
    mlat: String(report.latitude),
    mlon: String(report.longitude),
  }).toString();
  osmUrl.hash = `map=18/${report.latitude}/${report.longitude}`;

  const reportUrl =
    env.APP_BASE_URL != null
      ? new URL(`/reports/${report.id}`, env.APP_BASE_URL).toString()
      : null;

  const subject = `[Sentinela] ${incidentTypeLabel[report.type]} report`;

  const lines: string[] = [
    `Incident: ${incidentTypeLabel[report.type]}`,
    `Time (UTC): ${createdAtIso}`,
    `Coordinates: ${report.latitude}, ${report.longitude}`,
    `OpenStreetMap: ${osmUrl.toString()}`,
  ];

  if (report.address) lines.push(`Address: ${report.address}`);
  if (reportUrl) lines.push(`Report: ${reportUrl}`);
  if (report.reporterEmail) lines.push(`Reporter email: ${report.reporterEmail}`);

  lines.push("");

  if (report.description) {
    lines.push("Description:");
    lines.push(report.description);
    lines.push("");
  }

  if (report.images.length > 0) {
    lines.push("Images:");
    for (const image of report.images) lines.push(`- ${image.url}`);
    lines.push("");
  }

  const body = lines.join("\n");

  const mailto =
    to != null
      ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(body)}`
      : null;

  return { to, subject, body, mailto };
}
