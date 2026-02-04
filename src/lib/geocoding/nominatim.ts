import { env } from "@/lib/env";

type NominatimReverseResponse = {
  display_name?: string;
  address?: {
    country_code?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    postcode?: string;
  };
};

export type ReverseGeocodeResult = {
  displayName: string | null;
  countryCode: string | null;
  admin1: string | null;
  admin2: string | null;
  admin3: string | null;
};

export async function reverseGeocode({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): Promise<ReverseGeocodeResult | null> {
  if (!env.ENABLE_NOMINATIM) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
  }).toString();

  const userAgent = env.NOMINATIM_USER_AGENT ?? "Kaos/0.1";

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimReverseResponse;
  const address = data.address ?? {};

  return {
    displayName: data.display_name ?? null,
    countryCode: address.country_code?.toUpperCase?.() ?? null,
    admin1: address.state ?? null,
    admin2: address.county ?? null,
    admin3:
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      null,
  };
}

