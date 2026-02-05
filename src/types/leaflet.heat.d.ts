import * as L from "leaflet";

declare module "leaflet" {
  interface HeatLayerOptions {
    /** Radius of each point of the heatmap (default 25). */
    radius?: number;
    /** Amount of blur (default 15). */
    blur?: number;
    /** Max point intensity (default 1.0). */
    max?: number;
    /** Max zoom level for intensity scaling. */
    maxZoom?: number;
    /** Minimum opacity for a point (default 0.05). */
    minOpacity?: number;
    /** Color gradient – keys are stops from 0 to 1. */
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number, number?]>): this;
    addLatLng(latlng: [number, number, number?]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions,
  ): HeatLayer;
}
