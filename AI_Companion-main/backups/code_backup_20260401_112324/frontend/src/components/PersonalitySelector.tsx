"use client";

import React from "react";

const personalities = [
  { id: "Friendly", label: "Friendly", emoji: "😊" },
  { id: "Funny", label: "Funny", emoji: "😄" },
  { id: "Motivational", label: "Direct", emoji: "😐" },
];

interface PersonalitySelectorProps {
  selected: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const PersonalitySelector = ({ selected, onSelect, disabled }: PersonalitySelectorProps) => {
  return (
    <div className="personality-tray">
      {personalities.map((p) => (
        <button
          key={p.id}
          className={`personality-btn ${selected === p.id ? "active" : ""}`}
          onClick={() => onSelect(p.id)}
          disabled={disabled}
          type="button"
        >
          <span className="personality-emoji">{p.emoji}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PersonalitySelector;
