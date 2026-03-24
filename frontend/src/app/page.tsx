"use client";

import { FormEvent, useState, useRef, useEffect } from "react";

type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hey 👋 I'm Clidy... your AI friend. What's on your mind today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const textInput = input.trim();
    if (!textInput) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textInput }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach API");
      }

      const data = await response.json();
      
      // Delay AI response by ~1 second for human-like feeling
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.reply || "No reply from backend",
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (submissionError) {
      console.error(submissionError);
      setError("Oops 😅 something went wrong, try again!");
    } finally {
      setIsTyping(false);
    }
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
        </div>

        <div className="chat-container">
          <div className="chatLog" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`messageCard messageCard--${message.sender === "ai" ? "assistant" : "user"}`}
                key={message.id}
              >
                <p>{message.text}</p>
              </article>
            ))}
            
            {isTyping && (
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            )}
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
            onChange={(event) => setInput(event.target.value)}
            disabled={isTyping}
            autoComplete="off"
          />
          <button 
            className="composerButton" 
            type="submit" 
            disabled={isTyping || !input.trim()}
            title="Send Message"
          >
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
        {error ? <p className="status status--error">{error}</p> : null}
      </section>
    </main>
  );
}
