# AI Companion

AI Companion is a lightweight full-stack monorepo with a working chat loop, SSE streaming, conversation memory, JWT-backed backend auth, authenticated conversation read APIs, and a basic latency cache.

## What Is Ready

- `frontend/`: Next.js chat UI on the current `main` branch.
- `backend/`: Express API with `GET /health`, `GET /status`, `POST /api/chat`, `POST /api/chat/stream`, auth routes under `/api/auth`, conversation routes under `/api/conversations`, and legacy `POST /chat/send`.
- `backend/prisma/schema.prisma`: `User`, `Conversation`, `ChatMessage`, and `Session` models for memory and auth.
- `docs/full-stack-sync.md`: API field contract for UI/UX and frontend/backend alignment.

## Branch Strategy

- `main`: production-ready history only.
- `dev`: integration branch for shared work.
- `codex/<feature-name>`: working feature branches.

Recommended flow:

1. Branch from `dev`.
2. Use `codex/<feature-name>` or `<team>/<feature-name>` for feature work.
3. Merge feature branches into `dev`.
4. Promote tested `dev` work into `main`.

## Tech Stack Handshake

- Frontend: Next.js + React
- Backend: Node.js + Express + Prisma + Gemini SDK
- Database shell: SQLite for local development

The frontend reads `NEXT_PUBLIC_API_URL`.
The backend reads `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CONVERSATION_MEMORY_LIMIT`, `CACHE_TTL_SECONDS`, `CACHE_MAX_ENTRIES`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.

## Environment Setup

Copy these files before starting:

- `frontend/.env.local.example` -> `frontend/.env.local`
- `backend/.env.example` -> `backend/.env`

For stable auth sessions across backend restarts, set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `backend/.env`.

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
  "message": "Hello there",
  "conversationId": "optional-cuid",
  "history": [],
  "provider": "gemini"
}
```

Response shape:

```json
{
  "reply": "Starter AI reply...",
  "timestamp": "2026-03-23T12:00:00.000Z",
  "provider": "gemini | fallback",
  "model": "gemini-2.5-flash | null",
  "conversationId": "cuid",
  "memoryCount": 4,
  "cacheHit": false,
  "context": {
    "userId": null,
    "tonePreference": "friendly",
    "mood": "curious"
  }
}
```

### Streaming

```http
POST /api/chat/stream
Content-Type: application/json
```

The server responds as `text/event-stream` and emits `data: <chunk>` events followed by `data: [DONE]`.

### Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
PATCH /api/auth/profile
```

Auth responses return an `accessToken`, `refreshToken`, `sessionId`, and `user`. Protected requests should send `Authorization: Bearer <accessToken>`.

### Conversations

```http
GET /api/conversations
GET /api/conversations/:conversationId
GET /api/conversations/:conversationId/messages
```

These routes are auth-protected and return the authenticated user's saved conversation context and message history.

## Team Handoff Notes

- UI field names are documented in `docs/full-stack-sync.md`.
- The current frontend uses `NEXT_PUBLIC_API_URL` and streams from `POST /api/chat/stream`.
- The backend supports both anonymous chats and authenticated chats, and still keeps `/chat/send` for legacy compatibility.
- `npm run verify:backend` now checks health, CORS, cache hit/miss behavior, streaming, DB-backed memory, auth, conversation reads, and persistence against the compiled backend.

## Current Note On Prisma

`prisma generate` is working and the generated client is checked into the backend source tree.
On this machine, Prisma's schema engine is still unreliable for `prisma migrate dev`, so local development uses the checked-in SQL migrations through `npm run db:migrate`.
That migration runner keeps a local `_LocalMigration` journal table and applies the SQL files under `backend/prisma/migrations/` in order.

## Current Note On Gemini

The Gemini SDK is wired server-side. If `GEMINI_API_KEY` is present in `backend/.env` or root `.env`, the backend will call the configured `GEMINI_MODEL`.
If the key is missing or Gemini fails, the server returns a safe fallback reply so the UI plumbing still works.

## CI And Staging

- Backend CI workflow: `.github/workflows/backend-ci.yml`
- Backend staging preview workflow: `.github/workflows/backend-staging.yml`
- Backend container build: `backend/Dockerfile`
- Local staging compose stack: `docker-compose.staging.yml`
- More staging notes: `docs/backend-staging.md`

## Channel Message

Use this in `#Full-Stack-Devs`:

> @Full-Stack-Devs: IT'S GO TIME!
> 
> We have the first roadmap in motion. Today's goal is not polished AI, it's a working pulse.
> 
> By the end of the session, we want one message to travel from the UI to the server and back again cleanly. Frontend and backend field names are documented, env files are aligned, and the first health/chat endpoints are in place.
