"use client";

import React, { useEffect, useRef, useState } from "react";

interface MessageActionsProps {
  text: string;
  sender: "user" | "ai";
  onEdit?: () => void;
  onRetry?: () => void;
  onBranch?: () => void;
  onFixReply?: () => void;
  onExplain?: () => void;
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h4m0 11V10l3-6a1 1 0 0 1 1.87.5V10H19a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2h-8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 3h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4m0-11v11l-3 6a1 1 0 0 1-1.87-.5V14H5a2 2 0 0 1-2-2l1-7a2 2 0 0 1 2-2h8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="9"
        y="9"
        width="10"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16 8a3 3 0 1 0-2.82-4H13a3 3 0 0 0 .18 1.03L8.91 7.38a3 3 0 0 0-1.91-.69 3 3 0 1 0 1.91 5.31l4.27 2.35A3 3 0 0 0 13 15a3 3 0 1 0 .18 1.03L8.91 13.7a3 3 0 0 0 0-3.39l4.27-2.35A3 3 0 0 0 16 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

const MessageActions = ({
  text,
  sender,
  onEdit,
  onRetry,
  onBranch,
  onFixReply,
  onExplain,
}: MessageActionsProps) => {
  const isAiMessage = sender === "ai";
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail for old browsers
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Clizel chat message",
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }

      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // ignore cancelled or unsupported share attempts
    }
  };

  return (
    <div
      className={`message-actions message-actions--${sender}`}
      aria-label="Message actions"
    >
      {isAiMessage && (
        <button
          type="button"
          className={`action-btn ${reaction === "like" ? "action-btn--active" : ""}`}
          title="Like"
          aria-label="Like message"
          onClick={() => setReaction((current) => (current === "like" ? null : "like"))}
        >
          <span className="action-icon">
            <ThumbsUpIcon />
          </span>
        </button>
      )}

      {isAiMessage && (
        <button
          type="button"
          className={`action-btn ${reaction === "dislike" ? "action-btn--active" : ""}`}
          title="Dislike"
          aria-label="Dislike message"
          onClick={() => setReaction((current) => (current === "dislike" ? null : "dislike"))}
        >
          <span className="action-icon">
            <ThumbsDownIcon />
          </span>
        </button>
      )}

      <button
        type="button"
        className="action-btn"
        onClick={handleCopy}
        title="Copy message"
        aria-label="Copy message"
      >
        <span className="action-icon">
          <CopyIcon />
        </span>
        {copied && <span className="action-feedback">Copied</span>}
      </button>

      <button
        type="button"
        className="action-btn"
        onClick={handleShare}
        title="Share message"
        aria-label="Share message"
      >
        <span className="action-icon">
          <ShareIcon />
        </span>
        {shared && <span className="action-feedback">Shared</span>}
      </button>

      {sender === "user" && onEdit && (
        <button
          type="button"
          className="action-btn"
          onClick={onEdit}
          title="Edit message"
          aria-label="Edit message"
        >
          <span className="action-icon">
            <EditIcon />
          </span>
        </button>
      )}

      <div className="action-menu" ref={menuRef}>
        <button
          type="button"
          className={`action-btn ${menuOpen ? "action-btn--active" : ""}`}
          title="More options"
          aria-label="More options"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span className="action-icon">
            <MoreIcon />
          </span>
        </button>

        {menuOpen && (
          <div className="action-menu__panel" role="menu" aria-label="More message options">
            {onFixReply && (
              <button
                type="button"
                className="action-menu__item"
                role="menuitem"
                onClick={() => {
                  onFixReply();
                  setMenuOpen(false);
                }}
              >
                Fix reply
              </button>
            )}

            {onExplain && (
              <button
                type="button"
                className="action-menu__item"
                role="menuitem"
                onClick={() => {
                  onExplain();
                  setMenuOpen(false);
                }}
              >
                Explain
              </button>
            )}

            {onRetry && (
              <button
                type="button"
                className="action-menu__item"
                role="menuitem"
                onClick={() => {
                  onRetry();
                  setMenuOpen(false);
                }}
              >
                Retry response
              </button>
            )}

            {onBranch && (
              <button
                type="button"
                className="action-menu__item"
                role="menuitem"
                onClick={() => {
                  onBranch();
                  setMenuOpen(false);
                }}
              >
                New branch chat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageActions;

