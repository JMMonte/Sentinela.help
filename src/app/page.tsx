import { Suspense } from "react";
import { getOverlayConfig } from "@/lib/maps/overlay-config";
import { ReportsOverview } from "@/components/reports/reports-overview";

export default function Home() {
  const overlayConfig = getOverlayConfig();
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
      <ReportsOverview overlayConfig={overlayConfig} />
    </Suspense>
  );
}
