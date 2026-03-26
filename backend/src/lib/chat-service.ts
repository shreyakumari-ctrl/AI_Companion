import { env } from "./env";
import { providerRegistry, type HistoryTurn, type InferenceRequest } from "./adapters";
import { HttpError } from "./http-error";
import { prisma } from "./prisma";
import { resolveTemplate } from "./promptTemplates";

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

async function resolveStoredConversation(params: {
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

  return {
    adapter,
    provider,
    conversationId: conversation?.id ?? null,
    userContext: {
      userId: effectiveUserId,
      tonePreference,
      mood,
    },
    inferenceRequest: {
      message: params.message,
      history: recentTurns,
      template: {
        systemInstruction: resolveTemplate(params.templateId, {
          tonePreference,
          mood,
        }),
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

  let reply: string;
  let provider = prepared.provider;

  if (!prepared.adapter.isAvailable()) {
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
  };
}

export async function streamChat(
  params: ChatExecutionInput,
  onChunk: (chunk: string) => void,
  auth?: AuthContext,
): Promise<Omit<ChatResult, "reply">> {
  const prepared = await prepareChatRequest(params, auth);
  const memoryCount = prepared.inferenceRequest.history.length;
  let provider = prepared.provider;
  let reply = "";

  if (!prepared.adapter.isAvailable()) {
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
  };
}
