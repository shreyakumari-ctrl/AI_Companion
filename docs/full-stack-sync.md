# Full-Stack Sync

This document is the quick contract for frontend, backend, and UI/UX alignment.

## Local URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Frontend Env

- `NEXT_PUBLIC_API_URL=http://localhost:5000`

## Local Database Setup

Run:

```bash
npm run db:generate
npm run db:migrate
```

## Frontend -> Backend

### Standard Chat

`POST /api/chat`

```json
{
  "message": "string",
  "conversationId": "string | null",
  "history": [
    {
      "sender": "user | ai",
      "text": "string"
    }
  ],
  "provider": "gemini | openai",
  "templateId": "string | undefined",
  "tonePreference": "string | undefined",
  "mood": "string | undefined"
}
```

### Streaming Chat

`POST /api/chat/stream`

Same request body as `/api/chat`.

Response is `text/event-stream`:

- `data: <single character or escaped newline chunk>`
- `data: [DONE]`
- `data: [ERROR]`

### Auth

`POST /api/auth/register`

```json
{
  "email": "string",
  "password": "string",
  "name": "string | undefined"
}
```

`POST /api/auth/login`

```json
{
  "email": "string",
  "password": "string"
}
```

`POST /api/auth/refresh`

```json
{
  "refreshToken": "string"
}
```

`POST /api/auth/logout`

```json
{
  "refreshToken": "string"
}
```

`GET /api/auth/me`

Header:

```http
Authorization: Bearer <accessToken>
```

## Backend -> Frontend

```json
{
  "reply": "string",
  "timestamp": "ISO-8601 string",
  "provider": "gemini | fallback",
  "model": "string | null",
  "conversationId": "string",
  "memoryCount": "number",
  "context": {
    "userId": "string | null",
    "tonePreference": "string",
    "mood": "string"
  }
}
```

Auth success response:

```json
{
  "user": {
    "id": "string",
    "email": "string | null",
    "name": "string | null",
    "tonePreference": "string",
    "mood": "string"
  },
  "accessToken": "string",
  "refreshToken": "string",
  "sessionId": "string",
  "accessTokenExpiresInMinutes": "number",
  "refreshTokenExpiresInDays": "number"
}
```

Legacy compatibility:

- `POST /chat/send` is still supported for older clients.
- Anonymous chats still work without auth headers.

## Database Schema

Current server-side models:

- `User`
- `Conversation`
- `ChatMessage`
- `Session`

`User` fields:

- `id`
- `email`
- `passwordHash`
- `name`
- `tonePreference`
- `mood`
- `createdAt`
- `updatedAt`

`Conversation` fields:

- `id`
- `title`
- `userId`
- `createdAt`
- `updatedAt`

`ChatMessage` fields:

- `id`
- `role`
- `content`
- `provider`
- `userId`
- `conversationId`
- `createdAt`

`Session` fields:

- `id`
- `userId`
- `refreshTokenHash`
- `expiresAt`
- `revokedAt`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

## Naming Rules

- Use `message` for the outbound user text.
- Use `reply` for the backend assistant response.
- Use `conversationId` to continue the same memory thread.
- Use `tonePreference` and `mood` exactly as written.
- Keep `timestamp` in ISO format.
- Use `provider` to indicate `gemini` or `fallback`.
- Use `Authorization: Bearer <accessToken>` for authenticated requests.
