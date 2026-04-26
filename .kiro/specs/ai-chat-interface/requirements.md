# Requirements Document

## Introduction

This feature transforms the existing Clidy AI chat prototype into a production-ready full-stack AI chat interface. The work covers four areas: a polished dynamic chat UI with Markdown rendering and streaming text output; a structured API integration layer that centralises all HTTP calls and reads URLs from environment variables; a backend inference controller that can route requests to multiple LLM providers (Gemini, GPT, etc.); and robust error handling on both the client and server sides. The existing Next.js frontend and Node/Express + Prisma + SQLite backend are the target platforms, with Gemini already partially wired up.

---

## Glossary

- **Chat_Interface**: The Next.js client-side component that renders the conversation and accepts user input.
- **API_Service**: The dedicated frontend utility module (`src/services/`) responsible for all outbound HTTP requests to the backend.
- **Inference_Controller**: The backend module that selects and invokes the appropriate LLM provider based on request parameters.
- **LLM_Provider**: An external large-language-model service (e.g. Gemini, OpenAI GPT).
- **Prompt_Template**: A server-side wrapper that prepends system instructions to the raw user message before it is sent to an LLM_Provider.
- **Context_Window**: The rolling set of the last N conversation turns sent to the LLM_Provider to maintain short-term memory.
- **Stream**: A Server-Sent Events (SSE) or chunked HTTP response that delivers LLM output token-by-token.
- **Toast**: A transient, non-blocking UI notification displayed to the user.
- **Retry_Button**: A UI control that re-submits the most recent failed request without requiring the user to retype their message.
- **Typing_Indicator**: An animated UI element shown while the backend is generating a response.
- **Markdown_Renderer**: A frontend component that converts Markdown-formatted text (code blocks, lists, bold, etc.) into styled HTML.
- **Env_Config**: Environment variables loaded at runtime; never bundled into client-side code.

---

## Requirements

### Requirement 1: Dynamic Chat Interface

**User Story:** As a user, I want a responsive chat interface that shows my messages and AI replies in real time, so that the conversation feels natural and immediate.

#### Acceptance Criteria

1. THE Chat_Interface SHALL display user messages and AI replies in chronological order within a scrollable message list.
2. WHEN a new message or AI reply is added, THE Chat_Interface SHALL automatically scroll the viewport to the most recent message.
3. WHILE the backend is generating a response, THE Chat_Interface SHALL display a Typing_Indicator.
4. WHEN the backend response is received, THE Chat_Interface SHALL hide the Typing_Indicator and render the AI reply.
5. WHILE the backend is generating a response, THE Chat_Interface SHALL disable the message input field and send button to prevent duplicate submissions.
6. THE Markdown_Renderer SHALL render AI reply text that contains Markdown syntax (code blocks, inline code, ordered lists, unordered lists, bold, italic) as formatted HTML.
7. THE Markdown_Renderer SHALL sanitize rendered HTML to prevent cross-site scripting (XSS) injection.
8. WHEN an AI reply contains a fenced code block, THE Markdown_Renderer SHALL apply syntax highlighting and display a copy-to-clipboard button.

---

### Requirement 2: API Integration Layer

**User Story:** As a developer, I want all frontend HTTP calls centralised in a dedicated service module that reads endpoint URLs from environment variables, so that no URLs are hardcoded and the integration is easy to maintain.

#### Acceptance Criteria

1. THE API_Service SHALL expose a `sendMessage` function that accepts a user message string and an optional conversation history array, and returns the AI reply.
2. THE API_Service SHALL read the backend base URL exclusively from the `NEXT_PUBLIC_API_URL` environment variable; no URL string literals SHALL appear outside the API_Service module.
3. WHEN `NEXT_PUBLIC_API_URL` is not set at build time, THE API_Service SHALL throw a configuration error that surfaces in the browser console and prevents the request from being sent.
4. THE API_Service SHALL set the `Content-Type: application/json` header on every outbound POST request.
5. WHEN the backend returns an HTTP status code outside the 2xx range, THE API_Service SHALL throw a typed error object containing the status code and a human-readable message.
6. THE API_Service SHALL expose a `sendMessageStream` function that accepts a user message string and a callback, and invokes the callback with each received text chunk until the stream closes.

---

### Requirement 3: Streaming Response Support

**User Story:** As a user, I want AI responses to appear word-by-word as they are generated, so that I do not have to wait for the full reply before reading it.

#### Acceptance Criteria

1. WHEN the Chat_Interface sends a message, THE API_Service SHALL open a streaming connection to the backend `/api/chat/stream` endpoint using the Fetch API with `ReadableStream`.
2. WHILE a Stream is open, THE Chat_Interface SHALL append each received text chunk to the current AI reply bubble in the message list.
3. WHEN the Stream closes normally, THE Chat_Interface SHALL mark the AI reply as complete and hide the Typing_Indicator.
4. IF the Stream closes with an error, THEN THE Chat_Interface SHALL display a Toast notification and show a Retry_Button on the failed message.
5. THE backend stream endpoint SHALL emit chunks using the `text/event-stream` content type with `data:` prefixed lines.
6. WHEN the LLM_Provider does not support streaming, THE backend stream endpoint SHALL emit the full reply as a single `data:` chunk and then close the stream.

