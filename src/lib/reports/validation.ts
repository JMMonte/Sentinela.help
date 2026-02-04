import { z } from "zod";

import { incidentTypes } from "./incident-types";

export const createReportFieldsSchema = z.object({
  type: z.enum(incidentTypes),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
  reporterEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("")),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});

export type CreateReportFields = z.infer<typeof createReportFieldsSchema>;

export const contributionTypes = [
  "COMMENT",
  "ESCALATE",
  "DEESCALATE",
  "SOLVED",
  "REOPEN",
] as const;

export type ContributionType = (typeof contributionTypes)[number];

export const createContributionFieldsSchema = z.object({
  type: z.enum(contributionTypes).optional().default("COMMENT"),
  comment: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
  contributorEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("")),
});

export type CreateContributionFields = z.infer<typeof createContributionFieldsSchema>;
