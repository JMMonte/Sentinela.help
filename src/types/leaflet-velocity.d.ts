import * as L from "leaflet";

declare module "leaflet" {
  interface VelocityDisplayOptions {
    velocityType?: string;
    position?: "topleft" | "topright" | "bottomleft" | "bottomright";
    emptyString?: string;
    angleConvention?: string;
    speedUnit?: "kt" | "k/h" | "mph" | "m/s";
    showCardinal?: boolean;
    directionString?: string;
    speedString?: string;
  }

  interface VelocityLayerOptions {
    displayValues?: boolean;
    displayOptions?: VelocityDisplayOptions;
    data?: unknown;
    minVelocity?: number;
    maxVelocity?: number;
    velocityScale?: number;
    colorScale?: string[];
    opacity?: number;
    particleAge?: number;
    particleMultiplier?: number;
    particleLineWidth?: number;
    frameRate?: number;
    paneName?: string;
    onAdd?: () => void;
    onRemove?: () => void;
  }

  interface VelocityLayer extends Layer {
    setData(data: unknown): void;
    setOptions(options: Partial<VelocityLayerOptions>): void;
  }

  function velocityLayer(options: VelocityLayerOptions): VelocityLayer;
}
