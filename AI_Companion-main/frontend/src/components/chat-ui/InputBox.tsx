"use client";

import { FormEvent } from "react";

type InputBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isPremium: boolean;
};

export default function InputBox({
  value,
  onChange,
  onSubmit,
  isPremium,
}: InputBoxProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative overflow-hidden rounded-[1.75rem] border p-2 backdrop-blur-2xl transition duration-300 ease-in-out ${
        isPremium
          ? "border-fuchsia-300/20 bg-white/10 shadow-[0_0_45px_rgba(168,85,247,0.18)]"
          : "border-white/10 bg-slate-950/80 shadow-xl shadow-black/25"
      }`}
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 transition focus-within:border-fuchsia-300/35 focus-within:shadow-[0_0_0_1px_rgba(232,121,249,0.16),0_0_24px_rgba(168,85,247,0.18)]">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            rows={1}
            placeholder="Ask anything, add an emoji, or just drop the vibe..."
            className="max-h-36 w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/35"
          />
        </div>
        <button
          type="submit"
          disabled={!value.trim()}
          className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/30 transition duration-300 ease-in-out hover:scale-[1.02] hover:shadow-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.24em] text-white/35">
        <span>Enter to send</span>
        <span>{isPremium ? "Vibe Mode active" : "Normal Mode"}</span>
      </div>
    </form>
  );
}
