# Backend Staging Guide

This repo now includes a backend-only staging path for internal testing.

## What Exists

- GitHub Actions CI: `.github/workflows/backend-ci.yml`
- GitHub Actions staging preview: `.github/workflows/backend-staging.yml`
- Backend container image: `backend/Dockerfile`
- Local staging compose file: `docker-compose.staging.yml`
- Staging env template: `backend/.env.staging.example`

## Local Staging Run

1. Copy `backend/.env.staging.example` to `backend/.env.staging`
2. Fill in the real staging secrets and API keys
3. Run:

```bash
docker compose -f docker-compose.staging.yml up --build
```

Backend staging will be exposed on `http://localhost:5000`.

## CI

`backend-ci.yml` runs on pushes and pull requests touching backend files. It:

- installs dependencies
- generates Prisma client
- applies checked-in SQL migrations
- builds the backend
- runs `npm run verify:backend`

## Staging Preview Workflow

`backend-staging.yml` can be triggered manually or from pushes to `dev` that touch backend files. It:

- builds the backend container image
- boots a preview container in the GitHub Actions runner
- checks `GET /health`
- tears the preview down cleanly

## Notes

- Current staging still uses SQLite because the checked-in Prisma datasource is SQLite.
- `DATABASE_URL=file:./prisma/data/staging.db` keeps staging isolated from local dev without mounting over the checked-in Prisma migrations.
- If you move to PostgreSQL later, update `backend/prisma/schema.prisma`, the migration flow, and the staging env template together.
