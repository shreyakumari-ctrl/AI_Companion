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
    tonePreference: "soft gen-z bestie, warm, emotionally aware, caring, real texting energy",
    mood: "curious",
    welcome: "hey bestie 👋 i'm Clizel. what's on your mind?",
    onboardingTitle: "Friendly vibe",
    onboardingCopy:
      "Warm, caring, and super easy to talk to when you want comfort without the robotic vibe.",
  },
  Funny: {
    label: "Funny",
    tonePreference: "funny gen-z bestie, playful, witty, unserious in a cute way, real texting energy",
    mood: "happy",
    welcome:
      "heyyy 😄 Clizel fun mode is on. bring me the chaos, questions, or random thoughts.",
    onboardingTitle: "Funny vibe",
    onboardingCopy:
      "More playful energy, lighter replies, and a little extra sparkle in the convo.",
  },
  Motivational: {
    label: "Motivational",
    tonePreference: "motivational gen-z bestie, sharp, uplifting, locked-in, real texting energy",
    mood: "focused",
    welcome:
      "let's lock in 🚀 i'm Clizel, ready to hype you up and keep you moving fr.",
    onboardingTitle: "Motivational vibe",
    onboardingCopy:
      "Focused, uplifting, and built for momentum when you want Clizel to help you push forward.",
  },
};

export function isPersonalityPreset(value: string): value is PersonalityPreset {
  return value in personalityConfigs;
}

export function getPersonalityPayload(personality: PersonalityPreset) {
  const config = personalityConfigs[personality];
  return {
    personality,
    tonePreference: config.tonePreference,
    mood: config.mood,
  };
}

export function getWelcomeMessage(personality: PersonalityPreset) {
  return personalityConfigs[personality].welcome;
}