---

### Requirement 4: Client-Side Error Handling

**User Story:** As a user, I want clear feedback when something goes wrong and an easy way to retry, so that I am never left wondering whether my message was received.

#### Acceptance Criteria

1. WHEN a network request fails due to a connectivity issue, THE Chat_Interface SHALL display a Toast notification with the message "Connection lost. Check your network and try again."
2. WHEN the backend returns a 5xx error, THE Chat_Interface SHALL display a Toast notification with the message "Something went wrong on our end. Please try again."
3. WHEN the backend returns a 4xx error, THE Chat_Interface SHALL display a Toast notification with the specific error message returned by the backend.
4. WHEN a request fails for any reason, THE Chat_Interface SHALL render a Retry_Button beneath the failed user message.
5. WHEN the user activates the Retry_Button, THE Chat_Interface SHALL re-submit the original message without requiring the user to retype it.
6. THE Toast SHALL automatically dismiss after 5 seconds unless the user manually closes it.
7. WHEN multiple errors occur in rapid succession, THE Chat_Interface SHALL queue Toast notifications and display them one at a time.

---

### Requirement 5: Inference Controller (Multi-Provider Routing)

**User Story:** As a developer, I want a central backend controller that can route inference requests to different LLM providers, so that I can switch or add providers without rewriting request-handling logic.

#### Acceptance Criteria

1. THE Inference_Controller SHALL accept a `provider` field in the request body with allowed values `"gemini"` and `"openai"`; if omitted, THE Inference_Controller SHALL default to `"gemini"`.
2. WHEN `provider` is `"gemini"`, THE Inference_Controller SHALL delegate the request to the Gemini adapter.
3. WHEN `provider` is `"openai"`, THE Inference_Controller SHALL delegate the request to the OpenAI adapter.
4. IF the requested provider's API key is not present in Env_Config, THEN THE Inference_Controller SHALL return HTTP 503 with the message `"Provider <name> is not configured on this server."`.
5. THE Inference_Controller SHALL expose a `/api/providers` GET endpoint that returns a JSON array of provider names whose API keys are currently configured.
6. WHEN a new LLM_Provider adapter is added, THE Inference_Controller SHALL require no changes to the routing logic beyond registering the new adapter.

---

### Requirement 6: API Gateway and Secret Management

**User Story:** As a developer, I want all LLM provider API keys stored exclusively in server-side environment variables, so that secrets are never exposed to the browser.

#### Acceptance Criteria

1. THE backend SHALL load all LLM provider API keys from `.env` files using the existing `env.ts` validation module; no API key SHALL be hardcoded in source files.
2. THE backend SHALL never include API keys in any HTTP response body or header.
3. WHEN the backend starts and a required environment variable is missing, THE backend SHALL log a descriptive error and exit with a non-zero status code.
4. THE frontend `NEXT_PUBLIC_` environment variables SHALL contain only the backend base URL and non-sensitive configuration; no LLM API keys SHALL be prefixed with `NEXT_PUBLIC_`.

---

### Requirement 7: Prompt Templating

**User Story:** As a developer, I want a server-side prompt template system that wraps user messages with system instructions, so that the AI persona and behaviour can be configured without changing application code.

#### Acceptance Criteria

1. THE Prompt_Template SHALL prepend a configurable system instruction string to every message sent to an LLM_Provider.
2. THE Prompt_Template SHALL interpolate the user's `tonePreference` and `mood` fields into the system instruction string at request time.
3. WHEN a `templateId` field is present in the request body, THE Prompt_Template SHALL load the corresponding template from a server-side template registry.
4. IF `templateId` is absent, THEN THE Prompt_Template SHALL use the default template defined in Env_Config (`DEFAULT_PROMPT_TEMPLATE`).
5. THE Prompt_Template SHALL be solution-free with respect to the LLM_Provider; the same template SHALL be usable with any registered provider.

---

### Requirement 8: Context Management (Short-Term Memory)

**User Story:** As a user, I want the AI to remember what I said earlier in the conversation, so that my replies feel coherent and I do not have to repeat myself.

#### Acceptance Criteria

1. THE Chat_Interface SHALL maintain a local conversation history array containing all messages exchanged in the current session.
2. WHEN sending a message, THE API_Service SHALL include the last 5 turns (user + AI pairs) from the conversation history in the request body as a `history` array.
3. THE Inference_Controller SHALL prepend the received `history` array to the LLM_Provider request in chronological order, before the current user message.
4. THE Inference_Controller SHALL truncate the history to a maximum of 5 turns before forwarding to the LLM_Provider, discarding the oldest turns first.
5. WHEN the conversation history is empty (first message), THE Inference_Controller SHALL send only the current user message and the system prompt to the LLM_Provider.
6. THE Chat_Interface SHALL provide a "Clear conversation" control that resets the local conversation history array to empty.
