"use client";

import React from "react";

type TypingIndicatorProps = {
  label?: string;
};

const TypingIndicator = ({ label = "Clidy is typing..." }: TypingIndicatorProps) => {
  return (
    <div className="typing-indicator" aria-label={label}>
      <span></span>
      <span></span>
      <span></span>
      <strong className="typing-indicator__label">{label}</strong>
      <style jsx>{`
        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: #334155;
          border-radius: 12px;
          width: fit-content;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-of-type(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-of-type(2) { animation-delay: -0.16s; }
        .typing-indicator__label {
          margin-left: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;
