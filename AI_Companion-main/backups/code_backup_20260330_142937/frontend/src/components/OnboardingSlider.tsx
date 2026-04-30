"use client";

import { useState } from "react";
import PersonalitySelector from "./PersonalitySelector";
import type { PersonalityPreset } from "@/lib/chatPersonality";
import { personalityConfigs } from "@/lib/chatPersonality";

type OnboardingSliderProps = {
  open: boolean;
  personality: PersonalityPreset;
  goals: string;
  interests: string;
  onPersonalityChange: (value: PersonalityPreset) => void;
  onGoalsChange: (value: string) => void;
  onInterestsChange: (value: string) => void;
  onFinish: () => void;
};

const steps = [
  {
    eyebrow: "Step 1",
    title: "What are your academic goals?",
    body: "Tell Clizel what you're working toward so the chat feels useful from the very first reply.",
  },
  {
    eyebrow: "Step 2",
    title: "What are your interests?",
    body: "Share a few interests so future replies can feel more personal and relevant.",
  },
  {
    eyebrow: "Step 3",
    title: "Choose Clizel's personality",
    body: "Pick the tone you want. You can change it later without changing the chat layout.",
  },
];

export default function OnboardingSlider({
  open,
  personality,
  goals,
  interests,
  onPersonalityChange,
  onGoalsChange,
  onInterestsChange,
  onFinish,
}: OnboardingSliderProps) {
  const [step, setStep] = useState(0);

  if (!open) {
    return null;
  }

  const activeStep = steps[step];

  return (
    <div
      className="onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
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

          {step === 0 && (
            <label className="onboarding-field">
              <span className="onboarding-field__label">Academic goals</span>
              <textarea
                className="onboarding-field__input onboarding-field__input--textarea"
                value={goals}
                onChange={(event) => onGoalsChange(event.target.value)}
                placeholder="Examples: ace my semester exams, improve coding, stay consistent with revision..."
                rows={4}
              />
            </label>
          )}

          {step === 1 && (
            <label className="onboarding-field">
              <span className="onboarding-field__label">Interests</span>
              <textarea
                className="onboarding-field__input onboarding-field__input--textarea"
                value={interests}
                onChange={(event) => onInterestsChange(event.target.value)}
                placeholder="Examples: AI, productivity, design, fitness, writing, startups..."
                rows={4}
              />
            </label>
          )}

          {step === 2 && (
            <>
              <PersonalitySelector
                selected={personality}
                onSelect={(id) => onPersonalityChange(id as PersonalityPreset)}
              />
              <div className="onboarding-personality-card">
                <h3>{personalityConfigs[personality].onboardingTitle}</h3>
                <p>{personalityConfigs[personality].onboardingCopy}</p>
              </div>
              <div className="onboarding-checklist">
                <div className="onboarding-check">Goals saved for future chats</div>
                <div className="onboarding-check">
                  Interests stored locally on this device
                </div>
                <div className="onboarding-check">
                  Personality applied to your next reply
                </div>
              </div>
            </>
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
