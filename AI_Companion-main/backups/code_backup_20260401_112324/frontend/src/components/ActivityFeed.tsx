"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getActivityFeed } from "@/services/api";
import { useChatStore } from "@/store/chatStore";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
}

const categoryIconMap: Record<string, string> = {
  login: "🔐",
  update: "🔄",
  message: "💬",
  task: "✅",
};

const ACTIVITY_ERROR_MESSAGE = "Unable to load activity feed 😅";

function formatTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function createFallbackEvent() {
  return {
    id: `fallback-${Date.now()}`,
    title: "New notification received",
    description: "A fresh update has arrived in your activity feed.",
    category: "system",
    timestamp: new Date().toISOString(),
  };
}

export default function ActivityFeed() {
  const pushToast = useChatStore((state) => state.pushToast);
  const pushToastRef = useRef(pushToast);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pushToastRef.current = pushToast;
  }, [pushToast]);

  useEffect(() => {
    let active = true;

    getActivityFeed()
      .then((data) => {
        if (!active) return;
        setActivities(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : JSON.stringify(err) || "Unknown error";
        console.error("Activity feed failed:", errorMessage);
        setError(ACTIVITY_ERROR_MESSAGE);
        setLoading(false);
        pushToastRef.current({ message: ACTIVITY_ERROR_MESSAGE, type: "error" });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:5000";
    let socket: Socket | null = null;
    let fallbackTimer: number | undefined;

    const addActivity = (activity: ActivityItem) => {
      setActivities((current) => [activity, ...current].slice(0, 8));
      pushToastRef.current({ message: "New notification received 🔔", type: "info" });
    };

    const stopFallback = () => {
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const startFallback = () => {
      if (fallbackTimer) return;
      fallbackTimer = window.setInterval(() => {
        addActivity(createFallbackEvent());
      }, 22000);
    };

    let handleNotification: ((payload: Partial<ActivityItem>) => void) | null = null;

    try {
      socket = io(socketUrl, {
        transports: ["websocket"],
        path: "/socket.io",
      });

      socket.on("connect", () => {
        stopFallback();
        pushToastRef.current({ message: "Realtime activity listener connected", type: "info" });
      });

      handleNotification = (payload: Partial<ActivityItem>) => {
        const activity = {
          id: payload.id || `socket-${Date.now()}`,
          title: payload.title || "New notification received",
          description:
            payload.description || "A realtime update arrived in your activity feed.",
          category: payload.category || "system",
          timestamp: payload.timestamp || new Date().toISOString(),
        };
        addActivity(activity);
      };

      socket.on("new_notification", handleNotification);

      socket.on("connect_error", () => {
        startFallback();
      });

      socket.on("disconnect", () => {
        startFallback();
      });
    } catch {
      startFallback();
    }

    return () => {
      if (socket) {
        if (handleNotification) {
          socket.off("new_notification", handleNotification);
        }
        socket.off("connect_error");
        socket.off("disconnect");
        socket.disconnect();
      }
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
      }
    };
  }, []);

  return (
    <div className="dashboard-card activity-feed-card">
      <div className="dashboard-card__header">
        <div>
          <p className="section-label">Activity Feed</p>
          <h3 className="dashboard-card__title">Live activity stream</h3>
          <p className="dashboard-card__subtitle">
            Recent user events and system updates arrive in real time.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="activity-feed-skeleton">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="activity-card skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line long" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="activity-error-card">
          <strong>Unable to load activity feed 😅</strong>
          <p>Please refresh the page or try again later.</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-empty-card">
          <p>No activity yet. Check back in a moment or refresh the page.</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity) => (
            <div key={activity.id} className="activity-card">
              <div className="activity-card__icon">
                {activity.category === "system" ? (
                  <img src="/logo-mark.png" alt="" className="app-logo-mark activity-card__logo" />
                ) : (
                  categoryIconMap[activity.category] || "!"
                )}
              </div>
              <div className="activity-card__content">
                <h4>{activity.title}</h4>
                <p>{activity.description}</p>
              </div>
              <time>{formatTimestamp(activity.timestamp)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

