import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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

export interface UserProfile {
  goals: string;
  interests: string;
  personality: "Friendly" | "Funny" | "Motivational";
  onboardingCompleted: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  toasts: Toast[];
  conversationId: string | null;
  userProfile: UserProfile;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => string;
  updateMessage: (id: string, text: string) => void;
  appendChunk: (id: string, chunk: string) => void;
  markComplete: (id: string) => void;
  markFailed: (id: string) => void;
  removeMessage: (id: string) => void;
  clearHistory: () => void;
  setConversationId: (conversationId: string | null) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const defaultUserProfile: UserProfile = {
  goals: "",
  interests: "",
  personality: "Friendly",
  onboardingCompleted: false,
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isStreaming: false,
      toasts: [],
      conversationId: null,
      userProfile: defaultUserProfile,

      addMessage: (msg) => {
        const id = nanoid();

        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id,
              timestamp: Date.now(),
            },
          ],
          isStreaming:
            msg.sender === "ai" &&
            (msg.status === "streaming" || msg.status === "pending")
              ? true
              : state.isStreaming,
        }));

        return id;
      },

      updateMessage: (id, text) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id
              ? {
                  ...message,
                  text,
                  timestamp: Date.now(),
                }
              : message,
          ),
        })),

      appendChunk: (id, chunk) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id
              ? {
                  ...m,
                  text: m.text + chunk,
                  ...(m.status !== "streaming" && {
                    status: "streaming" as const,
                  }),
                }
              : m,
          ),
        })),

      markComplete: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, status: "complete" } : m,
          ),
          isStreaming: false,
        })),

      markFailed: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, status: "failed" } : m,
          ),
          isStreaming: false,
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
          isStreaming: false,
        })),

      clearHistory: () =>
        set({
          messages: [],
          isStreaming: false,
          conversationId: null,
        }),

      setConversationId: (conversationId) =>
        set({
          conversationId,
        }),

      updateUserProfile: (profile) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            ...profile,
          },
        })),

      pushToast: (toast) =>
        set((state) => {
          const exists = state.toasts.some(
            (existing) =>
              existing.message === toast.message &&
              existing.type === toast.type,
          );

          return exists
            ? state
            : {
                toasts: [...state.toasts, { ...toast, id: nanoid() }],
              };
        }),

      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "clidy-chat-store",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        messages: state.messages,
        conversationId: state.conversationId,
        userProfile: state.userProfile,
      }),
    },
  ),
);

export default useChatStore;
