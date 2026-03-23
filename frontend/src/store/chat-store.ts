import { create } from "zustand";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatStore = {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  addMessage: (message: ChatMessage) => void;
  setIsSending: (isSending: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    {
      id: "welcome-message",
      role: "assistant",
      content:
        "AI Companion is online. Send a message and I will bounce back through the backend heartbeat.",
      createdAt: new Date().toISOString(),
    },
  ],
  isSending: false,
  error: null,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setIsSending: (isSending) => set({ isSending }),
  setError: (error) => set({ error }),
  clearMessages: () =>
    set({
      messages: [],
      error: null,
      isSending: false,
    }),
}));
