# Design Document: AI Chat Interface

## Overview

This design transforms the existing Clidy AI prototype into a production-ready full-stack chat interface. The work spans four layers:

1. **Frontend** — a Next.js React component with Markdown rendering, streaming word-by-word output, toast notifications, and context management.
2. **API Service** — a typed frontend utility module (`frontend/src/services/chatApi.ts`) that centralises all HTTP calls, reads the backend URL from `NEXT_PUBLIC_API_URL`, and exposes both `sendMessage` and `sendMessageStream`.
3. **Backend Inference Controller** — a new Express router (`backend/src/routes/inference.ts`) that routes requests to Gemini or OpenAI adapters, enforces provider availability, and exposes `/api/providers`.
4. **Prompt Templating & Context** — a server-side template registry and a rolling 5-turn history window forwarded with every request.

The existing stack (Next.js 15, Node/Express, Prisma + SQLite, `@google/genai`) is preserved. No new databases or infrastructure are introduced.

---

## Architecture

```mermaid
graph TD
    subgraph Browser
        UI[ChatInterface Component]
        SVC[chatApi Service]
        STORE[Zustand Store\nconversation history]
    end

    subgraph Next.js Server
        ENV_FE[NEXT_PUBLIC_API_URL]
    end

    subgraph Express Backend
        CHAT_ROUTE[/api/chat POST]
        STREAM_ROUTE[/api/chat/stream POST]
        PROVIDERS_ROUTE[/api/providers GET]
        INFERENCE[InferenceController]
        TEMPLATE[PromptTemplateRegistry]
        GEMINI_ADAPTER[GeminiAdapter]
        OPENAI_ADAPTER[OpenAIAdapter]
        ENV_BE[env.ts\nZod validation]
    end

    subgraph External
        GEMINI[Google Gemini API]
        OPENAI[OpenAI API]
    end

    UI -->|user message + history| SVC
    SVC -->|reads| ENV_FE
    SVC -->|POST JSON| CHAT_ROUTE
    SVC -->|POST + ReadableStream| STREAM_ROUTE
    CHAT_ROUTE --> INFERENCE
    STREAM_ROUTE --> INFERENCE
    INFERENCE --> TEMPLATE
    INFERENCE -->|provider=gemini| GEMINI_ADAPTER
    INFERENCE -->|provider=openai| OPENAI_ADAPTER
    GEMINI_ADAPTER --> GEMINI
    OPENAI_ADAPTER --> OPENAI
    PROVIDERS_ROUTE --> ENV_BE
    ENV_BE -.->|validates keys at startup| INFERENCE
```

**Key design decisions:**

- Streaming uses the native Fetch `ReadableStream` on the client and SSE (`text/event-stream`) on the server — no WebSocket dependency.
- The frontend never holds LLM API keys; all secrets live in `backend/.env` and are validated by the existing `env.ts` Zod schema.
- Provider routing is data-driven: a `providerRegistry` map replaces `if/else` chains, so adding a new provider requires only registering a new adapter.
- Conversation history is stored in a Zustand store on the client and sent as a `history` array; the backend truncates to 5 turns before forwarding to the LLM.

---

## Components and Interfaces

### Frontend

#### `ChatInterface` (`frontend/src/app/page.tsx` — refactored)

Responsibilities: render message list, typing indicator, toast queue, retry buttons, clear-conversation control, and the composer form.

State (via Zustand store `useChatStore`):
```ts
interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  toasts: Toast[];
  addMessage: (msg: ChatMessage) => void;
  appendChunk: (id: string, chunk: string) => void;
  markComplete: (id: string) => void;
  markFailed: (id: string) => void;
  clearHistory: () => void;
  pushToast: (toast: Toast) => void;
  dismissToast: (id: string) => void;
}
```

#### `MarkdownRenderer` (`frontend/src/components/MarkdownRenderer.tsx`)

Wraps `react-markdown` + `remark-gfm` for GFM support, `rehype-sanitize` for XSS prevention, and `react-syntax-highlighter` for code blocks. Each fenced code block gets a copy-to-clipboard button rendered as a wrapper component.

