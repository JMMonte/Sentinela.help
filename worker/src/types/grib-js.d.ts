declare module "grib-js" {
  interface GribField {
    name?: string;
    parameterNumber?: number;
    typeOfFirstFixedSurface?: number;
    level?: number;
    forecastTime?: number;
    data?: number[];
    Ni?: number;
    Nj?: number;
    lo1?: number;
    lo2?: number;
    la1?: number;
    la2?: number;
    Di?: number;
    Dj?: number;
    grid?: {
      definition?: {
        Ni?: number;
        Nj?: number;
        lo1?: number;
        la1?: number;
        Di?: number;
        Dj?: number;
      };
    };
    product?: {
      details?: {
        category?: { value?: number };
        parameter?: { value?: number };
      };
    };
  }

  interface GribMessage {
    fields: GribField[];
  }

  function readData(
    buffer: Buffer | Uint8Array,
    callback: (err: Error | null, messages: GribMessage[]) => void
  ): void;

  export { readData, GribField, GribMessage };
}
