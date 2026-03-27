"use client";

import React from "react";
import type { PersonalityPreset } from "@/lib/chatPersonality";

interface PersonalitySelectorProps {
  selected: PersonalityPreset;
  onSelect: (p: PersonalityPreset) => void;
  disabled?: boolean;
}

const personalities: { label: PersonalityPreset; emoji: string; color: string }[] = [
  { label: "Friendly", emoji: "😊", color: "#eef2ff" },
  { label: "Funny", emoji: "😄", color: "#fdf2f8" },
  { label: "Motivational", emoji: "🚀", color: "#f0fdf4" },
];

export default function PersonalitySelector({
  selected,
  onSelect,
  disabled,
}: PersonalitySelectorProps) {
  return (
    <div className="personality-selector">
      {personalities.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelect(p.label)}
          disabled={disabled}
          className={`personality-item ${selected === p.label ? "active" : ""}`}
          style={{ backgroundColor: p.color }}
          title={`${p.label} personality`}
        >
          <span className="personality-emoji">{p.emoji}</span>
          <span className="personality-label">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

export type Personality = PersonalityPreset;
