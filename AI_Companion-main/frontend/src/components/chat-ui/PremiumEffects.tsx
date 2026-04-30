"use client";

type PremiumEffectsProps = {
  isPremium: boolean;
  mood: "happy" | "sad" | "angry" | "excited" | "tired";
  effect?: "none" | "glow" | "sparkles" | "waves";
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
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
  effect = "glow",
  customColors,
}: PremiumEffectsProps) {
  if (!isPremium) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        {/* Baseline Gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(88,28,135,0.35),rgba(29,78,216,0.28),rgba(236,72,153,0.24),rgba(88,28,135,0.35))] bg-[length:200%_200%] animate-[premiumGradient_12s_ease-in-out_infinite]" />
        
        {/* Glow Effect (Orbits) */}
        {effect === "glow" && (
          <>
            <div
              className={`absolute inset-x-[-10%] top-[-20%] h-72 bg-gradient-to-b ${moodGlowMap[mood]} blur-3xl`}
            />
            <div 
              className="absolute -left-16 top-20 h-36 w-36 rounded-full blur-3xl animate-[floatOrb_11s_ease-in-out_infinite]" 
              style={{ backgroundColor: customColors?.primary ? `${customColors.primary}33` : 'rgba(168, 85, 247, 0.2)' }}
            />
            <div 
              className="absolute right-0 top-1/3 h-40 w-40 rounded-full blur-3xl animate-[floatOrb_14s_ease-in-out_infinite_reverse]" 
              style={{ backgroundColor: customColors?.secondary ? `${customColors.secondary}33` : 'rgba(6, 182, 212, 0.2)' }}
            />
            <div 
              className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full blur-3xl animate-[floatOrb_12s_ease-in-out_infinite]" 
              style={{ backgroundColor: customColors?.accent ? `${customColors.accent}33` : 'rgba(139, 92, 246, 0.2)' }}
            />
          </>
        )}

        {/* Sparkles Effect */}
        {effect === "sparkles" && (
          <div className="absolute inset-0">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  opacity: 0.4 + Math.random() * 0.6,
                  boxShadow: `0 0 8px ${customColors?.primary || '#fff'}`,
                }}
              />
            ))}
          </div>
        )}

        {/* Waves Effect */}
        {effect === "waves" && (
          <div className="absolute bottom-0 left-0 right-0 h-48 opacity-40">
            <svg 
              className="h-full w-full" 
              viewBox="0 0 1440 320" 
              preserveAspectRatio="none"
              style={{ filter: "blur(40px)" }}
            >
              <path
                fill={customColors?.primary || "#6366f1"}
                d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                style={{ animation: "waves 10s ease-in-out infinite" }}
              />
            </svg>
          </div>
        )}

        {/* Floating Particles (shown in all active effects except none) */}
        {effect !== "none" && Array.from({ length: 14 }).map((_, index) => (
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
