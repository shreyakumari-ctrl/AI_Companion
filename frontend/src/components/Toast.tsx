"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success";
  duration?: number;
  onClose: () => void;
}

const Toast = ({ message, type = "error", duration = 3000, onClose }: ToastProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className={`toast animate-slide-in ${type}`}>
      {message}
      <style jsx>{`
        .toast {
          position: fixed;
          top: 1.25rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          background: rgba(239, 68, 68, 0.92);
          color: white;
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 40px rgba(239, 68, 68, 0.28);
          z-index: 1000;
          font-weight: 600;
          animation: toastSlideIn 0.24s ease-out;
        }
        .success {
          background: rgba(16, 185, 129, 0.92);
          box-shadow: 0 18px 40px rgba(16, 185, 129, 0.24);
        }
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
