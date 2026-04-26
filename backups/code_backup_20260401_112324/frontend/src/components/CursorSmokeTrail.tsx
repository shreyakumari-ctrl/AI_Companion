"use client";

import { useEffect, useState } from "react";

type TrailParticle = {
  id: number;
  x: number;
  y: number;
  size: number;
};

const MAX_PARTICLES = 10;

export default function CursorSmokeTrail() {
  const [particles, setParticles] = useState<TrailParticle[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!mediaQuery.matches || reducedMotion.matches) {
      return;
    }

    let lastEmission = 0;
    let particleId = 0;

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastEmission < 40) {
        return;
      }

      lastEmission = now;
      const nextParticle: TrailParticle = {
        id: particleId++,
        x: event.clientX,
        y: event.clientY,
        size: 24 + Math.random() * 20,
      };

      setParticles((current) => [...current.slice(-(MAX_PARTICLES - 1)), nextParticle]);

      window.setTimeout(() => {
        setParticles((current) => current.filter((particle) => particle.id !== nextParticle.id));
      }, 550);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  if (!particles.length) {
    return null;
  }

  return (
    <div className="cursor-smoke" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="cursor-smoke__particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
    </div>
  );
}
