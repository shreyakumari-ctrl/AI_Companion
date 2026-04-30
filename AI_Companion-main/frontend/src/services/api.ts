import { getPersonalityPayload, type PersonalityPreset } from "@/lib/chatPersonality";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
const V1_API_BASE = "/api/v1";

export interface MessageTurn {
  sender: "user" | "ai";
  text: string;
}

export interface UserProfilePayload {
  goals: string;
  interests: string;
}

export interface ChatAttachmentPayload {
  id: string;
  kind: "photo" | "camera" | "file" | "drive" | "notebook";
  label: string;
  meta?: string;
}

export type ChatMode = "search" | "analyze" | "create";
export type AIProvider = "Gemini" | "OpenAI" | "DeepSeek" | "Groq";
type BackendProvider = "gemini" | "openai";

export interface ApiError {
  status: number;
  message: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  provider: string;
  model: string | null;
  memoryCount: number;
  cacheHit: boolean;
  context: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
  lastMessage: {
    role: string;
    content: string;
    createdAt: string;
    provider: string | null;
  } | null;
}

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  provider: string | null;
  createdAt: string;
}

export interface ChatStreamMeta {
  conversationId: string;
  provider: string;
  model: string | null;
  memoryCount: number;
  cacheHit: boolean;
  context: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
  timestamp: string;
}

export interface ChatPromptOverrides {
  tonePreference?: string;
  mood?: string;
}

function sanitizeChatPayload(payload: {
  message: string;
  provider: BackendProvider;
  history: MessageTurn[];
  conversationId?: string | null;
  userProfile: UserProfilePayload;
  attachments: ChatAttachmentPayload[];
  mode: ChatMode;
  personality: PersonalityPreset;
  tonePreference?: string;
  mood?: string;
}) {
  return {
    ...payload,
    message: payload.message.trim().slice(0, 1000),
    tonePreference: payload.tonePreference?.trim().slice(0, 60),
    mood: payload.mood?.trim().slice(0, 60),
  };
}

function toBackendProvider(provider: AIProvider): BackendProvider {
  if (provider === "OpenAI") {
    return "openai";
  }

  return "gemini";
}

function normalizeApiError(status: number, rawMessage: string) {
  const message = rawMessage.trim();

  if (status === 429 || /quota|rate limit|resource_exhausted/i.test(message)) {
    return {
      status,
      message: "Clizel hit a rate limit. Give it a sec and try again.",
    } satisfies ApiError;
  }

  if (status === 503 || /unavailable|network|connection|server/i.test(message)) {
    return {
      status,
      message: "Clizel can't reach the server right now. Check the backend and try again.",
    } satisfies ApiError;
  }

  return {
    status,
    message: message || "Oops, something went wrong. Please try again.",
  } satisfies ApiError;
}

async function parseApiError(response: Response): Promise<ApiError> {
  const errorText = await response.text();

  try {
    const errorJson = JSON.parse(errorText);
    return normalizeApiError(
      response.status,
      errorJson.error ?? errorJson.message ?? errorText,
    );
  } catch {
    return normalizeApiError(response.status, errorText);
  }
}

function consumeSseEventBlock(
  eventBlock: string,
  onChunk: (chunk: string) => void,
  onMeta: (meta: ChatStreamMeta) => void,
) {
  let eventType = "message";
  const dataLines: string[] = [];

  for (const rawLine of eventBlock.split("\n")) {
    const line = rawLine.replace(/\r$/, "");

    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      let value = line.slice("data:".length);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
      dataLines.push(value);
    }
  }

  if (!dataLines.length) {
    return false;
  }

  const data = dataLines.join("\n");

  if (data === "[DONE]") {
    return true;
  }

  if (data === "[ERROR]") {
    throw normalizeApiError(500, "The stream ended unexpectedly.");
  }

  if (eventType === "meta") {
    try {
      onMeta(JSON.parse(data) as ChatStreamMeta);
    } catch {
      throw normalizeApiError(500, "The stream metadata payload was malformed.");
    }

    return false;
  }

  onChunk(data.replace(/\\n/g, "\n"));
  return false;
}

