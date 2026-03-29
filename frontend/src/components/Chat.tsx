"use client";

import React, { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import PersonalitySelector from "./PersonalitySelector";
import Toast from "./Toast";
import { sendMessageStream, MessageTurn } from "../services/api";
import { PersonalityPreset } from "../lib/chatPersonality";

const Chat = () => {
  const [messages, setMessages] = useState<MessageTurn[]>([
    { sender: "ai", text: "Hey! I'm Clidy ✨. How's your day going?" }
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

  return (
    <div className="chat-page">
      <Navbar />
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
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
              className="input-field"
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
          background: #0f172a;
          min-height: 100vh;
        }
        .chat-controls {
          margin-top: auto;
          padding: 1.5rem;
          border-radius: 24px;
          margin-bottom: 2rem;
        }
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 70px);
          max-width: 800px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default Chat;
