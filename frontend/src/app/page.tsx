"use client";

import { FormEvent, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import { ChatMessage, useChatStore } from "@/store/chat-store";

function createMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const { messages, isSending, error, addMessage, setIsSending, setError } =
    useChatStore();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message) {
      return;
    }

    addMessage(createMessage("user", message));
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(message);
      console.info("AI Companion response", response);
      addMessage(createMessage("assistant", response.reply));
    } catch (submissionError) {
      const errorMessage =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to reach the backend right now.";

      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="hero">
          <p className="eyebrow">AI Companion</p>
          <h1>First Full-Stack Pulse</h1>
          <p className="subcopy">
            This screen proves the transport layer is alive. A user message
            moves from Next.js to Express and comes back as an assistant reply.
          </p>
        </div>

        <div className="chatLog" aria-live="polite">
          {messages.map((message) => (
            <article
              className={`messageCard messageCard--${message.role}`}
              key={message.id}
            >
              <span className="messageRole">
                {message.role === "user" ? "You" : "AI"}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="composerLabel" htmlFor="message">
            Send the first message
          </label>
          <div className="composerRow">
            <input
              id="message"
              name="message"
              className="composerInput"
              placeholder="Type something friendly..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSending}
            />
            <button className="composerButton" type="submit" disabled={isSending}>
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
          {error ? <p className="status status--error">{error}</p> : null}
          {!error && isSending ? (
            <p className="status">Waiting for the backend heartbeat...</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
