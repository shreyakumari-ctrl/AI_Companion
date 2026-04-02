"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  sendMessageStream,
  type ChatAttachmentPayload,
  MessageTurn,
  ApiError,
  type AuthUser,
} from "@/services/api";
import PersonalitySelector from "@/components/PersonalitySelector";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageActions from "@/components/MessageActions";
import OnboardingSlider from "@/components/OnboardingSlider";
import CursorSmokeTrail from "@/components/CursorSmokeTrail";
import SocialScriptCarousel from "@/components/SocialScriptCarousel";
import ToastContainer from "@/components/ToastContainer";
import TypingIndicator from "@/components/TypingIndicator";
import ActivityFeed from "@/components/ActivityFeed";
import ProfileSettings from "@/components/ProfileSettings";
import { useChatStore } from "@/store/chatStore";
import {
  getWelcomeMessage,
  type PersonalityPreset,
} from "@/lib/chatPersonality";

type AttachmentKind = "photo" | "camera" | "file" | "drive" | "notebook";

type ComposerAttachment = {
  id: string;
  label: string;
  kind: AttachmentKind;
  meta?: string;
  previewUrl?: string;
};

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
    isFinal?: boolean;
    length: number;
  }>;
};

type CameraState = "idle" | "loading" | "ready" | "error";

type ErrorViewState = {
  title: string;
  copy: string;
};

type ChatExperienceProps = {
  variant?: "panel" | "immersive";
};

type HistoryPreview = {
  id: string;
  title: string;
  preview: string;
};

type DashboardTab = "chats" | "features" | "settings";
type SettingsTab =
  | "profile"
  | "profileUpdate"
  | "account"
  | "activity"
  | "appearance";
type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "clizel-theme-mode";

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7-3.5-.9-.5a7.5 7.5 0 0 0-.2-1.2l.7-.7a1 1 0 0 0 .2-1.1l-1-1.8a1 1 0 0 0-1-.5l-.9.2a7 7 0 0 0-1-.7l-.3-.9a1 1 0 0 0-.9-.7h-2a1 1 0 0 0-.9.7l-.3.9a7 7 0 0 0-1 .7l-.9-.2a1 1 0 0 0-1 .5l-1 1.8a1 1 0 0 0 .2 1.1l.7.7a7.5 7.5 0 0 0-.2 1.2l-.9.5a1 1 0 0 0-.5.9v2a1 1 0 0 0 .5.9l.9.5c.04.41.1.81.2 1.2l-.7.7a1 1 0 0 0-.2 1.1l1 1.8a1 1 0 0 0 1 .5l.9-.2c.31.27.65.5 1 .7l.3.9a1 1 0 0 0 .9.7h2a1 1 0 0 0 .9-.7l.3-.9c.35-.2.69-.43 1-.7l.9.2a1 1 0 0 0 1-.5l1-1.8a1 1 0 0 0-.2-1.1l-.7-.7c.1-.39.16-.79.2-1.2l.9-.5a1 1 0 0 0 .5-.9v-2a1 1 0 0 0-.5-.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 5h5v5H5zm9 0h5v5h-5zM5 14h5v5H5zm9 0h5v5h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm8 14-3.2-3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CustomizeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h9M4 17h6m7-10v10m0-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 11.5 12 5l8 6.5M6.5 10.8V19h11v-8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 6H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3M14 8l5 4-5 4M19 12H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.4 5.6-1.4-1.4M9 9 7.6 7.6m8.8 0L15 9M9 15l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.35 12.2c0-.63-.06-1.1-.18-1.58H12v3.45h5.38c-.1.86-.64 2.15-1.83 3.02l-.02.11 2.78 2.15.19.02c1.75-1.61 2.76-3.98 2.76-7.17Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.74c2.64 0 4.85-.87 6.47-2.37l-3.09-2.28c-.83.58-1.95.99-3.38.99a5.87 5.87 0 0 1-5.57-4.03l-.1.01-2.89 2.23-.03.09A9.77 9.77 0 0 0 12 21.74Z"
        fill="#34A853"
      />
      <path
        d="M6.43 14.05A5.98 5.98 0 0 1 6.1 12c0-.71.12-1.4.32-2.05l-.01-.14-2.93-2.26-.1.05A9.74 9.74 0 0 0 2.33 12c0 1.57.37 3.06 1.05 4.39l3.05-2.34Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.93c1.8 0 3.02.78 3.71 1.43l2.71-2.64C16.84 3.26 14.64 2.26 12 2.26a9.77 9.77 0 0 0-8.62 5.34l3.03 2.35A5.87 5.87 0 0 1 12 5.93Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.6 12.85c.02 2.12 1.86 2.83 1.88 2.84-.02.05-.29 1.02-.96 2.03-.58.87-1.18 1.73-2.13 1.75-.94.02-1.24-.56-2.32-.56-1.09 0-1.42.54-2.3.58-.9.03-1.57-.91-2.16-1.78-1.2-1.74-2.12-4.9-.9-7.03.6-1.06 1.68-1.73 2.85-1.75.89-.02 1.73.6 2.32.6.59 0 1.68-.75 2.84-.64.49.02 1.86.2 2.74 1.48-.07.05-1.64.95-1.62 2.48Zm-2.01-6.65c.49-.6.83-1.42.74-2.25-.71.03-1.56.47-2.07 1.07-.46.53-.87 1.37-.76 2.18.79.06 1.6-.4 2.09-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.7 3.5h2.6c.39 0 .73.26.83.63l.66 2.48a.9.9 0 0 1-.25.9L10.2 8.83a12.8 12.8 0 0 0 4.97 4.97l1.32-1.33c.23-.24.58-.33.9-.25l2.48.66c.37.1.63.44.63.83v2.6c0 .49-.4.89-.89.89C10.22 18.2 5.8 13.78 5.8 8.39c0-.49.4-.89.89-.89Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function takeNextDisplayToken(buffer: string, force = false) {
  if (!buffer) {
    return "";
  }

  if (buffer.startsWith("\n")) {
    return "\n";
  }

  const leadingWhitespace = buffer.match(/^[ \t]+/);
  if (leadingWhitespace) {
    return leadingWhitespace[0];
  }

  const wordWithBoundary = buffer.match(/^[^\s]+(?:\s+|$)/);
  if (wordWithBoundary) {
    const token = wordWithBoundary[0];
    if (/\s$/.test(token) || /[.,!?;:)\]]$/.test(token) || force) {
      return token;
    }
  }

  if (buffer.length >= 12) {
    return buffer.slice(0, Math.min(4, buffer.length));
  }

  return force ? buffer : "";
}

