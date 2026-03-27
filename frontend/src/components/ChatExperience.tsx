"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendMessageStream, MessageTurn } from "@/services/api";
import PersonalitySelector from "@/components/PersonalitySelector";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import OnboardingSlider from "@/components/OnboardingSlider";
import MessageBubble from "@/components/MessageBubble";
import {
  getWelcomeMessage,
  isPersonalityPreset,
  type PersonalityPreset,
} from "@/lib/chatPersonality";

type ChatExperienceProps = {
  variant?: "panel" | "immersive";
};

export default function ChatExperience({
  variant = "panel",
}: ChatExperienceProps) {
  // USING useState AS REQUESTED
  const [messages, setMessages] = useState<MessageTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [personality, setPersonality] = useState<PersonalityPreset>("Friendly");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImmersive = variant === "immersive";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    const storedPersonality = window.localStorage.getItem("clidy-personality");
    if (storedPersonality && isPersonalityPreset(storedPersonality)) {
      setPersonality(storedPersonality);
    }

    setShowOnboarding(
      window.localStorage.getItem("clidy-onboarding-done") !== "true",
    );
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem("clidy-personality", personality);
  }, [hasHydrated, personality]);

  useEffect(() => {
    if (!hasHydrated || showOnboarding || messages.length > 0) return;

    setMessages([
      {
        sender: "ai",
        text: getWelcomeMessage(personality),
      },
    ]);
  }, [hasHydrated, personality, showOnboarding, messages.length]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || showOnboarding) return;

    const userMsg: MessageTurn = { sender: "user", text };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput("");
    setErrorVisible(false);
    setIsStreaming(true);

    // AI Placeholder
    const aiMsgIndex = newMessages.length;
    setMessages((prev) => [...prev, { sender: "ai", text: "" }]);

    try {
      let fullAIResponse = "";
      
      // Memory Context: Last 4-5 messages (handled in api.ts, but we pass current messages)
      await sendMessageStream(text, personality, newMessages, (chunk) => {
        fullAIResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[aiMsgIndex]) {
            updated[aiMsgIndex] = { ...updated[aiMsgIndex], text: fullAIResponse };
          }
          return updated;
        });
      });
    } catch (err) {
      setErrorVisible(true);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleRetry() {
    setErrorVisible(false);
    const lastUser = [...messages].reverse().find(m => m.sender === "user");
    if (lastUser) setInput(lastUser.text);
    inputRef.current?.focus();
  }

  function finishOnboarding() {
    window.localStorage.setItem("clidy-onboarding-done", "true");
    setShowOnboarding(false);
    inputRef.current?.focus();
  }

  const hasOnlyWelcomeMessage =
    messages.length === 1 &&
    messages[0]?.sender === "ai";  async function handleEditMessage(index: number, newText: string) {
    if (isStreaming) return;

    // Remove all messages after the edited one (to reset context)
    const updatedMessages = messages.slice(0, index);
    const editedMsg: MessageTurn = { sender: "user", text: newText };
    const finalMessages = [...updatedMessages, editedMsg];
    
    setMessages(finalMessages);
    setIsStreaming(true);
    setErrorVisible(false);

    // AI Placeholder
    const aiMsgIndex = finalMessages.length;
    setMessages((prev) => [...prev, { sender: "ai", text: "" }]);

    try {
      let fullAIResponse = "";
      await sendMessageStream(newText, personality, finalMessages, (chunk) => {
        fullAIResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[aiMsgIndex]) {
            updated[aiMsgIndex] = { ...updated[aiMsgIndex], text: fullAIResponse };
          }
          return updated;
        });
      });
    } catch (err) {
      setErrorVisible(true);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className={`chat-shell ${isImmersive ? "chat-shell--immersive" : ""}`.trim()}>
      <OnboardingSlider
        open={showOnboarding}
        personality={personality}
        onPersonalityChange={setPersonality}
        onFinish={finishOnboarding}
      />

      <div className={`chat-panel ${isImmersive ? "chat-panel--immersive" : ""}`.trim()}>
        <header className="chat-header">
          <Link href="/" className="back-btn" title="Back to home">←</Link>
          <div className="chat-header-info">
            <div className="chat-avatar">✨</div>
            <div>
              <h1 className="chat-title">Clidy AI</h1>
              <div className="chat-status">
                <span className="status-dot" />{" "}
                {isImmersive ? "Focus mode, full chat flow" : "Always here for you"}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <Link href={isImmersive ? "/chat" : "/chat/live"} className="chat-mode-link">
              {isImmersive ? "Compact view" : "Open full chat"}
            </Link>
          </div>
        </header>

        <PersonalitySelector
          selected={personality}
          onSelect={(id) => setPersonality(id as PersonalityPreset)}
          disabled={isStreaming || showOnboarding}
        />

        <div className="chat-messages">
          <div className="chat-log" aria-live="polite" aria-label="Chat messages">
            {hasOnlyWelcomeMessage && !errorVisible && (
              <section className="chat-blank">
                <p className="chat-blank__eyebrow">{isImmersive ? "Full chat room is live" : "Streaming is live now"}</p>
                <h2 className="chat-blank__title">{isImmersive ? "Talk without the cramped modal feel" : "Start the first real convo"}</h2>
                <p className="chat-blank__copy">Ask for advice, drop a messy thought, or paste markdown. Clidy now streams replies with a smoother pace.</p>
                <div className="chat-blank__prompts">
                  <button type="button" onClick={() => setInput("Help me plan my week in a calm way.")}>Calm planning</button>
                  <button type="button" onClick={() => setInput("Give me a funny pep talk before I study.")}>Funny pep talk</button>
                  <button type="button" onClick={() => setInput("Explain async/await with a code example.")}>Markdown + code</button>
                </div>
              </section>
            )}

            {errorVisible && (
              <section className="chat-blank chat-blank--error" role="alert">
                <p className="chat-blank__eyebrow">Heads up</p>
                <h2 className="chat-blank__title">Oops 😅 Try again</h2>
                <p className="chat-blank__copy">Something went sideways. Clidy couldn't finish that thought.</p>
                <button type="button" className="retry-btn" onClick={handleRetry}>Retry with last message</button>
              </section>
            )}

            {messages.map((msg, i) => (
              <MessageBubble 
                key={i} 
                message={msg} 
                isStreaming={isStreaming && i === messages.length - 1} 
                onEdit={msg.sender === "user" ? (newText) => handleEditMessage(i, newText) : undefined}
              />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            id="chat-input"
            className="composer-input"
            placeholder={isImmersive ? "Ask Clidy anything..." : "Talk to Clidy... 😊"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
            disabled={isStreaming || showOnboarding}
            autoComplete="off"
            aria-label="Message input"
          />
          <button className="composer-send" type="submit" disabled={isStreaming || showOnboarding || !input.trim()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
