# Backend Implementation Plan

This document outlines the exact backend tasks required based on the current frontend–backend gaps. It focuses strictly on the assigned scope: attachments, structured chat modes, profile syncing, and replacing mock endpoints.

---

## 1. Attachment Support in Chat APIs

### Goal
Enable the backend to accept, process, and persist attachments (images, files, etc.) sent from the frontend chat interface.

### Steps

#### 1.1 Extend Chat Input Contract
- Update the chat request type to include attachments:
```ts
attachments?: {
  type: "image" | "file";
  url?: string;
  base64?: string;
  name?: string;
}[];
```

#### 1.2 Pass Attachments into Chat Flow
- Update `executeChat()` and `streamChat()` to include attachments in:
  - `prepareChatRequest()`
  - `inferenceRequest`

#### 1.3 Handle Attachments in Chat Service
- Ensure attachments are available alongside:
  - message
  - history
  - system prompt
- Keep attachments optional to maintain backward compatibility.

#### 1.4 Persist Attachments in Database
- Update Prisma `chatMessage` model:
```ts
attachments Json?
```

- Modify `persistConversationTurn()` to store attachments with each message.

---

## 2. Structured Chat Modes (Search, Analyze, Create)

### Goal
Introduce explicit backend support for chat modes instead of relying on prompt injection from the frontend.

### Steps

#### 2.1 Extend Chat Input
- Add mode field:
```ts
mode?: "search" | "analyze" | "create";
```

#### 2.2 Integrate Mode into Chat Flow
- Pass `mode` into `prepareChatRequest()`.

#### 2.3 Modify Prompt Construction
- Update system prompt logic to include mode-specific instructions:
  - search → research-focused responses
  - analyze → critical reasoning
  - create → creative generation

- This should be done before or within `resolveTemplate()`.

#### 2.4 Ensure Backward Compatibility
- If `mode` is not provided, default behavior remains unchanged.

---

## 3. Profile Syncing (Bio and Avatar)

### Goal
Extend backend profile support to match frontend fields (bio and avatar).

### Steps

#### 3.1 Update Prisma User Model
Add new fields:
```ts
bio String?
avatarUrl String?
```

#### 3.2 Update Profile API

##### GET /profile
- Include:
  - bio
  - avatarUrl

##### PATCH /profile
- Allow updating:
  - bio
  - avatarUrl

#### 3.3 Data Handling
- Accept avatar as URL (preferred approach).
- Do not store raw image data in database.

---

## 4. Replace Frontend Mock Activity/Profile Routes

### Goal
Provide real backend endpoints to replace frontend mock data.

### Steps

#### 4.1 Activity Endpoint

Create:
```
GET /activity
```

Response should include:
- Recent conversations
- Recent messages

#### 4.2 Data Source
- Reuse existing functions:
  - `listConversationsForUser()`
  - Conversation/message queries from Prisma

#### 4.3 Profile Flow Completion
- Ensure profile endpoints fully replace any frontend mock logic.

---

## Notes

- All new fields and features must be optional to avoid breaking existing functionality.
- No major refactoring of existing architecture should be done.
- Focus on extending current functionality, not restructuring it.
