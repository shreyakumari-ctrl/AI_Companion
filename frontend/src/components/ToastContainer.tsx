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
      className={`toast-shell toast-shell--${activeToast.type}`}
    >
      <span>{activeToast.message}</span>
      <button
        onClick={() => dismissToast(activeToast.id)}
        aria-label="Dismiss notification"
        className="toast-dismiss"
      >
        ×
      </button>
    </div>
  );
}
