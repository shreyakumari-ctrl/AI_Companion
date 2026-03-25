"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { sendMessageStream, ApiError, HistoryTurn } from "../services/chatApi";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TypingIndicator from "../components/TypingIndicator";
import ToastContainer from "../components/ToastContainer";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendChunk = useChatStore((s) => s.appendChunk);
  const markComplete = useChatStore((s) => s.markComplete);
  const markFailed = useChatStore((s) => s.markFailed);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const pushToast = useChatStore((s) => s.pushToast);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function submitMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    // Build history from current messages BEFORE adding new ones (last 5 complete turns)
    const history: HistoryTurn[] = useChatStore
      .getState()
      .messages.filter((m) => m.status === "complete")
      .slice(-10)
      .slice(-5)
      .map((m) => ({ sender: m.sender, text: m.text }));

    // Add user message
    addMessage({ sender: "user", text, status: "complete" });

    // Add AI placeholder
    addMessage({ sender: "ai", text: "", status: "streaming" });

    // Get the AI message ID — it's the last message added
    const aiMessageId = useChatStore.getState().messages.at(-1)!.id;

    try {
      await sendMessageStream(text, history, (chunk) => {
        appendChunk(aiMessageId, chunk);
      });
      markComplete(aiMessageId);
    } catch (err) {
      markFailed(aiMessageId);

      if (err instanceof TypeError) {
        pushToast({
          message: "Connection lost. Check your network and try again.",
          type: "error",
        });
      } else if (err && typeof err === "object" && "status" in err) {
        const apiErr = err as ApiError;
        if (apiErr.status >= 500) {
          pushToast({
            message: "Something went wrong on our end. Please try again.",
            type: "error",
          });
        } else {
          pushToast({ message: apiErr.message, type: "error" });
        }
      } else {
        pushToast({ message: "An unexpected error occurred.", type: "error" });
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await submitMessage(text);
  }

  async function handleRetry(messageText: string) {
    await submitMessage(messageText);
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="hero">
          <h1>✨ Clidy AI</h1>
          <span className="subtitle">
            <div className="status-dot" />
            online • always here for you
          </span>
          <button
            onClick={clearHistory}
            style={{ marginLeft: "auto" }}
            aria-label="Clear conversation"
          >
            Clear conversation
          </button>
        </div>

        <div className="chat-container">
          <div className="chatLog" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`messageRow messageRow--${message.sender === "ai" ? "ai" : "user"}`}
              >
                {/* AI avatar on the left */}
                {message.sender === "ai" && (
                  <div className="avatar avatar--ai" aria-hidden="true">✦</div>
                )}

                <div className="messageBubbleWrap">
                  {message.sender === "ai" && message.status === "streaming" && message.text === "" ? (
                    <TypingIndicator />
                  ) : (
                    <article
                      className={`messageCard messageCard--${
                        message.sender === "ai" ? "assistant" : "user"
                      }`}
                    >
                      {message.sender === "ai" ? (
                        <MarkdownRenderer content={message.text} />
                      ) : (
                        <p>{message.text}</p>
                      )}
                    </article>
                  )}
                  {message.status === "failed" && (
                    <button
                      onClick={() => handleRetry(message.text)}
                      aria-label="Retry message"
                    >
                      ↺ Retry
                    </button>
                  )}
                </div>

                {/* User avatar on the right */}
                {message.sender === "user" && (
                  <div className="avatar avatar--user" aria-hidden="true">U</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            id="message"
            name="message"
            className="composerInput"
            placeholder="Talk to Clidy... 😊"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            autoComplete="off"
          />
          <button
            className="composerButton"
            type="submit"
            disabled={isStreaming || !input.trim()}
            title="Send Message"
          >
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>

        <ToastContainer />
      </section>
    </main>
  );
}
