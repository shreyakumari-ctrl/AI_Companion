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
    <article className={`bubble bubble--${message.sender === "ai" ? "ai" : "user"}`}>
      {message.sender === "ai" && <div className="bubble-avatar" aria-hidden="true">✨</div>}
      
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
                <span className="bubble-status">Clidy is typing...</span>
              ) : (
                <MarkdownRenderer content={message.text || "\u00A0"} />
              )}
              {isStreaming && message.sender === "ai" && (
                <span className="bubble-status bubble-status--live">Clidy is streaming...</span>
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
    </article>
  );
};

export default MessageBubble;
