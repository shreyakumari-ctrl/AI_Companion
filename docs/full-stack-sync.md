# Full-Stack Sync

This document is the quick contract for frontend, backend, and UI/UX alignment.

## Local URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Local Database Setup

Run:

```bash
npm run db:generate
npm run db:migrate
```

## Frontend -> Backend

`POST /api/chat`

```json
{
  "message": "string"
}
```

## Backend -> Frontend

```json
{
  "reply": "string",
  "timestamp": "ISO-8601 string",
  "provider": "gemini | fallback",
  "model": "string | null",
  "context": {
    "userId": "string | null",
    "tonePreference": "string",
    "mood": "string"
  }
}
```

Legacy compatibility:

- `POST /chat/send` is still supported for older clients.

## Database Schema

Current server-side models:

- `User`
- `ChatMessage`

`User` fields:

- `id`
- `name`
- `tonePreference`
- `mood`
- `createdAt`
- `updatedAt`

`ChatMessage` fields:

- `id`
- `role`
- `content`
- `provider`
- `userId`
- `createdAt`

## Naming Rules

- Use `message` for the outbound user text.
- Use `reply` for the backend assistant response.
- Use `tonePreference` and `mood` exactly as written.
- Keep `timestamp` in ISO format.
- Use `provider` to indicate `gemini` or `fallback`.
