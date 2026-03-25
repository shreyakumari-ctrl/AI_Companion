"use client";

import { FormEvent, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { sendMessage } from "@/services/api";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hey 👋 I'm Clidy, your friendly AI companion! What's on your mind today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll whenever messages or typing state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /** Stream AI response character by character */
  async function streamText(fullText: string, msgId: string) {
    for (let i = 1; i <= fullText.length; i++) {
      // ~20ms per character feels natural without being slow
      await new Promise((r) => setTimeout(r, 18));
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: fullText.slice(0, i) } : m))
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    // 1. Show user message immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // 2. Call API
      const reply = await sendMessage(text);

      // 3. Stop typing indicator, add empty AI bubble, then stream text
      setIsTyping(false);
      const aiId = `ai-${Date.now()}`;
      setMessages((prev) => [...prev, { id: aiId, sender: "ai", text: "" }]);
      await streamText(reply, aiId);
    } catch {
      setIsTyping(false);
      setError("Oops 😅 Something went wrong. Please try again!");
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleRetry() {
    setError(null);
    // Pre-fill input with the last user message so they can re-send
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUser) setInput(lastUser.text);
  }

  return (
    <div className="chat-shell">
      <div className="chat-panel">
        {/* ── Header ─────────────────────────────────── */}
        <header className="chat-header">
          <Link href="/" className="back-btn" title="Back to home">
            ←
          </Link>
          <div className="chat-header-info">
            <div className="chat-avatar">✨</div>
            <div>
              <h1 className="chat-title">Clidy AI</h1>
              <div className="chat-status">
                <span className="status-dot" /> Always here for you
              </div>
            </div>
          </div>
        </header>

        {/* ── Messages ───────────────────────────────── */}
        <div className="chat-messages">
          <div className="chat-log" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`bubble bubble--${msg.sender === "ai" ? "ai" : "user"}`}
              >
                {msg.sender === "ai" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    ✨
                  </div>
                )}
                <p className="bubble-text">{msg.text || "\u00A0"}</p>
              </article>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="typing-wrap" aria-label="Clidy is typing">
                <div className="bubble-avatar" aria-hidden="true">
                  ✨
                </div>
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Error Bar ──────────────────────────────── */}
        {error && (
          <div className="error-bar" role="alert">
            <span>{error}</span>
            <button className="retry-btn" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {/* ── Composer ───────────────────────────────── */}
        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            id="chat-input"
            className="composer-input"
            placeholder="Talk to Clidy... 😊"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
            disabled={isTyping}
            autoComplete="off"
            autoFocus
            aria-label="Message input"
          />
          <button
            className="composer-send"
            type="submit"
            disabled={isTyping || !input.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
