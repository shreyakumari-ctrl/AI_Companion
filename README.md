# AI Companion

AI Companion is now scaffolded as a lightweight full-stack monorepo so the team can get a real frontend-to-backend pulse running immediately.

## What Is Ready

- `frontend/`: Next.js chat UI on the current `main` branch.
- `backend/`: Express API with `GET /health`, `GET /status`, `POST /api/chat`, and legacy `POST /chat/send`.
- `backend/prisma/schema.prisma`: `User` and `ChatMessage` models for future context-aware replies.
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

- Frontend: Next.js + React
- Backend: Node.js + Express + Prisma + Gemini SDK
- Database shell: SQLite for local development

The frontend reads `NEXT_PUBLIC_API_BASE_URL`.
The backend reads `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.

## Environment Setup

Copy these files before starting:

- `frontend/.env.local.example` -> `frontend/.env.local`
- `backend/.env.example` -> `backend/.env`

## Install And Run

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:5000`.

## API Pulse

### Health

```http
GET /health
GET /status
```

### Chat

```http
POST /api/chat
Content-Type: application/json

{
  "message": "Hello there"
}
```

Response shape:

```json
{
  "reply": "Starter AI reply...",
  "timestamp": "2026-03-23T12:00:00.000Z",
  "provider": "gemini | fallback",
  "model": "gemini-2.5-flash | null",
  "context": {
    "userId": null,
    "tonePreference": "friendly",
    "mood": "curious"
  }
}
```

## Team Handoff Notes

- UI field names are documented in `docs/full-stack-sync.md`.
- The current `main` frontend posts to `http://localhost:5000/api/chat`.
- The backend now supports that route directly and still keeps `/chat/send` for legacy compatibility.
- `npm run smoke` verifies `/health`, `/status`, `/api/chat`, and `/chat/send` against the compiled backend.

## Current Note On Prisma

`prisma generate` is working and the generated client is checked into the backend source tree.
On this machine, Prisma's schema engine is still unreliable for `prisma migrate dev`, so local development uses the checked-in SQL migrations through `npm run db:migrate`.
That migration runner keeps a local `_LocalMigration` journal table and applies the SQL files under `backend/prisma/migrations/` in order.

## Current Note On Gemini

The Gemini SDK is wired server-side. If `GEMINI_API_KEY` is present in `backend/.env` or root `.env`, the backend will call the configured `GEMINI_MODEL`.
If the key is missing or Gemini fails, the server returns a safe fallback reply so the UI plumbing still works.

## Channel Message

Use this in `#Full-Stack-Devs`:

> @Full-Stack-Devs: IT'S GO TIME!
> 
> We have the first roadmap in motion. Today's goal is not polished AI, it's a working pulse.
> 
> By the end of the session, we want one message to travel from the UI to the server and back again cleanly. Frontend and backend field names are documented, env files are aligned, and the first health/chat endpoints are in place.
