# Full-Stack Sync

This document is the quick contract for frontend, backend, and UI/UX alignment.

## Local URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Frontend -> Backend

`POST /chat/send`

```json
{
  "message": "string",
  "userId": "string | null"
}
```

## Backend -> Frontend

```json
{
  "reply": "string",
  "timestamp": "ISO-8601 string",
  "context": {
    "userId": "string | null",
    "tonePreference": "string",
    "mood": "string"
  }
}
```

## User Profile Schema

Current fields in the backend database shell:

- `id`
- `name`
- `tonePreference`
- `mood`
- `createdAt`
- `updatedAt`

## Naming Rules

- Use `message` for the outbound user text.
- Use `reply` for the backend assistant response.
- Use `tonePreference` and `mood` exactly as written.
- Keep `timestamp` in ISO format.
