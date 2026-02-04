import type { ReverseGeocodeResult } from "@/lib/geocoding/nominatim";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export type GovernmentContact = {
  email: string | null;
  webhookUrl: string | null;
  jurisdictionName: string | null;
};

export async function resolveGovernmentContact(
  geocode: ReverseGeocodeResult | null,
): Promise<GovernmentContact> {
  const fallback: GovernmentContact = {
    email: env.GOV_CONTACT_EMAIL ?? null,
    webhookUrl: null,
    jurisdictionName: null,
  };

  if (!geocode) return fallback;

  try {
    const candidates = [
      {
        countryCode: geocode.countryCode,
        admin1: geocode.admin1,
        admin2: geocode.admin2,
        admin3: geocode.admin3,
      },
      {
        countryCode: geocode.countryCode,
        admin1: geocode.admin1,
        admin2: geocode.admin2,
        admin3: null,
      },
      { countryCode: geocode.countryCode, admin1: geocode.admin1, admin2: null, admin3: null },
      { countryCode: geocode.countryCode, admin1: null, admin2: null, admin3: null },
    ].filter((where) => where.countryCode != null);

    for (const where of candidates) {
      const match = await prisma.jurisdiction.findFirst({
        where: {
          countryCode: where.countryCode,
          admin1: where.admin1,
          admin2: where.admin2,
          admin3: where.admin3,
        },
      });

      if (!match) continue;

      return {
        email: match.contactEmail ?? fallback.email,
        webhookUrl: match.contactWebhookUrl ?? fallback.webhookUrl,
        jurisdictionName: match.name,
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}

