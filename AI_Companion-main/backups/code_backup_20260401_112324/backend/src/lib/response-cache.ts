import crypto from "node:crypto";
import { env } from "./env";
import type { InferenceRequest } from "./adapters";

export type CachedChatResult = {
  reply: string;
  provider: string;
  model: string | null;
  cachedAt: number;
  expiresAt: number;
};

type CacheKeyInput = {
  provider: string;
  userId: string | null;
  conversationId: string | null;
  inferenceRequest: InferenceRequest;
};

class ResponseCache {
  private entries = new Map<string, CachedChatResult>();

  get(key: string) {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: Omit<CachedChatResult, "cachedAt" | "expiresAt">) {
    if (env.CACHE_TTL_SECONDS === 0) {
      return;
    }

    const cachedEntry: CachedChatResult = {
      ...value,
      cachedAt: Date.now(),
      expiresAt: Date.now() + env.CACHE_TTL_SECONDS * 1000,
    };

    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    this.entries.set(key, cachedEntry);

    while (this.entries.size > env.CACHE_MAX_ENTRIES) {
      const oldestKey = this.entries.keys().next().value;

      if (!oldestKey) {
        break;
      }

      this.entries.delete(oldestKey);
    }
  }

  size() {
    return this.entries.size;
  }
}

export function buildChatCacheKey(input: CacheKeyInput) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        provider: input.provider,
        userId: input.userId,
        conversationId: input.conversationId,
        message: input.inferenceRequest.message,
        history: input.inferenceRequest.history,
        systemInstruction: input.inferenceRequest.template.systemInstruction,
      }),
    )
    .digest("hex");
}

export const responseCache = new ResponseCache();
