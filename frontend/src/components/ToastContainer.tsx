"use client";
import { useEffect, useCallback } from "react";
import { useChatStore } from "../store/chatStore";

export default function ToastContainer() {
  const toasts = useChatStore((s) => s.toasts);
  const dismissToastAction = useChatStore((s) => s.dismissToast);

  // Stable reference so the effect doesn't re-run on every render
  const dismissToast = useCallback(
    (id: string) => dismissToastAction(id),
    [dismissToastAction]
  );

  const activeToast = toasts[0];

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => dismissToast(activeToast.id), 5000);
    return () => clearTimeout(timer);
  }, [activeToast?.id, dismissToast]);

  if (!activeToast) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        backgroundColor: activeToast.type === "error" ? "#ef4444" : "#3b82f6",
        color: "white",
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        maxWidth: "400px",
        zIndex: 1000,
      }}
    >
      <span>{activeToast.message}</span>
      <button
        onClick={() => dismissToast(activeToast.id)}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        ×
      </button>
    </div>
  );
}
