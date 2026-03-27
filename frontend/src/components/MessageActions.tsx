"use client";

import React, { useState } from "react";

interface MessageActionsProps {
  text: string;
  sender: "user" | "ai";
  onEdit?: () => void;
}

const MessageActions = ({ text, sender, onEdit }: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail for old browsers
    }
  };

  return (
    <div className="message-actions">
      <button className="action-btn" title="Like" aria-label="Like message">
        <span className="action-icon" role="img" aria-hidden="true">👍</span>
      </button>

      <button className="action-btn" title="Dislike" aria-label="Dislike message">
        <span className="action-icon" role="img" aria-hidden="true">👎</span>
      </button>

      <button className="action-btn" onClick={handleCopy} title="Copy message" aria-label="Copy message">
        <span className="action-icon" role="img" aria-hidden="true">📋</span>
        {copied && <span className="action-feedback">Copied</span>}
      </button>

      {sender === "user" && onEdit && (
        <button className="action-btn" onClick={onEdit} title="Edit message" aria-label="Edit message">
          <span className="action-icon" role="img" aria-hidden="true">✏️</span>
        </button>
      )}

      <button className="action-btn" title="More options" aria-label="More options">
        <span className="action-icon" role="img" aria-hidden="true">⋯</span>
      </button>
    </div>
  );
};

export default MessageActions;
