import { getOverlayConfig } from "@/lib/maps/overlay-config";
import { ReportsOverview } from "@/components/reports/reports-overview";

export default function Home() {
  const overlayConfig = getOverlayConfig();
  return <ReportsOverview overlayConfig={overlayConfig} />;
}
