"use client";

import { useState } from "react";

export type TerminatorOverlayConfig = {
  enabled: boolean;
};

export type TerminatorOverlayState = {
  isAvailable: boolean;
  enabled: boolean;
  animate: boolean;
  setEnabled: (enabled: boolean) => void;
  setAnimate: (animate: boolean) => void;
};

/**
 * Hook for managing the day/night terminator overlay.
 * This overlay shows the boundary between day and night on Earth.
 */
export function useTerminatorOverlay(config: TerminatorOverlayConfig): TerminatorOverlayState {
  const [enabled, setEnabled] = useState(false);
  const [animate, setAnimate] = useState(false);

  return {
    isAvailable: config.enabled,
    enabled: enabled && config.enabled,
    animate,
    setEnabled,
    setAnimate,
  };
}
