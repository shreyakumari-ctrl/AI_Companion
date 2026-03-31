"use client";
import { useEffect, useCallback, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";

export default function ToastContainer() {
  const toasts = useChatStore((s) => s.toasts);
  const dismissToastAction = useChatStore((s) => s.dismissToast);
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback(
    (id: string) => {
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }

      setLeavingIds((current) =>
        current.includes(id) ? current : [...current, id],
      );

      timersRef.current[id] = setTimeout(() => {
        dismissToastAction(id);
        setLeavingIds((current) => current.filter((toastId) => toastId !== id));
        delete timersRef.current[id];
      }, 220);
    },
    [dismissToastAction],
  );

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timersRef.current[toast.id]) return;

      timersRef.current[toast.id] = setTimeout(() => {
        setLeavingIds((current) =>
          current.includes(toast.id) ? current : [...current, toast.id],
        );

        timersRef.current[toast.id] = setTimeout(() => {
          dismissToastAction(toast.id);
          setLeavingIds((current) => current.filter((toastId) => toastId !== toast.id));
          delete timersRef.current[toast.id];
        }, 220);
      }, 3000);
    });

    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, [toasts, dismissToastAction]);

  if (!toasts.length) return null;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const leaving = leavingIds.includes(toast.id);

        return (
          <div
            key={toast.id}
            className={`toast-notification ${toast.type} ${
              leaving ? "toast-leaving" : ""
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="toast-dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
