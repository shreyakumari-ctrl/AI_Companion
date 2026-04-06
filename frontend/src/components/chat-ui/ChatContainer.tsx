"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InputBox from "@/components/chat-ui/InputBox";
import MessageBubble from "@/components/chat-ui/MessageBubble";
import PremiumEffects from "@/components/chat-ui/PremiumEffects";

type Mood = "happy" | "sad" | "angry" | "excited" | "tired";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Hey, I’m your AI copilot. Drop a thought, a task, or a chaotic emoji combo and I’ll roll with it.",
  },
  {
    id: "m2",
    role: "user",
    text: "Plan a focused work sprint for me tonight 🚀",
  },
  {
    id: "m3",
    role: "assistant",
    text: "Absolutely. I’d do a 90-minute deep block, a 15-minute reset, then one lighter cleanup pass so you finish strong without frying your brain.",
  },
];

const moodThemeMap: Record<
  Mood,
  {
    shell: string;
    badge: string;
    panel: string;
    typing: string;
  }
> = {
  happy: {
    shell: "brightness-100 saturate-110",
    badge: "border-amber-300/30 bg-amber-400/15 text-amber-100",
    panel: "shadow-[0_0_80px_rgba(251,191,36,0.14)]",
    typing: "bg-amber-300/15 text-amber-100",
  },
  sad: {
    shell: "brightness-95 saturate-90",
    badge: "border-sky-300/30 bg-sky-400/15 text-sky-100",
    panel: "shadow-[0_0_80px_rgba(56,189,248,0.12)]",
    typing: "bg-sky-300/15 text-sky-100",
  },
  angry: {
    shell: "brightness-95 saturate-105",
    badge: "border-rose-300/30 bg-rose-400/15 text-rose-100",
    panel: "shadow-[0_0_90px_rgba(248,113,113,0.12)] animate-[angerPulse_3s_ease-in-out_infinite]",
    typing: "bg-rose-300/15 text-rose-100",
  },
  excited: {
    shell: "brightness-110 saturate-125",
    badge: "border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100",
    panel: "shadow-[0_0_110px_rgba(232,121,249,0.18)]",
    typing: "bg-fuchsia-300/15 text-fuchsia-100",
  },
  tired: {
    shell: "brightness-75 saturate-75",
    badge: "border-slate-300/25 bg-slate-400/10 text-slate-200",
    panel: "shadow-[0_0_65px_rgba(100,116,139,0.12)]",
    typing: "bg-slate-300/10 text-slate-200",
  },
};

const aiReplies: Record<Mood, string[]> = {
  happy: [
    "Love this energy. Let’s turn it into a clean, joyful next step and keep the momentum warm.",
    "That sounds fun. I can help make it polished without losing the playful vibe ✨",
  ],
  sad: [
    "We can keep this soft and simple. I’ll help without making it feel heavy.",
    "Let’s take the gentlest path through it. One calm step is enough to start.",
  ],
  angry: [
    "I’m with you. Let’s channel that heat into something clear, sharp, and useful instead of messy.",
    "Totally fair reaction. Want me to turn that frustration into a concise response or action plan?",
  ],
  excited: [
    "Big energy detected. Let’s make it feel premium, fast, and a little electric.",
    "This is fun. I can help shape that idea into something sleek and launch-ready ⚡",
  ],
  tired: [
    "Let’s lower the friction. I’ll keep this light, clear, and easy to act on.",
    "No overthinking tonight. I’ll help you get to the simplest good answer.",
  ],
};

const moodOptions: Mood[] = ["happy", "sad", "angry", "excited", "tired"];

export default function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");
  const [isPremium, setIsPremium] = useState(true);
  const [mood, setMood] = useState<Mood>("excited");
  const [isTyping, setIsTyping] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const theme = moodThemeMap[mood];

  const headerCopy = useMemo(
    () =>
      isPremium
        ? "Premium Vibe Mode with animated gradients and mood-reactive glow."
        : "Normal Mode with a clean, focused free-user layout.",
    [isPremium],
  );

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      const choices = aiReplies[mood];
      const reply = choices[Math.floor(Math.random() * choices.length)];

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply,
        },
      ]);
      setIsTyping(false);
    }, 1100);
  };

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#050816] text-white transition duration-500 ease-in-out ${theme.shell}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.18),transparent_30%),linear-gradient(180deg,#050816_0%,#0b1023_45%,#050816_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div
          className={`relative flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl transition duration-500 ease-in-out ${theme.panel}`}
        >
          <PremiumEffects isPremium={isPremium} mood={mood} />

          <header className="relative z-10 flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
                AI Chat Interface
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Clizel Chat
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                {headerCopy}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setIsPremium(false)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
                    !isPremium
                      ? "bg-white text-slate-900 shadow-lg"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setIsPremium(true)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 ${
                    isPremium
                      ? "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white shadow-lg shadow-fuchsia-950/30"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Vibe Mode
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {moodOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMood(option)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] transition duration-300 ${
                      mood === option
                        ? `${theme.badge} shadow-lg`
                        : "border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <section className="relative z-10 flex flex-1 flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            <div className="mb-3 grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                      Current Mode
                    </p>
                    <p className="mt-2 text-base font-medium text-white">
                      {isPremium ? "Premium Vibe Mode" : "Normal Mode"}
                    </p>
                  </div>
                  <div
                    className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.24em] ${theme.badge}`}
                  >
                    {mood}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                  Premium Perks
                </p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {isPremium
                    ? "Animated gradients, glow borders, subtle particles, elevated typography, and mood transitions are active."
                    : "Upgrade to unlock animated gradients, glow borders, and enhanced motion."}
                </p>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="relative flex-1 space-y-4 overflow-y-auto rounded-[1.8rem] border border-white/10 bg-black/20 p-3 backdrop-blur-xl sm:p-4"
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isPremium={isPremium}
                  mood={mood}
                />
              ))}

              {isTyping ? (
                <div className="flex justify-start">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm ${theme.typing}`}
                  >
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3">
              <InputBox
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isPremium={isPremium}
              />
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @keyframes angerPulse {
          0%,
          100% {
            box-shadow: 0 0 90px rgba(248, 113, 113, 0.1);
          }
          50% {
            box-shadow: 0 0 110px rgba(248, 113, 113, 0.18);
          }
        }
      `}</style>
    </main>
  );
}
