declare module "grib-js" {
  export interface GribGridDefinition {
    ni: number;
    nj: number;
    lo1: number;
    la1: number;
    lo2: number;
    la2: number;
    di: number;
    dj: number;
    scanningMode: number;
    basicAngle: number;
    name: string;
    earthShape: { name: string; value: number };
    sphericalRadius: number;
    majorAxis: number;
    minorAxis: number;
    resolutionAndComponentFlags: number;
  }

  export interface GribGrid {
    source: number;
    dataPointCount: number;
    pointCountOctets: number;
    pointCountInterpretation: number;
    templateNumber: number;
    definition: GribGridDefinition;
  }

  export interface GribProduct {
    discipline: number;
    parameterCategory: number;
    parameterNumber: number;
    typeOfGeneratingProcess: number;
    forecastTime: number;
    firstFixedSurfaceType: number;
    firstFixedSurfaceValue: number;
  }

  export interface GribField {
    indicator: {
      discipline: number;
      totalLength: number;
    };
    grid: GribGrid;
    product: GribProduct;
    representation: unknown;
    bitMap: unknown;
    data: number[];
  }

  export interface GribMessage {
    fields: GribField[];
  }

  export function readData(
    buffer: Buffer,
    callback: (err: Error | null, messages: GribMessage[]) => void
  ): void;
}
