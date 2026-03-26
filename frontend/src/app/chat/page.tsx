"use client";

import { FormEvent, useRef, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { sendMessageStream, MessageTurn, ApiError } from "@/services/api";
import PersonalitySelector, { Personality } from "@/components/PersonalitySelector";

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
  const [personality, setPersonality] = useState<Personality>("Friendly");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll whenever messages or typing state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
    
    // Add user message to UI
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    // Prepare history for API call (excluding current message)
    const history: MessageTurn[] = messages.map(m => ({
      sender: m.sender,
      text: m.text
    }));

    try {
      let aiText = "";
      const aiId = `ai-${Date.now()}`;
      
      // Call streaming API
      await sendMessageStream(
        text,
        personality,
        history,
        (chunk) => {
          // Once we get first chunk, stop showing "Clidy is typing" and show AI bubble
          if (aiText === "") {
            setIsTyping(false);
            setMessages((prev) => [...prev, { id: aiId, sender: "ai", text: "" }]);
          }
          
          aiText += chunk;
          
          // Update the specific AI message with accumulated text
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, text: aiText } : m))
          );
        }
      );
      
      setIsTyping(false);
    } catch (err) {
      setIsTyping(false);
      const apiErr = err as ApiError;
      setError(apiErr.message || "Oops 😅 Something went wrong. Please try again!");
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleRetry() {
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUser) {
      setInput(lastUser.text);
      setError(null);
    } else {
      setError(null);
    }
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

        {/* ── Personality Selector ──────────────────── */}
        <PersonalitySelector 
          selected={personality} 
          onSelect={setPersonality}
          disabled={isTyping} 
        />

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
                {msg.sender === "user" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    👤
                  </div>
                )}
              </article>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="typing-wrap" aria-label="Clidy is typing">
                <div className="bubble-avatar" aria-hidden="true">
                  ✨
                </div>
                <div className="typing-indicator" title="Clidy is typing...">
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
            placeholder={`Talk to Clidy... 😊`}
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