export async function sendMessage(
  message: string,
  provider: AIProvider,
  personality: PersonalityPreset,
  history: MessageTurn[],
  userProfile: UserProfilePayload,
  attachments: ChatAttachmentPayload[] = [],
  mode: ChatMode = "search",
  promptOverrides: ChatPromptOverrides = {},
  conversationId?: string | null,
): Promise<ChatResponse> {
  let response: Response;
  const requestBody = JSON.stringify(sanitizeChatPayload({
    message,
    provider: toBackendProvider(provider),
    history: history.slice(-5),
    conversationId,
    userProfile,
    attachments,
    mode,
    ...getPersonalityPayload(personality),
    ...promptOverrides,
  }));

  try {
    response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: createJsonHeaders(true),
      body: requestBody,
    });
  } catch {
    throw normalizeApiError(503, "Network request failed.");
  }

  if (response.status === 401 && readAccessToken()) {
    storeAccessToken(null);

    try {
      response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: createJsonHeaders(false),
        body: requestBody,
      });
    } catch {
      throw normalizeApiError(503, "Network request failed.");
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as ChatResponse;
}

export async function sendMessageStream(
  message: string,
  provider: AIProvider,
  personality: PersonalityPreset,
  history: MessageTurn[],
  userProfile: UserProfilePayload,
  onChunk: (chunk: string) => void,
  attachments: ChatAttachmentPayload[] = [],
  mode: ChatMode = "search",
  promptOverrides: ChatPromptOverrides = {},
  conversationId?: string | null,
): Promise<ChatStreamMeta | null> {
  let response: Response;
  let streamMeta: ChatStreamMeta | null = null;
  let receivedStreamChunk = false;
  const requestBody = JSON.stringify(sanitizeChatPayload({
    message,
    provider: toBackendProvider(provider),
    history: history.slice(-5),
    conversationId,
    userProfile,
    attachments,
    mode,
    ...getPersonalityPayload(personality),
    ...promptOverrides,
  }));

  try {
    response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: createJsonHeaders(true),
      body: requestBody,
    });
  } catch {
    throw normalizeApiError(503, "Network request failed.");
  }

  if (response.status === 401 && readAccessToken()) {
    storeAccessToken(null);

    try {
      response = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: createJsonHeaders(false),
        body: requestBody,
      });
    } catch {
      throw normalizeApiError(503, "Network request failed.");
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (!response.body) {
    throw normalizeApiError(500, "No response body was returned.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function processEventBlocks(eventBlocks: string[]) {
    for (const eventBlock of eventBlocks) {
      const normalizedBlock = eventBlock.replace(/\r/g, "");

      if (!normalizedBlock.replace(/\n/g, "").length) {
        continue;
      }

      try {
        const isDone = consumeSseEventBlock(
          normalizedBlock,
          (chunk) => {
            if (chunk) {
              receivedStreamChunk = true;
            }
            onChunk(chunk);
          },
          (meta) => {
            streamMeta = meta;
          },
        );

        if (isDone) {
          return true;
        }
      } catch (error) {
        if (receivedStreamChunk) {
          return true;
        }

        throw error;
      }
    }

    return false;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const eventBlocks = buffer.split("\n\n");
      buffer = eventBlocks.pop() ?? "";

      if (processEventBlocks(eventBlocks)) {
        return streamMeta;
      }
    }
  } catch (error) {
    if (receivedStreamChunk) {
      return streamMeta;
    }

    throw error;
  }

  const trailingBuffer = `${buffer}${decoder.decode()}`.replace(/\r\n/g, "\n");

  if (trailingBuffer.replace(/\r|\n/g, "").length) {
    processEventBlocks([trailingBuffer]);
  }

  return streamMeta;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
}

export interface ProfilePayload {
  name: string;
  email: string;
  bio: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  tonePreference: string;
  mood: string;
  plan?: "FREE" | "PRO";
  isPro?: boolean;
}

export interface AuthSessionPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  accessTokenExpiresInMinutes: number;
  refreshTokenExpiresInDays: number;
}

export interface AuthStatePayload {
  user: AuthUser;
  sessionId: string;
}

