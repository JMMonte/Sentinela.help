"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { LatLngExpression } from "leaflet";
import { toast } from "sonner";
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
  contributions: ContributionData[];
};

type GetReportResponse = {
  report: ReportDetailData | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;

  const isPositive = score > 0;
  const Icon = isPositive ? ChevronUp : ChevronDown;
  const absScore = Math.abs(score);
  const tooltipText = isPositive
    ? `${absScore} more escalation${absScore !== 1 ? "s" : ""} than de-escalations`
    : `${absScore} more de-escalation${absScore !== 1 ? "s" : ""} than escalations`;

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
  if (isLoading) {
    return <p className="px-4 text-sm text-muted-foreground">Loading…</p>;
  }
  if (reports.length === 0) {
    return (
      <p className="px-4 text-sm text-muted-foreground">
        No matching reports.
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
  if (status === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <Check className="h-3 w-3" />
        Solved
      </span>
    );
  }
  if (status === "NOTIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Escalated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
      Active
    </span>
  );
}

function ContributionTypeBadge({ type }: { type: ContributionType }) {
  if (type === "ESCALATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Escalated
      </span>
    );
  }
  if (type === "DEESCALATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        De-escalated
      </span>
    );
  }
  if (type === "SOLVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Check className="h-3 w-3" />
        Marked Solved
      </span>
    );
  }
  if (type === "REOPEN") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Reopened
      </span>
    );
  }
  return null; // COMMENT type doesn't need a badge
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
  const [inputComment, setInputComment] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputFiles, setInputFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"ESCALATE" | "SOLVED" | "REOPEN" | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

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
      toast.error("Add a comment or image first.");
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
        throw new Error(data.error || "Failed to submit");
      }

      const actionLabel =
        actionType === "ESCALATE" ? "Escalated" :
        actionType === "DEESCALATE" ? "De-escalated" :
        actionType === "SOLVED" ? "Marked as solved" :
        actionType === "REOPEN" ? "Reopened" : "Comment added";

      toast.success(actionLabel + (hasContent && actionType !== "COMMENT" ? " with comment" : ""));
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
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
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
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Loading…</p>
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
          Back
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <IncidentTypeBadge type={report.type} />
          <StatusBadge status={report.status} />
          <ScoreBadge score={report.score} />
          {onGoTo && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onGoTo}>
              <MapPin className="mr-1 h-3 w-3" />
              Go to
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
            {report.description && (
              <p className="whitespace-pre-wrap text-sm">{report.description}</p>
            )}
            {report.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {report.images.map((image) => (
                  <a
                    key={image.url}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt=""
                      className="h-28 w-full object-cover"
                      loading="lazy"
                    />
                  </a>
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
          {report.contributions.map((contribution) => (
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
              {contribution.comment && (
                <p className="whitespace-pre-wrap text-sm">{contribution.comment}</p>
              )}
              {contribution.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {contribution.images.map((image) => (
                    <a
                      key={image.url}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt=""
                        className="h-28 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Update button - pinned at bottom */}
      <div className="shrink-0 border-t bg-background p-4">
        <Button
          className="w-full"
          size="lg"
          onClick={() => setIsUpdateDialogOpen(true)}
        >
          Add Update
        </Button>
      </div>

      {/* Update dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Update</DialogTitle>
            <DialogDescription>
              Add a comment, change status, or attach images to this report.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <Textarea
              placeholder="Add a comment... (optional for actions)"
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
                    <span>+ Add images</span>
                  ) : (
                    <span>{inputFiles.length} image(s)</span>
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
                placeholder="Your email (optional)"
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
                + Add your email
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
                        selectedAction === "ESCALATE" && (isEscalated
                          ? "ring-2 ring-blue-500 ring-offset-1"
                          : "ring-2 ring-red-500 ring-offset-1")
                      )}
                      disabled={isSubmitting}
                      onClick={() =>
                        setSelectedAction((prev) =>
                          prev === "ESCALATE" ? null : "ESCALATE"
                        )
                      }
                    >
                      {isEscalated ? (
                        <ChevronDown className="mr-1 h-4 w-4 text-blue-500" />
                      ) : (
                        <ChevronUp className="mr-1 h-4 w-4 text-red-500" />
                      )}
                      {isEscalated ? "De-escalate" : "Escalate"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isEscalated ? "Mark as less urgent" : "Mark as more urgent"}</p>
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
                        Reopen
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Report is not actually solved</p>
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
                        Solved
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark incident as resolved</p>
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
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || (!hasContent && !selectedAction)}
              onClick={() => {
                // Determine what action to submit
                let actionType: ContributionType = "COMMENT";
                if (selectedAction === "ESCALATE") {
                  actionType = isEscalated ? "DEESCALATE" : "ESCALATE";
                } else if (selectedAction === "SOLVED") {
                  actionType = "SOLVED";
                } else if (selectedAction === "REOPEN") {
                  actionType = "REOPEN";
                }
                handleSubmit(actionType);
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    if (files.length === 0) return "No images selected";
    if (files.length === 1) return "1 image selected";
    return `${files.length} images selected`;
  }, [files.length]);

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
            e instanceof Error ? e.message : "Failed to load reports",
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

  const filtered = useMemo(() => {
    // First apply time filter
    const filterOption = TIME_FILTER_OPTIONS.find((o) => o.value === timeFilter);
    const cutoffMs = filterOption ? filterOption.hours * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - cutoffMs);

    let result = reports.filter((r) => new Date(r.createdAt) >= cutoffDate);

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
        toast.error(
          "Unable to read your location. Check browser permissions.",
        ),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handleMapClick(lat: number, lng: number) {
    setPinLocation({ latitude: lat, longitude: lng });
    setView("form");
    setPanelOpen(true);
  }

  async function onSubmit(values: ReportFormValues) {
    if (!pinLocation) {
      toast.error("Tap the map to drop a pin first.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please attach at least one image.");
      return;
    }
    if (files.length > maxImages) {
      toast.error(`Please attach up to ${maxImages} images.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("description", values.description ?? "");
      formData.append("reporterEmail", values.reporterEmail ?? "");
      formData.append("latitude", String(pinLocation.latitude));
      formData.append("longitude", String(pinLocation.longitude));
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
      toast.success("Report submitted.");

      // Reset form
      form.reset();
      setFiles([]);
      setPinLocation(null);
      setView("reports");
      void fetchReports();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to submit report",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Sidebar content builders ──

  function handleSelectReport(reportId: string) {
    setSelectedReportId(reportId);
    setView("detail");
  }

  function handleBackToList() {
    setSelectedReportId(null);
    setView("reports");
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
          placeholder={isLoading ? "Loading…" : `Filter ${filtered.length} reports…`}
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
        <p className="text-sm text-muted-foreground">New report</p>
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
          Tap the map to pin a location, then fill in details.
        </p>
        <div className="text-muted-foreground">
          {pinLocation
            ? `Location: ${pinLocation.latitude.toFixed(6)}, ${pinLocation.longitude.toFixed(6)}`
            : "Location: not selected yet"}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            if (!navigator.geolocation) {
              toast.error("Geolocation is not available in this browser.");
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
                toast.error(
                  "Unable to read your location. Check browser permissions.",
                ),
              { enableHighAccuracy: true, timeout: 10_000 },
            );
          }}
        >
          Use my location
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
                <FormLabel>Incident type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an incident type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {incidentTypes.map((type) => {
                      const Icon = incidentTypeIcon[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <Icon className="mr-2 inline-block size-4" />
                          {incidentTypeLabel[type]}
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What is happening? Any immediate hazards?"
                    className="min-h-28"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Max 2000 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reporterEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your email (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  If provided, local government can contact you for details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2">
            <div className="text-sm font-medium">Images</div>
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
              {selectedCountText} (up to {maxImages})
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit report"}
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
          className="h-full w-full rounded-none"
          overlayConfig={overlayConfig}
        />
      </div>

      {/* ── Portal actions into the topbar ── */}
      {headerPortal &&
        createPortal(
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={requestLocation}
              title="Center on my location"
            >
              <Locate className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-7 w-7 sm:inline-flex"
              onClick={() => setPanelOpen((prev) => !prev)}
            >
              {panelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full h-7 px-3 text-xs"
              onClick={() => {
                setView("form");
                setPanelOpen(true);
              }}
            >
              Report incident
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
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border-t bg-background/95 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-[height] duration-300 ease-out sm:hidden",
          activeSnap === "expanded" ? "h-[calc(100dvh-60px)]" : "h-[180px]"
        )}
      >
        {/* Handle */}
        <button
          type="button"
          className="flex w-full shrink-0 items-center justify-center py-3"
          onClick={() => setActiveSnap(activeSnap === "collapsed" ? "expanded" : "collapsed")}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/50" />
        </button>

        {/* Reports view header */}
          {view === "reports" && (
            <>
              <div className="px-4 pt-1 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Reports</h2>
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? "Loading…" : `${filtered.length} nearby`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-3 text-xs"
                    onClick={() => {
                      setView("form");
                      setActiveSnap("expanded");
                    }}
                  >
                    Report
                  </Button>
                </div>
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
          )}

          {/* Form view */}
          {view === "form" && (
            <div
              className={cn(
                "flex-1 pb-[env(safe-area-inset-bottom)]",
                activeSnap === "collapsed" ? "overflow-hidden" : "overflow-y-auto",
              )}
            >
              <div className="px-4 pt-1 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">New Report</h2>
                    <p className="text-sm text-muted-foreground">
                      {pinLocation
                        ? `${pinLocation.latitude.toFixed(4)}, ${pinLocation.longitude.toFixed(4)}`
                        : "Tap the map to pin location"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      cancelForm();
                      setActiveSnap("collapsed");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="px-4 py-4">
                <div className="grid gap-2 pb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("Geolocation is not available in this browser.");
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
                          toast.error(
                            "Unable to read your location. Check browser permissions.",
                          ),
                        { enableHighAccuracy: true, timeout: 10_000 },
                      );
                    }}
                  >
                    <Locate className="mr-2 h-4 w-4" />
                    Use my location
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
                          <FormLabel>Incident type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an incident type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incidentTypes.map((type) => {
                                const Icon = incidentTypeIcon[type];
                                return (
                                  <SelectItem key={type} value={type}>
                                    <Icon className="mr-2 inline-block size-4" />
                                    {incidentTypeLabel[type]}
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What is happening?"
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
                          <FormLabel>Your email (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-2">
                      <div className="text-sm font-medium">Images</div>
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
                        {selectedCountText} (up to {maxImages})
                      </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting…" : "Submit report"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          )}
      </div>

      {/* ── Post-submission dialog ── */}
      <Dialog
        open={submitResult != null}
        onOpenChange={() => setSubmitResult(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report submitted</DialogTitle>
            <DialogDescription>
              Notify your local government using the actions below.
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
                  To:{" "}
                  {draft?.to ? (
                    <span className="text-foreground">{draft.to}</span>
                  ) : (
                    <span className="italic">not configured</span>
                  )}
                </span>
                <Link
                  href={`/reports/${submitResult.report.id}`}
                  className="text-xs underline"
                >
                  View report
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
                toast.success("Copied to clipboard.");
              }}
            >
              Copy message
            </Button>

            <Button
              type="button"
              disabled={!draft?.mailto}
              asChild={!!draft?.mailto}
              title={
                !draft?.mailto
                  ? "Set GOV_CONTACT_EMAIL to enable mailto."
                  : undefined
              }
            >
              {draft?.mailto ? (
                <a href={draft.mailto}>Send email</a>
              ) : (
                <span>Send email</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