#### `ToastContainer` (`frontend/src/components/ToastContainer.tsx`)

Renders the toast queue. Each toast auto-dismisses after 5 s via `setTimeout`; manual close dispatches `dismissToast`. Toasts are displayed one at a time (queue-based).

#### `TypingIndicator` (`frontend/src/components/TypingIndicator.tsx`)

Three-dot animated indicator, shown while `isStreaming === true`.

---

### API Service (`frontend/src/services/chatApi.ts`)

```ts
export interface ApiError {
  status: number;
  message: string;
}

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

// Non-streaming: returns full reply string
export async function sendMessage(
  message: string,
  history?: ChatMessage[]
): Promise<string>

// Streaming: invokes onChunk for each SSE data line, resolves when stream closes
export async function sendMessageStream(
  message: string,
  history: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<void>
```

Both functions read `process.env.NEXT_PUBLIC_API_URL` and throw `ApiError` on non-2xx responses or missing config.

---

### Backend

#### `InferenceController` (`backend/src/routes/inference.ts`)

New Express router mounted at `/api/chat` (replacing the existing `chatRouter` for new endpoints) and `/api/providers`.

```ts
// Provider adapter interface
interface LLMAdapter {
  isAvailable(): boolean;
  generate(req: InferenceRequest): Promise<string>;
  generateStream(req: InferenceRequest, onChunk: (chunk: string) => void): Promise<void>;
}

interface InferenceRequest {
  message: string;
  history: HistoryTurn[];
  template: ResolvedTemplate;
  userId?: string | null;
}
```

Provider registry (data-driven, no if/else):
```ts
const providerRegistry: Record<string, LLMAdapter> = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
};
```

Endpoints:
- `POST /api/chat` — non-streaming, returns `{ reply, provider, model, timestamp }`
- `POST /api/chat/stream` — SSE streaming, emits `data: <chunk>\n\n`, ends with `data: [DONE]\n\n`
- `GET /api/providers` — returns `string[]` of configured provider names

#### `GeminiAdapter` (`backend/src/lib/adapters/gemini.ts`)

Wraps the existing `generateAssistantReply` logic. Adds `generateStream` using `@google/genai` streaming API.

#### `OpenAIAdapter` (`backend/src/lib/adapters/openai.ts`)

Wraps `openai` npm package. `isAvailable()` checks `env.OPENAI_API_KEY`.

#### `PromptTemplateRegistry` (`backend/src/lib/promptTemplates.ts`)

```ts
interface PromptTemplate {
  id: string;
  systemInstruction: string; // may contain {{tonePreference}} and {{mood}} placeholders
}

function resolveTemplate(templateId?: string, vars: TemplateVars): string
```

Default template loaded from `env.DEFAULT_PROMPT_TEMPLATE` (falls back to a hardcoded default if unset). Templates are stored as an in-memory map; no database table needed.

---

## Data Models

### Frontend (`ChatMessage`)

```ts
interface ChatMessage {
  id: string;           // nanoid
  sender: "user" | "ai";
  text: string;
  status: "pending" | "streaming" | "complete" | "failed";
  timestamp: number;    // Date.now()
}

interface Toast {
  id: string;
  message: string;
  type: "error" | "info";
}
```

### API Request / Response

**POST `/api/chat`** request body:
```ts
{
  message: string;          // 1–1000 chars
  provider?: "gemini" | "openai";  // default "gemini"
  templateId?: string;
  history?: HistoryTurn[];  // max 5 turns
  userId?: string | null;
}
```

**POST `/api/chat`** response:
```ts
{
  reply: string;
  provider: string;
  model: string | null;
  timestamp: string;        // ISO 8601
}
```

**POST `/api/chat/stream`** — same request body; response is `text/event-stream`:
```
data: Hello\n\n
data:  world\n\n
data: [DONE]\n\n
```

**GET `/api/providers`** response:
```ts
string[]  // e.g. ["gemini"]
```

