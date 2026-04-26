"use client";

type Mood = "happy" | "sad" | "angry" | "excited" | "tired";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type MessageBubbleProps = {
  message: ChatMessage;
  isPremium: boolean;
  mood: Mood;
};

const premiumMoodRingMap: Record<Mood, string> = {
  happy: "shadow-[0_0_30px_rgba(251,191,36,0.18)] ring-1 ring-amber-300/25",
  sad: "shadow-[0_0_30px_rgba(56,189,248,0.18)] ring-1 ring-sky-300/25",
  angry: "shadow-[0_0_30px_rgba(248,113,113,0.18)] ring-1 ring-rose-300/25",
  excited: "shadow-[0_0_30px_rgba(232,121,249,0.26)] ring-1 ring-fuchsia-300/30",
  tired: "shadow-[0_0_24px_rgba(148,163,184,0.12)] ring-1 ring-slate-300/15",
};

export default function MessageBubble({
  message,
  isPremium,
  mood,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full animate-[messageIn_320ms_ease-out] ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`group max-w-[85%] rounded-[1.75rem] border px-4 py-3 text-sm leading-7 text-white/90 transition duration-300 ease-in-out sm:max-w-[72%] ${
          isUser
            ? "rounded-br-md border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-blue-500"
            : "rounded-bl-md border-white/10 bg-white/8 backdrop-blur-xl"
        } ${isPremium ? `${premiumMoodRingMap[mood]} hover:-translate-y-0.5` : "shadow-lg shadow-black/15"}`}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/45">
          <span>{isUser ? "You" : "AI"}</span>
          <span className="h-1 w-1 rounded-full bg-current" />
          <span>{isUser ? "prompt" : "response"}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-white/90">
          {message.text}
        </p>
      </div>
      <style jsx global>{`
        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
