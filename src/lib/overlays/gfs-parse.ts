/**
 * Server-only GFS GRIB parsing utilities.
 *
 * This file should only be imported in API routes, NOT client components.
 * Uses grib-js which requires Node.js fs module.
 */

import "server-only";
import { readData, type GribMessage } from "grib-js";
import type { GfsGridData, GfsGridHeader } from "./gfs-utils";

// ============================================================================
// GRIB Parsing
// ============================================================================

/**
 * Parse GRIB2 buffer using grib-js callback API.
 */
export function parseGribData(buffer: Buffer): Promise<GribMessage[]> {
  return new Promise((resolve, reject) => {
    readData(buffer, (err, messages) => {
      if (err) reject(err);
      else resolve(messages);
    });
  });
}

/**
 * Extract a specific variable field from GRIB messages.
 *
 * @param messages - Parsed GRIB messages
 * @param category - Parameter category (e.g., 0 for Temperature)
 * @param parameter - Parameter number within category
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractGfsField(
  messages: GribMessage[],
  category: number,
  parameter: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any | null {
  const allFields = messages.flatMap((m) => m.fields);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCategory = (f: any) => f?.product?.details?.category?.value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getParameter = (f: any) => f?.product?.details?.parameter?.value;

  return (
    allFields.find(
      (f) => getCategory(f) === category && getParameter(f) === parameter,
    ) || null
  );
}

/**
 * Build standardized grid data from a GRIB field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGridData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any,
  name: string,
  unit: string,
  transform?: (value: number) => number,
): GfsGridData {
  const gridDef = field.grid?.definition || field.grid;

  const header: GfsGridHeader = {
    nx: gridDef.ni,
    ny: gridDef.nj,
    lo1: gridDef.lo1,
    la1: gridDef.la1,
    dx: gridDef.di,
    dy: gridDef.dj,
  };

  // Apply optional transformation (e.g., Kelvin to Celsius)
  const data = transform
    ? field.data.map((v: number) => transform(v))
    : field.data;

  return { header, data, unit, name };
}