### Backend env additions (`env.ts` schema extension)

```ts
OPENAI_API_KEY: z.string().trim().optional()
OPENAI_MODEL: z.string().default("gpt-4o-mini")
DEFAULT_PROMPT_TEMPLATE: z.string().default("default")
```

### History Turn

```ts
interface HistoryTurn {
  sender: "user" | "ai";
  text: string;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Message list chronological ordering

*For any* sequence of messages added to the chat store, the order of messages in the store's `messages` array should match the order in which they were added (insertion order preserved).

**Validates: Requirements 1.1**

---

### Property 2: Markdown renders to HTML

*For any* string containing Markdown syntax (bold, italic, lists, code blocks), passing it through `MarkdownRenderer` should produce an HTML string that contains the corresponding HTML elements (e.g., `<strong>`, `<em>`, `<ul>`, `<code>`).

**Validates: Requirements 1.6**

---

### Property 3: XSS payloads are stripped

*For any* input string containing XSS patterns (e.g., `<script>`, `onerror=`, `javascript:`), the output of `MarkdownRenderer` should not contain any executable script content — specifically, no `<script>` tags and no inline event handler attributes.

**Validates: Requirements 1.7**

---

### Property 4: Code blocks include copy button

*For any* input string containing a fenced code block (triple-backtick), the rendered output of `MarkdownRenderer` should include a copy-to-clipboard button element.

**Validates: Requirements 1.8**

---

### Property 5: API Service uses env URL for all requests

*For any* message sent via `sendMessage` or `sendMessageStream`, the outbound HTTP request URL should begin with the value of `NEXT_PUBLIC_API_URL`.

**Validates: Requirements 2.2**

---

### Property 6: Content-Type header on every POST

*For any* call to `sendMessage` or `sendMessageStream`, the outbound request should include the header `Content-Type: application/json`.

**Validates: Requirements 2.4**

---

### Property 7: Non-2xx responses throw typed ApiError

*For any* HTTP status code outside the 2xx range (e.g., 400, 404, 500, 503), calling `sendMessage` should throw an `ApiError` object whose `status` field equals the received status code.

**Validates: Requirements 2.5**

---

### Property 8: Stream callback receives all chunks in order

*For any* sequence of SSE `data:` lines emitted by the backend, `sendMessageStream` should invoke the `onChunk` callback once per chunk, in the same order the chunks were emitted, and the concatenation of all chunks should equal the full reply text.

**Validates: Requirements 2.6, 3.2**

---

### Property 9: SSE lines follow data: prefix format

*For any* streaming response from `/api/chat/stream`, every emitted line carrying content should match the pattern `data: <text>\n\n`, and the stream should terminate with `data: [DONE]\n\n`.

**Validates: Requirements 3.5**

---

### Property 10: Error responses produce correct toast messages

*For any* HTTP error response, the toast message displayed should follow the mapping rule: network failure → "Connection lost. Check your network and try again."; 5xx status → "Something went wrong on our end. Please try again."; 4xx status → the error message string from the response body.

**Validates: Requirements 4.1, 4.2, 4.3**

---

### Property 11: Failed messages always show retry button

*For any* message whose status is `"failed"`, the rendered chat UI should include a Retry_Button associated with that message.

**Validates: Requirements 4.4**

---

### Property 12: Retry re-submits original message text

*For any* failed message with text T, activating its Retry_Button should result in a new outbound request whose `message` field equals T.

**Validates: Requirements 4.5**

---

### Property 13: Toast queue shows one at a time

*For any* number N of errors occurring in rapid succession, the toast store should contain N toasts, and at most one toast should be in the "active/visible" position at any given time.

**Validates: Requirements 4.7**

---

### Property 14: Provider routing and default

*For any* inference request, if the `provider` field is absent the selected adapter should be the Gemini adapter; if `provider` is a valid registered key, the adapter for that key should be selected.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 15: Unconfigured provider returns 503

*For any* provider name whose API key is absent from `env`, a POST to `/api/chat` with that provider should return HTTP 503 with a message containing the provider name.

**Validates: Requirements 5.4**

---

### Property 16: /api/providers reflects configured keys

*For any* combination of API keys present in `env`, the response from `GET /api/providers` should contain exactly the set of provider names whose keys are non-empty, and no others.

**Validates: Requirements 5.5**

---

### Property 17: API keys absent from all responses

*For any* request to any backend endpoint, the response body (serialized as a string) and response headers should not contain the value of any configured LLM API key.

**Validates: Requirements 6.2**

---

### Property 18: System instruction prepended to every prompt

*For any* user message and resolved template, the string passed to the LLM adapter should start with the template's system instruction string.

**Validates: Requirements 7.1**

---

### Property 19: Template interpolation

*For any* `tonePreference` value T and `mood` value M, the resolved template string should contain T and M at the positions defined by the `{{tonePreference}}` and `{{mood}}` placeholders.

**Validates: Requirements 7.2**

---

### Property 20: Template registry lookup round-trip

*For any* `templateId` registered in the template registry, calling `resolveTemplate(templateId, vars)` should return the system instruction string associated with that ID (after variable interpolation).

**Validates: Requirements 7.3**

---

### Property 21: History array grows with each turn

*For any* sequence of N user+AI message pairs exchanged in a session, the conversation history array in the store should have length N after all exchanges complete.

**Validates: Requirements 8.1**

---

### Property 22: Frontend sends at most 5 history turns

*For any* conversation history of length N, the `history` array included in the outbound request body should have length `min(N, 5)` and should consist of the N most recent turns.

**Validates: Requirements 8.2**

---

### Property 23: Backend truncates history to 5 turns

*For any* `history` array of length N forwarded to the `InferenceController`, the array passed to the LLM adapter should have length `min(N, 5)`, containing the last 5 entries in their original order.

**Validates: Requirements 8.3, 8.4**

---

### Property 24: Clear conversation resets history to empty

*For any* conversation history of any length, calling `clearHistory()` on the store should result in the `messages` array being empty and the next outbound request containing an empty `history` array.

**Validates: Requirements 8.6**

---

## Error Handling

### Frontend

| Error condition | Detection | User-facing response |
|---|---|---|
| `NEXT_PUBLIC_API_URL` not set | `sendMessage` / `sendMessageStream` startup check | Console error + request blocked |
| Network failure (fetch throws) | `catch` on fetch call | Toast: "Connection lost. Check your network and try again." + Retry_Button |
| 4xx response | `response.ok === false`, status 400–499 | Toast: backend error message + Retry_Button |
| 5xx response | `response.ok === false`, status 500–599 | Toast: "Something went wrong on our end. Please try again." + Retry_Button |
| Stream error mid-flight | `ReadableStream` reader throws | Toast + message marked `"failed"` + Retry_Button |
| Duplicate submission | Input disabled while `isStreaming` | Prevented at UI level |

Toast lifecycle: pushed to queue → displayed → auto-dismissed after 5 s via `setTimeout` → or manually dismissed. Only one toast visible at a time; queue drains sequentially.

### Backend

| Error condition | HTTP status | Response body |
|---|---|---|
| Invalid request body (Zod) | 400 | `{ error, details }` |
| Unknown provider | 400 | `{ error: "Unknown provider: <name>" }` |
| Provider not configured | 503 | `{ error: "Provider <name> is not configured on this server." }` |
| LLM adapter throws | 500 | `{ error: "Internal server error." }` |
| Missing required env var at startup | process exit 1 | Logged to stderr |

The existing global error handler in `app.ts` is preserved. The new inference router uses `next(error)` to delegate to it.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- **Unit tests** cover specific examples, integration points, and error conditions.
- **Property-based tests** verify universal invariants across randomly generated inputs.

### Property-Based Testing

**Library**: [`fast-check`](https://github.com/dubzzz/fast-check) — works in both Node (Jest/Vitest) and browser (Vitest) environments.

Each property-based test must:
- Run a minimum of **100 iterations** (fast-check default is 100; set `numRuns: 100` explicitly).
- Include a comment tag referencing the design property:
  ```ts
  // Feature: ai-chat-interface, Property 3: XSS payloads are stripped
  ```
- Be implemented as a **single** `fc.assert(fc.property(...))` call per design property.

**Property test targets** (one test per property above):

| Property | Test file | fast-check arbitraries |
|---|---|---|
| 1 — Message ordering | `chatStore.test.ts` | `fc.array(fc.record({...}))` |
| 2 — Markdown renders HTML | `MarkdownRenderer.test.tsx` | `fc.string()` with Markdown fragments |
| 3 — XSS stripped | `MarkdownRenderer.test.tsx` | `fc.constantFrom(xssPayloads)` |
| 4 — Code block copy button | `MarkdownRenderer.test.tsx` | `fc.string()` wrapped in triple-backtick |
| 5 — API URL from env | `chatApi.test.ts` | `fc.webUrl()` for base URL |
| 6 — Content-Type header | `chatApi.test.ts` | `fc.string()` for message |
| 7 — Non-2xx throws ApiError | `chatApi.test.ts` | `fc.integer({min:400,max:599})` |
| 8 — Stream chunks in order | `chatApi.test.ts` | `fc.array(fc.string())` for chunks |
| 9 — SSE line format | `inference.test.ts` | `fc.string()` for chunk content |
| 10 — Error toast messages | `ChatInterface.test.tsx` | `fc.integer({min:400,max:599})` |
| 11 — Failed message retry button | `ChatInterface.test.tsx` | `fc.record({status: fc.constant("failed"), ...})` |
| 12 — Retry re-submits original text | `ChatInterface.test.tsx` | `fc.string({minLength:1})` |
| 13 — Toast queue one at a time | `toastStore.test.ts` | `fc.array(fc.string(), {minLength:2})` |
| 14 — Provider routing + default | `inference.test.ts` | `fc.option(fc.constantFrom("gemini","openai"))` |
| 15 — Unconfigured provider 503 | `inference.test.ts` | `fc.string()` for unknown provider name |
| 16 — /api/providers reflects keys | `inference.test.ts` | `fc.subarray(["gemini","openai"])` |
| 17 — API keys absent from responses | `inference.test.ts` | `fc.string()` for API key value |
| 18 — System instruction prepended | `promptTemplates.test.ts` | `fc.string()` for message |
| 19 — Template interpolation | `promptTemplates.test.ts` | `fc.string()` for tone/mood |
| 20 — Template registry round-trip | `promptTemplates.test.ts` | `fc.string()` for templateId |
| 21 — History grows with turns | `chatStore.test.ts` | `fc.array(fc.record({...}))` |
| 22 — Frontend sends ≤5 turns | `chatApi.test.ts` | `fc.array(fc.record({...}), {maxLength:20})` |
| 23 — Backend truncates to 5 | `inference.test.ts` | `fc.array(fc.record({...}), {maxLength:20})` |
| 24 — Clear resets history | `chatStore.test.ts` | `fc.array(fc.record({...}))` |

### Unit Tests

Unit tests focus on:
- Specific error message strings (4.1, 4.2, 4.3 exact wording)
- Typing indicator show/hide state transitions (1.3, 1.4)
- Input disabled while streaming (1.5)
- Stream closes normally → status `"complete"` (3.3)
- Stream closes with error → status `"failed"` (3.4)
- Toast auto-dismiss after 5 s (4.6, using `vi.useFakeTimers()`)
- `NEXT_PUBLIC_API_URL` missing throws config error (2.3)
- Env schema validation rejects missing required vars (6.3)
- Default template used when `templateId` absent (7.4)
- Empty history sends only system prompt + message (8.5)

### Test File Layout

```
frontend/src/
  __tests__/
    chatStore.test.ts
    chatApi.test.ts
    MarkdownRenderer.test.tsx
    ChatInterface.test.tsx
    toastStore.test.ts

backend/src/
  __tests__/
    inference.test.ts
    promptTemplates.test.ts
```
