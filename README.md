# AI Companion

AI Companion is now scaffolded as a lightweight full-stack monorepo so the team can get a real frontend-to-backend pulse running immediately.

## What Is Ready

- `frontend/`: Next.js chat UI with Zustand-powered message history.
- `backend/`: Express API with `GET /health` and `POST /chat/send`.
- `backend/prisma/schema.prisma`: First User Profile schema for future context-aware replies.
- `docs/full-stack-sync.md`: API field contract for UI/UX and frontend/backend alignment.

## Branch Strategy

- `main`: production-ready history only.
- `dev`: integration branch for shared work.
- `codex/fullstack-pulse`: current feature branch for this bootstrap.

Recommended flow:

1. Branch from `dev`.
2. Use `codex/<feature-name>` or `<team>/<feature-name>` for feature work.
3. Merge feature branches into `dev`.
4. Promote tested `dev` work into `main`.

## Tech Stack Handshake

- Frontend: Next.js + React + Zustand
- Backend: Node.js + Express + Prisma
- Database shell: SQLite for local development

The frontend reads `NEXT_PUBLIC_API_BASE_URL`.
The backend reads `PORT`, `FRONTEND_URL`, and `DATABASE_URL`.

## Environment Setup

Copy these files before starting:

- `frontend/.env.local.example` -> `frontend/.env.local`
- `backend/.env.example` -> `backend/.env`

## Install And Run

```bash
npm install
npm run db:generate
npm run db:bootstrap
npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:4000`.

## API Pulse

### Health

```http
GET /health
```

### Chat

```http
POST /chat/send
Content-Type: application/json

{
  "message": "Hello there",
  "userId": null
}
```

Response shape:

```json
{
  "reply": "Starter AI reply...",
  "timestamp": "2026-03-23T12:00:00.000Z",
  "context": {
    "userId": null,
    "tonePreference": "friendly",
    "mood": "curious"
  }
}
```

## Team Handoff Notes

- UI field names are documented in `docs/full-stack-sync.md`.
- The frontend currently renders chat messages and also logs the API response to the browser console after each send.
- The backend response is intentionally hardcoded for now so the transport layer is stable before adding a real model.
- `npm run smoke` verifies `/health` and `/chat/send` against the compiled backend.

## Current Note On Prisma

`prisma generate` is working and the generated client is checked into the backend source tree.
On this machine, Prisma's schema engine is still erroring for `prisma migrate dev`, so the local SQLite shell is bootstrapped with `npm run db:bootstrap` using the checked-in SQL migration under `backend/prisma/migrations/20260323193000_init/migration.sql`.

## Channel Message

Use this in `#Full-Stack-Devs`:

> @Full-Stack-Devs: IT'S GO TIME!
> 
> We have the first roadmap in motion. Today's goal is not polished AI, it's a working pulse.
> 
> By the end of the session, we want one message to travel from the UI to the server and back again cleanly. Frontend and backend field names are documented, env files are aligned, and the first health/chat endpoints are in place.
