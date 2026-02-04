"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ReportsMap, type ReportMapItem, type OverlayConfig } from "@/components/maps/reports-map";
import { IncidentTypeBadge } from "@/components/reports/incident-type-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncidentType } from "@/lib/reports/incident-types";

type ReportStatus = "NEW" | "NOTIFIED" | "CLOSED";

type ReportDetails = {
  id: string;
  createdAt: string;
  type: IncidentType;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  description: string | null;
  reporterEmail: string | null;
  images: Array<{ url: string }>;
  score: number;
};

type GetReportResponse = {
  report: ReportDetails | null;
};

export function ReportDetails({
  reportId,
  overlayConfig,
}: {
  reportId: string;
  overlayConfig?: OverlayConfig;
}) {
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Failed to load report (${response.status})`);
        const data = (await response.json()) as GetReportResponse;
        if (!cancelled) setReport(data.report);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load report");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const mapItem = useMemo<ReportMapItem[]>(
    () =>
      report
        ? [
            {
              id: report.id,
              type: report.type,
              status: report.status,
              latitude: report.latitude,
              longitude: report.longitude,
              createdAt: report.createdAt,
              description: report.description,
              imageUrl: report.images[0]?.url ?? null,
              score: report.score,
            },
          ]
        : [],
    [report],
  );

  const osmUrl = useMemo(() => {
    if (!report) return null;
    const url = new URL("https://www.openstreetmap.org/");
    url.search = new URLSearchParams({
      mlat: String(report.latitude),
      mlon: String(report.longitude),
    }).toString();
    url.hash = `map=18/${report.latitude}/${report.longitude}`;
    return url.toString();
  }, [report]);

  if (error) {
    return (
      <div className="relative flex h-dvh w-full items-center justify-center bg-muted">
        <div className="rounded-xl border bg-background/90 p-6 shadow-lg backdrop-blur-md">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="relative flex h-dvh w-full items-center justify-center bg-muted">
        <div className="rounded-xl border bg-background/90 p-6 shadow-lg backdrop-blur-md">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full">
      <ReportsMap
        reports={mapItem}
        center={[report.latitude, report.longitude]}
        zoom={16}
        className="h-full w-full rounded-none"
        overlayConfig={overlayConfig}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:p-6 sm:pl-0 sm:pt-16">
        <Card className="pointer-events-auto flex w-full flex-col overflow-hidden bg-background/95 shadow-lg backdrop-blur-md supports-backdrop-filter:bg-background/80 sm:h-full sm:w-[420px]">
          <CardHeader className="shrink-0 flex flex-col gap-2 pb-3">
            <div className="flex items-center gap-2">
              <IncidentTypeBadge type={report.type} />
              <span className="font-mono text-sm text-muted-foreground">{report.id}</span>
            </div>
            <CardTitle className="text-xs text-muted-foreground">
              {new Date(report.createdAt).toLocaleString()}
            </CardTitle>
            <div className="flex items-center gap-2">
              {osmUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={osmUrl} target="_blank" rel="noreferrer">
                    Open in OSM
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm">
                <Link href="/report">New report</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto pb-6 max-h-[60dvh] sm:max-h-none">
            <div className="grid gap-4">
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Coordinates:</span>{" "}
                  {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                </div>
                {report.address ? (
                  <div>
                    <span className="text-muted-foreground">Address:</span> {report.address}
                  </div>
                ) : null}
                {report.reporterEmail ? (
                  <div>
                    <span className="text-muted-foreground">Reporter email:</span>{" "}
                    {report.reporterEmail}
                  </div>
                ) : null}
              </div>

              {report.description ? (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Description</div>
                  <div className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">
                    {report.description}
                  </div>
                </div>
              ) : null}

              {report.images.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Images</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {report.images.map((image) => (
                      <a
                        key={image.url}
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-md border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          className="h-56 w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
