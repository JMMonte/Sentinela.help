"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { LatLngExpression } from "leaflet";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Locate,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import { z } from "zod";

import { ReportsMap, type ReportMapItem, type OverlayConfig } from "@/components/maps/reports-map";
import { IncidentTypeBadge } from "@/components/reports/incident-type-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  incidentTypeIcon,
  incidentTypeLabel,
  incidentTypes,
  type IncidentType,
} from "@/lib/reports/incident-types";
import {
  type WeatherSnapshot,
  getWeatherIconUrl,
  msToKmh,
  windDegToDirection,
} from "@/lib/overlays/weather-api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportsResponse = { reports: ReportMapItem[] };

type Coordinates = { latitude: number; longitude: number };

type CreateReportResponse = {
  report: {
    id: string;
    createdAt: string;
    type: IncidentType;
    latitude: number;
    longitude: number;
    address: string | null;
    images: Array<{ url: string }>;
  };
  government?: {
    email: string | null;
    jurisdictionName: string | null;
  };
  notificationDraft: {
    to: string | null;
    subject: string;
    body: string;
    mailto: string | null;
  };
};

const reportFormSchema = z.object({
  type: z.enum(incidentTypes),
  description: z.string().trim().max(2000).optional(),
  reporterEmail: z.string().trim().email().optional().or(z.literal("")),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

type SidebarView = "reports" | "form" | "detail";

type TimeFilter = "4h" | "8h" | "24h" | "3d" | "7d";

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string; hours: number }[] = [
  { value: "4h", label: "4h", hours: 4 },
  { value: "8h", label: "8h", hours: 8 },
  { value: "24h", label: "24h", hours: 24 },
  { value: "3d", label: "3d", hours: 72 },
  { value: "7d", label: "7d", hours: 168 },
];

type ReportStatus = "NEW" | "NOTIFIED" | "CLOSED";
type ContributionType = "COMMENT" | "ESCALATE" | "DEESCALATE" | "SOLVED" | "REOPEN";

type ContributionData = {
  id: string;
  createdAt: string;
  type: ContributionType;
  contributorEmail: string | null;
  comment: string | null;
  images: Array<{ url: string }>;
  weatherSnapshot: WeatherSnapshot | null;
};

type ReportDetailData = {
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
  weatherSnapshot: WeatherSnapshot | null;
  contributions: ContributionData[];
};

type GetReportResponse = {
  report: ReportDetailData | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VOTE_STORAGE_KEY = "sentinela_votes";

type VoteRecord = {
  escalate?: boolean;
  deescalate?: boolean;
};

function getUserVotes(reportId: string): VoteRecord {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(VOTE_STORAGE_KEY);
    if (!stored) return {};
    const votes = JSON.parse(stored) as Record<string, VoteRecord>;
    return votes[reportId] || {};
  } catch {
    return {};
  }
}

function setUserVote(reportId: string, voteType: "escalate" | "deescalate") {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(VOTE_STORAGE_KEY);
    const votes: Record<string, VoteRecord> = stored ? JSON.parse(stored) : {};
    if (!votes[reportId]) votes[reportId] = {};
    votes[reportId][voteType] = true;
    localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // Ignore storage errors
  }
}

