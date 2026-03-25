# Implementation Plan: AI Chat Interface

## Overview

Incremental implementation starting with the backend foundation (env, adapters, inference controller, prompt templates), then the frontend service layer, then UI components, and finally wiring everything together. Each step builds on the previous and is validated by tests before moving on.

## Tasks

- [x] 1. Extend backend environment schema and add OpenAI/template env vars
  - Add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `DEFAULT_PROMPT_TEMPLATE` fields to `backend/src/env.ts` Zod schema
  - Ensure startup exits with non-zero status when required vars are missing
  - _Requirements: 6.1, 6.3_

- [x] 2. Implement PromptTemplateRegistry
  - [x] 2.1 Create `backend/src/lib/promptTemplates.ts` with in-memory template map, `resolveTemplate(templateId?, vars)`, and default template fallback from `env.DEFAULT_PROMPT_TEMPLATE`
    - Support `{{tonePreference}}` and `{{mood}}` placeholder interpolation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 2.2 Write property test for template interpolation (Property 19)
    - **Property 19: Template interpolation**
    - **Validates: Requirements 7.2**

  - [ ]* 2.3 Write property test for template registry round-trip (Property 20)
    - **Property 20: Template registry lookup round-trip**
    - **Validates: Requirements 7.3**

  - [ ]* 2.4 Write unit tests for PromptTemplateRegistry
    - Test default template used when `templateId` absent (Req 7.4)
    - Test system instruction prepended to every prompt (Property 18, Req 7.1)
    - _Requirements: 7.1, 7.4_

- [x] 3. Implement LLM provider adapters
  - [x] 3.1 Create `backend/src/lib/adapters/gemini.ts` implementing `LLMAdapter` interface
    - Migrate existing `generateAssistantReply` logic into `generate()`
    - Implement `generateStream()` using `@google/genai` streaming API
    - `isAvailable()` checks `env.GEMINI_API_KEY`
    - _Requirements: 5.2_

  - [x] 3.2 Create `backend/src/lib/adapters/openai.ts` implementing `LLMAdapter` interface
    - Implement `generate()` and `generateStream()` using the `openai` npm package
    - `isAvailable()` checks `env.OPENAI_API_KEY`
    - _Requirements: 5.3_

  - [x] 3.3 Create `backend/src/lib/adapters/index.ts` exporting the `providerRegistry` map
    - `const providerRegistry: Record<string, LLMAdapter> = { gemini, openai }`
    - _Requirements: 5.6_

- [x] 4. Implement InferenceController router
  - [x] 4.1 Create `backend/src/routes/inference.ts` with `POST /api/chat`, `POST /api/chat/stream`, and `GET /api/providers`
    - Use `providerRegistry` for data-driven routing; default provider is `"gemini"`
    - Validate request body with Zod; return 400 on invalid input
    - Return 503 with `"Provider <name> is not configured on this server."` when API key absent
    - Prepend history (truncated to 5 turns) and resolved template before forwarding to adapter
    - SSE stream emits `data: <chunk>\n\n` lines and terminates with `data: [DONE]\n\n`
    - `/api/providers` returns array of provider names whose keys are configured
    - Never include API key values in any response body or header
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 8.3, 8.4, 8.5_

  - [ ]* 4.2 Write property test for provider routing and default (Property 14)
    - **Property 14: Provider routing and default**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 4.3 Write property test for unconfigured provider returns 503 (Property 15)
    - **Property 15: Unconfigured provider returns 503**
    - **Validates: Requirements 5.4**

  - [ ]* 4.4 Write property test for /api/providers reflects configured keys (Property 16)
    - **Property 16: /api/providers reflects configured keys**
    - **Validates: Requirements 5.5**

  - [ ]* 4.5 Write property test for API keys absent from all responses (Property 17)
    - **Property 17: API keys absent from all responses**
    - **Validates: Requirements 6.2**

  - [ ]* 4.6 Write property test for SSE line format (Property 9)
    - **Property 9: SSE lines follow data: prefix format**
    - **Validates: Requirements 3.5**

  - [ ]* 4.7 Write property test for backend history truncation (Property 23)
    - **Property 23: Backend truncates history to 5 turns**
    - **Validates: Requirements 8.3, 8.4**

  - [ ]* 4.8 Write unit tests for InferenceController
    - Test empty history sends only system prompt + message (Req 8.5)
    - Test stream closes with `data: [DONE]\n\n` (Req 3.5, 3.6)
    - _Requirements: 3.5, 3.6, 8.5_

- [x] 5. Mount inference router in Express app
  - Replace or extend the existing `chatRouter` registration in `backend/src/app.ts` with the new inference router
  - Ensure the global error handler in `app.ts` is preserved and `next(error)` delegation works
  - _Requirements: 5.1_

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement frontend Zustand store
  - [x] 7.1 Create `frontend/src/store/chatStore.ts` with `useChatStore` implementing `ChatStore` interface
    - State: `messages`, `isStreaming`, `toasts`
    - Actions: `addMessage`, `appendChunk`, `markComplete`, `markFailed`, `clearHistory`, `pushToast`, `dismissToast`
    - Use `nanoid` for message IDs; timestamps via `Date.now()`
    - _Requirements: 1.1, 1.2, 4.6, 4.7, 8.1, 8.6_

  - [ ]* 7.2 Write property test for message list chronological ordering (Property 1)
    - **Property 1: Message list chronological ordering**
    - **Validates: Requirements 1.1**

  - [ ]* 7.3 Write property test for history grows with each turn (Property 21)
    - **Property 21: History array grows with each turn**
    - **Validates: Requirements 8.1**

  - [ ]* 7.4 Write property test for clear conversation resets history (Property 24)
    - **Property 24: Clear conversation resets history to empty**
    - **Validates: Requirements 8.6**

  - [ ]* 7.5 Write property test for toast queue shows one at a time (Property 13)
    - **Property 13: Toast queue shows one at a time**
    - **Validates: Requirements 4.7**

