"use client";

import React, { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import MessageActions from "./MessageActions";

interface MessageBubbleProps {
  message: {
    sender: "user" | "ai";
    text: string;
  };
  isStreaming?: boolean;
  onEdit?: (newText: string) => void;
}

const MessageBubble = ({ message, isStreaming, onEdit }: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text && onEdit) {
      onEdit(editText);
    }
    setIsEditing(false);
  };

  return (
    <article className={`bubble bubble--${message.sender === "ai" ? "ai" : "user"} bubble--interactive`}>
      {message.sender === "ai" && (
        <div className="bubble-avatar" aria-hidden="true">
          <img src="/logo-mark.png" alt="" className="bubble-avatar__logo" />
        </div>
      )}
      
      <div className="bubble-content">
        <div className="bubble-body">
          {isEditing ? (
            <div className="edit-message-container">
              <textarea
                className="edit-message-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="edit-actions">
                <button onClick={handleSaveEdit} className="btn-save">Save & Resend</button>
                <button onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {message.sender === "ai" && !message.text ? (
                <span className="bubble-status">Clizel is typing...</span>
              ) : (
                <MarkdownRenderer content={message.text || "\u00A0"} />
              )}
              {isStreaming && message.sender === "ai" && (
                <span className="bubble-status bubble-status--live">Clizel is streaming...</span>
              )}
            </>
          )}
        </div>
        
        {!isEditing && (
          <MessageActions 
            text={message.text} 
            sender={message.sender} 
            onEdit={message.sender === "user" ? () => setIsEditing(true) : undefined} 
          />
        )}
      </div>

      {message.sender === "user" && <div className="bubble-avatar" aria-hidden="true">👤</div>}
      <style jsx>{`
        .bubble--interactive {
          animation: messageFadeIn 0.28s ease-out both;
        }
        .bubble-content {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .bubble--interactive :global(.message-actions) {
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
          pointer-events: none;
        }
        .bubble--interactive:hover :global(.message-actions),
        .bubble--interactive:focus-within :global(.message-actions) {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        @keyframes messageFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </article>
  );
};

export default MessageBubble;

