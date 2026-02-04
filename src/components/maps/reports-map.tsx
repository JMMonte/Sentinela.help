"use client";

import dynamic from "next/dynamic";

import type { ReportsMapProps } from "./reports-map-client";

export type { ReportMapItem, OverlayConfig } from "./reports-map-client";

export const ReportsMap = dynamic<ReportsMapProps>(
  () => import("./reports-map-client").then((m) => m.ReportsMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[420px] w-full animate-pulse bg-muted" />
    ),
  },
);