- [x] 8. Implement API Service
  - [x] 8.1 Create `frontend/src/services/chatApi.ts` with `sendMessage` and `sendMessageStream`
    - Read base URL exclusively from `process.env.NEXT_PUBLIC_API_URL`; throw config error if unset
    - Set `Content-Type: application/json` on every POST
    - Throw typed `ApiError` on non-2xx responses
    - `sendMessageStream` reads `ReadableStream`, invokes `onChunk` per SSE `data:` line, stops on `[DONE]`
    - Include `history` array (last 5 turns) in request body
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 8.2_

  - [ ]* 8.2 Write property test for API Service uses env URL (Property 5)
    - **Property 5: API Service uses env URL for all requests**
    - **Validates: Requirements 2.2**

  - [ ]* 8.3 Write property test for Content-Type header on every POST (Property 6)
    - **Property 6: Content-Type header on every POST**
    - **Validates: Requirements 2.4**

  - [ ]* 8.4 Write property test for non-2xx throws ApiError (Property 7)
    - **Property 7: Non-2xx responses throw typed ApiError**
    - **Validates: Requirements 2.5**

  - [ ]* 8.5 Write property test for stream chunks received in order (Property 8)
    - **Property 8: Stream callback receives all chunks in order**
    - **Validates: Requirements 2.6, 3.2**

  - [ ]* 8.6 Write property test for frontend sends at most 5 history turns (Property 22)
    - **Property 22: Frontend sends at most 5 history turns**
    - **Validates: Requirements 8.2**

  - [ ]* 8.7 Write unit tests for chatApi
    - Test `NEXT_PUBLIC_API_URL` missing throws config error (Req 2.3)
    - _Requirements: 2.3_

- [x] 9. Implement UI components
  - [x] 9.1 Create `frontend/src/components/MarkdownRenderer.tsx`
    - Use `react-markdown` + `remark-gfm` + `rehype-sanitize` + `react-syntax-highlighter`
    - Render fenced code blocks with a copy-to-clipboard button
    - _Requirements: 1.6, 1.7, 1.8_

  - [ ]* 9.2 Write property test for Markdown renders to HTML (Property 2)
    - **Property 2: Markdown renders to HTML**
    - **Validates: Requirements 1.6**

  - [ ]* 9.3 Write property test for XSS payloads are stripped (Property 3)
    - **Property 3: XSS payloads are stripped**
    - **Validates: Requirements 1.7**

  - [ ]* 9.4 Write property test for code blocks include copy button (Property 4)
    - **Property 4: Code blocks include copy button**
    - **Validates: Requirements 1.8**

  - [x] 9.5 Create `frontend/src/components/TypingIndicator.tsx`
    - Three-dot animated indicator; shown while `isStreaming === true`
    - _Requirements: 1.3, 1.4_

  - [x] 9.6 Create `frontend/src/components/ToastContainer.tsx`
    - Render toast queue; auto-dismiss after 5 s via `setTimeout`; manual close via `dismissToast`
    - Display one toast at a time; queue drains sequentially
    - _Requirements: 4.6, 4.7_

- [x] 10. Refactor ChatInterface and wire everything together
  - [x] 10.1 Refactor `frontend/src/app/page.tsx` into the full `ChatInterface` component
    - Connect to `useChatStore` for messages, streaming state, and toasts
    - On submit: call `sendMessageStream`, dispatch `appendChunk` per chunk, `markComplete` on close, `markFailed` on error
    - Disable input and send button while `isStreaming === true`
    - Auto-scroll to latest message on each new message or chunk
    - Render `TypingIndicator` while streaming, `MarkdownRenderer` for AI replies, `ToastContainer` for notifications
    - Render `Retry_Button` beneath any message with `status === "failed"`; on click re-submit original message text
    - Render "Clear conversation" control that calls `clearHistory()`
    - Map error types to correct toast messages (network → Req 4.1, 5xx → Req 4.2, 4xx → Req 4.3)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 8.6_

  - [ ]* 10.2 Write property test for error toast messages (Property 10)
    - **Property 10: Error responses produce correct toast messages**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 10.3 Write property test for failed messages always show retry button (Property 11)
    - **Property 11: Failed messages always show retry button**
    - **Validates: Requirements 4.4**

  - [ ]* 10.4 Write property test for retry re-submits original message text (Property 12)
    - **Property 12: Retry re-submits original message text**
    - **Validates: Requirements 4.5**

  - [ ]* 10.5 Write unit tests for ChatInterface
    - Test typing indicator shown while streaming, hidden after complete (Req 1.3, 1.4)
    - Test input disabled while `isStreaming` (Req 1.5)
    - Test stream closes normally → message status `"complete"` (Req 3.3)
    - Test stream closes with error → message status `"failed"` + toast (Req 3.4)
    - Test toast auto-dismiss after 5 s using `vi.useFakeTimers()` (Req 4.6)
    - _Requirements: 1.3, 1.4, 1.5, 3.3, 3.4, 4.6_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` and a comment tag referencing the property number
- Test files live in `frontend/src/__tests__/` and `backend/src/__tests__/`
