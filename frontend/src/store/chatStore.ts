import { create } from "zustand";
import { nanoid } from "nanoid";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  status: "pending" | "streaming" | "complete" | "failed";
  timestamp: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "error" | "info";
}

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  toasts: Toast[];
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  appendChunk: (id: string, chunk: string) => void;
  markComplete: (id: string) => void;
  markFailed: (id: string) => void;
  clearHistory: () => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  toasts: [],

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: nanoid(),
          timestamp: Date.now(),
        },
      ],
      isStreaming:
        msg.sender === "ai" &&
        (msg.status === "streaming" || msg.status === "pending")
          ? true
          : state.isStreaming,
    })),

  appendChunk: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id
          ? { ...m, text: m.text + chunk, ...(m.status !== "streaming" && { status: "streaming" as const }) }
          : m
      ),
    })),

  markComplete: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status: "complete" } : m
      ),
      isStreaming: false,
    })),

  markFailed: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status: "failed" } : m
      ),
      isStreaming: false,
    })),

  clearHistory: () =>
    set({
      messages: [],
      isStreaming: false,
    }),

  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: nanoid() }],
    })),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useChatStore;