export interface AuthProfileUpdatePayload {
  name?: string | null;
  tonePreference?: string;
  mood?: string;
}

const ACCESS_TOKEN_KEY = "clizel-access-token";

async function parseJsonOrError(response: Response) {
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return response.json();
}

function readAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function storeAccessToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function getAuthHeaders() {
  const token = readAccessToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function createJsonHeaders(includeAuth = true) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (includeAuth) {
    for (const [key, value] of Object.entries(getAuthHeaders())) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function authRequest(path: string, init?: RequestInit) {
  return authenticatedRequest(`${API_URL}/api/auth${path}`, init);
}

async function authenticatedRequest(url: string, init?: RequestInit) {
  let response: Response;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(getAuthHeaders())) {
    headers.set(key, value);
  }

  try {
    response = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw normalizeApiError(503, "Network request failed.");
  }

  if (response.status === 401 && readAccessToken()) {
    storeAccessToken(null);
  }

  return response;
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  const response = await fetch(`${V1_API_BASE}/activity`);
  return parseJsonOrError(response);
}

export async function getProfile(): Promise<ProfilePayload> {
  const response = await fetch(`${V1_API_BASE}/profile`);
  return parseJsonOrError(response);
}

export async function updateProfile(profile: ProfilePayload): Promise<ProfilePayload> {
  const response = await fetch(`${V1_API_BASE}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  return parseJsonOrError(response);
}

export async function loginUser(email: string, password: string): Promise<AuthSessionPayload> {
  const response = await authRequest("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = (await parseJsonOrError(response)) as AuthSessionPayload;
  storeAccessToken(session.accessToken);
  return session;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<AuthSessionPayload> {
  const response = await authRequest("/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  const session = (await parseJsonOrError(response)) as AuthSessionPayload;
  storeAccessToken(session.accessToken);
  return session;
}

export async function loginWithGoogleCredential(
  credential: string,
): Promise<AuthSessionPayload> {
  const response = await authRequest("/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  const session = (await parseJsonOrError(response)) as AuthSessionPayload;
  storeAccessToken(session.accessToken);
  return session;
}

export async function logoutUser(): Promise<void> {
  const response = await authRequest("/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken: null }),
  });
  await parseJsonOrError(response);
  storeAccessToken(null);
}

export async function getCurrentUser(): Promise<AuthStatePayload> {
  const response = await authRequest("/me", {
    method: "GET",
  });
  return parseJsonOrError(response);
}

export async function updateAuthProfile(
  payload: AuthProfileUpdatePayload,
): Promise<AuthStatePayload> {
  const response = await authRequest("/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseJsonOrError(response);
}

export async function getConversations(limit = 20): Promise<ConversationSummary[]> {
  const response = await authenticatedRequest(
    `${API_URL}/api/conversations?limit=${limit}`,
    {
      method: "GET",
    },
  );
  const data = (await parseJsonOrError(response)) as {
    conversations: ConversationSummary[];
  };
  return data.conversations;
}

export async function getConversationMessages(
  conversationId: string,
  limit = 100,
): Promise<ConversationMessage[]> {
  const response = await authenticatedRequest(
    `${API_URL}/api/conversations/${conversationId}/messages?limit=${limit}`,
    {
      method: "GET",
    },
  );
  const data = (await parseJsonOrError(response)) as {
    messages: ConversationMessage[];
  };
  return data.messages;
}

// ============================================
// PAYMENT API
// ============================================

export interface PaymentOrderPayload {
  amount: number; // in INR
  currency: string;
  receipt: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface PaymentVerifyPayload {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
}

export async function createPaymentOrder(
  amount: number,
): Promise<PaymentOrderResponse> {
  const response = await authenticatedRequest(
    `${API_URL}/api/payment/create-order`,
    {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `order_${Date.now()}`,
      }),
    },
  );
  return parseJsonOrError(response);
}

export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<PaymentVerifyResponse> {
  const response = await authenticatedRequest(
    `${API_URL}/api/payment/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        orderId,
        paymentId,
        signature,
      }),
    },
  );
  return parseJsonOrError(response);
}