function getStreamDelay(token: string) {
  if (!token.trim()) {
    return 12;
  }

  if (token.includes("\n")) {
    return 44;
  }

  if (/[.,!?]$/.test(token.trim())) {
    return 54;
  }

  return Math.min(42, Math.max(18, token.length * 6));
}

function createComposerAttachment(
  label: string,
  kind: AttachmentKind,
  meta?: string,
  previewUrl?: string,
): ComposerAttachment {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    kind,
    meta,
    previewUrl,
  };
}

export default function ChatExperience({
  variant = "panel",
}: ChatExperienceProps) {
  const router = useRouter();
  const RecognitionAPI =
    typeof window !== "undefined"
      ? ((window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).SpeechRecognition ??
        (window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).webkitSpeechRecognition)
      : undefined;
  const messages = useChatStore((state) => state.messages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const appendChunk = useChatStore((state) => state.appendChunk);
  const markComplete = useChatStore((state) => state.markComplete);
  const markFailed = useChatStore((state) => state.markFailed);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const clearHistory = useChatStore((state) => state.clearHistory);
  const pushToast = useChatStore((state) => state.pushToast);
  const conversationId = useChatStore((state) => state.conversationId);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const userProfile = useChatStore((state) => state.userProfile);
  const updateUserProfile = useChatStore((state) => state.updateUserProfile);

  const [input, setInput] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [errorState, setErrorState] = useState<ErrorViewState | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<
    ComposerAttachment[]
  >([]);
  const [activeTool, setActiveTool] = useState<"search" | "analyze" | "create">(
    "search",
  );
  const [isListening, setIsListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [isLagging, setIsLagging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerSettingsOpen, setDrawerSettingsOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<DashboardTab>("chats");
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("profileUpdate");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileUpdateModalOpen, setProfileUpdateModalOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{
    stop: () => void;
  } | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const streamBufferRef = useRef("");
  const streamTimerRef = useRef<number | null>(null);
  const streamFinishedRef = useRef(false);
  const streamMessageIdRef = useRef<string | null>(null);
  const streamDrainResolverRef = useRef<(() => void) | null>(null);
  const lastChunkAtRef = useRef(0);

  const isImmersive = variant === "immersive";
  const personality = userProfile.personality as PersonalityPreset;
  const showOnboarding = !userProfile.onboardingCompleted;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeMode(storedTheme);
      return;
    }

    setThemeMode("dark");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (!active) {
          return;
        }

        setAuthUser(data.user);
        updateUserProfile({
          displayName: data.user.name ?? data.user.email ?? "Clizel User",
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAuthUser(null);
      });

    return () => {
      active = false;
    };
  }, [updateUserProfile]);

  useEffect(() => {
    if (!panelOpen) {
      setDrawerSettingsOpen(false);
      return;
    }

    function handlePanelEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }

    window.addEventListener("keydown", handlePanelEscape);
    return () => {
      window.removeEventListener("keydown", handlePanelEscape);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!hasHydrated || showOnboarding || messages.length > 0) {
      return;
    }

    addMessage({
      sender: "ai",
      text: getWelcomeMessage(personality),
      status: "complete",
    });
  }, [addMessage, hasHydrated, messages.length, personality, showOnboarding]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        window.clearTimeout(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!composerMenuRef.current?.contains(event.target as Node)) {
        setComposerMenuOpen(false);
      }
    }

    if (composerMenuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [composerMenuOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      setIsLagging(false);
      return;
    }

    const interval = window.setInterval(() => {
      if (!lastChunkAtRef.current) {
        return;
      }

      setIsLagging(performance.now() - lastChunkAtRef.current > 1800);
    }, 450);

    return () => {
      window.clearInterval(interval);
    };
  }, [isStreaming]);

  function resolveErrorState(apiError: ApiError): ErrorViewState {
    if (apiError.status === 429 || /rate limit|quota/i.test(apiError.message)) {
      return {
        title: "Clizel hit a rate limit",
        copy: "The backend is up, but the model is asking us to slow down for a sec. Give it a minute and retry.",
      };
    }

    if (
      apiError.status === 503 ||
      /server|network|connection/i.test(apiError.message)
    ) {
      return {
        title: "Connection got messy",
        copy: "The chat couldn't reach the backend cleanly. Check the server, then send again.",
      };
    }

    return {
      title: "Something went sideways",
      copy:
        apiError.message || "The stream broke before Clizel could finish that thought.",
    };
  }

  function settleQueuedStream() {
    if (streamTimerRef.current !== null) {
      window.clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    streamBufferRef.current = "";
    streamFinishedRef.current = false;
    streamMessageIdRef.current = null;
    streamDrainResolverRef.current?.();
    streamDrainResolverRef.current = null;
  }

  function drainQueuedStream() {
    const messageId = streamMessageIdRef.current;

    if (!messageId) {
      settleQueuedStream();
      return;
    }

    const nextToken = takeNextDisplayToken(
      streamBufferRef.current,
      streamFinishedRef.current,
    );

    if (!nextToken) {
      if (streamFinishedRef.current && !streamBufferRef.current) {
        settleQueuedStream();
        return;
      }

      streamTimerRef.current = window.setTimeout(drainQueuedStream, 16);
      return;
    }

    streamBufferRef.current = streamBufferRef.current.slice(nextToken.length);
    appendChunk(messageId, nextToken);

    if (!streamBufferRef.current && streamFinishedRef.current) {
      settleQueuedStream();
      return;
    }

    streamTimerRef.current = window.setTimeout(
      drainQueuedStream,
      getStreamDelay(nextToken),
    );
  }

  function queueSmoothChunk(messageId: string, chunk: string) {
    streamMessageIdRef.current = messageId;
    streamBufferRef.current += chunk;

    if (streamTimerRef.current === null) {
      drainQueuedStream();
    }
  }

  function finishSmoothStream(messageId: string) {
    streamMessageIdRef.current = messageId;
    streamFinishedRef.current = true;

    if (streamTimerRef.current === null) {
      drainQueuedStream();
    }

    return new Promise<void>((resolve) => {
      if (!streamBufferRef.current && streamTimerRef.current === null) {
        settleQueuedStream();
        resolve();
        return;
      }

      streamDrainResolverRef.current = resolve;
    });
  }

  function cancelSmoothStream() {
    settleQueuedStream();
  }

  function addComposerAttachments(next: ComposerAttachment[]) {
    setComposerAttachments((current) => [...current, ...next]);
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind,
  ) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    addComposerAttachments(
      files.map((file) =>
        createComposerAttachment(
          file.name,
          kind,
          `${Math.max(1, Math.round(file.size / 1024))} KB`,
          kind === "photo" ? URL.createObjectURL(file) : undefined,
        ),
      ),
    );
    setComposerMenuOpen(false);
    pushToast({
      type: "info",
      message: `${files.length} ${kind === "file" ? "file" : "image"} added to the composer`,
    });
    event.target.value = "";
  }

  function handleAddCloudSource(kind: "drive" | "notebook") {
    addComposerAttachments([
      createComposerAttachment(
        kind === "drive" ? "Google Drive source" : "Notebook source",
        kind,
        kind === "drive" ? "Cloud link" : "Research context",
      ),
    ]);
    setComposerMenuOpen(false);
    pushToast({
      type: "info",
      message:
        kind === "drive"
          ? "Drive source chip added. Connect backend sync next for real document fetch."
          : "Notebook source chip added. Source grounding UI is ready.",
    });
  }

  async function handleOpenCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      pushToast({
        type: "error",
        message: "Camera access is not supported in this browser.",
      });
      return;
    }

    try {
      setCameraOpen(true);
      setCameraState("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }

      setCameraState("ready");
      setComposerMenuOpen(false);
    } catch {
      setCameraState("error");
      pushToast({
        type: "error",
        message: "Camera open nahi ho paya. Permission allow karke phir try karo.",
      });
    }
  }

  function handleCloseCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraState("idle");
  }

  function handleCaptureFromCamera() {
    const video = cameraVideoRef.current;

    if (!video || !cameraStreamRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const context = canvas.getContext("2d");

    if (!context) {
      pushToast({
        type: "error",
        message: "Camera frame capture initialize nahi ho paya.",
      });
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const previewUrl = canvas.toDataURL("image/jpeg", 0.92);

    addComposerAttachments([
      createComposerAttachment(
        `Camera capture ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        "camera",
        "Live capture",
        previewUrl,
      ),
    ]);
    pushToast({
      type: "info",
      message: "Camera capture composer me add ho gaya.",
    });
    handleCloseCamera();
  }

  function handleRemoveComposerAttachment(id: string) {
    setComposerAttachments((current) => {
      const attachmentToRemove = current.find((attachment) => attachment.id === id);
      if (attachmentToRemove?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(attachmentToRemove.previewUrl);
      }

      return current.filter((attachment) => attachment.id !== id);
    });
  }

  function handleToggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!RecognitionAPI) {
      pushToast({
        type: "error",
        message: "Voice input is not supported in this browser yet.",
      });
      return;
    }

    const recognition = new RecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        setInput((current) =>
          `${current}${current.trim() ? " " : ""}${finalTranscript.trim()}`.trim(),
        );
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      pushToast({
        type: "error",
        message: "Voice capture stopped before transcription could finish.",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    setComposerMenuOpen(false);
  }

  function buildAttachmentPayload(
    attachments: ComposerAttachment[],
  ): ChatAttachmentPayload[] {
    return attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      label: attachment.label,
      meta: attachment.meta,
    }));
  }

  function clearComposerAttachments() {
    setComposerAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });

      return [];
    });
  }

  async function streamAssistantReply(
    text: string,
    history: MessageTurn[],
    attachmentPayload: ChatAttachmentPayload[] = [],
    clearAttachmentsOnSuccess = false,
  ) {
    const aiMessageId = addMessage({
      sender: "ai",
      text: "",
      status: "pending",
    });

    setErrorState(null);
    lastChunkAtRef.current = performance.now();
    setIsLagging(false);

    try {
      const streamMeta = await sendMessageStream(
        text,
        personality,
        history,
        {
          goals: userProfile.goals.trim(),
          interests: userProfile.interests.trim(),
        },
        (chunk) => {
          lastChunkAtRef.current = performance.now();
          setIsLagging(false);
          queueSmoothChunk(aiMessageId, chunk);
        },
        attachmentPayload,
        activeTool,
        conversationId,
      );

      await finishSmoothStream(aiMessageId);

      if (streamMeta?.conversationId) {
        setConversationId(streamMeta.conversationId);
      }

      if (streamMeta || streamBufferRef.current || streamMessageIdRef.current === null) {
        markComplete(aiMessageId);
        if (clearAttachmentsOnSuccess) {
          clearComposerAttachments();
        }
      } else {
        removeMessage(aiMessageId);
      }
    } catch (err) {
      const apiErr = err as ApiError;

      cancelSmoothStream();
      markFailed(aiMessageId);
      setIsLagging(false);

      setErrorState(resolveErrorState(apiErr));
      pushToast({
        type: "error",
        message:
          apiErr.message || "Oops ðŸ˜… Something went wrong. Please try again!",
      });
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || showOnboarding) {
      return;
    }

    addMessage({
      sender: "user",
      text,
      status: "complete",
    });

    setInput("");
    setErrorState(null);
    setComposerMenuOpen(false);

    const priorHistory: MessageTurn[] = messages
      .filter(
        (message) =>
          message.text.trim().length > 0 && message.status !== "failed",
      )
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      }));
    const history: MessageTurn[] = [...priorHistory, { sender: "user", text }];
    const attachmentPayload = buildAttachmentPayload(composerAttachments);
    await streamAssistantReply(text, history, attachmentPayload, true);
  }

  function handleRetry() {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.sender === "user");
    if (lastUser) {
      setInput(lastUser.text);
    }

    setErrorState(null);
    inputRef.current?.focus();
  }

  function handleStartEditMessage(id: string, text: string) {
    setEditingMessageId(id);
    setEditingText(text);
    setErrorState(null);
  }

  function handleCancelEditMessage() {
    setEditingMessageId(null);
    setEditingText("");
  }

  async function handleSaveEditMessage() {
    const nextText = editingText.trim();

    if (!editingMessageId || !nextText || isStreaming) {
      return;
    }

    const editedMessageIndex = messages.findIndex(
      (message) => message.id === editingMessageId && message.sender === "user",
    );

    updateMessage(editingMessageId, nextText);
    setEditingMessageId(null);
    setEditingText("");

    if (editedMessageIndex === -1) {
      return;
    }

    const staleMessages = messages.slice(editedMessageIndex + 1);
    staleMessages.forEach((message) => {
      removeMessage(message.id);
    });

    const priorHistory: MessageTurn[] = messages
      .slice(0, editedMessageIndex)
      .filter(
        (message) =>
          message.text.trim().length > 0 && message.status !== "failed",
      )
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      }));

    const history: MessageTurn[] = [...priorHistory, { sender: "user", text: nextText }];

    pushToast({
      type: "info",
      message: "Regenerating response from your edited message...",
    });

    await streamAssistantReply(nextText, history);
  }

  function handleRetryFromText(text: string) {
    setInput(text);
    setErrorState(null);
    inputRef.current?.focus();
    pushToast({
      type: "info",
      message: "Retry draft added to the input",
    });
  }

  function handleNewBranchFromText(text: string) {
    clearHistory();
    setConversationId(null);
    setErrorState(null);
    setInput(text);
    addMessage({
      sender: "ai",
      text: `${getWelcomeMessage(personality)}\n\nNew branch draft is ready below.`,
      status: "complete",
    });
    inputRef.current?.focus();
    pushToast({
      type: "info",
      message: "Started a new branch from this message",
    });
  }

  function finishOnboarding() {
    updateUserProfile({
      onboardingCompleted: true,
      personality,
    });
    inputRef.current?.focus();
  }

  const hasOnlyWelcomeMessage =
    messages.length === 1 &&
    messages[0]?.sender === "ai" &&
    messages[0]?.status === "complete";
  const historyItems: HistoryPreview[] = messages
    .filter((message) => message.sender === "user")
    .slice(-10)
    .reverse()
    .map((message, index) => ({
      id: message.id,
      title: index === 0 ? "Current chat" : `Chat ${index + 1}`,
      preview: message.text,
    }));
  const shouldShowSocialCarousel =
    (activeTool === "create" || composerAttachments.length > 0) &&
    input.trim().length > 0;
  const composerStatusLabel = !isOnline
    ? "Reconnecting..."
    : isLagging
      ? "Network lag ðŸ˜…"
      : isListening
        ? "Listening"
        : isStreaming
          ? "Clizel is cooking"
          : activeTool;

  function handleStartFreshChat() {
    clearHistory();
    setConversationId(null);
    setErrorState(null);
    setInput("");
    addMessage({
      sender: "ai",
      text: getWelcomeMessage(personality),
      status: "complete",
    });
    inputRef.current?.focus();
    pushToast({
      type: "info",
      message: "Fresh chat ready",
    });
  }

  function handleWorkspaceAction(
    action: "search" | "customize",
  ) {
    if (action === "search") {
      setActiveTool("search");
      inputRef.current?.focus();
      return;
    }

    if (action === "customize") {
      openSettingsSection("profileUpdate");
    }
  }

  function openPanel(tab: DashboardTab, settingsTab?: SettingsTab) {
    setActivePanelTab(tab);
    if (tab === "settings" && settingsTab) {
      setActiveSettingsTab(settingsTab);
    }
    setPanelOpen(true);
  }

  function openAuthModal(mode: "login" | "register" = "login") {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setPanelOpen(false);
  }

  function openProfileUpdateModal() {
    setProfileUpdateModalOpen(true);
    setPanelOpen(false);
  }

  function openSettingsSection(section: SettingsTab) {
    if (section === "profileUpdate") {
      openProfileUpdateModal();
      return;
    }

    if (section === "activity") {
      if (typeof window !== "undefined") {
        window.open("/activity", "_blank", "noopener,noreferrer");
      }
      setPanelOpen(false);
      return;
    }

    if (section === "account" && !authUser) {
      openAuthModal("login");
      return;
    }

    setActiveSettingsTab(section);
    setActivePanelTab("settings");
    setPanelOpen(true);
  }

  function handleToggleTheme() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
    pushToast({
      type: "info",
      message: `Theme switched to ${themeMode === "dark" ? "light" : "dark"} mode`,
    });
  }

  function handleGoHome() {
    setPanelOpen(false);
    router.push("/");
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authEmail.trim() || !authPassword.trim()) {
      pushToast({
        type: "error",
        message: "Email and password are both needed.",
      });
      return;
    }

    setAuthPending(true);

    try {
      const session =
        authMode === "login"
          ? await loginUser(authEmail.trim(), authPassword)
          : await registerUser(authEmail.trim(), authPassword, authName.trim() || undefined);

      setAuthUser(session.user);
      updateUserProfile({
        displayName: session.user.name ?? session.user.email ?? "Clizel User",
      });
      setAuthPassword("");
      setAuthModalOpen(false);
      pushToast({
        type: "info",
        message: authMode === "login" ? "Logged in successfully âœ…" : "Account created âœ…",
      });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Couldn't complete auth right now.";
      pushToast({ type: "error", message });
    } finally {
      setAuthPending(false);
    }
  }

  async function handleLogout() {
    setAuthPending(true);

    try {
      await logoutUser();
      setAuthUser(null);
      setAuthPassword("");
      pushToast({
        type: "info",
        message: "Logged out cleanly",
      });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Logout didn't go through.";
      pushToast({ type: "error", message });
    } finally {
      setAuthPending(false);
    }
  }

  const profileDisplayName =
    authUser?.name ||
    userProfile.displayName ||
    authUser?.email ||
    "You";
  const profileInitial = profileDisplayName.trim().charAt(0).toUpperCase() || "Y";

  return (
    <div
      className={`chat-shell ${isImmersive ? "chat-shell--immersive" : ""}`.trim()}
    >
      <CursorSmokeTrail />
      <OnboardingSlider
        open={showOnboarding}
        personality={personality}
        goals={userProfile.goals}
        interests={userProfile.interests}
        onGoalsChange={(goals) => updateUserProfile({ goals })}
        onInterestsChange={(interests) => updateUserProfile({ interests })}
        onPersonalityChange={(nextPersonality) =>
          updateUserProfile({ personality: nextPersonality })
        }
        onFinish={finishOnboarding}
      />

      <div
        className={`chat-panel ${isImmersive ? "chat-panel--immersive" : ""}`.trim()}
      >
        <div
          className={`dashboard-drawer-backdrop ${panelOpen ? "is-open" : ""}`}
          onClick={() => setPanelOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`dashboard-drawer ${panelOpen ? "is-open" : ""}`}
          aria-hidden={!panelOpen}
        >
          <div className="dashboard-drawer__header">
            <div>
              <button
                type="button"
                className="dashboard-drawer__home-icon"
                onClick={handleGoHome}
                aria-label="Home"
                title="Home"
              >
                <HomeIcon />
              </button>
              <strong>Clizel</strong>
            </div>
            <button
              type="button"
              className="dashboard-icon-btn"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
            >
              Ã—
            </button>
          </div>

          <div className="dashboard-drawer__body">
            <div className="workspace-quick-actions workspace-quick-actions--drawer">
              <button
                type="button"
                className={`workspace-quick-action ${
                  activePanelTab === "chats" ? "is-active" : ""
                }`}
                onClick={() => setActivePanelTab("chats")}
              >
                <ChatIcon />
                <span>Chats</span>
              </button>
              <button
                type="button"
                className={`workspace-quick-action ${
                  activePanelTab === "features" ? "is-active" : ""
                }`}
                onClick={() => setActivePanelTab("features")}
              >
                <GridIcon />
                <span>Features</span>
              </button>
              <button
                type="button"
                className="workspace-quick-action"
                onClick={() => {
                  handleStartFreshChat();
                  setPanelOpen(false);
                }}
              >
                <SparkIcon />
                <span>New chat</span>
              </button>
              <button
                type="button"
                className="workspace-quick-action"
                onClick={() => {
                  handleWorkspaceAction("search");
                  setPanelOpen(false);
                }}
              >
                <SearchIcon />
                <span>Search</span>
              </button>
              <button
                type="button"
                className="workspace-quick-action"
                onClick={() => {
                  handleWorkspaceAction("customize");
                }}
              >
                <CustomizeIcon />
                <span>Customize</span>
              </button>
            </div>

            {activePanelTab === "chats" ? (
              <div className="dashboard-panel-stack dashboard-panel-stack--chats">
                <div className="dashboard-sidebar__section">
                  <p className="dashboard-sidebar__label">Recent Chats</p>
                  <div className="dashboard-history">
                    {historyItems.length ? (
                      historyItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`dashboard-history__item ${
                            index === 0 ? "is-active" : ""
                          }`}
                          onClick={() => {
                            handleRetryFromText(item.preview);
                            setPanelOpen(false);
                          }}
                        >
                          <strong>{item.title}</strong>
                          <span>{item.preview}</span>
                        </button>
                      ))
                    ) : (
                      <div className="dashboard-history__empty">
                        Your chats will show up here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activePanelTab === "features" ? (
              <div className="dashboard-panel-stack">
                <div className="dashboard-feature-card">
                  <p className="dashboard-sidebar__eyebrow">Quick prompt</p>
                  <strong>Social script generator</strong>
                  <span>
                    Make swipeable replies for awkward chats, soft pivots, or funny exits.
                  </span>
                  <button
                    type="button"
                    className="dashboard-feature-card__action"
                    onClick={() => {
                      setActiveTool("create");
                      setInput("Help me reply to this text without sounding dry.");
                      setPanelOpen(false);
                      inputRef.current?.focus();
                    }}
                  >
                    Open create mode
                  </button>
                </div>

                <div className="dashboard-feature-card">
                  <p className="dashboard-sidebar__eyebrow">Analyze</p>
                  <strong>Screenshot and file context</strong>
                  <span>
                    Drop files, photos, camera captures, or notes straight into the composer.
                  </span>
                  <button
                    type="button"
                    className="dashboard-feature-card__action"
                    onClick={() => {
                      setActiveTool("analyze");
                      setPanelOpen(false);
                    }}
                  >
                    Switch to analyze
                  </button>
                </div>

              </div>
            ) : null}
          </div>

          <div className="dashboard-drawer__footer">
            <button
              type="button"
              className={`workspace-quick-action ${
                drawerSettingsOpen ? "is-active" : ""
              }`}
              onClick={() => setDrawerSettingsOpen((current) => !current)}
            >
              <SettingsIcon />
              <span>Settings</span>
            </button>
            {drawerSettingsOpen ? (
              <div className="dashboard-drawer-settings-menu">
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={openProfileUpdateModal}
                >
                  <UserAvatarIcon />
                  <span>Profile Update</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={handleToggleTheme}
                >
                  <ThemeIcon mode={themeMode} />
                  <span>{themeMode === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action workspace-quick-action--sub"
                  onClick={() => openSettingsSection("activity")}
                >
                  <GridIcon />
                  <span>Activity</span>
                </button>
              </div>
            ) : null}
            {authUser ? (
              <button
                type="button"
                className="workspace-quick-action workspace-quick-action--danger"
                onClick={() => {
                  void handleLogout();
                  setPanelOpen(false);
                }}
                disabled={authPending}
              >
                <LogoutIcon />
                <span>{authPending ? "Logging out..." : "Logout"}</span>
              </button>
            ) : (
              <button
                type="button"
                className="workspace-quick-action"
                onClick={() => openAuthModal("login")}
              >
                <UserAvatarIcon />
                <span>Login</span>
              </button>
            )}
          </div>
        </aside>
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar dashboard-sidebar--workspace">
            <div className="workspace-shell">
              <div className="workspace-brand">
                <strong>Clizel</strong>
              </div>

              <div className="workspace-quick-actions">
                <button
                  type="button"
                  className="workspace-quick-action"
                  onClick={handleStartFreshChat}
                >
                  <SparkIcon />
                  <span>New chat</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action"
                  onClick={() => handleWorkspaceAction("search")}
                >
                  <SearchIcon />
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  className="workspace-quick-action"
                  onClick={() => handleWorkspaceAction("customize")}
                >
                  <CustomizeIcon />
                  <span>Customize</span>
                </button>
              </div>

              <div className="workspace-main-links" aria-label="Workspace navigation">
                <button type="button" className="workspace-main-link is-active">
                  <ChatIcon />
                  <span>Chats</span>
                </button>
              </div>

              <div className="dashboard-sidebar__section workspace-recents">
                <p className="dashboard-sidebar__label">Recents</p>
                <div className="dashboard-history">
                  {historyItems.length ? (
                    historyItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`dashboard-history__item ${
                          index === 0 ? "is-active" : ""
                        }`}
                        onClick={() => handleRetryFromText(item.preview)}
                      >
                        <span>{item.preview || item.title}</span>
                      </button>
                    ))
                  ) : (
                    <div className="dashboard-history__empty">
                      Your chats will show up here.
                    </div>
                  )}
                </div>
              </div>

              <div className="workspace-user-footer">
                <button
                  type="button"
                  className="workspace-user-pill"
                  onClick={() => openSettingsSection("profile")}
                  title="Open profile"
                >
                  <span className="workspace-user-pill__avatar">
                    {userProfile.avatarDataUrl ? (
                      <img src={userProfile.avatarDataUrl} alt={profileDisplayName} />
                    ) : (
                      profileInitial
                    )}
                  </span>
                  <span className="workspace-user-pill__meta">
                    <strong>{profileDisplayName}</strong>
                    <small>{authUser ? "Logged in" : "Free plan"}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`dashboard-sidebar__theme-icon ${
                    themeMode === "dark" ? "is-dark" : "is-light"
                  }`}
                  onClick={handleToggleTheme}
                  title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
                  aria-label="Toggle theme"
                >
                  <ThemeIcon mode={themeMode} />
                </button>
                <button
                  type="button"
                  className="workspace-footer-icon"
                  onClick={() => openSettingsSection("profileUpdate")}
                  title="Settings"
                  aria-label="Settings"
                >
                  <SettingsIcon />
                </button>
                {authUser ? (
                  <button
                    type="button"
                    className="workspace-footer-auth"
                    onClick={handleLogout}
                    disabled={authPending}
                  >
                    <LogoutIcon />
                    <span>{authPending ? "..." : "Logout"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="workspace-footer-auth"
                    onClick={() => openAuthModal("login")}
                  >
                    <UserAvatarIcon />
                    <span>Login</span>
                  </button>
                )}
              </div>
            </div>
          </aside>

                    <div className="dashboard-content">
        <header className="chat-header">
          <div className="chat-header-info">
            <button
              type="button"
              className="dashboard-icon-btn"
              title="Open panel"
              onClick={() => openPanel("chats")}
            >
              <MenuIcon />
            </button>
            <div className="chat-brand-lockup">
              <img src="/logo-mark.png" alt="Clizel logo" className="app-logo-mark chat-brand-lockup__logo" />
              <h1 className="chat-title">Clizel</h1>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              className="dashboard-icon-btn"
              title="New chat"
              onClick={handleStartFreshChat}
            >
              <SparkIcon />
            </button>
            <button
              type="button"
              className="dashboard-profile-pill"
              title="Profile"
              onClick={() => openSettingsSection("profile")}
            >
              <span className="dashboard-profile-pill__avatar">
                {userProfile.avatarDataUrl ? (
                  <img src={userProfile.avatarDataUrl} alt={profileDisplayName} />
                ) : (
                  profileInitial
                )}
              </span>
            </button>
          </div>
        </header>
        <PersonalitySelector
          selected={personality}
          onSelect={(id) =>
            updateUserProfile({ personality: id as PersonalityPreset })
          }
          disabled={isStreaming || showOnboarding}
        />
        <div className="chat-messages">
          <div className="chat-log" aria-live="polite" aria-label="Chat messages">
            {hasOnlyWelcomeMessage && !errorState && (
              <section className="chat-blank">
                <p className="chat-blank__eyebrow">Start a new conversation</p>
                <h2 className="chat-blank__title">
                  {isImmersive
                    ? "What can Clizel help with today?"
                    : "Start a new conversation"}
                </h2>
                <p className="chat-blank__copy">
                  Ask for advice, drop a messy thought, or paste markdown. Clizel
                  keeps the convo flowing with smoother streaming, better context
                  memory, and cleaner replies that feel more like texting a best
                  friend than using a bot.
                </p>
                <div className="chat-blank__prompts">
                  <button
                    type="button"
                    onClick={() => setInput("Help me plan my week in a calm way.")}
                  >
                    Calm planning
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput("Give me a funny pep talk before I study.")
                    }
                  >
                    Funny pep talk
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput("Explain async/await with a code example.")
                    }
                  >
                    Markdown + code
                  </button>
                </div>
              </section>
            )}

            {errorState && (
              <section className="chat-blank chat-blank--error" role="alert">
                <p className="chat-blank__eyebrow">Heads up</p>
                <h2 className="chat-blank__title">{errorState.title}</h2>
                <p className="chat-blank__copy">{errorState.copy}</p>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={handleRetry}
                >
                  Retry with last message
                </button>
              </section>
            )}

            {messages.map((msg, index) => (
              <article
                key={msg.id}
                className={`bubble bubble--${msg.sender === "ai" ? "ai" : "user"} ${
                  msg.status === "failed" ? "bubble--failed" : ""
                } ${
                  msg.status === "pending" || msg.status === "streaming"
                    ? "bubble--streaming"
                    : ""
                }`}
              >
                <div className="bubble-body">
                  {editingMessageId === msg.id && msg.sender === "user" ? (
                    <div className="edit-message-container">
                      <textarea
                        className="edit-message-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        autoFocus
                        aria-label="Edit message"
                      />
                      <div className="edit-actions">
                        <button
                          type="button"
                          className="edit-action-btn edit-action-btn--primary"
                          onClick={handleSaveEditMessage}
                          disabled={!editingText.trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="edit-action-btn"
                          onClick={handleCancelEditMessage}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  {msg.sender === "ai" && !msg.text ? (
                    <TypingIndicator label="Clizel is cooking..." />
                  ) : msg.sender === "ai" ? (
                    <MarkdownRenderer content={msg.text} />
                  ) : (
                    <p className="bubble-text bubble-text--plain">
                      {msg.text || "\u00A0"}
                    </p>
                  )}

                  {msg.status === "streaming" && (
                    <span className="bubble-status bubble-status--live">
                      Clizel is typing it out...
                    </span>
                  )}

                  {msg.status === "failed" && (
                    <span className="bubble-status">Stream interrupted</span>
                  )}

                  {msg.text && (
                    <MessageActions
                      text={msg.text}
                      sender={msg.sender}
                      onRetry={
                        msg.sender === "ai"
                          ? () => {
                              const previousUserText =
                                [...messages.slice(0, index)]
                                  .reverse()
                                  .find((message) => message.sender === "user")?.text ?? "";

                              if (previousUserText) {
                                handleRetryFromText(previousUserText);
                              }
                            }
                          : undefined
                      }
                      onBranch={() => handleNewBranchFromText(msg.text)}
                      onEdit={
                        msg.sender === "user"
                          ? () => handleStartEditMessage(msg.id, msg.text)
                          : undefined
                      }
                    />
                  )}
                    </>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="bubble-avatar" aria-hidden="true">
                    {userProfile.avatarDataUrl ? (
                      <img src={userProfile.avatarDataUrl} alt="" />
                    ) : authUser ? (
                      profileInitial
                    ) : (
                      <span className="bubble-avatar__icon">
                        <UserAvatarIcon />
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}

            <div ref={chatEndRef} />
          </div>
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => handleFileSelection(event, "photo")}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.ppt,.pptx"
            multiple
            hidden
            onChange={(event) => handleFileSelection(event, "file")}
          />

          <div className="composer-shell">
            <div className="composer-topbar" aria-label="Composer tools">
              <div className="composer-mode-row">
                {[
                  ["search", "Search"],
                  ["analyze", "Analyze"],
                  ["create", "Create"],
                ].map(([tool, label]) => (
                  <button
                    key={tool}
                    type="button"
                    className={`composer-mode-chip ${
                      activeTool === tool ? "composer-mode-chip--active" : ""
                    }`}
                    onClick={() =>
                      setActiveTool(tool as "search" | "analyze" | "create")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className={`composer-status-badge ${
                  !isOnline || isLagging ? "composer-status-badge--alert" : ""
                }`}
              >
                {composerStatusLabel}
              </div>
            </div>

            {shouldShowSocialCarousel && (
              <SocialScriptCarousel
                prompt={input}
                hasAttachmentContext={composerAttachments.length > 0}
                onCopy={(label) =>
                  pushToast({
                    type: "info",
                    message: `${label} copied ?`,
                  })
                }
              />
            )}

            {composerAttachments.length > 0 && (
              <div className="composer-attachments" aria-label="Attached sources">
                {composerAttachments.map((attachment) => (
                  <div key={attachment.id} className="composer-attachment-pill">
                    {attachment.previewUrl && (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.label}
                        className="composer-attachment-pill__preview"
                      />
                    )}
                    <span className="composer-attachment-pill__kind">
                      {attachment.kind}
                    </span>
                    <span>{attachment.label}</span>
                    {attachment.meta && (
                      <span className="composer-attachment-pill__meta">
                        {attachment.meta}
                      </span>
                    )}
                    <button
                      type="button"
                      className="composer-attachment-pill__remove"
                      onClick={() => handleRemoveComposerAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="composer-input-wrap">
              <div className="composer-leading-tools" ref={composerMenuRef}>
                <button
                  type="button"
                  className={`composer-plus-btn ${
                    composerMenuOpen ? "composer-plus-btn--active" : ""
                  }`}
                  onClick={() => setComposerMenuOpen((current) => !current)}
                  aria-label="Add sources"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {composerMenuOpen && (
                  <div className="composer-menu">
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Photos
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={handleOpenCamera}
                    >
                      Camera
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Files
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => handleAddCloudSource("drive")}
                    >
                      Drive
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => handleAddCloudSource("notebook")}
                    >
                      Notebook
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                id="chat-input"
                className={`composer-input composer-input--textarea ${
                  input.trim() ? "composer-input--active" : ""
                }`}
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as FormEvent);
                  }
                }}
                disabled={isStreaming || showOnboarding}
                autoComplete="off"
                autoFocus
                rows={1}
                aria-label="Message input"
              />

              <button
                type="button"
                className={`composer-voice-btn ${
                  isListening ? "composer-voice-btn--active" : ""
                }`}
                onClick={handleToggleVoiceInput}
                disabled={isStreaming || showOnboarding}
                title={isListening ? "Stop voice input" : "Start voice input"}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 16a4 4 0 0 0 4-4V8a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm0 0v3m-5-6a5 5 0 0 0 10 0m-10 0v1a5 5 0 0 0 10 0v-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                className="composer-send"
                type="submit"
                disabled={isStreaming || showOnboarding || !input.trim()}
                title="Send message"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera capture">
          <div className="camera-modal__card">
            <div className="camera-modal__header">
              <div>
                <p className="camera-modal__eyebrow">Live camera</p>
                <h3 className="camera-modal__title">Capture for Clizel</h3>
              </div>
              <button
                type="button"
                className="camera-modal__close"
                onClick={handleCloseCamera}
                aria-label="Close camera"
              >
                Ã—
              </button>
            </div>

            <div className="camera-modal__viewport">
              <video
                ref={cameraVideoRef}
                className="camera-modal__video"
                autoPlay
                muted
                playsInline
              />
              {cameraState !== "ready" && (
                <div className="camera-modal__overlay">
                  {cameraState === "loading"
                    ? "Opening camera..."
                    : "Camera preview unavailable"}
                </div>
              )}
            </div>

            <div className="camera-modal__actions">
              <button
                type="button"
                className="camera-modal__btn camera-modal__btn--ghost"
                onClick={handleCloseCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="camera-modal__btn camera-modal__btn--primary"
                onClick={handleCaptureFromCamera}
                disabled={cameraState !== "ready"}
              >
                Use capture
              </button>
            </div>
          </div>
        </div>
      )}

      {authModalOpen && (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Authentication"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setAuthModalOpen(false);
            }
          }}
        >
          <div className="auth-modal__card">
            <button
              type="button"
              className="auth-modal__close"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close authentication"
            >
              ×
            </button>

            <div className="auth-modal__body">
              <div className="auth-modal__brand" aria-hidden="true">
                <img src="/logo-mark.png" alt="" className="auth-modal__brand-logo" />
              </div>
              <h3 className="auth-modal__title">Log in or sign up</h3>
              <p className="auth-modal__copy">
                You&apos;ll get smarter responses and can upload files, images, and more.
              </p>

              <div className="auth-provider-list">
                <button
                  type="button"
                  className="auth-provider-btn"
                  onClick={() =>
                    pushToast({
                      type: "info",
                      message: "Social login can be wired to your existing backend next.",
                    })
                  }
                >
                  <span className="auth-provider-btn__icon">
                    <GoogleIcon />
                  </span>
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="auth-provider-btn"
                  onClick={() =>
                    pushToast({
                      type: "info",
                      message: "Social login can be wired to your existing backend next.",
                    })
                  }
                >
                  <span className="auth-provider-btn__icon">
                    <AppleIcon />
                  </span>
                  Continue with Apple
                </button>
                <button
                  type="button"
                  className="auth-provider-btn"
                  onClick={() =>
                    pushToast({
                      type: "info",
                      message: "Phone auth can be connected in account settings.",
                    })
                  }
                >
                  <span className="auth-provider-btn__icon">
                    <PhoneIcon />
                  </span>
                  Continue with phone
                </button>
              </div>

              <div className="auth-modal__separator">
                <span>OR</span>
              </div>

              <form className="auth-modal__form" onSubmit={handleAuthSubmit}>
                {authMode === "register" ? (
                  <input
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                ) : null}
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                />
                <button type="submit" className="auth-modal__submit" disabled={authPending}>
                  {authPending
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Continue"
                      : "Create account"}
                </button>
              </form>

              <button
                type="button"
                className="auth-modal__switch"
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              >
                {authMode === "login"
                  ? "Need an account? Switch to register"
                  : "Already have an account? Switch to login"}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileUpdateModalOpen && (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Profile update"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setProfileUpdateModalOpen(false);
            }
          }}
        >
          <div className="profile-update-modal__card">
            <div className="profile-update-modal__header">
              <div>
                <p className="dashboard-sidebar__eyebrow">Profile</p>
                <h3>Update your profile</h3>
              </div>
              <button
                type="button"
                className="auth-modal__close"
                onClick={() => setProfileUpdateModalOpen(false)}
                aria-label="Close profile update"
              >
                ×
              </button>
            </div>
            <div className="profile-update-modal__body">
              <ProfileSettings />
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}


