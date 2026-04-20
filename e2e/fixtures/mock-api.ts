export const mockAiStatus = {
  storyWriterConfigured: true,
  storyReviewerConfigured: false,
  imageGeneratorConfigured: true,
  subscriptionConfigured: false,
};

export const mockSubscriptionStatus = {
  usage: {
    subscribed: false,
    subscriptionConfigured: false,
    canGenerate: true,
    dailyLimit: 3,
    usedFreeImages: 0,
    remainingFreeImages: 3,
  },
  billingConfigured: false,
  actions: { canCheckout: false, canManage: false },
};

const blockText =
  "Mono keeps the room soft while the night leans closer. The child breathes slowly, listening for a gentle rhythm. Stars stay patient beyond the window. Blankets hold warmth like a small promise. Sleep arrives in quiet layers, one breath at a time.";

export const mockBedtimeStory = {
  title: "E2E Mock Bedtime Title",
  languageLabel: "English",
  readingTimeMinutes: 10,
  summary:
    "A gentle mock story for automated testing with Mono and a calm moonlit room that settles softly.",
  moral: "Small routines make big nights feel safe.",
  caregiverTip: "Speak softly and slow down between pages.",
  coverScene: {
    heading: "Moonlit hello",
    text: `${blockText} ${blockText}`,
    imagePrompt: "Soft moonlight nursery with a calm monkey guide and cozy blankets.",
    sceneType: "moon",
  },
  storyBlocks: [
    {
      heading: "First hush",
      text: blockText,
      imagePrompt: "Quiet stars outside a window, warm indoor light.",
      sceneType: "clouds",
    },
    {
      heading: "Second drift",
      text: blockText,
      imagePrompt: "A sleepy village lane with lantern glow.",
      sceneType: "village",
    },
    {
      heading: "Last tuck-in",
      text: blockText,
      imagePrompt: "Forest edge fading into dreams, soft greens and blues.",
      sceneType: "forest",
    },
  ],
  tags: ["e2e", "mock", "bedtime"],
};

export const mockIllustration = {
  imageDataUrl: null as string | null,
  fallback: true,
  note: "E2E mock illustration.",
};
