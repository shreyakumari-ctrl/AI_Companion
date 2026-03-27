export type PersonalityPreset = "Friendly" | "Funny" | "Motivational";

type PersonalityConfig = {
  label: PersonalityPreset;
  tonePreference: string;
  mood: string;
  welcome: string;
  onboardingTitle: string;
  onboardingCopy: string;
};

export const personalityConfigs: Record<PersonalityPreset, PersonalityConfig> = {
  Friendly: {
    label: "Friendly",
    tonePreference: "friendly",
    mood: "curious",
    welcome:
      "Hey 👋 I'm Clidy, your friendly AI companion! What's on your mind today?",
    onboardingTitle: "Friendly vibe",
    onboardingCopy: "Warm, caring, and super easy to talk to when you just want real comfort.",
  },
  Funny: {
    label: "Funny",
    tonePreference: "playful",
    mood: "happy",
    welcome:
      "Heyyy 😄 I'm Clidy in fun mode. Bring me your chaos, questions, or random thoughts.",
    onboardingTitle: "Funny vibe",
    onboardingCopy: "More playful energy, lighter replies, and a little extra sparkle in the conversation.",
  },
  Motivational: {
    label: "Motivational",
    tonePreference: "motivational",
    mood: "focused",
    welcome:
      "Let's lock in 🚀 I'm Clidy, ready to hype you up and help you keep moving.",
    onboardingTitle: "Motivational vibe",
    onboardingCopy: "Focused, uplifting, and built for momentum when you want Clidy to push you forward.",
  },
};

export function isPersonalityPreset(value: string): value is PersonalityPreset {
  return value in personalityConfigs;
}

export function getPersonalityPayload(personality: PersonalityPreset) {
  const config = personalityConfigs[personality];
  return {
    tonePreference: config.tonePreference,
    mood: config.mood,
  };
}

export function getWelcomeMessage(personality: PersonalityPreset) {
  return personalityConfigs[personality].welcome;
}
