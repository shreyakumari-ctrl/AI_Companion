"use client";

import React, { useState, useRef, useEffect } from "react";
import CursorSmokeTrail from "./CursorSmokeTrail";
import Navbar from "./Navbar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import PersonalitySelector from "./PersonalitySelector";
import Toast from "./Toast";
import { sendMessageStream, MessageTurn } from "../services/api";
import { PersonalityPreset } from "../lib/chatPersonality";

const Chat = () => {
  const [messages, setMessages] = useState<MessageTurn[]>([
    { sender: "ai", text: "Hey! I'm Clizel. How's your day going?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [personality, setPersonality] = useState<PersonalityPreset>("Friendly");
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: MessageTurn = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      let aiResponse = "";
      const aiMsgIndex = messages.length + 1; // Anticipated index

      // Add a placeholder for AI message
      setMessages((prev) => [...prev, { sender: "ai", text: "" }]);

      await sendMessageStream(
        input,
        personality,
        messages,
        { goals: "", interests: "" },
        (chunk: string) => {
          aiResponse += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[aiMsgIndex] = { sender: "ai", text: aiResponse };
            return newMessages;
          });
        },
      );
    } catch (err) {
      setError("Oops 😅 something went wrong");
    } finally {
      setIsTyping(false);
    }
  };

  const handleEditMessage = (index: number, newText: string) => {
    setMessages((prev) =>
      prev.map((message, messageIndex) =>
        messageIndex === index ? { ...message, text: newText } : message,
      ),
    );
  };

  return (
    <div className="chat-page">
      <CursorSmokeTrail />
      <Navbar />
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <MessageBubble
              key={index}
              message={msg}
              isStreaming={isTyping && index === messages.length - 1 && msg.sender === "ai"}
              onEdit={
                msg.sender === "user"
                  ? (newText) => handleEditMessage(index, newText)
                  : undefined
              }
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-controls glass">
          <PersonalitySelector 
            selected={personality} 
            onSelect={(id) => setPersonality(id as PersonalityPreset)} 
          />
          
          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className={`input-field ${input.trim() ? "input-field--active" : ""}`}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend(e);
              }}
            />
            <button className="send-btn" type="submit" disabled={!input.trim() || isTyping}>
              Send
            </button>
          </form>
        </div>
      </div>

      {error && <Toast message={error} onClose={() => setError(null)} />}

      <style jsx>{`
        .chat-page {
          position: relative;
          background:
            radial-gradient(circle at top, rgba(124, 58, 237, 0.18), transparent 32%),
            linear-gradient(180deg, #0f172a 0%, #111827 100%);
          min-height: 100vh;
          overflow: hidden;
        }
        .chat-controls {
          margin-top: auto;
          padding: 1.5rem;
          border-radius: 24px;
          margin-bottom: 2rem;
          background: rgba(15, 23, 42, 0.56);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(18px);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.28);
        }
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 70px);
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1rem;
          position: relative;
          z-index: 2;
        }
        .chat-messages {
          scroll-behavior: smooth;
        }
        .chat-input-area {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .input-field {
          flex: 1;
          min-height: 48px;
          padding: 0 1rem;
          border-radius: 16px;
          border: 1px solid rgba(129, 140, 248, 0.2);
          background: rgba(255, 255, 255, 0.9);
          color: #111827;
          outline: none;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
        }
        .input-field:focus,
        .input-field--active {
          border-color: rgba(99, 102, 241, 0.55);
          box-shadow:
            0 0 0 4px rgba(99, 102, 241, 0.14),
            0 14px 30px rgba(79, 70, 229, 0.18);
        }
        .send-btn {
          min-width: 108px;
          min-height: 48px;
          padding: 0 1.1rem;
          border-radius: 16px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          color: #fff;
          font-weight: 700;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, opacity 0.2s ease-in-out;
          box-shadow: 0 12px 28px rgba(79, 70, 229, 0.28);
        }
        .send-btn:hover:not(:disabled) {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 16px 34px rgba(79, 70, 229, 0.34);
        }
        .send-btn:disabled {
          opacity: 0.55;
        }
        :global([data-theme="light"]) .chat-page {
          background:
            radial-gradient(circle at top, rgba(124, 58, 237, 0.12), transparent 34%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        }
        :global([data-theme="light"]) .chat-controls {
          background: rgba(255, 255, 255, 0.82);
          border-color: rgba(99, 102, 241, 0.14);
          box-shadow: 0 16px 36px rgba(30, 41, 59, 0.12);
        }
        :global([data-theme="light"]) .input-field {
          background: rgba(255, 255, 255, 0.96);
          color: #0f172a;
          border-color: rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Chat;
