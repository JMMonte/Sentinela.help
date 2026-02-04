# Kaos

OpenStreetMap-based incident reporting: users can upload images, pin a location, and generate a ready-to-send message for local government (floods, fires, explosions, etc).

## Stack

- Next.js (App Router) + TypeScript
- shadcn/ui (Radix + Tailwind)
- Leaflet + OpenStreetMap tiles
- Prisma ORM + Postgres (via `pg` driver adapter)

## Local development

1) Install deps

```bash
pnpm install
```

2) Configure env

```bash
cp .env.example .env
```

3) Start Postgres (requires Docker Desktop)

```bash
docker compose up -d db
```

Note: this compose file maps Postgres to `localhost:5433` to avoid clashing with a locally installed Postgres on `5432`.

4) Run migrations + generate client

```bash
pnpm db:migrate
pnpm db:generate
```

5) Start the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Notes

- Uploads are saved to `public/uploads/` in local dev (ignored by git). For production, swap this for object storage (S3/R2/etc).
- To enable address lookup (reverse geocoding), set `ENABLE_NOMINATIM=true` and provide a descriptive `NOMINATIM_USER_AGENT` in `.env`.

## Architecture

See `docs/ARCHITECTURE.md`.
