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
