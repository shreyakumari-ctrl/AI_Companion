"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendMessageStream, MessageTurn, ApiError } from "@/services/api";
import PersonalitySelector from "@/components/PersonalitySelector";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import OnboardingSlider from "@/components/OnboardingSlider";
import ToastContainer from "@/components/ToastContainer";
import TypingIndicator from "@/components/TypingIndicator";
import { useChatStore } from "@/store/chatStore";
import {
  getWelcomeMessage,
  isPersonalityPreset,
  type PersonalityPreset,
} from "@/lib/chatPersonality";

type ErrorViewState = {
  title: string;
  copy: string;
};

export default function ChatPage() {
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendChunk = useChatStore((state) => state.appendChunk);
  const markComplete = useChatStore((state) => state.markComplete);
  const markFailed = useChatStore((state) => state.markFailed);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const pushToast = useChatStore((state) => state.pushToast);

  const [input, setInput] = useState("");
  const [personality, setPersonality] = useState<PersonalityPreset>("Friendly");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [errorState, setErrorState] = useState<ErrorViewState | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    const storedPersonality = window.localStorage.getItem("clidy-personality");
    if (storedPersonality && isPersonalityPreset(storedPersonality)) {
      setPersonality(storedPersonality);
    }

    setShowOnboarding(window.localStorage.getItem("clidy-onboarding-done") !== "true");
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem("clidy-personality", personality);
  }, [hasHydrated, personality]);

  useEffect(() => {
    if (!hasHydrated || showOnboarding || messages.length > 0) {
      return;
    }

    addMessage({
      sender: "ai",
      text: getWelcomeMessage(personality),
      status: "complete",
    });
  }, [addMessage, hasHydrated, messages.length, personality, showOnboarding]);

  function resolveErrorState(apiError: ApiError): ErrorViewState {
    if (apiError.status === 429 || /rate limit|quota/i.test(apiError.message)) {
      return {
        title: "Clidy hit a rate limit",
        copy: "The backend is up, but the model is asking us to slow down for a moment. Give it a minute and retry.",
      };
    }

    if (apiError.status === 503 || /server|network|connection/i.test(apiError.message)) {
      return {
        title: "Connection got messy",
        copy: "The chat couldn't reach the backend cleanly. Check the server, then send again.",
      };
    }

    return {
      title: "Something went sideways",
      copy: apiError.message || "The stream broke before Clidy could finish that thought.",
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || showOnboarding) {
      return;
    }

    addMessage({
      sender: "user",
      text,
      status: "complete",
    });

    const aiMessageId = addMessage({
      sender: "ai",
      text: "",
      status: "pending",
    });

    setInput("");
    setErrorState(null);

    const history: MessageTurn[] = messages
      .filter((message) => message.text.trim().length > 0 && message.status !== "failed")
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      }));

    let receivedChunk = false;

    try {

      await sendMessageStream(text, personality, history, (chunk) => {
        receivedChunk = true;
        appendChunk(aiMessageId, chunk);
      });

      if (receivedChunk) {
        markComplete(aiMessageId);
      } else {
        removeMessage(aiMessageId);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (receivedChunk) {
        markFailed(aiMessageId);
      } else {
        removeMessage(aiMessageId);
      }
      setErrorState(resolveErrorState(apiErr));
      pushToast({
        type: "error",
        message: apiErr.message || "Oops 😅 Something went wrong. Please try again!",
      });
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleRetry() {
    const lastUser = [...messages].reverse().find((message) => message.sender === "user");
    if (lastUser) {
      setInput(lastUser.text);
    }

    setErrorState(null);
    inputRef.current?.focus();
  }

  function finishOnboarding() {
    window.localStorage.setItem("clidy-onboarding-done", "true");
    window.localStorage.setItem("clidy-personality", personality);
    setShowOnboarding(false);
    inputRef.current?.focus();
  }

  const hasOnlyWelcomeMessage =
    messages.length === 1 &&
    messages[0]?.sender === "ai" &&
    messages[0]?.status === "complete";

  return (
    <div className="chat-shell">
      <OnboardingSlider
        open={showOnboarding}
        personality={personality}
        onPersonalityChange={setPersonality}
        onFinish={finishOnboarding}
      />

      <div className="chat-panel">
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

        <PersonalitySelector
          selected={personality}
          onSelect={setPersonality}
          disabled={isStreaming || showOnboarding}
        />

        <div className="chat-messages">
          <div className="chat-log" aria-live="polite" aria-label="Chat messages">
            {hasOnlyWelcomeMessage && !errorState && (
              <section className="chat-blank">
                <p className="chat-blank__eyebrow">Streaming is live now</p>
                <h2 className="chat-blank__title">Start the first real convo</h2>
                <p className="chat-blank__copy">
                  Ask for advice, drop a messy thought, or paste markdown. Clidy now streams replies and formats completed AI messages cleanly.
                </p>
                <div className="chat-blank__prompts">
                  <button type="button" onClick={() => setInput("Help me plan my week in a calm way.")}>
                    Calm planning
                  </button>
                  <button type="button" onClick={() => setInput("Give me a funny pep talk before I study.")}>
                    Funny pep talk
                  </button>
                  <button type="button" onClick={() => setInput("Explain async/await with a code example.")}>
                    Markdown + code
                  </button>
                </div>
              </section>
            )}

            {errorState && (
              <section className="chat-blank chat-blank--error" role="alert">
                <p className="chat-blank__eyebrow">Heads up</p>
                <h2 className="chat-blank__title">{errorState.title}</h2>
                <p className="chat-blank__copy">{errorState.copy}</p>
                <button type="button" className="retry-btn" onClick={handleRetry}>
                  Retry with last message
                </button>
              </section>
            )}

            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`bubble bubble--${msg.sender === "ai" ? "ai" : "user"} ${
                  msg.status === "failed" ? "bubble--failed" : ""
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    ✨
                  </div>
                )}

                <div className="bubble-body">
                  {msg.sender === "ai" && !msg.text ? (
                    <TypingIndicator />
                  ) : msg.sender === "ai" ? (
                    <MarkdownRenderer content={msg.text} />
                  ) : (
                    <p className="bubble-text bubble-text--plain">{msg.text || "\u00A0"}</p>
                  )}

                  {msg.status === "failed" && (
                    <span className="bubble-status">Stream interrupted</span>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    👤
                  </div>
                )}
              </article>
            ))}

            <div ref={chatEndRef} />
          </div>
        </div>

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
            disabled={isStreaming || showOnboarding}
            autoComplete="off"
            autoFocus
            aria-label="Message input"
          />
          <button
            className="composer-send"
            type="submit"
            disabled={isStreaming || showOnboarding || !input.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
}
