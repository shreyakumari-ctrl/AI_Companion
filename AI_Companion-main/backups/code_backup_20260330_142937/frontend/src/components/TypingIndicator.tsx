"use client";

import React from "react";

type TypingIndicatorProps = {
  label?: string;
};

const TypingIndicator = ({
  label = "Clizel is cooking something 🔥...",
}: TypingIndicatorProps) => {
  return (
    <div className="typing-indicator typing-indicator--enhanced" aria-label={label}>
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
          background: linear-gradient(
            135deg,
            rgba(91, 99, 246, 0.18),
            rgba(124, 58, 237, 0.18)
          );
          border-radius: 12px;
          width: fit-content;
          box-shadow: 0 10px 24px rgba(91, 99, 246, 0.14);
          animation: shimmerPulse 1.8s ease-in-out infinite;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-of-type(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator span:nth-of-type(2) {
          animation-delay: -0.16s;
        }

        .typing-indicator__label {
          margin-left: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        @keyframes shimmerPulse {
          0%,
          100% {
            box-shadow: 0 10px 24px rgba(91, 99, 246, 0.12);
          }
          50% {
            box-shadow: 0 14px 32px rgba(124, 58, 237, 0.2);
          }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;
