import type { Metadata } from "next";

import { getOverlayConfig } from "@/lib/maps/overlay-config";
import { ReportDetails } from "@/components/reports/report-details";

export const metadata: Metadata = {
  title: "Report",
};

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const overlayConfig = getOverlayConfig();
  return <ReportDetails reportId={id} overlayConfig={overlayConfig} />;
}

