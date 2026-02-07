"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchGdacsEvents,
  type GdacsEvent,
  type GdacsEventType,
} from "@/lib/overlays/gdacs-api";

export type GdacsOverlayConfig = {
  enabled: boolean;
};

export type GdacsOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  events: GdacsEvent[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  // Filter by event type
  eventTypeFilter: Set<GdacsEventType>;
  setEventTypeFilter: (types: Set<GdacsEventType>) => void;
  setEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
};

const ALL_EVENT_TYPES: GdacsEventType[] = ["EQ", "FL", "TC", "VO", "WF", "DR"];

export function useGdacsOverlay(config: GdacsOverlayConfig): GdacsOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<GdacsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<Set<GdacsEventType>>(
    new Set(ALL_EVENT_TYPES)
  );

  const isAvailable = config.enabled;

  const refresh = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchGdacsEvents();
      setEvents(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch GDACS data");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Fetch when enabled
  useEffect(() => {
    if (!enabled || !isAvailable) return;
    void refresh();
  }, [enabled, isAvailable, refresh]);

  // Filter events by type
  const filteredEvents = events.filter((e) => eventTypeFilter.has(e.eventType));

  return {
    isAvailable,
    enabled: enabled && isAvailable,
    events: filteredEvents,
    isLoading,
    error,
    lastUpdated,
    eventTypeFilter,
    setEventTypeFilter,
    setEnabled,
    refresh,
  };
}
