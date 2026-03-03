# Doughnut Impact App

TypeScript full-stack app for mapping business impacts to Doughnut dimensions, scoring impacts, and tracking trendlines.

## Stack

- Next.js 14 + TypeScript (App Router)
- Prisma + Postgres (Supabase local/hosted)
- Zod validation
- React Hook Form + TanStack Query
- D3 for chart visualizations (doughnut, trends)
- Inngest for background extraction jobs
- OpenAI API for AI-assisted extraction

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env
```

3. Generate Prisma client + migrate + seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Run dev server

```bash
npm run dev
```

## Deploy On Vercel (Free Tier)

This is the lowest-cost path to get the app online:

- Hosting: Vercel Hobby ($0)
- Database: Neon Postgres Free ($0)

1. Push this repo to GitHub.
2. Create a Neon project and copy the pooled `DATABASE_URL`.
3. Initialize the Neon database from your machine:

```bash
DATABASE_URL="your_neon_database_url" npm run prisma:push
DATABASE_URL="your_neon_database_url" npm run prisma:seed
```

4. In Vercel, import the GitHub repo.
5. In Vercel project settings, add environment variables:

- `DATABASE_URL` (required)
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
- `INNGEST_EVENT_KEY` (optional)
- `INNGEST_SIGNING_KEY` (optional)

6. Deploy.

Notes:

- `INNGEST_*` vars are optional for first deploy; extraction falls back to inline processing if Inngest is not configured.
- `OPENAI_API_KEY` is optional; company analysis route uses a fallback response when key is missing.
- Build runs `prisma generate` automatically via the `build` script.

## API Endpoints

- `POST /api/companies`
- `POST /api/impacts/manual`
- `POST /api/impacts/extract`
- `POST /api/impacts/review`
- `GET /api/companies/:id/doughnut?from&to`
- `GET /api/companies/:id/trends?from&to&granularity`

Additional helper endpoints:

- `GET /api/companies`
- `GET /api/dimensions`
- `GET /api/companies/:id/candidates`
- `GET /api/companies/:id/impacts`

## Notes

- AI extraction requires `OPENAI_API_KEY`. Without it, the system returns a deterministic fallback candidate for local testing.
- Human review is mandatory: extracted candidates are not converted to impacts until accepted through review API.
- RLS policy examples are in `supabase/rls.sql`.

## Tests

```bash
npm run test
```
