"use client";
// Version: 1.0.1 - Force refresh after streaming cleanup

import { type CSSProperties, ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getConversationMessages,
  getConversations,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  sendMessageStream,
  createPaymentOrder,
  verifyPayment,
  type AIProvider,
  type ChatAttachmentPayload,
  type ChatMode,
  type ConversationSummary,
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
import ProfileSettings from "@/components/ProfileSettings";
import { useChatStore, type ChatMessage } from "@/store/chatStore";
import {
  getPersonalityPayload,
  getWelcomeMessage,
  type PersonalityPreset,
} from "@/lib/chatPersonality";
import PremiumEffects from "./chat-ui/PremiumEffects";

type VisualTheme = "default" | "vibe";
type BackgroundEffect = "none" | "glow" | "sparkles" | "waves";
type ThemeDesignerSection = "theme" | "style" | "mood" | "premium";

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
type VibeMood = "happy" | "sad" | "angry" | "excited" | "tired";
type SupportView = "help" | "terms";

const THEME_STORAGE_KEY = "clizel-theme-mode";
const VISUAL_THEME_STORAGE_KEY = "clizel-visual-theme";
const VIBE_MOOD_STORAGE_KEY = "clizel-vibe-mood";
const HEADER_UPGRADE_DISMISSED_KEY = "clizel-header-upgrade-dismissed";
const CUSTOM_THEME_COLORS_KEY = "clizel_custom_theme_colors";
const PRESET_THEME_KEY = "clizel_custom_theme_preset";
const BACKGROUND_EFFECT_KEY = "clizel_background_effect";
const DEFAULT_PREMIUM_THEME_PRESET = "Elegance";

const PREMIUM_THEME_PRESETS: Record<string, string[]> = {
  "Elegance": ["#818cf8", "#c084fc", "#f472b6"],
  "Titanium": ["#94a3b8", "#475569", "#1e293b"],
  "Obsidian": ["#10b981", "#059669", "#064e3b"],
  "Aurora": ["#2dd4bf", "#8b5cf6", "#d946ef"],
  "Slate Pro": ["#cbd5e1", "#64748b", "#1e293b"],
  "Zinc Luxe": ["#d4d4d8", "#52525b", "#18181b"],
  "Solar": ["#fbbf24", "#ea580c", "#7c2d12"],
  "Cyber": ["#22d3ee", "#0891b2", "#155e75"]
};
const DEFAULT_PROVIDER: AIProvider = "Gemini";
const AI_PROVIDERS: AIProvider[] = ["Gemini", "OpenAI", "DeepSeek", "Groq"];
const BACKEND_READY_PROVIDERS: AIProvider[] = ["Gemini", "OpenAI"];
const PROVIDER_COPY: Record<AIProvider, { label: string; description: string }> = {
  Gemini: {
    label: "Gemini",
    description: "Balanced default for everyday work",
  },
  OpenAI: {
    label: "OpenAI",
    description: "Strong for ambitious multi-step tasks",
  },
  DeepSeek: {
    label: "DeepSeek",
    description: "Reasoning focused for deeper analysis",
  },
  Groq: {
    label: "Groq",
    description: "Fastest for quick responses",
  },
};

const VIBE_MOOD_OPTIONS: Array<{
  id: VibeMood;
  label: string;
  description: string;
  accent: [string, string];
  surface: string;
}> = [
  {
    id: "happy",
    label: "Happy",
    description: "Warm golden glow atmosphere",
    accent: ["#fbbf24", "#f59e0b"],
    surface: "linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.08))",
  },
  {
    id: "sad",
    label: "Sad",
    description: "Deep oceanic blue serenity",
    accent: ["#60a5fa", "#3b82f6"],
    surface: "linear-gradient(135deg, rgba(96, 165, 250, 0.16), rgba(59, 130, 246, 0.08))",
  },
  {
    id: "angry",
    label: "Angry",
    description: "Crimson intensity pulse",
    accent: ["#f87171", "#dc2626"],
    surface: "linear-gradient(135deg, rgba(248, 113, 113, 0.16), rgba(220, 38, 38, 0.1))",
  },
  {
    id: "excited",
    label: "Excited",
    description: "Electric cyan and magenta",
    accent: ["#22d3ee", "#d946ef"],
    surface: "linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(217, 70, 239, 0.1))",
  },
  {
    id: "tired",
    label: "Tired",
    description: "Dimmed slate minimalism",
    accent: ["#94a3b8", "#475569"],
    surface: "linear-gradient(135deg, rgba(148, 163, 184, 0.14), rgba(71, 85, 105, 0.08))",
  },
];

const BASE_THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  description: string;
  eyebrow: string;
}> = [
  {
    id: "dark",
    label: "Night Studio",
    description: "Deep contrast, calm focus.",
    eyebrow: "Recommended",
  },
  {
    id: "light",
    label: "Soft Daylight",
    description: "Bright cards, soft shadows.",
    eyebrow: "Clean",
  },
];

const VISUAL_THEME_OPTIONS: Array<{
  id: VisualTheme;
  label: string;
  description: string;
  badge: string;
}> = [
  {
    id: "default",
    label: "Clean Default",
    description: "Minimal, tidy, distraction-free.",
    badge: "Classic",
  },
  {
    id: "vibe",
    label: "Vibe Mode",
    description: "Glow, depth, and richer mood.",
    badge: "Immersive",
  },
];

const THEME_DESIGNER_SECTIONS: Array<{
  id: ThemeDesignerSection;
  label: string;
  description: string;
}> = [
  {
    id: "theme",
    label: "Theme",
    description: "Compact boxed layout",
  },
  {
    id: "style",
    label: "Chat style",
    description: "Glow depth or clean default",
  },
  {
    id: "mood",
    label: "Color presets",
    description: "Mood-driven accents",
  },
  {
    id: "premium",
    label: "Custom polish",
    description: "Premium colors and effects",
  },
];

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim();
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) {
    return `rgba(99, 102, 241, ${alpha})`;
  }

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const personalityPromptMap: Record<
  PersonalityPreset,
  { tonePreference: string; mood: string }
> = {
  Friendly: {
    tonePreference: "gentle, emotionally warm, validating, like a close friend texting you at 2am who actually gets it",
    mood: "relaxed",
  },
  Funny: {
    tonePreference: "chaotic-cute, playful, expressive, funny in a natural texting way, like a real online bestie",
    mood: "curious",
  },
  Motivational: {
    tonePreference: "high-energy, emotionally smart, confident, push-you-forward bestie energy with modern texting rhythm",
    mood: "focused",
  },
};

function toStoreMessage(
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  },
): ChatMessage {
  return {
    id: message.id,
    sender: message.role === "user" ? "user" : "ai",
    text: message.content,
    status: "complete" as const,
    timestamp: new Date(message.createdAt).getTime(),
  };
}

function buildModeInstruction(mode: ChatMode) {
  switch (mode) {
    case "search":
      return "Use search mode: answer with the clearest direct result first, then only the most relevant supporting detail.";
    case "analyze":
      return "Use analyze mode: inspect the request carefully, point out patterns or issues, and explain your reasoning clearly.";
    case "create":
      return "Use create mode: produce polished, useful output that is easy to copy or send as-is.";
    default:
      return "";
  }
}

function buildSocialActionPrompt(action: "fix" | "explain", sourceText: string) {
  if (action === "fix") {
    return `Please improve and tighten this reply so it sounds smarter, cleaner, and more natural while keeping the same intent:\n\n${sourceText}`;
  }

  return `Please explain this reply in simple words, highlight what it means, and point out the main takeaway:\n\n${sourceText}`;
}


