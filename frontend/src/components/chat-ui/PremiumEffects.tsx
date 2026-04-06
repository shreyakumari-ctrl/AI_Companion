"use client";

type PremiumEffectsProps = {
  isPremium: boolean;
  mood: "happy" | "sad" | "angry" | "excited" | "tired";
};

const moodGlowMap: Record<PremiumEffectsProps["mood"], string> = {
  happy: "from-amber-300/20 via-orange-400/10 to-transparent",
  sad: "from-sky-400/20 via-blue-500/10 to-transparent",
  angry: "from-rose-500/20 via-red-500/10 to-transparent",
  excited: "from-fuchsia-400/25 via-cyan-400/10 to-transparent",
  tired: "from-slate-400/12 via-indigo-500/8 to-transparent",
};

export default function PremiumEffects({
  isPremium,
  mood,
}: PremiumEffectsProps) {
  if (!isPremium) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(88,28,135,0.35),rgba(29,78,216,0.28),rgba(236,72,153,0.24),rgba(88,28,135,0.35))] bg-[length:200%_200%] animate-[premiumGradient_12s_ease-in-out_infinite]" />
        <div
          className={`absolute inset-x-[-10%] top-[-20%] h-72 bg-gradient-to-b ${moodGlowMap[mood]} blur-3xl`}
        />
        <div className="absolute -left-16 top-20 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl animate-[floatOrb_11s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-1/3 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl animate-[floatOrb_14s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl animate-[floatOrb_12s_ease-in-out_infinite]" />
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-white/35"
            style={{
              width: `${(index % 3) + 4}px`,
              height: `${(index % 3) + 4}px`,
              left: `${6 + index * 6.4}%`,
              top: `${10 + (index * 11) % 70}%`,
              animation: `particleFloat ${9 + (index % 5)}s ease-in-out ${index * 0.25}s infinite`,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes premiumGradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes floatOrb {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -20px, 0) scale(1.08);
          }
        }

        @keyframes particleFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.18;
          }
          50% {
            transform: translate3d(8px, -18px, 0);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
