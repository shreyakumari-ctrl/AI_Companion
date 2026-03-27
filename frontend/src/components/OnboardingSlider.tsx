"use client";

import { useState } from "react";
import PersonalitySelector from "./PersonalitySelector";
import type { PersonalityPreset } from "@/lib/chatPersonality";
import { personalityConfigs } from "@/lib/chatPersonality";

type OnboardingSliderProps = {
  open: boolean;
  personality: PersonalityPreset;
  onPersonalityChange: (value: PersonalityPreset) => void;
  onFinish: () => void;
};

const steps = [
  {
    eyebrow: "Step 1",
    title: "Build your Clidy vibe",
    body: "Set the tone before your first message so the chat feels like your space from the jump.",
  },
  {
    eyebrow: "Step 2",
    title: "Pick your companion energy",
    body: "Friendly, funny, or motivational. You can switch it later, but this sets the first impression.",
  },
  {
    eyebrow: "Step 3",
    title: "You’re ready to talk",
    body: "Clidy streams replies live, renders markdown cleanly, and throws clear toasts when the API acts up.",
  },
];

export default function OnboardingSlider({
  open,
  personality,
  onPersonalityChange,
  onFinish,
}: OnboardingSliderProps) {
  const [step, setStep] = useState(0);

  if (!open) {
    return null;
  }

  const activeStep = steps[step];

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`onboarding-progress-dot ${index === step ? "is-active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-step" key={step}>
          <p className="onboarding-eyebrow">{activeStep.eyebrow}</p>
          <h2 className="onboarding-title" id="onboarding-title">
            {activeStep.title}
          </h2>
          <p className="onboarding-copy">{activeStep.body}</p>

          {step === 1 && (
            <>
              <PersonalitySelector
                selected={personality}
                onSelect={(id) => onPersonalityChange(id as PersonalityPreset)}
              />
              <div className="onboarding-personality-card">
                <h3>{personalityConfigs[personality].onboardingTitle}</h3>
                <p>{personalityConfigs[personality].onboardingCopy}</p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="onboarding-checklist">
              <div className="onboarding-check">Live streaming reply bubbles</div>
              <div className="onboarding-check">Markdown-ready AI responses</div>
              <div className="onboarding-check">Clear error toasts and retry flow</div>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-btn onboarding-btn--ghost"
            onClick={() => {
              if (step === 0) {
                onFinish();
                return;
              }

              setStep((current) => current - 1);
            }}
          >
            {step === 0 ? "Skip" : "Back"}
          </button>

          <button
            type="button"
            className="onboarding-btn onboarding-btn--primary"
            onClick={() => {
              if (step === steps.length - 1) {
                onFinish();
                return;
              }

              setStep((current) => current + 1);
            }}
          >
            {step === steps.length - 1 ? "Start chatting" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
