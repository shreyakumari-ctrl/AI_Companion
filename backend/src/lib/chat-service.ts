import { env } from "./env";
import { providerRegistry, type HistoryTurn, type InferenceRequest } from "./adapters";
import { HttpError } from "./http-error";
import { prisma } from "./prisma";
import { resolveTemplate } from "./promptTemplates";
import { buildChatCacheKey, responseCache } from "./response-cache";

type ProviderName = keyof typeof providerRegistry;

export type ChatExecutionInput = {
  message: string;
  provider: ProviderName;
  templateId?: string;
  history: HistoryTurn[];
  conversationId?: string | null;
  userId?: string | null;
  tonePreference?: string;
  mood?: string;
};

export type AuthContext = {
  userId: string;
  email: string | null;
  sessionId: string;
};

type PreparedChatRequest = {
  adapter: (typeof providerRegistry)[ProviderName];
  conversationId: string | null;
  cacheKey: string;
  inferenceRequest: InferenceRequest;
  provider: ProviderName;
  userContext: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
};

type ChatResult = {
  reply: string;
  provider: string;
  model: string | null;
  conversationId: string;
  context: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
  memoryCount: number;
  cacheHit: boolean;
};

export type ConversationSummary = {
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
};

export type ConversationContextView = {
  conversation: {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string | null;
  };
  memoryCount: number;
  history: HistoryTurn[];
};

export type ConversationMessageView = {
  id: string;
  role: string;
  content: string;
  provider: string | null;
  createdAt: string;
};

function normalizeHistory(history: HistoryTurn[]) {
  return history
    .slice(-env.CONVERSATION_MEMORY_LIMIT)
    .map((turn) => ({
      sender: turn.sender,
      text: turn.text.trim(),
    }))
    .filter((turn) => turn.text.length > 0);
}

function mapDbRoleToHistoryTurn(role: string): HistoryTurn["sender"] {
  return role === "user" ? "user" : "ai";
}

function modelForProvider(provider: string) {
  if (provider === "gemini") {
    return env.GEMINI_MODEL;
  }

  if (provider === "openai") {
    return env.OPENAI_MODEL;
  }

  return null;
}

function buildFallbackReply(message: string) {
  return `Clidy fallback reply: I heard "${message}". The server is online, but the selected provider is unavailable right now.`;
}

export async function resolveStoredConversation(params: {
  conversationId?: string | null;
  userId: string | null;
}) {
  if (params.conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: params.conversationId,
      },
    });

    if (!conversation) {
      throw new HttpError(404, "Conversation not found.");
    }

    if (params.userId && conversation.userId && conversation.userId !== params.userId) {
      throw new HttpError(403, "Conversation access denied.");
    }

    if (!params.userId && conversation.userId) {
      throw new HttpError(401, "Authentication required for this conversation.");
    }

    return conversation;
  }

  if (!params.userId) {
    return null;
  }

  return prisma.conversation.findFirst({
    where: {
      userId: params.userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function loadRecentConversationTurns(conversationId: string) {
  const storedMessages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: env.CONVERSATION_MEMORY_LIMIT,
  });

  return storedMessages
    .reverse()
    .map((message) => ({
      sender: mapDbRoleToHistoryTurn(message.role),
      text: message.content,
    }));
}

async function prepareChatRequest(
  params: ChatExecutionInput,
  auth?: AuthContext,
): Promise<PreparedChatRequest> {
  const provider = params.provider;
  const adapter = providerRegistry[provider];

  if (!adapter) {
    throw new HttpError(400, `Unknown provider: ${provider}`);
  }

  const effectiveUserId = auth?.userId ?? params.userId ?? null;
  const user = effectiveUserId
    ? await prisma.user.findUnique({
        where: {
          id: effectiveUserId,
        },
      })
    : null;

  const conversation = await resolveStoredConversation({
    conversationId: params.conversationId,
    userId: effectiveUserId,
  });

  const recentTurns = conversation
    ? await loadRecentConversationTurns(conversation.id)
    : normalizeHistory(params.history);

  const tonePreference =
    params.tonePreference ?? user?.tonePreference ?? "friendly";
  const mood = params.mood ?? user?.mood ?? "curious";
  const systemInstruction = resolveTemplate(params.templateId, {
    tonePreference,
    mood,
  });

  return {
    adapter,
    provider,
    conversationId: conversation?.id ?? null,
    userContext: {
      userId: effectiveUserId,
      tonePreference,
      mood,
    },
    cacheKey: buildChatCacheKey({
      provider,
      userId: effectiveUserId,
      conversationId: conversation?.id ?? params.conversationId ?? null,
      inferenceRequest: {
        message: params.message,
        history: recentTurns,
        template: {
          systemInstruction,
        },
        userId: effectiveUserId,
      },
    }),
    inferenceRequest: {
      message: params.message,
      history: recentTurns,
      template: {
        systemInstruction,
      },
      userId: effectiveUserId,
    },
  };
}

async function ensureConversation(params: {
  conversationId: string | null;
  userId: string | null;
  message: string;
}) {
  if (params.conversationId) {
    return params.conversationId;
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId: params.userId,
      title: params.message.slice(0, 80),
    },
  });

  return conversation.id;
}

