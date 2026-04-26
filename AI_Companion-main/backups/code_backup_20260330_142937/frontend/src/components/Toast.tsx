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
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          background: #ef4444;
          color: white;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
          z-index: 1000;
          font-weight: 600;
        }
        .success { background: #10b981; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
};

export default Toast;
