# Architecture

## Goals

- Make reporting fast on mobile: pin location, attach images, submit.
- Keep server responsibilities small and swappable: storage and notifications via adapters.
- Use OpenStreetMap for map context and optional reverse-geocoding.

## High-level design

### UI (Next.js + shadcn/ui)

- Routes:
  - `/` Home + recent reports map (`src/app/page.tsx`)
  - `/report` Create report flow (`src/app/report/page.tsx`)
  - `/reports` Browse reports (`src/app/reports/page.tsx`)
  - `/reports/[id]` Report details (`src/app/reports/[id]/page.tsx`)
- Map rendering:
  - Leaflet + OSM tiles in client-only components (`src/components/maps/*`)

### API (Next.js route handlers)

- `GET /api/reports` list recent reports for the map
- `POST /api/reports` multipart form upload + report creation
- `GET /api/reports/[id]` report details

### Domain

- Incident types live in `src/lib/reports/incident-types.ts` (shared across UI + API).
- Input validation is done with Zod in `src/lib/reports/validation.ts`.
- Government notification draft is composed in `src/lib/government/notification-draft.ts` and returned to the UI, which prompts the user to send/copy it.

### Data (Prisma + Postgres)

Prisma schema: `prisma/schema.prisma`

- `Report`: type, coordinates, optional description/address, optional reporter email
- `ReportImage`: uploaded image metadata (URL, mime, bytes)
- `Jurisdiction`: placeholder for future “route-to-correct-government” logic (match by admin areas or polygons)

Prisma config: `prisma.config.ts` (connection URL for Migrate/Introspection is sourced from `DATABASE_URL`).

Client connection: `src/lib/db/prisma.ts` uses the `pg` driver adapter (`@prisma/adapter-pg`).

### Uploads (current implementation)

- Local dev writes files to `public/uploads/` (`src/lib/uploads/local-public-storage.ts`).
- Production should use object storage + signed uploads; keep the same API surface and swap the implementation.

### Notifications (current implementation)

- App **generates** an email draft (subject/body + `mailto:` URL when `GOV_CONTACT_EMAIL` is set).
- Optional future paths:
  - Webhook to a civic system / ticketing queue
  - Email provider (Resend/SendGrid/SES)
  - 311 / emergency dispatch integration (jurisdiction-dependent)

## Future improvements

- Rate limiting and abuse prevention (per IP / per device, CAPTCHA, moderation queue).
- Jurisdiction routing:
  - Reverse geocode -> admin fields -> lookup contact
  - Polygon boundaries (PostGIS) for accurate routing
- Media pipeline:
  - Strip EXIF, resize images, virus scan, store originals separately
- Auth:
  - Anonymous by default; optional accounts for responders and moderators.

