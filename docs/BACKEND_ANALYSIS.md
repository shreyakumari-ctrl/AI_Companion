# Backend Technical Analysis
**AI Companion — Express + Prisma Backend**
_Generated for onboarding new backend developers_

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure Breakdown](#3-folder-structure-breakdown)
4. [Entry Point & App Flow](#4-entry-point--app-flow)
5. [Database Layer (Prisma)](#5-database-layer-prisma)
6. [API Structure](#6-api-structure)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Environment & Config](#8-environment--config)
9. [Error Handling](#9-error-handling)
10. [External Integrations](#10-external-integrations)
11. [Code Quality Observations](#11-code-quality-observations)
12. [How to Run the Backend](#12-how-to-run-the-backend)
13. [Immediate Improvements](#13-immediate-improvements)
14. [Safe First Tasks for a New Developer](#14-safe-first-tasks-for-a-new-developer)

---

## 1. Project Overview

### What the backend does
This is the API server for **Clizel** (formerly "Clidy") — an AI chat companion application. It sits between the frontend and one or more LLM providers, managing conversations, user accounts, and AI message generation.

### Main Responsibilities
- Receive chat messages and route them to an LLM provider (Gemini, OpenAI, or fallbacks)
- Persist conversations and chat history to a local SQLite database via Prisma
- Support both standard JSON responses and **Server-Sent Events (SSE) streaming**
- Authenticate users with **JWT access/refresh tokens** + **httpOnly cookie sessions**
- Maintain per-conversation memory (last N turns sent as context to the LLM)
- Cache repeated prompts in-memory using an LRU-style cache to reduce API costs/latency
- Provide conversation CRUD endpoints for the frontend

### High-Level Architecture
```
Frontend (React)
      │
      ▼
Express REST API  ──────────── Global Middleware (CORS, JSON, cookies)
      │
  ┌───┴─────────────────────────────────┐
  │ Routes                              │
  │  /chat             (legacy)         │
  │  /api/chat         (primary)        │
  │  /api/chat/stream  (SSE streaming)  │
  │  /api/auth/*       (auth)           │
  │  /api/conversations/*               │
  │  /api/providers    (list LLMs)      │
  └───┬─────────────────────────────────┘
      │
  ┌───▼──────────────┐
  │  chat-service.ts │  ← Core business logic
  │  - Provider failover
  │  - Cache check
  │  - History injection
  │  - DB persistence
  └───┬──────────────┘
      │
  ┌───▼───────────────────────────────┐
  │  LLM Adapters                     │
  │  adapters/gemini.ts  (primary)    │
  │  adapters/openai.ts  (fallback)   │
  │  adapters/deepseek.ts (unregistered)
  │  adapters/groq.ts    (unregistered)
  └───┬───────────────────────────────┘
      │
  ┌───▼──────────────────────────┐
  │  SQLite DB (better-sqlite3)  │
  │  via Prisma ORM              │
  └──────────────────────────────┘
```

The architecture is **flat/modular**, not layered with separate controllers — route files call service functions directly.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 (Docker) |
| Framework | Express | latest |
| Language | TypeScript | latest |
| ORM | Prisma | latest |
| Database | SQLite (via `better-sqlite3`) | latest |
| Auth | `jsonwebtoken` + Node.js `crypto` (scrypt) | ^9.0.3 |
| Validation | Zod | latest |
| AI: Gemini | `@google/genai` | latest |
| AI: OpenAI | `openai` SDK | ^6.32.0 |
| Cookies | `cookie-parser` | ^1.4.7 |
| CORS | `cors` | latest |
| Env loading | `dotenv` | latest |
| Dev runner | `tsx watch` | latest |
| TypeScript compile | `tsc` | latest |
| Container | Docker (multi-stage, `node:22-bookworm-slim`) | — |

**Notable absences:** No logging library (only `console.log`), no test framework, no rate limiting, no request ID tracking.

---

## 3. Folder Structure Breakdown

```
backend/
├── Dockerfile                  ← Multi-stage production container build
├── package.json                ← Scripts, dependencies
├── prisma.config.ts            ← Prisma CLI config (schema path, migration path, DB URL)
├── tsconfig.json               ← TypeScript compiler config (CommonJS output, strict)
├── .env.example                ← Template for dev environment variables
├── .env.staging.example        ← Template for staging environment
│
├── prisma/
│   ├── schema.prisma           ← Database schema (models, relations, enums)
│   └── migrations/             ← SQL migration files (applied chronologically)
│       ├── 20260323193000_init/
│       ├── 20260324110000_align_server_with_main/
│       └── 20260326094500_streaming_memory_auth/
│
├── scripts/
│   ├── apply-local-schema.js   ← Custom migration runner (bypasses Prisma CLI)
│   ├── smoke-test.js           ← Quick sanity check of running server
│   └── verify-backend.js       ← Full integration test suite (~540 lines)
│
└── src/
    ├── index.ts                ← Server startup + startup logs
    ├── app.ts                  ← Express app wiring (middleware, routes, error handler)
    ├── load-env.ts             ← Loads .env files from repo root and backend root
    │
    ├── generated/prisma/       ← Auto-generated Prisma client (do not edit manually)
    │
    ├── lib/
    │   ├── env.ts              ← Zod-validated environment schema, exported as `env`
    │   ├── prisma.ts           ← Singleton Prisma client (hot-reload safe)
    │   ├── auth.ts             ← Full auth logic: password hashing, JWT, sessions
    │   ├── chat-service.ts     ← Core business logic: executeChat, streamChat, DB ops
    │   ├── chat-contract.ts    ← Zod schemas for incoming chat request validation
    │   ├── promptTemplates.ts  ← System prompt templates with variable interpolation
    │   ├── response-cache.ts   ← In-memory LRU cache for repeated prompts
    │   ├── http-error.ts       ← HttpError class (statusCode + message)
    │   ├── brand-text.ts       ← Replaces "Clidy" → "Clizel" in AI output
    │   ├── gemini.ts           ← LEGACY standalone Gemini client (unused, superseded)
    │   └── adapters/
    │       ├── index.ts        ← Provider registry (only gemini + openai are active)
    │       ├── gemini.ts       ← Gemini adapter (primary LLM)
    │       ├── openai.ts       ← OpenAI adapter (fallback)
    │       ├── deepseek.ts     ← DeepSeek adapter (stub, NOT registered)
    │       └── groq.ts         ← Groq adapter (stub, NOT registered)
    │
    ├── middleware/
    │   └── auth.ts             ← optionalAuth + requireAuth middleware functions
    │
    └── routes/
        ├── auth.ts             ← /api/auth/* (register, login, refresh, logout, me, profile)
        ├── chat.ts             ← /chat/* (legacy chat endpoints)
        ├── conversations.ts    ← /api/conversations/* (list, get, messages)
        └── inference.ts        ← /api/chat, /api/chat/stream, /api/providers
```

---

## 4. Entry Point & App Flow

### Server Startup
1. **`src/index.ts`** — Calls `app.listen(env.PORT)`, logs startup status for each configured LLM provider and feature flags.
2. **`src/app.ts`** — Builds and exports the Express `app`. This is where all wiring happens.
3. **`src/load-env.ts`** — Loaded first (imported at top of `app.ts`). Calls `dotenv.config()` for four possible `.env` file paths in priority order:
   - `<repoRoot>/.env`
   - `<backendRoot>/.env`
   - `<repoRoot>/.env.local`
   - `<backendRoot>/.env.local`

### Middleware Flow (in order, `app.ts`)
```
1. CORS          — Origin allowlist check, credentials, exposed headers
2. cookieParser  — Parses httpOnly cookies (used for refresh token)
3. express.json  — JSON body parsing, 1MB limit
4. Routes        — Matched against registered routers
5. Error handler — Global catch-all at the very bottom
```

### Route Registration Order
```
app.use("/chat",               chatRouter)          ← legacy
app.use("/api",                inferenceRouter)      ← primary AI routes
app.use("/api/auth",           authRouter)           ← auth
app.use("/api/conversations",  conversationsRouter)  ← conversation CRUD
```

**Health checks** are registered inline before all routers:
- `GET /health` → `{ status: "ok", ... }`
- `GET /status` → `{ status: "ok", ... }`

### Per-Request Auth Flow
Routes that need authentication use two middleware functions chained together:
```typescript
router.get("/me", optionalAuth, requireAuth, handler)
```
- `optionalAuth` — Reads `Authorization: Bearer <token>`, verifies JWT, looks up DB session, attaches `req.auth`. If no token: continues. If invalid token: returns 401.
- `requireAuth` — If `req.auth` is not set: returns 401. Otherwise continues.

Public routes (e.g., `/api/chat`) use only `optionalAuth`, allowing anonymous requests while still identifying authenticated users if a token is present.

---

## 5. Database Layer (Prisma)

### Location
- Schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Generated client: `backend/src/generated/prisma/`
- Custom migration runner: `backend/scripts/apply-local-schema.js`

### Database
- **Engine:** SQLite (file-based, via `better-sqlite3`)
- **Default file:** `./prisma/dev.db` (relative to backend root)

### Models

#### `User`
The central entity. Can exist without email/password (anonymous users with only `chats` linked by session context).

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String? | Unique, nullable (anonymous users) |
| `passwordHash` | String? | `"salt:derivedKeyHex"` format (scrypt) |
| `name` | String? | Display name |
| `tonePreference` | String | Default: `"friendly"` |
| `mood` | String | Default: `"curious"` |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

Relations: has many `ChatMessage`, `Conversation`, `Session`

---

#### `Conversation`
Groups related messages. Can be anonymous (userId is nullable).

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String? | Nullable, not auto-generated |
| `userId` | String? | FK → User (nullable) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto (indexed) |

Relations: belongs to `User?`, has many `ChatMessage`
Indexes: `userId`, `updatedAt`

---

#### `ChatMessage`
Individual message turns. Stores both `user` and `assistant` roles.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `role` | String | `"user"` or `"assistant"` |
| `content` | String | Full message text |
| `provider` | String? | Which LLM generated this (for assistant messages) |
| `userId` | String? | FK → User (nullable) |
| `conversationId` | String? | FK → Conversation (nullable) |
| `createdAt` | DateTime | Auto |

Indexes: `userId`, `(conversationId, createdAt)` (composite for efficient history queries)

---

#### `Session`
JWT refresh token sessions. Enables token rotation and server-side revocation.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User (Cascade delete) |
| `refreshTokenHash` | String | SHA-256 of the refresh token |
| `expiresAt` | DateTime | Absolute expiry |
| `revokedAt` | DateTime? | Set on logout |
| `lastUsedAt` | DateTime? | Updated on each use |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

Indexes: `userId`, `expiresAt`

### Relationships Summary
```
User ──< Conversation ──< ChatMessage
User ──< ChatMessage (direct link for messages without a conversation)
User ──< Session
```

### Migrations
Three migrations exist, managed by a **custom Node.js migration runner** (`scripts/apply-local-schema.js`) rather than the Prisma CLI. The runner:
1. Reads `DATABASE_URL` from env
2. Creates a `_LocalMigration` tracking table
3. Sorts and applies unapplied `migration.sql` files in alphabetical order
4. Wraps each migration in a transaction

There are **no Prisma enums** — all enum-like fields (e.g., `role`, `tonePreference`, `mood`) are stored as plain strings.

---

## 6. API Structure

### Health Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check |
| `GET` | `/status` | None | Liveness check (alias) |

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register new user. Returns `{ user, accessToken, refreshToken, sessionId }` |
| `POST` | `/api/auth/login` | None | Login. Returns same shape as register |
| `POST` | `/api/auth/refresh` | None | Rotate refresh token (reads from cookie or body). Returns new token pair |
| `POST` | `/api/auth/logout` | None | Revoke session, clear refresh cookie |
| `GET` | `/api/auth/me` | Required | Return current user + sessionId |
| `PATCH` | `/api/auth/profile` | Required | Update `name`, `tonePreference`, `mood` |

### Chat / Inference — `/api` and `/chat`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/chat` | Optional | Non-streaming chat. Returns `{ reply, timestamp, provider, model, context, conversationId, memoryCount, cacheHit }` |
| `POST` | `/api/chat/stream` | Optional | SSE streaming chat. Emits character chunks + `meta` event + `[DONE]` |
| `GET` | `/api/providers` | None | Returns `["gemini", "openai", "fallback"]` |
| `POST` | `/chat` | Optional | Legacy alias for `/api/chat` |
| `POST` | `/chat/send` | Optional | Legacy alias for `/api/chat` |

### Conversations — `/api/conversations`
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/conversations` | Required | List user's conversations. Query: `?limit=20` (1–50) |
| `GET` | `/api/conversations/:id` | Required | Get conversation metadata + recent history |
| `GET` | `/api/conversations/:id/messages` | Required | Paginated message list. Query: `?limit=100` (1–200) |

### Chat Request Body Shape
```json
{
  "message": "Hello!",
  "provider": "gemini",
  "templateId": "default",
  "personality": "Friendly",
  "history": [{ "sender": "user", "text": "..." }, { "sender": "ai", "text": "..." }],
  "userId": "cuid_or_null",
  "conversationId": "cuid_or_null",
  "tonePreference": "friendly",
  "mood": "curious"
}
```

### SSE Stream Format
```
data: H
data: e
data: l
data: l
data: o
data: {"type":"meta","timestamp":"...","provider":"gemini","model":"gemini-2.5-flash","conversationId":"...","memoryCount":2,"cacheHit":false,"context":"..."}
data: [DONE]
```

---

## 7. Authentication & Authorization

### Mechanism
- **Access token:** Short-lived JWT (default 15 min), sent in `Authorization: Bearer` header
- **Refresh token:** Long-lived JWT (default 7 days), sent via `httpOnly` cookie (`clidy_refresh_token`, `path: /api/auth`)
- **Password hashing:** Node.js `crypto.scrypt` with 16-byte random salt, stored as `"saltHex:derivedKeyHex"`

### Token Flow
```
Register/Login → create DB Session → sign access + refresh JWTs
                                   → store SHA-256(refreshToken) in Session.refreshTokenHash

Authenticated Request → verify access JWT → check DB session (not revoked/expired)
                      → attach req.auth = { userId, email, sessionId }

Token Refresh → verify refresh JWT → check DB session + hash match
              → create new Session → issue new token pair → revoke old session

Logout → set Session.revokedAt → clear cookie
```

### Dev Safety Net
If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` are missing from env, **random ephemeral secrets** are generated per-process startup:
```typescript
// src/lib/auth.ts
const ACCESS_SECRET  = env.JWT_ACCESS_SECRET  ?? crypto.randomBytes(32).toString("hex");
const REFRESH_SECRET = env.JWT_REFRESH_SECRET ?? crypto.randomBytes(32).toString("hex");
```
This means all existing tokens are invalidated on every server restart in dev if secrets are not set.

### Role/Permission System
There is **no role-based access control**. All authenticated users have the same permissions. Authorization is purely presence/absence of a valid session.

### Middleware
```
src/middleware/auth.ts
  ├── optionalAuth(req, res, next)  — parse + validate token if present
  └── requireAuth(req, res, next)   — hard-fail if req.auth not set
```

---

## 8. Environment & Config

### Required Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Allowed CORS origin |
| `DATABASE_URL` | No | `file:./prisma/dev.db` | SQLite file path |
| `GEMINI_API_KEY` | **Yes** (primary LLM) | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `OPENAI_API_KEY` | No | — | OpenAI API key (fallback LLM) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `JWT_ACCESS_SECRET` | **Yes** (prod) | random (dev only) | JWT access token signing secret |
| `JWT_REFRESH_SECRET` | **Yes** (prod) | random (dev only) | JWT refresh token signing secret |
| `JWT_ACCESS_TTL_MINUTES` | No | `15` | Access token lifetime |
| `JWT_REFRESH_TTL_DAYS` | No | `7` | Refresh token lifetime |
| `CONVERSATION_MEMORY_LIMIT` | No | `12` | Max history turns sent to LLM |
| `CACHE_TTL_SECONDS` | No | `60` | Response cache TTL (0 = disabled) |
| `CACHE_MAX_ENTRIES` | No | `200` | Max response cache entries |
| `DEFAULT_PROMPT_TEMPLATE` | No | `default` | Which prompt template to use |

Variables for DeepSeek and Groq are defined in `env.ts` but their adapters are not registered, so they have no effect.

### Config Files
- **`src/lib/env.ts`** — Parses and validates all env vars using Zod at startup. If required vars are missing or invalid, the process throws before serving any requests. All code should import `env` from here, never `process.env` directly.
- **`prisma.config.ts`** — Used only by the Prisma CLI. Specifies schema path, migrations path, and database URL.
- **`.env.example`** — Template for developer setup.
- **`.env.staging.example`** — Template for staging deployment.

### Env Loading Order
`src/load-env.ts` applies this priority (later files override earlier):
1. `<repo root>/.env`
2. `<backend root>/.env`
3. `<repo root>/.env.local`
4. `<backend root>/.env.local`

---

## 9. Error Handling

### Global Error Handler (`src/app.ts`)
A single Express `(error, req, res, next)` handler at the bottom of `app.ts` catches all thrown/forwarded errors:

```typescript
// Error handler order:
1. CORS errors        → 403 with message
2. ZodError           → 400 with flattened issue array
3. HttpError          → error.statusCode with error.message
4. Unexpected errors  → 500 "Internal server error"
```

### `HttpError` Class (`src/lib/http-error.ts`)
```typescript
class HttpError extends Error {
  statusCode: number;
}
```
Used throughout routes and services to produce specific HTTP status codes:
- `new HttpError(400, "Invalid input")` — validation failures
- `new HttpError(401, "Authentication required.")` — missing/invalid auth
- `new HttpError(403, "Access denied.")` — wrong user accessing another's data
- `new HttpError(404, "Conversation not found.")` — missing resources
- `new HttpError(409, "Email already registered.")` — conflicts

### Service-Level Error Handling
`chat-service.ts` catches provider errors per-attempt, marks providers as cooling down on network failures, and falls back through all registered providers before returning a "fallback" placeholder reply. This means **the `/api/chat` endpoint almost never 500s** — it degrades gracefully.

### What Is Missing
- No logging of errors to a persistent store or external service
- No request ID for tracing errors across logs
- Error responses do not include a machine-readable `code` field (only `error` string)

---

## 10. External Integrations

### Google Gemini (Primary LLM)
- Package: `@google/genai`
- Adapter: `src/lib/adapters/gemini.ts`
- Config: `GEMINI_API_KEY`, `GEMINI_MODEL`
- Supports both `generate()` (full response) and `generateStream()` (async iterator)
- History is formatted as alternating `user`/`model` content turns

### OpenAI (Fallback LLM)
- Package: `openai` ^6.32.0
- Adapter: `src/lib/adapters/openai.ts`
- Config: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Standard chat completions API with streaming support

### DeepSeek & Groq (Stub — Inactive)
- Adapters exist at `src/lib/adapters/deepseek.ts` and `src/lib/adapters/groq.ts`
- Use raw `fetch` to OpenAI-compatible endpoints
- **Not registered** in `src/lib/adapters/index.ts`
- Streaming is fake (calls `generate()` then calls `onChunk` once with full reply)
- Can be activated by adding them to the `providerRegistry` in `adapters/index.ts`

### No Other External Services
- No email service (no welcome emails, no password reset)
- No file storage
- No analytics
- No monitoring/APM

---

## 11. Code Quality Observations

### Strengths
- Zod validation at every entry point (env, request bodies, query params)
- Clean provider abstraction via `LLMAdapter` interface
- Graceful provider failover with cooldown tracking
- Secure password hashing (scrypt + constant-time comparison)
- Token rotation on refresh (prevents refresh token reuse)
- Comprehensive integration test script (`verify-backend.js`)
- Hot-reload safe Prisma singleton

### Inconsistencies

**1. Duplicate chat routes (`/chat` and `/api/chat`)**
`routes/chat.ts` (legacy, mounted at `/chat`) and `routes/inference.ts` (mounted at `/api`) implement the same `handleChatRequest` logic nearly identically. This creates maintenance burden — a bug fix needs to be applied in two places.

**2. Legacy `src/lib/gemini.ts`**
This file is a standalone Gemini client that predates the adapter architecture. It is no longer imported by any route but still exists, which can confuse new developers.

**3. DeepSeek and Groq adapters — dead code**
Both adapters are fully implemented but not registered in `providerRegistry`. Their streaming implementations are also fake (no true streaming). Additionally, the env vars for these providers are defined in `env.ts` but missing from `.env.example`.

**4. No controllers layer**
All route handlers contain inline business logic, blurring the line between HTTP routing and application logic. For example, `routes/auth.ts` contains the full registration/login implementation rather than delegating to a dedicated auth service.

**5. Schema string fields used as enums**
`role` (user/assistant), `tonePreference`, and `mood` are plain strings in the database with no validation at the DB level. Invalid values can be inserted if validation is bypassed.

### Potential Bugs

**1. Ephemeral JWT secrets on dev restart**
Without `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` in `.env`, all tokens are invalidated on every server restart. This can cause confusing "token invalid" errors during development.

**2. Conversation ownership check for anonymous users**
In `chat-service.ts → resolveStoredConversation()`, if a conversation has no owner (`userId === null`) and the request has no auth, it is allowed through. This means anonymous conversations can be accessed by anyone who knows the `conversationId`.

**3. Zod `chatRequestSchema` — `provider` does not allow `"fallback"`**
Clients cannot request the `"fallback"` provider explicitly (it's not in the `enum`), but the response can return `provider: "fallback"`. This is actually correct behavior but is not documented.

**4. `history` field in `chatRequestSchema` is capped at 15 but `CONVERSATION_MEMORY_LIMIT` defaults to 12**
If a client sends `history` with 15 turns and the server has `CONVERSATION_MEMORY_LIMIT=12`, the server will use its DB-fetched history, ignoring the client-supplied history anyway. The schema cap is slightly misleading.

**5. Missing `await` risk in `apply-local-schema.js`**
The custom migration script uses synchronous `better-sqlite3` calls directly but is wrapped in `async` functions with `await` in some places. If a future change mixes async incorrectly, migrations could silently fail.

### Missing Best Practices
- **No request logging** — No HTTP access log (no Morgan or equivalent). Debugging issues in production requires guessing from application logs.
- **No rate limiting** — Auth endpoints (login, register, refresh) have no rate limiting. Brute-force password attacks are possible.
- **No pagination cursor** — Conversation list and message list use `limit` only (no offset or cursor-based pagination). Large datasets will eventually be slow to query.
- **No input sanitization beyond Zod** — While Zod validates shape and length, there is no explicit XSS or injection sanitization (though SQLite + Prisma parameterization protects against SQL injection in normal usage).
- **`latest` version pins** — Several dependencies use `"latest"`, which can cause unexpected breaking changes on fresh installs.

---

## 12. How to Run the Backend

### Prerequisites
- Node.js 18+ (22 recommended)
- npm

### Install
```bash
cd backend
npm install
```

### Set Up Environment
```bash
cp .env.example .env
# Edit .env and fill in at minimum:
# GEMINI_API_KEY=your_key_here
# JWT_ACCESS_SECRET=any_long_random_string
# JWT_REFRESH_SECRET=another_long_random_string
```

### Set Up Database
```bash
# Run the custom migration script (creates dev.db and applies all migrations)
npm run db:bootstrap

# Then generate the Prisma client
npm run prisma:generate
```

### Run in Development
```bash
npm run dev
# Server starts at http://localhost:5000
# Hot-reload via tsx watch
```

### Run in Production
```bash
npm run build   # Compiles TypeScript → dist/
npm run start   # Runs dist/index.js
```

### Verify the Server
```bash
# Quick smoke test
npm run smoke

# Full integration test (requires server running on port 5000)
npm run verify
```

### Prisma Schema Changes
```bash
# After editing prisma/schema.prisma:
npm run prisma:generate    # Regenerate the client

# To create a migration:
npx prisma migrate dev --name your_migration_name
# OR use the custom runner after writing your own SQL:
npm run db:migrate
```

---

## 13. Immediate Improvements

These improvements increase safety, clarity, and scalability without breaking existing behavior.

### High Priority

**1. Add rate limiting to auth routes**
Use `express-rate-limit` on `/api/auth/login`, `/api/auth/register`, and `/api/auth/refresh`. Without this, the login endpoint is vulnerable to brute-force attacks.
```
npm install express-rate-limit
```
Apply in `src/app.ts` before `authRouter`.

**2. Pin dependency versions**
Replace all `"latest"` in `package.json` with explicit semver ranges to prevent unexpected breaking changes:
```json
"@google/genai": "^0.21.0",
"cors": "^2.8.5"
```
Run `npm list` to find current exact versions.

**3. Add HTTP request logging**
Add `morgan` for access logging. This is essential for debugging production issues:
```
npm install morgan @types/morgan
app.use(morgan("combined"));  // add near top of app.ts
```

**4. Remove or clearly archive `src/lib/gemini.ts`**
The legacy file creates confusion. Either delete it or move it to `src/lib/legacy/` with a comment explaining it is deprecated.

**5. Document the anonymous conversation access policy**
The fact that anonymous (no-userId) conversations are accessible to any caller is either a security hole or intentional design. This should be documented in code and reviewed.

---

### Medium Priority

**6. Merge duplicate chat routes**
Remove `routes/chat.ts` and update any clients still calling `/chat` or `/chat/send` to use `/api/chat`. This eliminates the maintenance duplicate.

**7. Extract service from `routes/auth.ts`**
Create `src/lib/auth-service.ts` and move the registration/login DB logic there, keeping `routes/auth.ts` thin (HTTP parsing only).

**8. Register DeepSeek/Groq or remove them**
The adapters are half-finished. Either:
- Fix their streaming implementations and register them in `providerRegistry`
- Remove them entirely to avoid dead code confusion

**9. Add cursor-based pagination for messages**
`GET /api/conversations/:id/messages` currently uses `limit` only. Replace with:
```
GET /api/conversations/:id/messages?before=<messageId>&limit=50
```

**10. Add database-level constraints via migrations**
The `role` field on `ChatMessage` should be constrained to `"user"` or `"assistant"` at the DB level as a CHECK constraint.

---

### Low Priority

**11. Add a global request ID**
Use `crypto.randomUUID()` to generate a request ID per request, attach it to `res.locals.requestId`, include it in error responses. This helps correlate frontend errors with backend logs.

**12. Replace `console.log` with a structured logger**
Use `pino` or `winston` for JSON-structured logs, which are easier to parse in production log aggregators.

**13. Add proper API response types**
Currently there are no shared TypeScript types for API response shapes. Defining these helps prevent regressions when changing response structures.

---

## 14. Safe First Tasks for a New Developer

These tasks are self-contained, low-risk, and a great way to get familiar with the codebase.

---

**Task 1 — Add `DEEPSEEK_API_KEY` and `GROQ_API_KEY` to `.env.example`**
These are defined in `env.ts` but missing from the example file.
File to edit: `backend/.env.example`
Risk: Zero. Documentation-only change.

---

**Task 2 — Fix the response cache key to exclude `userId` safely**
`src/lib/response-cache.ts` — `buildChatCacheKey()` includes `userId` in the hash. This means identical prompts from different users are not cached as hits for each other (which is correct), but anonymous requests would all share the same `userId: null` bucket.
Review the cache key logic and add a comment explaining the design decision.
Files: `src/lib/response-cache.ts`
Risk: Very low. No functional change, only documentation.

---

**Task 3 — Add `Morgan` request logging**
Install `morgan`, add `app.use(morgan("dev"))` near the top of `src/app.ts`.
This is a additive-only change.
Files: `src/app.ts`, `package.json`
Risk: Very low. Does not change any existing behavior.

---

**Task 4 — Add a `GET /api/providers` that reflects actual availability**
Currently it always returns `["gemini", "openai", "fallback"]` regardless of whether keys are configured.
Update it to dynamically check `adapter.isAvailable()` for each registered provider.
File: `src/routes/inference.ts`
Risk: Low. The route currently returns hardcoded data.

---

**Task 5 — Write a Zod schema for `GET /api/conversations` query params**
The `limit` query param is validated inline with `parseInt` and manual checks. Replace it with a Zod schema to be consistent with the rest of the codebase.
File: `src/routes/conversations.ts`
Risk: Very low. No behavior change, just validation style consistency.

---

**Task 6 — Add types for API response shapes**
Create `src/lib/api-types.ts` and define TypeScript interfaces for the response bodies returned by `/api/chat`, `/api/auth/register`, `/api/auth/me`, and `/api/conversations`.
Risk: Zero. Types only, no runtime code.

---

**Task 7 — Pin all `"latest"` dependency versions**
Run `npm list --depth=0` to find current installed versions, then update `package.json` to pin them to specific semver ranges.
File: `package.json`
Risk: Very low. The installed versions do not change, only the manifest is made explicit.

---

_End of Backend Analysis_