function useRelativeTimeFormatter() {
  const t = useTranslations("relativeTime");

  return function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("justNow");
    if (diffMins < 60) return t("minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };
}

function ScoreBadge({ score }: { score: number }) {
  const t = useTranslations("tooltips");

  if (score === 0) return null;

  const isPositive = score > 0;
  const Icon = isPositive ? ChevronUp : ChevronDown;
  const absScore = Math.abs(score);
  const tooltipText = isPositive
    ? t(absScore !== 1 ? "escalationsMorePlural" : "escalationsMore", { count: absScore })
    : t(absScore !== 1 ? "deescalationsMorePlural" : "deescalationsMore", { count: absScore });

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-help items-center text-xs font-semibold",
              isPositive ? "text-red-500" : "text-blue-500"
            )}
          >
            <Icon className="h-3.5 w-3.5 -mr-0.5" />
            {absScore}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ReportListItems({
  reports,
  isLoading,
  onHover,
  onSelect,
}: {
  reports: ReportMapItem[];
  isLoading: boolean;
  onHover?: (reportId: string | null) => void;
  onSelect?: (reportId: string) => void;
}) {
  const t = useTranslations();
  const formatRelativeTime = useRelativeTimeFormatter();

  if (isLoading) {
    return <p className="px-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  }
  if (reports.length === 0) {
    return (
      <p className="px-4 text-sm text-muted-foreground">
        {t("reports.noMatching")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {reports.slice(0, 50).map((report) => (
        <li key={report.id}>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            onMouseEnter={() => onHover?.(report.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onSelect?.(report.id)}
          >
            <div className="grid gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <IncidentTypeBadge type={report.type} />
                <ScoreBadge score={report.score} />
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(report.createdAt))}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{new Date(report.createdAt).toLocaleString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {report.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {report.description}
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const t = useTranslations("status");

  if (status === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <Check className="h-3 w-3" />
        {t("solved")}
      </span>
    );
  }
  if (status === "NOTIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        {t("escalated")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
      {t("active")}
    </span>
  );
}

function ContributionTypeBadge({ type }: { type: ContributionType }) {
  const t = useTranslations("status");

  if (type === "ESCALATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        {t("escalated")}
      </span>
    );
  }
  if (type === "DEESCALATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {t("deescalated")}
      </span>
    );
  }
  if (type === "SOLVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Check className="h-3 w-3" />
        {t("markedSolved")}
      </span>
    );
  }
  if (type === "REOPEN") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        {t("reopened")}
      </span>
    );
  }
  return null; // COMMENT type doesn't need a badge
}

function WeatherSnapshotRow({ snapshot }: { snapshot: WeatherSnapshot }) {
  const temp = Math.round(snapshot.temp);
  const feelsLike = Math.round(snapshot.feels_like);
  const wind = msToKmh(snapshot.wind_speed);
  const windDir = windDegToDirection(snapshot.wind_deg);
  const iconUrl = getWeatherIconUrl(snapshot.icon);
  const visibility = (snapshot.visibility / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconUrl} alt={snapshot.description} className="h-8 w-8 -ml-0.5" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold text-foreground text-sm leading-none">{temp}&deg;C</span>
          <span className="text-muted-foreground capitalize truncate">{snapshot.description}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Feels {feelsLike}&deg;</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span>{wind} km/h {windDir}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span>{snapshot.humidity}%</span>
          <span className="text-muted-foreground/40 hidden sm:inline">&middot;</span>
          <span className="hidden sm:inline">{visibility} km</span>
        </div>
      </div>
    </div>
  );
}

function ReportDetailContent({
  report,
  isLoading,
  error,
  onBack,
  onRefresh,
  onReportsRefresh,
  onGoTo,
}: {
  report: ReportDetailData | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onReportsRefresh: () => void;
  onGoTo?: () => void;
}) {
  const t = useTranslations();
  const [inputComment, setInputComment] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputFiles, setInputFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"ESCALATE" | "DEESCALATE" | "SOLVED" | "REOPEN" | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<VoteRecord>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Collect all images for lightbox navigation
  const allImages = useMemo(() => {
    if (!report) return [];
    const images = [...report.images];
    for (const contribution of report.contributions) {
      images.push(...contribution.images);
    }
    return images;
  }, [report]);

  // Load user's previous votes from localStorage
  useEffect(() => {
    if (report?.id) {
      setUserVotes(getUserVotes(report.id));
    }
  }, [report?.id]);

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

  const hasContent = inputComment.trim().length > 0 || inputFiles.length > 0;

  async function handleSubmit(actionType: ContributionType) {
    if (!report) return;

    // For COMMENT type, require content
    if (actionType === "COMMENT" && !hasContent) {
      toast.error(t("toast.addCommentFirst"));
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", actionType);
      formData.append("comment", inputComment);
      formData.append("contributorEmail", inputEmail);
      for (const file of inputFiles) {
        formData.append("images", file);
      }

      const response = await fetch(`/api/reports/${report.id}/contributions`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("toast.failedToSubmit"));
      }

      const toastKey =
        actionType === "ESCALATE" ? (hasContent ? "escalatedWithComment" : "escalated") :
        actionType === "DEESCALATE" ? (hasContent ? "deescalatedWithComment" : "deescalated") :
        actionType === "SOLVED" ? (hasContent ? "markedSolvedWithComment" : "markedSolved") :
        actionType === "REOPEN" ? (hasContent ? "reopenedWithComment" : "reopened") : "commentAdded";

      toast.success(t(`toast.${toastKey}`));

      // Save vote to localStorage
      if (actionType === "ESCALATE") {
        setUserVote(report.id, "escalate");
        setUserVotes((prev) => ({ ...prev, escalate: true }));
      } else if (actionType === "DEESCALATE") {
        setUserVote(report.id, "deescalate");
        setUserVotes((prev) => ({ ...prev, deescalate: true }));
      }

      setInputComment("");
      setInputEmail("");
      setInputFiles([]);
      setShowEmailInput(false);
      setSelectedAction(null);
      setIsUpdateDialogOpen(false);
      onRefresh();
      if (actionType !== "COMMENT") {
        onReportsRefresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toast.failedToSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.back")}
        </Button>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.back")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const isSolved = report.status === "CLOSED";
  const isEscalated = report.status === "NOTIFIED";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <IncidentTypeBadge type={report.type} />
          <StatusBadge status={report.status} />
          <ScoreBadge score={report.score} />
          {onGoTo && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onGoTo}>
              <MapPin className="mr-1 h-3 w-3" />
              {t("reportDetail.goTo")}
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content area - Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {/* Original report entry */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>{new Date(report.createdAt).toLocaleString()}</span>
              {report.reporterEmail && (
                <>
                  <span>•</span>
                  <span>{report.reporterEmail}</span>
                </>
              )}
            </div>
            {report.weatherSnapshot && (
              <WeatherSnapshotRow snapshot={report.weatherSnapshot} />
            )}
            {report.description && (
              <p className="whitespace-pre-wrap text-sm">{report.description}</p>
            )}
            {report.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {report.images.map((image, imageIndex) => (
                  <button
                    key={image.url}
                    type="button"
                    className="overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() => {
                      setLightboxIndex(imageIndex);
                      setLightboxOpen(true);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt=""
                      className="h-28 w-full object-cover transition-transform hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span>
                {report.address ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
              </span>
              {osmUrl && (
                <a
                  href={osmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  OSM ↗
                </a>
              )}
            </div>
          </div>

          {/* Contributions */}
          {report.contributions.map((contribution, contributionIndex) => {
            // Calculate base index for this contribution's images in allImages array
            const baseIndex = report.images.length +
              report.contributions.slice(0, contributionIndex).reduce((acc, c) => acc + c.images.length, 0);

            return (
              <div key={contribution.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{new Date(contribution.createdAt).toLocaleString()}</span>
                  {contribution.contributorEmail && (
                    <>
                      <span>•</span>
                      <span>{contribution.contributorEmail}</span>
                    </>
                  )}
                  <ContributionTypeBadge type={contribution.type} />
                </div>
                {contribution.weatherSnapshot && (
                  <WeatherSnapshotRow snapshot={contribution.weatherSnapshot} />
                )}
                {contribution.comment && (
                  <p className="whitespace-pre-wrap text-sm">{contribution.comment}</p>
                )}
                {contribution.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {contribution.images.map((image, imageIndex) => (
                      <button
                        key={image.url}
                        type="button"
                        className="overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={() => {
                          setLightboxIndex(baseIndex + imageIndex);
                          setLightboxOpen(true);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          className="h-28 w-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Update button - pinned at bottom */}
      <div className="shrink-0 border-t bg-background p-4">
        <Button
          className="w-full"
          size="lg"
          onClick={() => setIsUpdateDialogOpen(true)}
        >
          {t("reportDetail.addUpdate")}
        </Button>
      </div>

      {/* Update dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("reportDetail.updateDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("reportDetail.updateDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <Textarea
              placeholder={t("reportDetail.addComment")}
              value={inputComment}
              onChange={(e) => setInputComment(e.target.value)}
              className="min-h-20 resize-none"
              disabled={isSubmitting}
            />

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.currentTarget.files;
                    setInputFiles(list ? Array.from(list) : []);
                  }}
                  disabled={isSubmitting}
                />
                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted">
                  {inputFiles.length === 0 ? (
                    <span>{t("reportDetail.addImages")}</span>
                  ) : (
                    <span>{t("reportDetail.imagesCount", { count: inputFiles.length })}</span>
                  )}
                </div>
              </label>
              {inputFiles.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputFiles([])}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {showEmailInput ? (
              <Input
                type="email"
                placeholder={t("reportDetail.yourEmailOptional")}
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                disabled={isSubmitting}
              />
            ) : (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline text-left"
                onClick={() => setShowEmailInput(true)}
              >
                {t("reportDetail.addYourEmail")}
              </button>
            )}

            {/* Action toggles */}
            <TooltipProvider delayDuration={0}>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1",
                        selectedAction === "ESCALATE" && "ring-2 ring-red-500 ring-offset-1"
                      )}
                      disabled={isSubmitting || userVotes.escalate}
                      onClick={() =>
                        setSelectedAction((prev) =>
                          prev === "ESCALATE" ? null : "ESCALATE"
                        )
                      }
                    >
                      <ChevronUp className="mr-1 h-4 w-4 text-red-500" />
                      {t("reportDetail.escalate")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{userVotes.escalate ? t("reportDetail.alreadyVotedEscalate") : t("reportDetail.escalateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1",
                        selectedAction === "DEESCALATE" && "ring-2 ring-blue-500 ring-offset-1"
                      )}
                      disabled={isSubmitting || userVotes.deescalate}
                      onClick={() =>
                        setSelectedAction((prev) =>
                          prev === "DEESCALATE" ? null : "DEESCALATE"
                        )
                      }
                    >
                      <ChevronDown className="mr-1 h-4 w-4 text-blue-500" />
                      {t("reportDetail.deescalate")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{userVotes.deescalate ? t("reportDetail.alreadyVotedDeescalate") : t("reportDetail.deescalateTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
                {isSolved ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1",
                          selectedAction === "REOPEN" && "ring-2 ring-yellow-500 ring-offset-1"
                        )}
                        disabled={isSubmitting}
                        onClick={() =>
                          setSelectedAction((prev) =>
                            prev === "REOPEN" ? null : "REOPEN"
                          )
                        }
                      >
                        <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />
                        {t("reportDetail.reopen")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("reportDetail.reopenTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "flex-1",
                          selectedAction === "SOLVED" && "ring-2 ring-green-500 ring-offset-1"
                        )}
                        disabled={isSubmitting}
                        onClick={() =>
                          setSelectedAction((prev) =>
                            prev === "SOLVED" ? null : "SOLVED"
                          )
                        }
                      >
                        <Check className="mr-1 h-4 w-4 text-green-500" />
                        {t("reportDetail.markSolved")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("reportDetail.solvedTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateDialogOpen(false);
                setInputComment("");
                setInputEmail("");
                setInputFiles([]);
                setShowEmailInput(false);
                setSelectedAction(null);
              }}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={isSubmitting || (!hasContent && !selectedAction)}
              onClick={() => {
                // Determine what action to submit
                let actionType: ContributionType = "COMMENT";
                if (selectedAction === "ESCALATE") {
                  actionType = "ESCALATE";
                } else if (selectedAction === "DEESCALATE") {
                  actionType = "DEESCALATE";
                } else if (selectedAction === "SOLVED") {
                  actionType = "SOLVED";
                } else if (selectedAction === "REOPEN") {
                  actionType = "REOPEN";
                }
                handleSubmit(actionType);
              }}
            >
              {isSubmitting ? t("reportForm.submitting") : t("reportDetail.submitUpdate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <ImageLightbox
        images={allImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportsOverview({
  overlayConfig,
}: {
  overlayConfig?: OverlayConfig;
}) {
  const t = useTranslations();

  // ── Router / URL state ──
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Reports state ──
  const [reports, setReports] = useState<ReportMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("8h");

  // ── Map / location state ──
  const [center, setCenter] = useState<LatLngExpression | undefined>();
  const [userLocation, setUserLocation] = useState<
    [number, number] | undefined
  >();
  const [flyToLocation, setFlyToLocation] = useState<
    [number, number] | undefined
  >();

  // ── UI state ──
  const [view, setView] = useState<SidebarView>("reports");
  const [panelOpen, setPanelOpen] = useState(true);
  const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);
  const [activeSnap, setActiveSnap] = useState<"collapsed" | "expanded">("collapsed");

  // ── Mobile bottom sheet drag state ──
  const COLLAPSED_HEIGHT = 180;
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const getExpandedHeight = useCallback(() => {
    return window.innerHeight - 60;
  }, []);

  const handleDragStart = useCallback((clientY: number) => {
    if (!sheetRef.current) return;
    isDragging.current = true;
    dragStartY.current = clientY;
    dragStartHeight.current = sheetRef.current.offsetHeight;
    // Disable transition during drag for smooth movement
    sheetRef.current.style.transition = "none";
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = dragStartY.current - clientY;
    const newHeight = Math.max(
      COLLAPSED_HEIGHT,
      Math.min(getExpandedHeight(), dragStartHeight.current + delta)
    );
    sheetRef.current.style.height = `${newHeight}px`;
  }, [getExpandedHeight]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;

    const currentHeight = sheetRef.current.offsetHeight;
    const expandedHeight = getExpandedHeight();
    const midpoint = (COLLAPSED_HEIGHT + expandedHeight) / 2;

    // Re-enable transition for snap animation
    sheetRef.current.style.transition = "";
    sheetRef.current.style.height = "";

    // Snap to closest position
    if (currentHeight > midpoint) {
      setActiveSnap("expanded");
    } else {
      setActiveSnap("collapsed");
    }
  }, [getExpandedHeight]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for testing on desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY);

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // ── Detail view state ──
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);

  // ── Report form state ──
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { type: "FLOOD", description: "", reporterEmail: "" },
  });
  const [pinLocation, setPinLocation] = useState<Coordinates | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<CreateReportResponse | null>(null);

  const maxImages = 3;
  const selectedCountText = useMemo(() => {
    if (files.length === 0) return t("reportForm.noImagesSelected");
    if (files.length === 1) return t("reportForm.oneImageSelected");
    return t("reportForm.imagesSelected", { count: files.length });
  }, [files.length, t]);

  // ── Effects ──

  useEffect(() => {
    setHeaderPortal(document.getElementById("header-actions"));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setCenter(loc);
        setUserLocation(loc);
        setFlyToLocation(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  // Load report from URL on initial mount only (for shareable links)
  useEffect(() => {
    const reportId = searchParams.get("report");
    if (reportId) {
      setSelectedReportId(reportId);
      setView("detail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - after that, local state is source of truth

  // Fetch report detail when selected
  useEffect(() => {
    if (!selectedReportId) {
      setSelectedReport(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    async function fetchDetail() {
      try {
        const response = await fetch(`/api/reports/${selectedReportId}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Failed to load report (${response.status})`);
        const data = (await response.json()) as GetReportResponse;
        if (!cancelled) {
          setSelectedReport(data.report);
          setDetailLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : "Failed to load report");
          setDetailLoading(false);
        }
      }
    }

    void fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedReportId]);

  async function refreshSelectedReport() {
    if (!selectedReportId) return;
    try {
      const response = await fetch(`/api/reports/${selectedReportId}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Failed to load report (${response.status})`);
      const data = (await response.json()) as GetReportResponse;
      setSelectedReport(data.report);
    } catch {
      // Silent fail on refresh - user can see existing data
    }
  }

  const fetchReports = useMemo(() => {
    let version = 0;
    return async () => {
      const v = ++version;
      setIsLoading(true);
      try {
        const response = await fetch("/api/reports?limit=500", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error(`Failed to load reports (${response.status})`);
        const data = (await response.json()) as ReportsResponse;
        if (v === version) setReports(data.reports);
      } catch (e) {
        if (v === version)
          toast.error(
            e instanceof Error ? e.message : t("toast.failedToLoad"),
          );
      } finally {
        if (v === version) setIsLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  // ── Derived ──

  const timeFilterHours = useMemo(() => {
    const opt = TIME_FILTER_OPTIONS.find((o) => o.value === timeFilter);
    return opt ? opt.hours : 8;
  }, [timeFilter]);

  const filtered = useMemo(() => {
    // First apply time filter
    const cutoffMs = timeFilterHours * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - cutoffMs);

    let result = reports.filter(
      (r) => r.status !== "CLOSED" || new Date(r.createdAt) >= cutoffDate,
    );

    // Then apply text filter
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          incidentTypeLabel[r.type].toLowerCase().includes(q),
      );
    }

    return result;
  }, [query, reports, timeFilter]);

  // ── Handlers ──

  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setCenter(loc);
        setUserLocation(loc);
        setFlyToLocation(loc);
      },
      () =>
        toast.error(t("toast.locationPermissionDenied")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handleMapClick(lat: number, lng: number) {
    setPinLocation({ latitude: lat, longitude: lng });
    setView("form");
    setPanelOpen(true);
  }

  async function onSubmit(values: ReportFormValues) {
    // Use pinLocation if set, otherwise fall back to user's current location
    const location = pinLocation ?? (userLocation ? { latitude: userLocation[0], longitude: userLocation[1] } : null);

    if (!location) {
      toast.error(t("toast.locationRequired"));
      return;
    }
    if (files.length === 0) {
      toast.error(t("toast.attachImage"));
      return;
    }
    if (files.length > maxImages) {
      toast.error(t("toast.attachMaxImages", { max: maxImages }));
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("description", values.description ?? "");
      formData.append("reporterEmail", values.reporterEmail ?? "");
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      for (const file of files) formData.append("images", file);

      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? `Failed to submit report (${response.status})`,
        );
      }

      const data = (await response.json()) as CreateReportResponse;
      setSubmitResult(data);
      toast.success(t("toast.reportSubmitted"));

      // Reset form
      form.reset();
      setFiles([]);
      setPinLocation(null);
      setView("reports");
      void fetchReports();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("toast.failedToSubmit"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Sidebar content builders ──

  function handleSelectReport(reportId: string) {
    setSelectedReportId(reportId);
    setView("detail");
    // Update URL for shareable links
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", reportId);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function handleBackToList() {
    setSelectedReportId(null);
    setView("reports");
    // Remove report param from URL (use replace to avoid adding history entry)
    const params = new URLSearchParams(searchParams.toString());
    params.delete("report");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }

  const reportsContent = (
    <>
      <div className="px-4 pb-3 space-y-3">
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <TabsList className="w-full">
            {TIME_FILTER_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="flex-1">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder={isLoading ? t("common.loading") : t("reports.filterPlaceholder", { count: filtered.length })}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <ReportListItems
          reports={filtered}
          isLoading={isLoading}
          onHover={setHoveredReportId}
          onSelect={handleSelectReport}
        />
      </div>
    </>
  );

  const detailContent = (
    <ReportDetailContent
      report={selectedReport}
      isLoading={detailLoading}
      error={detailError}
      onBack={handleBackToList}
      onRefresh={refreshSelectedReport}
      onReportsRefresh={fetchReports}
      onGoTo={selectedReport ? () => setFlyToLocation([selectedReport.latitude, selectedReport.longitude]) : undefined}
    />
  );

  function cancelForm() {
    setPinLocation(null);
    form.reset();
    setFiles([]);
    setView("reports");
  }

  const formContent = (
    <div className="flex-1 overflow-y-auto px-4 pb-6">
      <div className="flex items-center justify-between pb-3">
        <p className="text-sm text-muted-foreground">{t("reportForm.title")}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={cancelForm}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-2 pb-4 text-sm">
        <p className="text-muted-foreground">
          {t("reportForm.tapMapInstruction")}
        </p>
        <div className="text-muted-foreground">
          {pinLocation
            ? t("reportForm.locationSelected", { lat: pinLocation.latitude.toFixed(6), lng: pinLocation.longitude.toFixed(6) })
            : t("reportForm.locationNotSelected")}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            if (!navigator.geolocation) {
              toast.error(t("toast.geolocationUnavailable"));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setPinLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              () =>
                toast.error(t("toast.locationPermissionDenied")),
              { enableHighAccuracy: true, timeout: 10_000 },
            );
          }}
        >
          {t("reportForm.useMyLocation")}
        </Button>
      </div>

      <Form {...form}>
        <form
          className="grid gap-4"
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportForm.incidentType")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("reportForm.selectIncidentType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {incidentTypes.map((type) => {
                      const Icon = incidentTypeIcon[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <Icon className="mr-2 inline-block size-4" />
                          {t(`incidentTypes.${type}`)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportForm.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("reportForm.descriptionPlaceholder")}
                    className="min-h-28"
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("reportForm.descriptionMax")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reporterEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reportForm.yourEmail")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("reportForm.emailPlaceholder")} {...field} />
                </FormControl>
                <FormDescription>
                  {t("reportForm.emailDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2">
            <div className="text-sm font-medium">{t("reportForm.images")}</div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const list = event.currentTarget.files;
                if (!list) return setFiles([]);
                setFiles(Array.from(list));
              }}
            />
            <div className="text-sm text-muted-foreground">
              {selectedCountText} {t("reportForm.imagesLimit", { max: maxImages })}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("reportForm.submitting") : t("reportForm.submitReport")}
          </Button>
        </form>
      </Form>
    </div>
  );

  // ── Render ──

  const draft = submitResult?.notificationDraft ?? null;

  return (
    <div className="flex h-dvh w-full">
      <div className="relative flex-1">
        <ReportsMap
          reports={filtered}
          center={center}
          flyTo={flyToLocation}
          userLocation={userLocation}
          pinLocation={
            pinLocation
              ? [pinLocation.latitude, pinLocation.longitude]
              : undefined
          }
          onMapClick={handleMapClick}
          onReportSelect={(reportId) => {
            handleSelectReport(reportId);
            setPanelOpen(true);
            setActiveSnap("expanded");
          }}
          className="h-full w-full rounded-none"
          overlayConfig={overlayConfig}
          timeFilterHours={timeFilterHours}
        />
      </div>

      {/* ── Portal actions into the topbar ── */}
      {headerPortal &&
        createPortal(
          <>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-7 sm:w-7"
                    style={{ order: 1 }}
                    onClick={requestLocation}
                    aria-label={t("tooltips.centerLocation")}
                  >
                    <Locate className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("tooltips.centerLocation")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden h-7 w-7 sm:inline-flex"
                    style={{ order: 4 }}
                    onClick={() => setPanelOpen((prev) => !prev)}
                    aria-label={panelOpen ? t("tooltips.closePanel") : t("tooltips.openPanel")}
                  >
                    {panelOpen ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{panelOpen ? t("tooltips.closePanel") : t("tooltips.openPanel")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              size="sm"
              className="hidden sm:inline-flex rounded-full h-7 px-3 text-xs"
              style={{ order: 3 }}
              onClick={() => {
                setView("form");
                setPanelOpen(true);
              }}
            >
              {t("reports.reportIncident")}
            </Button>
          </>,
          headerPortal,
        )}

      {/* ── Desktop side panel ── */}
      {panelOpen ? (
        <div className="hidden w-[380px] shrink-0 flex-col border-l bg-background pt-4 sm:flex">
          {view === "reports" && reportsContent}
          {view === "detail" && detailContent}
          {view === "form" && formContent}
        </div>
      ) : null}

      {/* ── Mobile bottom sheet ── */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border-t bg-background/95 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-[height] duration-300 ease-out sm:hidden",
          activeSnap === "expanded" ? "h-[calc(100dvh-60px)]" : "h-[180px]"
        )}
      >
        {/* Reports view header - entire header is draggable except the button */}
          {view === "reports" && (
            <>
              <div
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onClick={() => {
                  if (!isDragging.current) {
                    setActiveSnap(activeSnap === "collapsed" ? "expanded" : "collapsed");
                  }
                }}
              >
                {/* Drag handle indicator */}
                <div className="flex w-full items-center justify-center py-3">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/50" />
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-semibold">{t("reports.title")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {isLoading ? t("common.loading") : t("reports.nearby", { count: filtered.length })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full h-8 px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView("form");
                        setActiveSnap("expanded");
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {t("reports.reportIncident")}
                    </Button>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                      <TabsList className="w-full h-9">
                        {TIME_FILTER_OPTIONS.map((option) => (
                          <TabsTrigger key={option.value} value={option.value} className="flex-1 text-xs">
                            {option.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>
              <Separator />
              <div
                className={cn(
                  "flex-1 pb-[env(safe-area-inset-bottom)]",
                  activeSnap === "collapsed" ? "overflow-hidden" : "overflow-y-auto",
                )}
              >
                <ReportListItems
                  reports={filtered}
                  isLoading={isLoading}
                  onSelect={(id) => {
                    handleSelectReport(id);
                    setActiveSnap("expanded");
                  }}
                />
              </div>
            </>
          )}

          {/* Detail view */}
          {view === "detail" && (
            <>
              {/* Draggable header area */}
              <div
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onClick={() => {
                  if (!isDragging.current) {
                    setActiveSnap(activeSnap === "collapsed" ? "expanded" : "collapsed");
                  }
                }}
              >
                <div className="flex w-full items-center justify-center py-3">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/50" />
                </div>
              </div>
              <div
                className={cn(
                  "flex-1 flex flex-col pb-[env(safe-area-inset-bottom)]",
                  activeSnap === "collapsed" ? "overflow-hidden" : "overflow-y-auto",
                )}
              >
                <ReportDetailContent
                  report={selectedReport}
                  isLoading={detailLoading}
                  error={detailError}
                  onBack={handleBackToList}
                  onRefresh={refreshSelectedReport}
                  onReportsRefresh={fetchReports}
                  onGoTo={selectedReport ? () => {
                    setFlyToLocation([selectedReport.latitude, selectedReport.longitude]);
                    setActiveSnap("collapsed");
                  } : undefined}
                />
              </div>
            </>
          )}

          {/* Form view */}
          {view === "form" && (
            <>
              {/* Draggable header area */}
              <div
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onClick={() => {
                  if (!isDragging.current) {
                    setActiveSnap(activeSnap === "collapsed" ? "expanded" : "collapsed");
                  }
                }}
              >
                <div className="flex w-full items-center justify-center py-3">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/50" />
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{t("reports.newReport")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {pinLocation
                          ? `${pinLocation.latitude.toFixed(4)}, ${pinLocation.longitude.toFixed(4)}`
                          : t("reportForm.tapMapToPin")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelForm();
                        setActiveSnap("collapsed");
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
              <div
                className={cn(
                  "flex-1 pb-[env(safe-area-inset-bottom)]",
                  activeSnap === "collapsed" ? "overflow-hidden" : "overflow-y-auto",
                )}
              >
              <div className="px-4 py-4">
                <div className="grid gap-2 pb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error(t("toast.geolocationUnavailable"));
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setPinLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                          });
                        },
                        () =>
                          toast.error(t("toast.locationPermissionDenied")),
                        { enableHighAccuracy: true, timeout: 10_000 },
                      );
                    }}
                  >
                    <Locate className="mr-2 h-4 w-4" />
                    {t("reportForm.useMyLocation")}
                  </Button>
                </div>

                <Form {...form}>
                  <form
                    className="grid gap-4"
                    onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
                  >
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("reportForm.incidentType")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("reportForm.selectIncidentType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incidentTypes.map((type) => {
                                const Icon = incidentTypeIcon[type];
                                return (
                                  <SelectItem key={type} value={type}>
                                    <Icon className="mr-2 inline-block size-4" />
                                    {t(`incidentTypes.${type}`)}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("reportForm.description")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("reportForm.descriptionPlaceholderShort")}
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reporterEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("reportForm.yourEmail")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("reportForm.emailPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-2">
                      <div className="text-sm font-medium">{t("reportForm.images")}</div>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          const list = event.currentTarget.files;
                          if (!list) return setFiles([]);
                          setFiles(Array.from(list));
                        }}
                      />
                      <div className="text-sm text-muted-foreground">
                        {selectedCountText} {t("reportForm.imagesLimit", { max: maxImages })}
                      </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? t("reportForm.submitting") : t("reportForm.submitReport")}
                    </Button>
                  </form>
                </Form>
              </div>
              </div>
            </>
          )}
      </div>

      {/* ── Post-submission dialog ── */}
      <Dialog
        open={submitResult != null}
        onOpenChange={() => setSubmitResult(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("submitDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("submitDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {submitResult ? (
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-md border p-4 text-sm">
                <div className="flex items-center gap-2">
                  <IncidentTypeBadge type={submitResult.report.type} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(submitResult.report.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid gap-1 text-muted-foreground">
                  <div>
                    {submitResult.report.latitude.toFixed(6)},{" "}
                    {submitResult.report.longitude.toFixed(6)}
                  </div>
                  {submitResult.report.address && (
                    <div>{submitResult.report.address}</div>
                  )}
                </div>

                {submitResult.report.images.length > 0 && (
                  <div className="flex gap-2">
                    {submitResult.report.images.map((img, i) => (
                      <img
                        key={i}
                        src={img.url}
                        alt={`Report image ${i + 1}`}
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("submitDialog.to")}{" "}
                  {draft?.to ? (
                    <span className="text-foreground">{draft.to}</span>
                  ) : (
                    <span className="italic">{t("submitDialog.notConfigured")}</span>
                  )}
                </span>
                <Link
                  href={`/reports/${submitResult.report.id}`}
                  className="text-xs underline"
                >
                  {t("reports.viewReport")}
                </Link>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!draft) return;
                await navigator.clipboard.writeText(
                  `${draft.subject}\n\n${draft.body}`,
                );
                toast.success(t("toast.copiedToClipboard"));
              }}
            >
              {t("submitDialog.copyMessage")}
            </Button>

            <Button
              type="button"
              disabled={!draft?.mailto}
              asChild={!!draft?.mailto}
              title={
                !draft?.mailto
                  ? t("submitDialog.sendEmailDisabled")
                  : undefined
              }
            >
              {draft?.mailto ? (
                <a href={draft.mailto}>{t("submitDialog.sendEmail")}</a>
              ) : (
                <span>{t("submitDialog.sendEmail")}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