function isBackendFallbackReply(text: string) {
  return text.trim().startsWith("Clizel fallback reply:");
}

function buildFallbackApiError(provider: AIProvider): ApiError {
  return {
    status: 503,
    message:
      provider === DEFAULT_PROVIDER
        ? "The selected provider is unavailable right now."
        : `The ${provider} model is unavailable right now.`,
  };
}

function isProviderUnavailableError(error: ApiError) {
  return /model not available|provider|model|unsupported|not available|unavailable/i.test(
    error.message,
  );
}

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

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.2 9a3.1 3.1 0 1 1 5.26 2.24c-.68.67-1.46 1.16-1.46 2.26M12 17.2h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 5 6v5c0 4.4 2.9 8.48 7 9.8 4.1-1.32 7-5.4 7-9.8V6l-7-3Zm-2 9 1.5 1.5L15 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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

function PricingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM9 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm13-4V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5C7 5 2.73 8.11 1 12.46c1.73 4.35 6 7.54 11 7.54s9.27-3.19 11-7.54C21.27 8.11 17 5 12 5Zm0 10a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Zm0-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l18 18M6.5 10c-1.38 2.02-2.2 4.49-2.2 7.15 0 7.73 6.27 14 14 14 2.66 0 5.13-.82 7.15-2.2M9.86 9.86a3.99 3.99 0 0 0 5.28 5.28M23 12c-1.73-4.35-6-7.54-11-7.54-1.55 0-3.05.23-4.49.67"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const setMessages = useChatStore((state) => state.setMessages);
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
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<
    ComposerAttachment[]
  >([]);
  const [activeTool, setActiveTool] = useState<ChatMode>("search");
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>(DEFAULT_PROVIDER);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [isLagging, setIsLagging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerSettingsOpen, setDrawerSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "theme" | "subscription">("main");
  const [activePanelTab, setActivePanelTab] = useState<DashboardTab>("chats");
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("profileUpdate");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileUpdateModalOpen, setProfileUpdateModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [activeThemeDesignerSection, setActiveThemeDesignerSection] =
    useState<ThemeDesignerSection>("theme");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportView, setSupportView] = useState<SupportView>("help");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [visualTheme, setVisualTheme] = useState<VisualTheme>("default");
  const [vibeMood, setVibeMood] = useState<VibeMood>("excited");
  const [headerUpgradeDismissed, setHeaderUpgradeDismissed] = useState(false);

  // Premium Theme States
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [customThemeColors, setCustomThemeColors] = useState<string[]>([
    ...PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET],
  ]);
  const [customThemePreset, setCustomThemePreset] = useState(
    DEFAULT_PREMIUM_THEME_PRESET,
  );
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect>("none");
  const [savedConversations, setSavedConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);

  // Payment States
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerMenuRef = useRef<HTMLDivElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{
    stop: () => void;
  } | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const lastChunkAtRef = useRef(0);
  const themeDesignerBodyRef = useRef<HTMLDivElement>(null);
  const themeDesignerSectionRefs = useRef<Record<ThemeDesignerSection, HTMLElement | null>>({
    theme: null,
    style: null,
    mood: null,
    premium: null,
  });

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
    if (!drawerSettingsOpen) {
      setSettingsView("main");
    }
  }, [drawerSettingsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const storedVisualTheme = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    const storedVibeMood = window.localStorage.getItem(VIBE_MOOD_STORAGE_KEY);
    const storedUpgradeDismissed = window.localStorage.getItem(HEADER_UPGRADE_DISMISSED_KEY) === "true";

    if (storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
    if (storedVisualTheme === "default" || storedVisualTheme === "vibe") setVisualTheme(storedVisualTheme);
    if (["happy", "sad", "angry", "excited", "tired"].includes(storedVibeMood || "")) {
      setVibeMood(storedVibeMood as any);
    }
    setHeaderUpgradeDismissed(storedUpgradeDismissed);

    // Premium Hydration
    const sCol = window.localStorage.getItem(CUSTOM_THEME_COLORS_KEY);
    const sPre = window.localStorage.getItem(PRESET_THEME_KEY);
    const sEff = window.localStorage.getItem(BACKGROUND_EFFECT_KEY);

    if (sCol) {
      try {
        const parsed = JSON.parse(sCol);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          setCustomThemeColors(parsed.slice(0, 3));
        }
      } catch (error) {}
    }
    if (sPre) {
      setCustomThemePreset(
        Object.prototype.hasOwnProperty.call(PREMIUM_THEME_PRESETS, sPre)
          ? sPre
          : "Custom Mix",
      );
    }
    if (sEff) setBackgroundEffect(sEff as BackgroundEffect);
    if (sCol || sPre || sEff) setIsPremiumUser(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPlanLabel = window.localStorage.getItem("userPlanLabel");
    const storedIsPro = window.localStorage.getItem("userPlanIsPro");
    if (!storedPlanLabel && storedIsPro === null) return;

    updateUserProfile({
      ...(storedPlanLabel ? { userPlan: storedPlanLabel } : {}),
      ...(storedIsPro !== null ? { isPro: storedIsPro === "true" } : {}),
    });
  }, [updateUserProfile]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const [primary, secondary, accent] = [
      customThemeColors[0] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][0],
      customThemeColors[1] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][1],
      customThemeColors[2] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][2],
    ];

    window.localStorage.setItem(
      CUSTOM_THEME_COLORS_KEY,
      JSON.stringify([primary, secondary, accent]),
    );
    window.localStorage.setItem(PRESET_THEME_KEY, customThemePreset);
    window.localStorage.setItem(BACKGROUND_EFFECT_KEY, backgroundEffect);

    if (visualTheme === "vibe" && customThemeColors.length >= 2) {
      const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
      document.documentElement.style.setProperty("--primary-gradient", gradient);
      document.documentElement.style.setProperty("--accent-primary", primary);
      document.documentElement.style.setProperty("--bubble-user", gradient);
      document.documentElement.style.setProperty("--purple", primary);
      document.documentElement.style.setProperty("--purple-mid", secondary);
      document.documentElement.style.setProperty("--border", hexToRgba(accent, 0.18));
      document.documentElement.style.setProperty("--shadow-glow", `0 0 34px ${hexToRgba(primary, 0.28)}`);
    } else {
      document.documentElement.style.removeProperty("--primary-gradient");
      document.documentElement.style.removeProperty("--accent-primary");
      document.documentElement.style.removeProperty("--bubble-user");
      document.documentElement.style.removeProperty("--purple");
      document.documentElement.style.removeProperty("--purple-mid");
      document.documentElement.style.removeProperty("--border");
      document.documentElement.style.removeProperty("--shadow-glow");
    }

    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, visualTheme);
  }, [customThemeColors, customThemePreset, visualTheme, backgroundEffect]);

  useEffect(() => {
    document.documentElement.setAttribute("data-chat-visual-theme", visualTheme);
    document.documentElement.setAttribute("data-chat-vibe-mood", vibeMood);
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, visualTheme);
    window.localStorage.setItem(VIBE_MOOD_STORAGE_KEY, vibeMood);
  }, [visualTheme, vibeMood]);

  useEffect(() => {
    if (!themeModalOpen) {
      return;
    }

    setActiveThemeDesignerSection("theme");
    themeDesignerBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [themeModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      HEADER_UPGRADE_DISMISSED_KEY,
      headerUpgradeDismissed ? "true" : "false",
    );
  }, [headerUpgradeDismissed]);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (!active) {
          return;
        }

        setAuthUser(data.user);
        const isPro = data.user.plan === "PRO";
        updateUserProfile({
          displayName: data.user.name ?? data.user.email ?? "Clizel User",
          email: data.user.email ?? "",
          userPlan: data.user.plan ?? "Free",
          isPro: isPro,
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAuthUser(null);
        setSavedConversations([]);
      });

    return () => {
      active = false;
    };
  }, [updateUserProfile]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let active = true;

    getConversations()
      .then((items) => {
        if (!active) {
          return;
        }

        setSavedConversations(items);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("Conversation list load failed:", error);
      });

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !conversationId) {
      return;
    }

    let active = true;
    setLoadingConversationId(conversationId);

    getConversationMessages(conversationId)
      .then((items) => {
        if (!active) {
          return;
        }

        if (items.length) {
          setMessages(items.map(toStoreMessage));
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("Conversation hydrate failed:", error);
      })
      .finally(() => {
        if (active) {
          setLoadingConversationId((current) =>
            current === conversationId ? null : current,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [authUser, conversationId, setMessages]);

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

      if (!providerMenuRef.current?.contains(event.target as Node)) {
        setProviderMenuOpen(false);
      }
    }

    if (composerMenuOpen || providerMenuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [composerMenuOpen, providerMenuOpen]);

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

  function handleOpenComposerProviderMenu() {
    setComposerMenuOpen(false);
    setProviderMenuOpen(true);
  }

  function handleUseSkillsShortcut() {
    setComposerMenuOpen(false);
    setActiveTool("create");
    pushToast({
      type: "info",
      message: "Skills shortcut ready. Switched to Create mode.",
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
        message: "Could not open camera. Please check permissions and try again.",
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
        message: "Failed to initialize camera frame capture.",
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

  function buildConversationHistory(sourceMessages: typeof messages) {
    return sourceMessages
      .filter(
        (message) =>
          message.text.trim().length > 0 && message.status !== "failed",
      )
      .map((message) => ({
        sender: message.sender,
        text: message.text,
      })) as MessageTurn[];
  }

  function buildPromptPayload(
    text: string,
    attachmentPayload: ChatAttachmentPayload[] = [],
  ) {
    const attachmentSummary =
      attachmentPayload.length > 0
        ? `\n\nContext: ${attachmentPayload
            .map((attachment) =>
              [attachment.kind, attachment.label, attachment.meta]
                .filter(Boolean)
                .join(" - "),
            )
            .join("; ")}`
        : "";
    const modeInstruction = (() => {
      if (activeTool === "search") {
        return "Search mode.";
      }

      if (activeTool === "analyze") {
        return "Analyze mode.";
      }

      if (activeTool === "create") {
        return "Create mode.";
      }

      return "";
    })();

    return {
      message: `${modeInstruction ? `${modeInstruction}\n\n` : ""}${text}${attachmentSummary}`.trim().slice(0, 950),
      tonePreference: `${getPersonalityPayload(personality).tonePreference}, ${personalityPromptMap[personality].tonePreference}`,
      mood: personalityPromptMap[personality].mood,
    };
  }

  async function loadConversation(conversation: ConversationSummary) {
    setLoadingConversationId(conversation.id);
    setErrorState(null);

    try {
      const conversationMessages = await getConversationMessages(conversation.id);
      setMessages(conversationMessages.map(toStoreMessage));
      setConversationId(conversation.id);
      setPanelOpen(false);
    } catch (error) {
      console.error("Conversation load failed:", error);
      pushToast({
        type: "error",
        message: "Could not load saved chat. Please try again.",
      });
    } finally {
      setLoadingConversationId((current) =>
        current === conversation.id ? null : current,
      );
    }
  }

  async function streamAssistantReply(
    text: string,
    history: MessageTurn[],
    attachmentPayload: ChatAttachmentPayload[] = [],
    clearAttachmentsOnSuccess = false,
    provider: AIProvider = selectedProvider,
  ) {
    if (!BACKEND_READY_PROVIDERS.includes(provider)) {
      setSelectedProvider(DEFAULT_PROVIDER);
      setProviderMenuOpen(false);
      setProviderNotice(`${provider} is not available right now. Switched to Gemini.`);
      pushToast({
        type: "error",
        message: "Model not available",
      });

      return streamAssistantReply(
        text,
        history,
        attachmentPayload,
        clearAttachmentsOnSuccess,
        DEFAULT_PROVIDER,
      );
    }

    const aiMessageId = addMessage({
      sender: "ai",
      text: "",
      status: "pending",
    });

    setErrorState(null);
    lastChunkAtRef.current = performance.now();
    setIsLagging(false);

    try {
      const promptPayload = buildPromptPayload(text, attachmentPayload);
      const streamMeta = await sendMessageStream(
        promptPayload.message,
        provider,
        personality,
        history,
        {
          goals: userProfile.goals.trim(),
          interests: userProfile.interests.trim(),
        },
        (chunk) => {
          lastChunkAtRef.current = performance.now();
          setIsLagging(false);
          appendChunk(aiMessageId, chunk);
        },
        attachmentPayload,
        activeTool,
        {
          tonePreference: promptPayload.tonePreference,
          mood: promptPayload.mood,
        },
        conversationId,
      );


      if (streamMeta?.conversationId) {
        setConversationId(streamMeta.conversationId);
      }

      const currentMessage = useChatStore
        .getState()
        .messages.find((message) => message.id === aiMessageId);
      const hasContent = !!currentMessage?.text;

      if (streamMeta || hasContent) {
        const receivedFallbackReply =
          streamMeta?.provider === "fallback" ||
          isBackendFallbackReply(currentMessage?.text ?? "");

        if (receivedFallbackReply) {
          removeMessage(aiMessageId);
          setErrorState(resolveErrorState(buildFallbackApiError(provider)));
          setProviderNotice(
            provider === DEFAULT_PROVIDER
              ? "Gemini is currently unavailable. Please try again in a few moments."
              : `${provider} was unavailable, so we've switched you to Gemini for now.`,
          );
          pushToast({
            type: "error",
            message:
              provider === DEFAULT_PROVIDER
                ? "AI model is unavailable right now"
                : "Model not available",
          });

          if (provider !== DEFAULT_PROVIDER) {
            setSelectedProvider(DEFAULT_PROVIDER);
            setProviderMenuOpen(false);
          }

          return;
        }

        if (currentMessage?.text) {
          setProviderNotice(null);
        }

        markComplete(aiMessageId);
        if (clearAttachmentsOnSuccess) {
          clearComposerAttachments();
        }
        if (authUser) {
          getConversations()
            .then((items) => setSavedConversations(items))
            .catch((error) => console.error("Conversation refresh failed:", error));
        }
      } else {
        removeMessage(aiMessageId);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      const partialMessage = useChatStore
        .getState()
        .messages.find((message) => message.id === aiMessageId);
      const hasPartialText = !!partialMessage?.text.trim();

      setIsLagging(false);

      if (hasPartialText) {
        markComplete(aiMessageId);
        pushToast({
          type: "info",
          message: "Reply ka kuch part aa gaya tha, so maine partial response preserve kar diya.",
        });
      } else if (
        provider !== DEFAULT_PROVIDER &&
        isProviderUnavailableError(apiErr)
      ) {
        removeMessage(aiMessageId);
        setSelectedProvider(DEFAULT_PROVIDER);
        setProviderMenuOpen(false);
        setProviderNotice(`${provider} unavailable tha, so Gemini pe switch kar diya.`);
        pushToast({
          type: "error",
          message: "Model not available",
        });
        await streamAssistantReply(
          text,
          history,
          attachmentPayload,
          clearAttachmentsOnSuccess,
          DEFAULT_PROVIDER,
        );
      } else {
        removeMessage(aiMessageId);
        setErrorState(resolveErrorState(apiErr));
        setProviderNotice(
          provider === DEFAULT_PROVIDER
            ? "Gemini couldn't respond right now. Please retry."
            : `${provider} failed to respond.`,
        );
        pushToast({
          type: "error",
          message:
            apiErr.message || "Oops ðŸ˜… Something went wrong. Please try again!",
        });
      }
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

    const priorHistory = buildConversationHistory(messages);
    const history: MessageTurn[] = [...priorHistory, { sender: "user", text }];
    const attachmentPayload = buildAttachmentPayload(composerAttachments);
    await streamAssistantReply(text, history, attachmentPayload, true);
  }

  async function handleSmartAction(action: "fix" | "explain", sourceText: string) {
    if (isStreaming) {
      return;
    }

    const actionLabel = action === "fix" ? "Fix reply" : "Explain";
    const prompt = buildSocialActionPrompt(action, sourceText);

    addMessage({
      sender: "user",
      text: actionLabel,
      status: "complete",
    });

    const history = [
      ...buildConversationHistory(messages),
      { sender: "user" as const, text: actionLabel },
    ];

    await streamAssistantReply(prompt, history);
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
    setEditingMessageId(null);
    setEditingText("");

    if (editedMessageIndex === -1) {
      return;
    }

    const nextMessages = messages
      .slice(0, editedMessageIndex + 1)
      .map((message) =>
        message.id === editingMessageId
          ? {
              ...message,
              text: nextText,
              timestamp: Date.now(),
            }
          : message,
      );

    setMessages(nextMessages);

    const priorHistory = buildConversationHistory(nextMessages.slice(0, editedMessageIndex));

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
  const historyItems: HistoryPreview[] = savedConversations.length
    ? savedConversations.map((conversation, index) => ({
        id: conversation.id,
        title: conversation.title || (index === 0 ? "Current chat" : `Chat ${index + 1}`),
        preview:
          conversation.lastMessage?.content ||
          conversation.title ||
          "Open this saved chat",
      }))
    : messages
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
    : loadingConversationId
      ? "Loading chat..."
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

  function openSupportModal(view: SupportView) {
    setSupportView(view);
    setSupportModalOpen(true);
    setDrawerSettingsOpen(false);
    setPanelOpen(false);
  }

  function openThemeModal() {
    setThemeModalOpen(true);
    setDrawerSettingsOpen(false);
    setPanelOpen(false);
  }

  function handleReportIssue() {
    if (typeof window !== "undefined") {
      window.location.href =
        "mailto:support@clizel.ai?subject=Clizel%20Support%20Request&body=Hi%20Clizel%20team%2C%0A%0AI%20need%20help%20with%3A%20";
    }

    pushToast({
      type: "info",
      message: "Support email opened so you can report the issue.",
    });
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

  function handleSetThemeMode(nextThemeMode: ThemeMode) {
    setThemeMode(nextThemeMode);
    pushToast({
      type: "info",
      message: `Theme switched to ${nextThemeMode} mode`,
    });
  }

  function handleToggleTheme() {
    handleSetThemeMode(themeMode === "dark" ? "light" : "dark");
  }

  function handleSetVisualTheme(nextVisualTheme: VisualTheme) {
    setVisualTheme(nextVisualTheme);
    pushToast({
      type: "info",
      message:
        nextVisualTheme === "vibe"
          ? "Vibe mode enabled from Theme settings."
          : "Default chat theme restored.",
    });
  }

  function handleSetVibeMood(nextMood: VibeMood) {
    setVibeMood(nextMood);
    pushToast({
      type: "info",
      message: `${nextMood.charAt(0).toUpperCase()}${nextMood.slice(1)} mood applied.`,
    });
  }

  function scrollThemeDesignerSection(section: ThemeDesignerSection) {
    setActiveThemeDesignerSection(section);
    const node = themeDesignerSectionRefs.current[section];

    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleThemeDesignerScroll() {
    const container = themeDesignerBodyRef.current;
    if (!container) {
      return;
    }

    let closestSection = activeThemeDesignerSection;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const section of THEME_DESIGNER_SECTIONS) {
      const node = themeDesignerSectionRefs.current[section.id];
      if (!node) {
        continue;
      }

      const distance = Math.abs(node.offsetTop - container.scrollTop - 16);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSection = section.id;
      }
    }

    if (closestSection !== activeThemeDesignerSection) {
      setActiveThemeDesignerSection(closestSection);
    }
  }

  function updateCustomThemeColor(index: number, value: string) {
    setIsPremiumUser(true);
    setActiveThemeDesignerSection("premium");
    setVisualTheme("vibe");
    setCustomThemePreset("Custom Mix");
    setCustomThemeColors((currentColors) => {
      const nextColors = [
        currentColors[0] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][0],
        currentColors[1] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][1],
        currentColors[2] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][2],
      ];

      nextColors[index] = value;
      return nextColors;
    });
  }

  function applyPremiumPreset(preset: string) {
    const nextColors = PREMIUM_THEME_PRESETS[preset];
    if (!nextColors) {
      return;
    }

    setIsPremiumUser(true);
    setActiveThemeDesignerSection("premium");
    setVisualTheme("vibe");
    setCustomThemePreset(preset);
    setCustomThemeColors([...nextColors]);
  }

  function handlePremiumEffectChange(nextEffect: BackgroundEffect) {
    setIsPremiumUser(true);
    setActiveThemeDesignerSection("premium");
    setVisualTheme("vibe");
    setBackgroundEffect(nextEffect);
  }

  function resetPremiumTheme() {
    setVisualTheme("default");
    setVibeMood("excited");
    setCustomThemePreset(DEFAULT_PREMIUM_THEME_PRESET);
    setCustomThemeColors([...PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET]]);
    setBackgroundEffect("none");
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

    if (authMode === "register" && authPassword !== authConfirmPassword) {
      pushToast({
        type: "error",
        message: "Passwords do not match.",
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
        email: session.user.email ?? "",
      });
      setAuthPassword("");
      setAuthConfirmPassword("");
      setAuthModalOpen(false);
      getConversations()
        .then((items) => setSavedConversations(items))
        .catch((error) => console.error("Conversation list refresh failed:", error));
      pushToast({
        type: "info",
        message: authMode === "login" ? "Logged in successfully ✔…" : "Account created ✔…",
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
      setSavedConversations([]);
      setAuthPassword("");
      setAuthConfirmPassword("");
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

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if ((window as Window & { Razorpay?: unknown }).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  async function handleUpgradePlan() {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
    if (!razorpayKey) {
      setPaymentError("Payment system not configured");
      pushToast({ type: "error", message: "Payment system is not available." });
      return;
    }

    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      // Step 1: Create order from backend
      const orderData = await createPaymentOrder(1999);
      
      // Step 2: Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Could not load Razorpay");
      }

      const RazorpayConstructor = (window as Window & { Razorpay?: any }).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error("Razorpay is not available");
      }

      const amount = 1999 * 100; // ₹1999 in paise
      const options = {
        key: razorpayKey,
        amount,
        currency: "INR",
        name: "Clizel",
        description: "Upgrade to Pro Plan",
        order_id: orderData.orderId,
        prefill: {
          name: userProfile.displayName || "User",
          email: userProfile.email || "",
        },
        theme: {
          color: themeMode === "dark" ? "#3b82f6" : "#2563eb",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Step 3: Verify payment with backend
            const verifyResult = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );

            if (verifyResult.success) {
              // Step 4: Fetch updated user data
              const userData = await getCurrentUser();
              
              // Step 5: Update UI state
              setAuthUser(userData.user);
              const isPro = userData.user.plan === "PRO";
              updateUserProfile({
                userPlan: isPro ? "Pro Plan" : "Free",
                isPro: isPro,
              });

              setPaymentProcessing(false);
              setDrawerSettingsOpen(false);
              setSettingsView("subscription");

              pushToast({
                message: "Payment Successful 🎉 Welcome to Pro!",
                type: "info",
              });
            } else {
              throw new Error(verifyResult.message || "Payment verification failed");
            }
          } catch (verifyError) {
            const message =
              verifyError && typeof verifyError === "object" && "message" in verifyError
                ? String(verifyError.message)
                : "Payment verification failed";
            setPaymentError(message);
            setPaymentProcessing(false);
            pushToast({ type: "error", message: "Payment verification failed" });
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            pushToast({
              message: "Payment was cancelled.",
              type: "error",
            });
          },
        },
      };

      const instance = new RazorpayConstructor(options);
      instance.on("payment.failed", () => {
        setPaymentProcessing(false);
        setPaymentError("Payment failed. Please try again.");
        pushToast({
          message: "Payment failed ❌ Please retry.",
          type: "error",
        });
      });

      instance.open();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Payment processing failed";
      setPaymentError(message);
      setPaymentProcessing(false);
      pushToast({ type: "error", message });
    }
  }

  const profileDisplayName =
    authUser?.name ||
    userProfile.displayName ||
    authUser?.email ||
    "You";
  const profileInitial = profileDisplayName.trim().charAt(0).toUpperCase() || "Y";
  const premiumPalette = [
    customThemeColors[0] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][0],
    customThemeColors[1] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][1],
    customThemeColors[2] ?? PREMIUM_THEME_PRESETS[DEFAULT_PREMIUM_THEME_PRESET][2],
  ];
  const premiumPaletteGradient = `linear-gradient(135deg, ${premiumPalette[0]}, ${premiumPalette[1]}, ${premiumPalette[2]})`;
  const activeMoodMeta =
    VIBE_MOOD_OPTIONS.find((mood) => mood.id === vibeMood) ?? VIBE_MOOD_OPTIONS[0];

  return (
    <div
      className={`chat-shell ${isImmersive ? "chat-shell--immersive" : ""} ${
        visualTheme === "vibe" ? `chat-shell--vibe mood-${vibeMood}` : ""
      }`.trim()}
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
        className={`chat-panel ${isImmersive ? "chat-panel--immersive" : ""} ${
          visualTheme === "vibe" ? `chat-panel--vibe mood-${vibeMood}` : ""
        }`.trim()}
      >
        {visualTheme === "vibe" && (
          <PremiumEffects
            isPremium={isPremiumUser}
            mood={vibeMood}
            effect={backgroundEffect}
            customColors={{
              primary: customThemeColors[0] ?? "#6366f1",
              secondary: customThemeColors[1] ?? "#a855f7",
              accent: customThemeColors[2] ?? "#6366f1",
            }}
          />
        )}
        {visualTheme === "vibe" ? (
          <div className={`chat-vibe-backdrop mood-${vibeMood}`} aria-hidden="true">
            <span className="chat-vibe-orb chat-vibe-orb--one" />
            <span className="chat-vibe-orb chat-vibe-orb--two" />
            <span className="chat-vibe-orb chat-vibe-orb--three" />
            <span className="chat-vibe-particles" />
          </div>
        ) : null}
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
                style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}
                onClick={() => {
                  setThemeModalOpen(true);
                }}
              >
                <CustomizeIcon />
                <span style={{ fontWeight: 700 }}>Vibe Designer</span>
              </button>
            </div>

            {activePanelTab === "chats" ? (
              <div className="dashboard-panel-stack dashboard-panel-stack--chats">
                <div className="dashboard-sidebar__section">
                  <p className="dashboard-sidebar__label">Recent Chats</p>
                  <div className="dashboard-history">
                    {historyItems.length ? (
                      historyItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`dashboard-history__item ${
                            item.id === conversationId ? "is-active" : ""
                          }`}
                          onClick={() => {
                            const matchedConversation = savedConversations.find(
                              (conversation) => conversation.id === item.id,
                            );

                            if (matchedConversation) {
                              void loadConversation(matchedConversation);
                              return;
                            }

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
              className="workspace-quick-action"
              onClick={() => {
                router.push("/pricing");
                setPanelOpen(false);
              }}
            >
              <PricingIcon />
              <span>Go Upgrade</span>
            </button>
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
                {settingsView === "main" ? (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">Account & Profile</div>
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
                        onClick={() => openSettingsSection("activity")}
                      >
                        <GridIcon />
                        <span>Activity Feed</span>
                      </button>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Experience</div>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => setSettingsView("theme")}
                      >
                        <ThemeIcon mode={themeMode} />
                        <span>Theme</span>
                      </button>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => setSettingsView("subscription")}
                      >
                        <PricingIcon />
                        <span className="flex-between">
                          Subscription
                          <span className="upgrade-badge">Upgrade</span>
                        </span>
                      </button>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Support & Legal</div>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => openSupportModal("help")}
                      >
                        <HelpIcon />
                        <span>Help Center</span>
                      </button>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => {
                          router.push("/terms");
                          setPanelOpen(false);
                        }}
                      >
                        <ShieldIcon />
                        <span>Terms</span>
                      </button>
                      <button
                        type="button"
                        className="workspace-quick-action workspace-quick-action--sub"
                        onClick={() => {
                          router.push("/privacy");
                          setPanelOpen(false);
                        }}
                      >
                        <ShieldIcon />
                        <span>Privacy</span>
                      </button>
                    </div>
                  </>
                ) : settingsView === "theme" ? (
                  <>
                    <button
                      type="button"
                      className="settings-back-btn"
                      onClick={() => setSettingsView("main")}
                    >
                      {"<- Back to settings"}
                    </button>
                    <div className="nested-settings-title">Theme</div>
                    <button
                      type="button"
                      className={`workspace-quick-action workspace-quick-action--sub ${
                        themeMode === "light" ? "is-active" : ""
                      }`}
                      onClick={() => setThemeMode("light")}
                    >
                      <ThemeIcon mode="light" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`workspace-quick-action workspace-quick-action--sub ${
                        themeMode === "dark" ? "is-active" : ""
                      }`}
                      onClick={() => setThemeMode("dark")}
                    >
                      <ThemeIcon mode="dark" />
                      <span>Dark</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="settings-back-btn"
                      onClick={() => setSettingsView("main")}
                    >
                      {"<- Back to settings"}
                    </button>
                    <div className="nested-settings-title">Subscription</div>
                    <div className="subscription-card-compact">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong>{userProfile.userPlan ?? "Free Plan"}</strong>
                        {userProfile.isPro && <span className="pro-badge-small">✨ Pro</span>}
                      </div>
                      <p>
                        {userProfile.isPro
                          ? "Premium access unlocked with your current plan."
                          : "Basic features with standard AI speed."}
                      </p>
                      {!userProfile.isPro ? (
                        <>
                          <div className="subscription-price">
                            <span className="price">₹1999</span>
                            <span className="period">/month</span>
                          </div>
                          <button
                            type="button"
                            className="upgrade-action-btn"
                            onClick={handleUpgradePlan}
                            disabled={paymentProcessing}
                          >
                            {paymentProcessing ? (
                              <>
                                <span className="payment-loader"></span>
                                Processing...
                              </>
                            ) : (
                              "Upgrade to Pro"
                            )}
                          </button>
                          {paymentError && (
                            <div className="payment-error-message">
                              {paymentError}
                              <button
                                type="button"
                                className="payment-error-retry"
                                onClick={handleUpgradePlan}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="subscription-current-message">
                          ✓ You are enjoying premium benefits
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                    historyItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`dashboard-history__item ${
                          item.id === conversationId ? "is-active" : ""
                        }`}
                        onClick={() => {
                          const matchedConversation = savedConversations.find(
                            (conversation) => conversation.id === item.id,
                          );

                          if (matchedConversation) {
                            void loadConversation(matchedConversation);
                            return;
                          }

                          handleRetryFromText(item.preview);
                        }}
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
                  className="workspace-upgrade-btn"
                  onClick={() => router.push("/pricing")}
                >
                  <PricingIcon />
                  <span className="workspace-upgrade-btn__copy">
                    <strong>Upgrade to Pro</strong>
                    <small>Unlock smarter tools and premium access</small>
                  </span>
                </button>
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
                    <span className="flex-between">
                      <strong>{profileDisplayName}</strong>
                      {userProfile.isPro ? <span className="upgrade-badge">Pro</span> : null}
                    </span>
                    <small>{userProfile.userPlan ?? "Free plan"}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`dashboard-sidebar__theme-icon ${
                    themeMode === "dark" ? "is-dark" : "is-light"
                  }`}
                  onClick={openThemeModal}
                  title="Open theme settings"
                  aria-label="Open theme settings"
                >
                  <ThemeIcon mode={themeMode} />
                </button>
                <button
                  type="button"
                  className="workspace-footer-icon"
                  onClick={openThemeModal}
                  title="Theme settings"
                  aria-label="Theme settings"
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
          {!headerUpgradeDismissed ? (
            <div className="chat-header-center">
              <div className="chat-upgrade-btn">
                <button
                  type="button"
                  className="chat-upgrade-btn__main"
                  title="Upgrade"
                  onClick={() => router.push("/pricing")}
                >
                  <PricingIcon />
                  <span className="chat-upgrade-btn__label">Upgrade</span>
                </button>
                <button
                  type="button"
                  className="chat-upgrade-close"
                  aria-label="Hide upgrade"
                  title="Hide upgrade"
                  onClick={() => setHeaderUpgradeDismissed(true)}
                >
                  x
                </button>
              </div>
            </div>
          ) : null}
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
                  {msg.sender === "ai" &&
                  !msg.text &&
                  (msg.status === "pending" || msg.status === "streaming") ? (
                    <TypingIndicator label="Clizel is cooking..." />
                  ) : msg.sender === "ai" ? (
                    <div className="ai-markdown-wrap">
                      <MarkdownRenderer content={msg.text} />
                    </div>
                  ) : (
                    <p className="bubble-text bubble-text--plain">
                      {msg.text || "\u00A0"}
                    </p>
                  )}

                  

                  {msg.status === "failed" && (
                    <span className="bubble-status">Stream interrupted</span>
                  )}

                  {msg.text && (
                    <MessageActions
                      text={msg.text}
                      sender={msg.sender}
                      onFixReply={
                        msg.sender === "ai"
                          ? () => {
                              void handleSmartAction("fix", msg.text);
                            }
                          : undefined
                      }
                      onExplain={
                        msg.sender === "ai"
                          ? () => {
                              void handleSmartAction("explain", msg.text);
                            }
                          : undefined
                      }
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
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.ppt,.pptx"
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
                    onClick={() => setActiveTool(tool as ChatMode)}
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

            {providerNotice && (
              <div className="composer-provider-notice" role="status" aria-live="polite">
                {providerNotice}
              </div>
            )}

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
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="composer-menu__item-icon" aria-hidden="true">
                        ↗
                      </span>
                      <span className="composer-menu__item-meta">
                        <span>Upload files or images</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={() => handleAddCloudSource("drive")}
                    >
                      <span className="composer-menu__item-icon" aria-hidden="true">
                        ⌁
                      </span>
                      <span className="composer-menu__item-meta">
                        <span>Connectors and sources</span>
                      </span>
                      <span className="composer-menu__item-chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={handleUseSkillsShortcut}
                    >
                      <span className="composer-menu__item-icon" aria-hidden="true">
                        ✦
                      </span>
                      <span className="composer-menu__item-meta">
                        <span>Use skills</span>
                      </span>
                      <span className="composer-menu__item-chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                    <button
                      type="button"
                      className="composer-menu__item"
                      onClick={handleOpenComposerProviderMenu}
                    >
                      <span className="composer-menu__item-icon" aria-hidden="true">
                        ◌
                      </span>
                      <span className="composer-menu__item-meta">
                        <span>Select orchestrator model</span>
                        <small>{selectedProvider}</small>
                      </span>
                      <span className="composer-menu__item-chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </div>
                )}

                {providerMenuOpen && (
                  <div
                    className="composer-provider-menu"
                    ref={providerMenuRef}
                    role="listbox"
                    aria-label="AI providers"
                  >
                    {AI_PROVIDERS.map((providerOption) => {
                      const isActive = providerOption === selectedProvider;
                      const providerDetails = PROVIDER_COPY[providerOption];

                      return (
                        <button
                          key={providerOption}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`composer-provider-option ${
                            isActive ? "composer-provider-option--active" : ""
                          }`}
                          onClick={() => {
                            setSelectedProvider(providerOption);
                            setProviderMenuOpen(false);
                            setProviderNotice(null);
                          }}
                        >
                          <span className="composer-provider-option__meta">
                            <span className="composer-provider-option__name">
                              {providerDetails.label}
                            </span>
                            <span className="composer-provider-option__subtle">
                              {providerDetails.description}
                            </span>
                          </span>
                          {isActive && (
                            <span className="composer-provider-option__check" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <div className="composer-provider-menu__divider" aria-hidden="true" />
                    <button
                      type="button"
                      className="composer-provider-menu__footer"
                      onClick={() => setProviderMenuOpen(false)}
                    >
                      <span>More models</span>
                      <span aria-hidden="true">›</span>
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

        {themeModalOpen && (
          <div className="theme-designer-overlay is-open" onClick={() => setThemeModalOpen(false)}>
            <div className="theme-designer-container" onClick={(e) => e.stopPropagation()}>
              <div className="theme-designer-shell">
                <aside className="theme-designer-sidebar">
                  <div className="theme-designer-profile">
                    <div className="theme-designer-profile__avatar">
                      {userProfile.avatarDataUrl ? (
                        <img src={userProfile.avatarDataUrl} alt={profileDisplayName} />
                      ) : (
                        <span>{profileInitial}</span>
                      )}
                    </div>
                    <div className="theme-designer-profile__copy">
                      <strong>{profileDisplayName}</strong>
                      <span>{userProfile.userPlan ?? "Free plan"}</span>
                    </div>
                  </div>

                  <div className="theme-designer-sidebar__group">
                    <p className="theme-designer-sidebar__label">Appearance</p>
                    {THEME_DESIGNER_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className={`theme-designer-sidebar__item ${
                          activeThemeDesignerSection === section.id ? "is-active" : ""
                        }`}
                        onClick={() => scrollThemeDesignerSection(section.id)}
                        aria-pressed={activeThemeDesignerSection === section.id}
                      >
                        <span>{section.label}</span>
                        <small>
                          {section.id === "style"
                            ? visualTheme === "vibe"
                              ? "Immersive glow active"
                              : "Clean default active"
                            : section.id === "mood"
                              ? VIBE_MOOD_OPTIONS.find((mood) => mood.id === vibeMood)?.label ?? section.description
                              : section.id === "premium"
                                ? isPremiumUser
                                  ? `${customThemePreset} + ${backgroundEffect}`
                                  : "Unlock custom effects"
                                : section.description}
                        </small>
                      </button>
                    ))}
                  </div>

                  <div className="theme-designer-sidebar__promo">
                    <span className="theme-designer-sidebar__promo-tag">Clizel Essence</span>
                    <strong>
                      {themeMode === "dark" ? "Shadow Workspace" : "Light Studio"} + {" "}
                      {visualTheme === "vibe" ? "Aura Active" : "Essential Mode"}
                    </strong>
                    <p>
                      {visualTheme === "vibe"
                        ? `Aura is currently syncing with ${VIBE_MOOD_OPTIONS.find((mood) => mood.id === vibeMood)?.label ?? "Excited"} mood and ${backgroundEffect} effects.`
                        : "Focus-first minimalist layout designed for distraction-free AI logic and speed."}
                    </p>
                  </div>
                </aside>

                <div className="theme-designer-main">
                  <div className="theme-modal__header theme-modal__header--designer">
                    <div className="theme-modal__title-wrap">
                      <div className="theme-modal__title-badge">Vibe Designer Pro</div>
                      <div className="theme-modal__header-copy">
                        <strong>Build your perfect premium workspace</strong>
                        <p>Sophisticated dark surfaces, sharp accents, and smooth cinematic transitions.</p>
                      </div>
                      <button
                        type="button"
                        className="theme-modal__ghost-btn"
                        onClick={resetPremiumTheme}
                      >
                        Reset theme
                      </button>
                    </div>
                    <button type="button" className="theme-designer-close" onClick={() => setThemeModalOpen(false)}>×</button>
                  </div>

                  <div
                    ref={themeDesignerBodyRef}
                    className="theme-modal__body premium-scroll"
                    onScroll={handleThemeDesignerScroll}
                  >
                    <section
                      className="theme-modal__section theme-modal__section--preview"
                      style={
                        {
                          "--designer-preview-gradient": premiumPaletteGradient,
                          "--designer-preview-surface": activeMoodMeta.surface,
                          "--designer-preview-accent": premiumPalette[0],
                          "--designer-preview-accent-soft": hexToRgba(premiumPalette[2], 0.26),
                        } as CSSProperties
                      }
                    >
                      <div className="theme-modal__section-copy">
                        <strong>Live preview</strong>
                        <span>See every change before you save it.</span>
                      </div>
                      <div
                        className={`theme-designer-live-preview ${
                          themeMode === "dark" ? "is-dark" : "is-light"
                        } ${visualTheme === "vibe" ? "is-vibe" : "is-default"}`}
                      >
                        <div className="theme-designer-live-preview__texture" aria-hidden="true" />
                        <div className="theme-designer-live-preview__sidebar">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="theme-designer-live-preview__main">
                          <div className="theme-designer-live-preview__topline">
                            <strong>{themeMode === "dark" ? "Night mode" : "Day mode"}</strong>
                            <small>{visualTheme === "vibe" ? activeMoodMeta.label : "Default"}</small>
                          </div>
                          <div className="theme-designer-live-preview__messages">
                            <i className="theme-designer-live-preview__bubble theme-designer-live-preview__bubble--ai" />
                            <i className="theme-designer-live-preview__bubble theme-designer-live-preview__bubble--user" />
                            <i className="theme-designer-live-preview__bubble theme-designer-live-preview__bubble--ai is-short" />
                          </div>
                          <div className="theme-designer-live-preview__composer">
                            <span />
                            <em>{backgroundEffect === "none" ? "No atmosphere" : backgroundEffect}</em>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section
                      ref={(node) => {
                        themeDesignerSectionRefs.current.theme = node;
                      }}
                      className="theme-modal__section"
                    >
                      <div className="theme-modal__section-copy">
                        <strong>Base theme</strong>
                        <span>Choose your overall canvas.</span>
                      </div>
                      <div className="theme-preview-grid theme-preview-grid--base">
                        {BASE_THEME_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`theme-preview-card theme-preview-card--base theme-preview-card--${option.id} ${
                              themeMode === option.id ? "is-active" : ""
                            }`}
                            onClick={() => {
                              setActiveThemeDesignerSection("theme");
                              setThemeMode(option.id);
                            }}
                          >
                            <div className="theme-preview-card__topline">
                              <span className="theme-preview-card__eyebrow">{option.eyebrow}</span>
                              <span className="theme-preview-card__check">{themeMode === option.id ? "Selected" : "Pick"}</span>
                            </div>
                            <div className="theme-preview-card__mockup" aria-hidden="true">
                              <span className="theme-preview-card__sidebar" />
                              <span className="theme-preview-card__panel">
                                <i />
                                <i />
                                <i />
                              </span>
                            </div>
                            <div className="theme-preview-card__swatches" aria-hidden="true">
                              <i />
                              <i />
                              <i />
                              <i />
                            </div>
                            <div className="theme-preview-card__copy">
                              <strong>{option.label}</strong>
                              <small>{option.description}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section
                      ref={(node) => {
                        themeDesignerSectionRefs.current.style = node;
                      }}
                      className="theme-modal__section"
                    >
                      <div className="theme-modal__section-copy">
                        <strong>Chat style</strong>
                        <span>Switch between clean and vivid chat.</span>
                      </div>
                      <div className="theme-preview-grid theme-preview-grid--style">
                        {VISUAL_THEME_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`theme-preview-card theme-preview-card--style ${
                              option.id === "vibe" ? "theme-preview-card--vibe" : "theme-preview-card--default"
                            } ${visualTheme === option.id ? "is-active" : ""}`}
                            onClick={() => {
                              setActiveThemeDesignerSection("style");
                              setVisualTheme(option.id);
                            }}
                          >
                            <div className="theme-preview-card__topline">
                              <span className="theme-preview-card__badge">{option.badge}</span>
                              <span className="theme-preview-card__check">
                                {visualTheme === option.id ? "Selected" : "Preview"}
                              </span>
                            </div>
                            <div className="theme-preview-card__scene" aria-hidden="true">
                              <span className="theme-preview-card__scene-nav" />
                              <span className="theme-preview-card__scene-main">
                                <i className="theme-preview-card__bubble theme-preview-card__bubble--ai" />
                                <i className="theme-preview-card__bubble theme-preview-card__bubble--user" />
                                <i className="theme-preview-card__composer" />
                              </span>
                            </div>
                            <div className="theme-preview-card__copy">
                              <strong>{option.label}</strong>
                              <small>{option.description}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section
                      ref={(node) => {
                        themeDesignerSectionRefs.current.mood = node;
                      }}
                      className="theme-modal__section"
                    >
                      <div className="theme-modal__section-copy">
                        <strong>Vibe presets</strong>
                        <span>Small color boxes for quick mood switching. These auto-enable Vibe Mode when you tap one.</span>
                      </div>
                      <div className={`theme-mood-grid ${visualTheme !== "vibe" ? "is-disabled" : ""}`}>
                        {VIBE_MOOD_OPTIONS.map((mood) => (
                          <button
                            key={mood.id}
                            type="button"
                            className={`theme-mood-chip ${vibeMood === mood.id ? "is-active" : ""}`}
                            onClick={() => {
                              setActiveThemeDesignerSection("mood");
                              setVisualTheme("vibe");
                              setVibeMood(mood.id);
                            }}
                            aria-pressed={vibeMood === mood.id}
                            style={
                              {
                                "--theme-mood-surface": mood.surface,
                                "--theme-mood-accent-a": mood.accent[0],
                                "--theme-mood-accent-b": mood.accent[1],
                              } as CSSProperties
                            }
                          >
                            <div className="theme-mood-chip__preview" aria-hidden="true">
                              <span className="theme-mood-chip__spark" />
                              <span className="theme-mood-chip__layout">
                                <i />
                                <i />
                                <i />
                              </span>
                            </div>
                            <div className="theme-mood-chip__meta">
                              <span>{mood.label}</span>
                              <small>{mood.description}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section
                      ref={(node) => {
                        themeDesignerSectionRefs.current.premium = node;
                      }}
                      className="theme-modal__section"
                    >
                      <div className="theme-modal__section-copy">
                        <strong>Custom Polish</strong>
                        <span>Exclusive presets and high-performance color tokens for the ultimate premium feel.</span>
                      </div>
                      {!isPremiumUser ? (
                        <div className="upgrade-teaser-card">
                          <div className="upgrade-teaser-card__content">
                            <strong>Nitro Theme Upgrade</strong>
                            <p>Unlock custom gradients, orbital glow, and animated waves.</p>
                          </div>
                          <button
                            type="button"
                            className="upgrade-teaser-card__btn"
                            onClick={() => {
                              setIsPremiumUser(true);
                              setActiveThemeDesignerSection("premium");
                              setVisualTheme("vibe");
                            }}
                          >
                            Unlock now
                          </button>
                        </div>
                      ) : (
                        <div className="premium-builder-grid">
                          <div
                            className="premium-live-preview premium-glass"
                            style={{ "--premium-preview-gradient": premiumPaletteGradient } as CSSProperties}
                          >
                            <div className="premium-live-preview__copy">
                              <strong>{customThemePreset}</strong>
                              <span>
                                {visualTheme === "vibe" ? "Live in Vibe Mode" : "Ready when Vibe Mode is enabled"}
                              </span>
                            </div>
                            <div className="premium-live-preview__swatches" aria-hidden="true">
                              {premiumPalette.map((color, index) => (
                                <i key={`${color}-${index}`} style={{ background: color }} />
                              ))}
                            </div>
                          </div>

                          <div className="premium-presets-row">
                            <button
                              type="button"
                              className={`premium-preset-chip ${
                                !Object.prototype.hasOwnProperty.call(PREMIUM_THEME_PRESETS, customThemePreset)
                                  ? "is-active"
                                  : ""
                              }`}
                              onClick={() => {
                                setIsPremiumUser(true);
                                setActiveThemeDesignerSection("premium");
                                setVisualTheme("vibe");
                                setCustomThemePreset("Custom Mix");
                              }}
                            >
                              Custom Mix
                            </button>
                            {Object.keys(PREMIUM_THEME_PRESETS).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                className={`premium-preset-chip ${customThemePreset === preset ? "is-active" : ""}`}
                                onClick={() => applyPremiumPreset(preset)}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <div className="premium-controls-grid">
                            <div className="premium-control-item">
                              <label>Primary Glow</label>
                              <input
                                type="color"
                                value={premiumPalette[0]}
                                onChange={(e) => updateCustomThemeColor(0, e.target.value)}
                              />
                            </div>
                            <div className="premium-control-item">
                              <label>Secondary</label>
                              <input
                                type="color"
                                value={premiumPalette[1]}
                                onChange={(e) => updateCustomThemeColor(1, e.target.value)}
                              />
                            </div>
                            <div className="premium-control-item">
                              <label>Accent</label>
                              <input
                                type="color"
                                value={premiumPalette[2]}
                                onChange={(e) => updateCustomThemeColor(2, e.target.value)}
                              />
                            </div>
                            <div className="premium-control-item">
                              <label>Atmosphere</label>
                              <select
                                value={backgroundEffect}
                                onChange={(e) => handlePremiumEffectChange(e.target.value as BackgroundEffect)}
                                className="premium-select"
                              >
                                <option value="none">None</option>
                                <option value="glow">Orbital Glow</option>
                                <option value="sparkles">Starfield Sparkles</option>
                                <option value="waves">Kinetic Waves</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <div className="auth-modal__password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Password"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="auth-modal__password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {authMode === "register" && authPassword.trim() ? (
                  <div className="auth-modal__password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={authConfirmPassword}
                      onChange={(event) => setAuthConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-modal__password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                ) : null}
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
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthPassword("");
                  setAuthConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
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

      {supportModalOpen && (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={supportView === "help" ? "Help center" : "Terms and conditions"}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSupportModalOpen(false);
            }
          }}
        >
          <div className="support-modal__card">
            <div className="support-modal__header">
              <div>
                <p className="dashboard-sidebar__eyebrow">
                  {supportView === "help" ? "Support" : "Policy"}
                </p>
                <h3>{supportView === "help" ? "Help Center" : "Terms & Conditions"}</h3>
              </div>
              <button
                type="button"
                className="auth-modal__close"
                onClick={() => setSupportModalOpen(false)}
                aria-label="Close support modal"
              >
                ×
              </button>
            </div>

            <div className="support-modal__body">
              {supportView === "help" ? (
                <>
                  <div className="support-modal__panel">
                    <strong>Need help with Clizel?</strong>
                    <p>
                      If something feels broken, confusing, or missing, you can report it here just like in most chat
                      apps.
                    </p>
                  </div>

                  <div className="support-modal__actions">
                    <button
                      type="button"
                      className="support-modal__primary"
                      onClick={handleReportIssue}
                    >
                      Report a problem
                    </button>
                    <button
                      type="button"
                      className="support-modal__secondary"
                      onClick={() => setSupportView("terms")}
                    >
                      View terms and conditions
                    </button>
                  </div>

                  <div className="support-modal__list">
                    <div className="support-modal__item">
                      <strong>Email support</strong>
                      <span>`support@clizel.ai`</span>
                    </div>
                    <div className="support-modal__item">
                      <strong>Best for</strong>
                      <span>Login issues, billing questions, bugs, and feedback</span>
                    </div>
                    <div className="support-modal__item">
                      <strong>What to send</strong>
                      <span>Describe the issue, what you expected, and any screenshot if possible</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="support-modal__panel">
                    <strong>Using Clizel responsibly</strong>
                    <p>
                      By using Clizel, you agree to use the product lawfully, keep your account secure, and avoid
                      harmful or abusive behavior.
                    </p>
                  </div>

                  <div className="support-modal__list">
                    <div className="support-modal__item">
                      <strong>Privacy and safety</strong>
                      <span>Your conversations should not be used for harassment, fraud, or illegal activity.</span>
                    </div>
                    <div className="support-modal__item">
                      <strong>Account responsibility</strong>
                      <span>You are responsible for your account access and any actions taken from it.</span>
                    </div>
                    <div className="support-modal__item">
                      <strong>Service changes</strong>
                      <span>Features, plans, or availability may change as the product improves over time.</span>
                    </div>
                  </div>

                  <div className="support-modal__actions">
                    <button
                      type="button"
                      className="support-modal__primary"
                      onClick={() => setSupportView("help")}
                    >
                      Open help center
                    </button>
                    <button
                      type="button"
                      className="support-modal__secondary"
                      onClick={handleReportIssue}
                    >
                      Contact support
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}