async function persistConversationTurn(params: {
  conversationId: string | null;
  userId: string | null;
  message: string;
  reply: string;
  provider: string;
}) {
  const conversationId = await ensureConversation({
    conversationId: params.conversationId,
    userId: params.userId,
    message: params.message,
  });

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        role: "user",
        content: params.message,
        userId: params.userId,
        conversationId,
        provider: "client",
      },
    }),
    prisma.chatMessage.create({
      data: {
        role: "assistant",
        content: params.reply,
        userId: params.userId,
        conversationId,
        provider: params.provider,
      },
    }),
    prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  return conversationId;
}

function emitCharacters(text: string, onChunk: (chunk: string) => void) {
  for (const character of text) {
    onChunk(character);
  }
}

export async function executeChat(
  params: ChatExecutionInput,
  auth?: AuthContext,
): Promise<ChatResult> {
  const prepared = await prepareChatRequest(params, auth);
  const memoryCount = prepared.inferenceRequest.history.length;
  const cached = responseCache.get(prepared.cacheKey);

  let reply: string;
  let provider = prepared.provider;
  let cacheHit = false;

  if (cached) {
    reply = cached.reply;
    provider = cached.provider as ProviderName;
    cacheHit = true;
  } else if (!prepared.adapter.isAvailable()) {
    reply = buildFallbackReply(params.message);
    provider = "fallback" as ProviderName;
  } else {
    try {
      reply = (await prepared.adapter.generate(prepared.inferenceRequest)).trim();
      if (!reply) {
        reply = buildFallbackReply(params.message);
        provider = "fallback" as ProviderName;
      }
    } catch (error) {
      console.error("Chat generation failed. Falling back to offline reply.", error);
      reply = buildFallbackReply(params.message);
      provider = "fallback" as ProviderName;
    }
  }

  if (!cacheHit && reply.trim()) {
    responseCache.set(prepared.cacheKey, {
      reply,
      provider,
      model: modelForProvider(provider),
    });
  }

  const conversationId = await persistConversationTurn({
    conversationId: prepared.conversationId,
    userId: prepared.userContext.userId,
    message: params.message,
    reply,
    provider,
  });

  return {
    reply,
    provider,
    model: provider === "fallback" ? null : modelForProvider(prepared.provider),
    conversationId,
    context: prepared.userContext,
    memoryCount,
    cacheHit,
  };
}

export async function streamChat(
  params: ChatExecutionInput,
  onChunk: (chunk: string) => void,
  auth?: AuthContext,
): Promise<Omit<ChatResult, "reply">> {
  const prepared = await prepareChatRequest(params, auth);
  const memoryCount = prepared.inferenceRequest.history.length;
  const cached = responseCache.get(prepared.cacheKey);
  let provider = prepared.provider;
  let reply = "";
  let cacheHit = false;

  if (cached) {
    reply = cached.reply;
    provider = cached.provider as ProviderName;
    cacheHit = true;
    emitCharacters(reply, onChunk);
  } else if (!prepared.adapter.isAvailable()) {
    reply = buildFallbackReply(params.message);
    provider = "fallback" as ProviderName;
    emitCharacters(reply, onChunk);
  } else {
    try {
      await prepared.adapter.generateStream(prepared.inferenceRequest, (chunk) => {
        if (!chunk) {
          return;
        }

        reply += chunk;
        emitCharacters(chunk, onChunk);
      });
    } catch (error) {
      console.error("Streaming generation failed. Falling back to offline reply.", error);

      if (!reply) {
        reply = buildFallbackReply(params.message);
        provider = "fallback" as ProviderName;
        emitCharacters(reply, onChunk);
      }
    }
  }

  if (!reply.trim()) {
    reply = buildFallbackReply(params.message);
    provider = "fallback" as ProviderName;
  }

  if (!cacheHit && reply.trim()) {
    responseCache.set(prepared.cacheKey, {
      reply,
      provider,
      model: modelForProvider(provider),
    });
  }

  const conversationId = await persistConversationTurn({
    conversationId: prepared.conversationId,
    userId: prepared.userContext.userId,
    message: params.message,
    reply,
    provider,
  });

  return {
    provider,
    model: provider === "fallback" ? null : modelForProvider(prepared.provider),
    conversationId,
    context: prepared.userContext,
    memoryCount,
    cacheHit,
  };
}

export async function listConversationsForUser(
  auth: AuthContext,
  limit: number,
): Promise<ConversationSummary[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId: auth.userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    messageCount: conversation._count.messages,
    lastMessage: conversation.messages[0]
      ? {
          role: conversation.messages[0].role,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].createdAt.toISOString(),
          provider: conversation.messages[0].provider,
        }
      : null,
  }));
}

export async function getConversationContext(
  conversationId: string,
  auth: AuthContext,
): Promise<ConversationContextView> {
  const conversation = await resolveStoredConversation({
    conversationId,
    userId: auth.userId,
  });

  if (!conversation) {
    throw new HttpError(404, "Conversation not found.");
  }

  const history = await loadRecentConversationTurns(conversation.id);

  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      userId: conversation.userId,
    },
    memoryCount: history.length,
    history,
  };
}

export async function getConversationMessages(
  conversationId: string,
  auth: AuthContext,
  limit: number,
): Promise<ConversationMessageView[]> {
  const conversation = await resolveStoredConversation({
    conversationId,
    userId: auth.userId,
  });

  if (!conversation) {
    throw new HttpError(404, "Conversation not found.");
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    provider: message.provider,
    createdAt: message.createdAt.toISOString(),
  }));
}
