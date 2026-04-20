"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Flame, LoaderCircle, Moon, Sparkles, Wind } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonkeyMark } from "@/components/monkey-mark";
import { PoodleCompanion } from "@/components/poodle-companion";
import { ScenePoster } from "@/components/scene-poster";
import { SoundDock } from "@/components/sound-dock";
import { SetupWizard, type SetupProfile } from "@/components/setup-wizard";
import { StoryBookReader } from "@/components/story-book-reader";
import { useBedtimeAudio } from "@/components/use-bedtime-audio";
import {
  createLocalDayKey,
  ensureMonobedtimeSessionId,
} from "@/lib/monobedtime-client-identity";
import type {
  BedtimeRequest,
  BedtimeResponse,
  IllustrationResponse,
  ImageUsage,
  SubscriptionStatus,
} from "@/lib/story-contract";

type Mood = "calm" | "warm" | "adventure";

type AIStatus = {
  storyWriterConfigured: boolean;
  storyReviewerConfigured: boolean;
  imageGeneratorConfigured: boolean;
  subscriptionConfigured: boolean;
};

type ArtState = {
  cover: IllustrationResponse | null;
  blocks: Record<number, IllustrationResponse | null>;
  loadingCover: boolean;
  loadingBlocks: Record<number, boolean>;
  note: string | null;
};

type OnboardingState = "checking" | "needsSetup" | "ready";
type StatusLoadState = "loading" | "ready" | "error";

const promptStarters = [
  "A moonlit nursery where Luffy keeps watch by the window.",
  "A sleepy boat ride across a silver sea with gentle stars overhead.",
  "A tiny forest lantern walk that ends with everyone safely tucked in.",
] as const;

function describeServiceStatus(aiStatus: AIStatus | null) {
  if (!aiStatus) {
    return "Checking story and illustration services for tonight...";
  }

  if (
    aiStatus.storyWriterConfigured &&
    aiStatus.storyReviewerConfigured &&
    aiStatus.imageGeneratorConfigured
  ) {
    return "Story writing, review, and illustration services are ready.";
  }

  if (aiStatus.storyWriterConfigured && aiStatus.storyReviewerConfigured) {
    return "Story writing and review are ready. Live illustration may fall back gracefully.";
  }

  if (aiStatus.storyWriterConfigured) {
    return "Story writing is ready. Review and illustration may use calmer fallback behavior.";
  }

  return "Some live bedtime services are still offline right now.";
}

function mergeUsageIntoSubscriptionStatus(
  current: SubscriptionStatus | null,
  usage: ImageUsage,
): SubscriptionStatus {
  const billingConfigured = current?.billingConfigured ?? usage.subscriptionConfigured;

  return {
    usage,
    billingConfigured,
    actions: {
      canCheckout: billingConfigured && !usage.subscribed,
      canManage: billingConfigured && usage.subscribed,
    },
  };
}

function describeIllustrationStatus(
  subscriptionStatus: SubscriptionStatus | null,
  statusState: StatusLoadState,
) {
  if (statusState === "loading") {
    return {
      badge: "Checking",
      title: "Checking your illustration credits...",
      detail: "Your story still generates while we confirm what illustration access is available tonight.",
      tone: "loading",
    } as const;
  }

  if (statusState === "error" || !subscriptionStatus) {
    return {
      badge: "Retrying",
      title: "Could not check illustration status.",
      detail: "Your story still generates; illustration will try its best when you ask for it.",
      tone: "error",
    } as const;
  }

  const { billingConfigured, usage } = subscriptionStatus;

  if (!billingConfigured && !usage.subscribed) {
    return {
      badge: "Coming soon",
      title: "Premium illustration subscription is coming soon.",
      detail: "Your full story still generates, and the built-in scene art stays ready either way.",
      tone: "soon",
    } as const;
  }

  if (usage.subscribed) {
    return {
      badge: "Premium",
      title: "Premium: unlimited story illustrations active.",
      detail: "Generate cover and page art whenever you want tonight.",
      tone: "premium",
    } as const;
  }

  if (usage.canGenerate) {
    return {
      badge: "Free tier",
      title: `Free: ${usage.remainingFreeImages} of ${usage.dailyLimit} daily illustrations remaining.`,
      detail: "Story text always comes first. Illustration follows when you want it.",
      tone: "free",
    } as const;
  }

  return {
    badge: "Used up",
    title: `Today's ${usage.dailyLimit} free illustrations are used up.`,
    detail: "Your story is complete and ready to read. Illustration resumes tomorrow.",
    tone: "limited",
  } as const;
}

function moodToBedtimeMood(mood: Mood): BedtimeRequest["bedtimeMood"] {
  if (mood === "warm") {
    return "cozy";
  }

  if (mood === "adventure") {
    return "adventurous";
  }

  return "calm";
}

function parseSavedProfile(rawValue: string | null): SetupProfile | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SetupProfile>;

    return {
      childName: typeof parsed.childName === "string" ? parsed.childName : "",
      age: typeof parsed.age === "string" ? parsed.age : "",
      language: typeof parsed.language === "string" ? parsed.language : "",
      culture: typeof parsed.culture === "string" ? parsed.culture : "",
    };
  } catch {
    return null;
  }
}

function parseAgeYears(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return 0;
  }

  if (normalized.match(/(\d+)\s*(month|months|mes|meses)/)) {
    return 0;
  }

  const yearMatch = normalized.match(/(\d+)\s*(year|years|ano|anos)/);
  if (yearMatch) {
    const years = Number.parseInt(yearMatch[1] ?? "0", 10);
    return Math.max(0, Math.min(12, years));
  }

  const numberMatch = normalized.match(/\d+/);
  if (numberMatch) {
    const years = Number.parseInt(numberMatch[0], 10);
    return Math.max(0, Math.min(12, years));
  }

  return 0;
}

function parseLanguageMode(value: string): BedtimeRequest["language"] {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.includes("bilingual") ||
    normalized.includes("both") ||
    normalized.includes("spanish and english") ||
    normalized.includes("spanish & english") ||
    normalized.includes("espanol y ingles") ||
    normalized.includes("espanol e ingles")
  ) {
    return "bilingual";
  }

  if (normalized.includes("spanish") || normalized.includes("espanol")) {
    return "es";
  }

  return "en";
}

function deriveLocation(culture: string) {
  const segments = culture
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments[0] ?? "home";
}

function previewSceneTypeForMood(mood: Mood) {
  if (mood === "warm") {
    return "village" as const;
  }

  if (mood === "adventure") {
    return "forest" as const;
  }

  return "clouds" as const;
}

function previewCaptionForMood(mood: Mood, culture: string) {
  if (mood === "warm") {
    return `Soft window light, favorite blankets, and a bedtime world that feels close to ${culture || "home"}.`;
  }

  if (mood === "adventure") {
    return `A brave little nighttime journey with just enough wonder to feel magical and still land softly.`;
  }

  return `Moonlight, slow breathing, and a gentle rhythm that settles the room without rushing bedtime.`;
}

export function NightlyScreen() {
  const [onboarding, setOnboarding] = useState<OnboardingState>("checking");
  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [mood, setMood] = useState<Mood>("calm");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [billingPending, setBillingPending] = useState(false);
  const [story, setStory] = useState<BedtimeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(
    null,
  );
  const [statusState, setStatusState] = useState<StatusLoadState>("loading");
  const [art, setArt] = useState<ArtState>({
    cover: null,
    blocks: {},
    loadingCover: false,
    loadingBlocks: {},
    note: null,
  });
  const [cueKey, setCueKey] = useState(0);
  const { activeSoundscape, selectSoundscape } = useBedtimeAudio();
  const sessionIdRef = useRef("guest-session");
  const dayKeyRef = useRef(createLocalDayKey());

  const profileLanguageLabel = profile?.language.trim() || "English";
  const illustrationLanguage = parseLanguageMode(profileLanguageLabel);
  const usage = subscriptionStatus?.usage ?? null;
  const serviceStatusMessage = describeServiceStatus(aiStatus);
  const illustrationStatus = describeIllustrationStatus(
    subscriptionStatus,
    statusState,
  );
  const previewSceneType = previewSceneTypeForMood(mood);
  const previewTitle = prompt.trim()
    ? prompt.trim()
    : `${profile?.childName || "Tonight"} and the hush before sleep`;
  const previewCaption = previewCaptionForMood(mood, profile?.culture?.trim() || "");

  const requestHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
      "x-monobedtime-day-key": dayKeyRef.current,
      "x-monobedtime-session-id": sessionIdRef.current,
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const [aiResponse, subscriptionResponse] = await Promise.all([
        fetch("/api/ai-status", { cache: "no-store" }),
        fetch("/api/subscription/status", {
          headers: requestHeaders(),
          cache: "no-store",
        }),
      ]);

      const aiData = await aiResponse.json();
      const subscriptionData = await subscriptionResponse.json();

      if (aiResponse.ok) {
        setAIStatus(aiData as AIStatus);
      } else {
        setAIStatus(null);
      }

      if (subscriptionResponse.ok) {
        const nextSubscriptionStatus = subscriptionData as SubscriptionStatus;
        setSubscriptionStatus(nextSubscriptionStatus);
        setStatusState("ready");

        return {
          aiStatus: aiResponse.ok ? (aiData as AIStatus) : null,
          subscriptionStatus: nextSubscriptionStatus,
        };
      }

      setSubscriptionStatus(null);
      setStatusState("error");

      return {
        aiStatus: aiResponse.ok ? (aiData as AIStatus) : null,
        subscriptionStatus: null,
      };
    } catch {
      setAIStatus(null);
      setSubscriptionStatus(null);
      setStatusState("error");

      return {
        aiStatus: null,
        subscriptionStatus: null,
      };
    }
  }, [requestHeaders]);

  useEffect(() => {
    sessionIdRef.current = ensureMonobedtimeSessionId();
    dayKeyRef.current = createLocalDayKey();
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const saved = parseSavedProfile(window.localStorage.getItem("mono_settings"));

    if (saved && saved.childName.trim()) {
      setProfile(saved);
      setOnboarding("ready");
      return;
    }

    setOnboarding("needsSetup");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCueKey((value) => value + 1);
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isGenerating, story]);

  async function startSubscriptionCheckout() {
    setBillingPending(true);
    setError(null);

    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not open subscription checkout.");
      }

      if (!data.url || typeof data.url !== "string") {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start subscription right now.",
      );
      setBillingPending(false);
    }
  }

  async function openSubscriptionPortal() {
    setBillingPending(true);
    setError(null);

    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: requestHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not open subscription portal.");
      }

      if (!data.url || typeof data.url !== "string") {
        throw new Error("Portal URL was not returned.");
      }

      window.location.href = data.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not open subscription manager right now.",
      );
      setBillingPending(false);
    }
  }

  async function generateArtForCover(storyValue: BedtimeResponse) {
    if (usage && !usage.canGenerate && !usage.subscribed) {
      setArt((current) => ({
        ...current,
        note: `Today's ${usage.dailyLimit} free illustrations are used up. Your story is complete - illustration resumes tomorrow.`,
      }));
      return;
    }

    setArt((current) => ({
      ...current,
      loadingCover: true,
      note: "Generating cover art...",
    }));

    try {
      const response = await fetch("/api/generate-illustration", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({
          title: storyValue.title,
          prompt: storyValue.coverScene.imagePrompt,
          sceneType: storyValue.coverScene.sceneType,
          language: illustrationLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setArt((current) => ({
          ...current,
          note: data.error ?? "Could not generate cover art right now.",
        }));
        if (data.usage) {
          setSubscriptionStatus((current) =>
            mergeUsageIntoSubscriptionStatus(current, data.usage as ImageUsage),
          );
          setStatusState("ready");
        }
        if (response.status === 402) {
          setError(
            data.error ??
              "Today's free illustrations are used up. Start a subscription to continue tonight.",
          );
        }
        return;
      }

      setArt((current) => ({
        ...current,
        cover: data as IllustrationResponse,
        note: data.note ?? "Cover art ready.",
      }));

      if (data.usage) {
        setSubscriptionStatus((current) =>
          mergeUsageIntoSubscriptionStatus(current, data.usage as ImageUsage),
        );
        setStatusState("ready");
      }
    } catch {
      setArt((current) => ({
        ...current,
        note: "Cover art request failed, using the built-in illustration.",
      }));
    } finally {
      setArt((current) => ({
        ...current,
        loadingCover: false,
      }));
      await refreshStatus();
    }
  }

  async function generateArtForBlock(index: number) {
    if (!story) {
      return;
    }

    if (usage && !usage.canGenerate && !usage.subscribed) {
      setArt((current) => ({
        ...current,
        note: `Today's ${usage.dailyLimit} free illustrations are used up. Your story is complete - illustration resumes tomorrow.`,
      }));
      return;
    }

    const block = story.storyBlocks[index];
    if (!block) {
      return;
    }

    setArt((current) => ({
      ...current,
      loadingBlocks: {
        ...current.loadingBlocks,
        [index]: true,
      },
      note: `Generating art for page ${index + 1}...`,
    }));

    try {
      const response = await fetch("/api/generate-illustration", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({
          title: block.heading,
          prompt: block.imagePrompt,
          sceneType: block.sceneType,
          language: illustrationLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setArt((current) => ({
          ...current,
          note: data.error ?? "Could not generate this page image right now.",
        }));
        if (data.usage) {
          setSubscriptionStatus((current) =>
            mergeUsageIntoSubscriptionStatus(current, data.usage as ImageUsage),
          );
          setStatusState("ready");
        }
        if (response.status === 402) {
          setError(
            data.error ??
              "Today's free illustrations are used up. Start a subscription to continue tonight.",
          );
        }
        return;
      }

      setArt((current) => ({
        ...current,
        blocks: {
          ...current.blocks,
          [index]: data as IllustrationResponse,
        },
        note: data.note ?? `Page ${index + 1} art ready.`,
      }));

      if (data.usage) {
        setSubscriptionStatus((current) =>
          mergeUsageIntoSubscriptionStatus(current, data.usage as ImageUsage),
        );
        setStatusState("ready");
      }
    } catch {
      setArt((current) => ({
        ...current,
        note: "Image generation failed for that page, fallback scene remains visible.",
      }));
    } finally {
      setArt((current) => ({
        ...current,
        loadingBlocks: {
          ...current.loadingBlocks,
          [index]: false,
        },
      }));
      await refreshStatus();
    }
  }

  async function handleGenerate() {
    if (!profile || onboarding !== "ready") {
      setError("Finish setup first so stories can be personalized.");
      return;
    }

    if (!prompt.trim()) {
      setError("Add a short story idea first.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStory(null);
    setArt({
      cover: null,
      blocks: {},
      loadingCover: false,
      loadingBlocks: {},
      note: null,
    });

    const profileCulture = profile.culture.trim();
    const profileLanguage = profile.language.trim();
    const profileAge = profile.age.trim();

    const payload: BedtimeRequest = {
      kidName: profile.childName.trim() || "Little One",
      age: parseAgeYears(profileAge),
      language: parseLanguageMode(profileLanguage),
      culturalBackground: profileCulture || "family bedtime traditions",
      location: deriveLocation(profileCulture),
      theme: prompt.trim(),
      bedtimeMood: moodToBedtimeMood(mood),
      moralLesson: "",
      favoriteAnimal: "monkey",
      favoriteColor: mood === "warm" ? "amber" : mood === "adventure" ? "indigo" : "blue",
      premium: true,
    };

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Story generation failed.");
      }

      const nextStory = data as BedtimeResponse;
      setStory(nextStory);
      const statusResult = await refreshStatus();
      const nextSubscriptionStatus = statusResult.subscriptionStatus;

      if (nextSubscriptionStatus?.usage.canGenerate === false) {
        setArt((current) => ({
          ...current,
          note: `Today's ${nextSubscriptionStatus.usage.dailyLimit} free illustrations are used up. Your story is complete - illustration resumes tomorrow.`,
        }));
        return;
      }

      await generateArtForCover(nextStory);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not generate the story right now.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSetupComplete(nextProfile: SetupProfile) {
    const normalizedProfile: SetupProfile = {
      childName: nextProfile.childName.trim(),
      age: nextProfile.age.trim(),
      language: nextProfile.language.trim(),
      culture: nextProfile.culture.trim(),
    };

    window.localStorage.setItem("mono_settings", JSON.stringify(normalizedProfile));
    setProfile(normalizedProfile);
    setOnboarding("ready");
    setError(null);
  }

  function restartSetup() {
    window.localStorage.removeItem("mono_settings");
    setProfile(null);
    setOnboarding("needsSetup");
    setStory(null);
    setPrompt("");
    setError(null);
  }

  if (onboarding === "checking") {
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.22),transparent_30%)]" />
        <div className="relative z-10 flex items-center gap-3 rounded-full border border-white/14 bg-white/10 px-5 py-3 backdrop-blur-xl">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <p className="text-sm text-indigo-100/80">Preparing your bedtime canvas...</p>
        </div>
      </div>
    );
  }

  if (onboarding === "needsSetup") {
    return (
      <SetupWizard
        activeSoundscape={activeSoundscape}
        onComplete={handleSetupComplete}
        onSelectSoundscape={selectSoundscape}
      />
    );
  }

  if (story) {
    return (
      <StoryBookReader
        story={story}
        coverArt={art.cover}
        blockArt={art.blocks}
        artNote={art.note}
        usage={usage}
        statusState={statusState}
        loadingCover={art.loadingCover}
        loadingBlocks={art.loadingBlocks}
        billingPending={billingPending}
        subscriptionConfigured={subscriptionStatus?.billingConfigured ?? false}
        actionError={error}
        onNewStory={() => {
          setStory(null);
          setPrompt("");
          setError(null);
        }}
        onGenerateCoverArt={() => {
          void generateArtForCover(story);
        }}
        onGenerateBlockArt={(index) => {
          void generateArtForBlock(index);
        }}
        onStartSubscription={
          subscriptionStatus?.actions.canCheckout
            ? () => {
                void startSubscriptionCheckout();
              }
            : undefined
        }
        onManageSubscription={
          subscriptionStatus?.actions.canManage
            ? () => {
                void openSubscriptionPortal();
              }
            : undefined
        }
        activeSoundscape={activeSoundscape}
        onSelectSoundscape={selectSoundscape}
      />
    );
  }

  const gradientAnimation = isGenerating
    ? "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)"
    : [
        "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
        "linear-gradient(180deg, #17172b 0%, #282566 100%)",
      ];
  const illustrationPanelClass =
    illustrationStatus.tone === "premium"
      ? "border-[#ffd59c]/28 bg-[#ffd59c]/10"
      : illustrationStatus.tone === "free"
        ? "border-emerald-300/24 bg-emerald-300/10"
        : illustrationStatus.tone === "limited"
          ? "border-amber-300/24 bg-amber-300/10"
          : illustrationStatus.tone === "error"
            ? "border-rose-300/24 bg-rose-300/10"
            : "border-white/24 bg-white/12";
  const illustrationBadgeClass =
    illustrationStatus.tone === "premium"
      ? "border-[#ffd59c]/35 bg-[#ffd59c]/14 text-[#fff2dc]"
      : illustrationStatus.tone === "free"
        ? "border-emerald-200/30 bg-emerald-300/14 text-emerald-50"
        : illustrationStatus.tone === "limited"
          ? "border-amber-200/30 bg-amber-300/14 text-amber-50"
          : illustrationStatus.tone === "error"
            ? "border-rose-200/30 bg-rose-300/14 text-rose-50"
            : "border-white/24 bg-white/10 text-white/88";
  const activeSoundLabel = activeSoundscape
    ? `${activeSoundscape.charAt(0).toUpperCase()}${activeSoundscape.slice(1)} on`
    : "Sound off";
  const moodCards = [
    {
      id: "calm",
      icon: Wind,
      label: "Calm",
      detail: "Quiet skies, gentler wording, and softer landings.",
      sceneType: "clouds" as const,
    },
    {
      id: "warm",
      icon: Flame,
      label: "Warm",
      detail: "Lamplight, closeness, and a room that feels held.",
      sceneType: "village" as const,
    },
    {
      id: "adventure",
      icon: Moon,
      label: "Adventure",
      detail: "A brave little night journey that still settles softly.",
      sceneType: "forest" as const,
    },
  ] as const;
  const featuredIdeas = [
    {
      starter: promptStarters[0],
      title: "Window Watch",
      caption: "A sleepy room, silver moonlight, and Luffy guarding the night.",
      sceneType: "moon" as const,
    },
    {
      starter: promptStarters[1],
      title: "Sea Drift",
      caption: "A little boat, a silver shoreline, and stars reflected in the water.",
      sceneType: "ocean" as const,
    },
    {
      starter: promptStarters[2],
      title: "Lantern Walk",
      caption: "A tiny glowing path through the trees that ends in a warm tuck-in.",
      sceneType: "forest" as const,
    },
  ] as const;

  return (
    <motion.div
      className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto text-white"
      animate={{ background: gradientAnimation }}
      transition={{
        background: {
          duration: 4,
          repeat: isGenerating ? 0 : Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        },
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.22),transparent_30%)]" />

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key="ui-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]"
          >
            <div className="flex flex-col gap-6">
              <section className="relative overflow-hidden rounded-[2.4rem] border border-white/18 bg-[#07111f]/90 p-5 shadow-[0_34px_120px_rgba(2,6,23,0.56)] sm:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0)_24%,rgba(4,9,21,0.28)_100%)]" />

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MonkeyMark className="rounded-[24px] border-white/20 bg-white/18 p-2.5" />
                      <div className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.26em] text-[#9ab8ff]">
                        Featured tonight
                      </div>
                    </div>

                    <div className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/72">
                      {activeSoundscape
                        ? `${activeSoundscape.charAt(0).toUpperCase()}${activeSoundscape.slice(1)} on`
                        : "Add sound"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
                    <div className="flex flex-col gap-5">
                      <div className="max-w-[34rem]">
                        <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">
                          Night story studio
                        </p>
                        <h1 className="mt-3 max-w-[12ch] text-balance text-[2.65rem] font-light leading-[0.95] text-white sm:text-[3.9rem]">
                          Bedtime feels like a premiere again.
                        </h1>
                        <p className="mt-4 max-w-[31rem] text-base leading-7 text-white/74">
                          Good evening, {profile?.childName || "little one"}. Set the tone, pick a
                          room sound, and start a story that looks like it belongs on screen.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.6rem] border border-white/12 bg-white/6 p-4">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/52">
                            For tonight
                          </div>
                          <div className="mt-2 text-lg font-medium text-white">
                            {profile?.childName || "Little one"}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            {profile?.age || "0 years"}, {profileLanguageLabel}
                          </p>
                        </div>

                        <div className="rounded-[1.6rem] border border-white/12 bg-white/6 p-4">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/52">
                            Story promise
                          </div>
                          <div className="mt-2 text-lg font-medium text-white">10 calm minutes</div>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            600 words and a clean, cinematic reading flow.
                          </p>
                        </div>

                        <div className="rounded-[1.6rem] border border-white/12 bg-white/6 p-4">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/52">
                            Companion
                          </div>
                          <div className="mt-2 text-lg font-medium text-white">Luffy on watch</div>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            A softer presence in the room so it feels guided, not generated.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[2rem] border border-white/12 bg-[#030711]/70 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-[0.18em] text-white/88">
                            Story brief
                          </span>
                          <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                            Detailed mode
                          </span>
                        </div>
                        <textarea
                          rows={5}
                          value={prompt}
                          onChange={(event) => setPrompt(event.target.value)}
                          placeholder="Share the bedtime idea. Example: Mono helps the nursery settle while little Luffy watches the moon through the window."
                          className="mt-4 min-h-[180px] w-full resize-none rounded-[1.7rem] border border-white/14 bg-[#02050d]/90 px-5 py-5 text-base leading-7 text-white placeholder:text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all focus:border-[#b6c8ff]/48 focus:outline-none"
                          aria-label="Story prompt input"
                        />

                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          data-testid="generate-story"
                          className="group mt-4 flex w-full items-center justify-center gap-3 rounded-[1.55rem] border border-[#c9d3ff]/28 bg-[linear-gradient(135deg,rgba(191,219,254,0.26),rgba(129,140,248,0.34),rgba(251,191,36,0.18))] px-6 py-5 text-white transition hover:border-[#dce6ff]/42 hover:shadow-[0_18px_50px_rgba(129,140,248,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isGenerating ? (
                            <LoaderCircle size={18} className="animate-spin" />
                          ) : (
                            <Sparkles size={18} className="opacity-70 transition-opacity group-hover:opacity-100" />
                          )}
                          <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                            {isGenerating ? "Waking up the stars..." : "Generate tonight's story"}
                          </span>
                        </button>

                        <div className="mt-4">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/54">
                            Quick visual picks
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            {featuredIdeas.map((idea) => (
                              <button
                                key={`${idea.title}-hero`}
                                type="button"
                                onClick={() => setPrompt(idea.starter)}
                                className="overflow-hidden rounded-[1.4rem] border border-white/12 bg-white/6 p-2 text-left transition hover:border-white/20 hover:bg-white/10"
                              >
                                <ScenePoster
                                  title={idea.title}
                                  caption={idea.caption}
                                  sceneType={idea.sceneType}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <ScenePoster
                        title={previewTitle}
                        caption={previewCaption}
                        sceneType={previewSceneType}
                        variant="hero"
                      />

                      <div className="overflow-hidden rounded-[1.8rem] border border-white/12 bg-white/6 p-3">
                        <div className="flex items-center gap-3">
                          <div className="overflow-hidden rounded-[1.2rem] border border-white/12 bg-white/8">
                            <Image
                              src="/luffy.svg"
                              alt="Luffy, the bedtime companion"
                              width={80}
                              height={104}
                              className="h-[104px] w-[80px] object-cover"
                              priority
                            />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                              Companion spotlight
                            </div>
                            <div className="mt-2 text-xl font-medium text-white">Luffy</div>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                              Keeping the room soft while the next story comes together.
                            </p>
                          </div>
                        </div>
                      </div>

                      <SoundDock
                        activeSoundscape={activeSoundscape}
                        onSelectSoundscape={selectSoundscape}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6">
              <section className="rounded-[2.1rem] border border-white/20 bg-[#101a33]/84 p-5 shadow-[0_28px_90px_rgba(7,10,26,0.42)] backdrop-blur-md sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/54">
                      Now streaming for
                    </div>
                    <h2 className="mt-3 text-2xl font-light text-white">
                      {profile?.childName || "Your little one"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={restartSetup}
                    className="inline-flex rounded-full border border-white/18 bg-white/8 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-white/12"
                  >
                    Edit profile
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/14 bg-slate-950/38 px-4 py-4 text-sm text-white/82">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/54">
                        Age + language
                      </div>
                      <div className="mt-2 text-base text-white">
                        {profile?.age || "0 years"}, {profileLanguageLabel}
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/14 bg-slate-950/38 px-4 py-4 text-sm text-white/82">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/54">
                        Roots
                      </div>
                      <div className="mt-2 text-base text-white">
                        {profile?.culture || "family bedtime traditions"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/14 bg-slate-950/38 px-4 py-4 text-sm text-white/82">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/54">
                      Room sound
                    </div>
                    <div className="mt-2 text-base text-white">{activeSoundLabel}</div>
                    <div className="mt-2 text-sm leading-6 text-white/64">
                      The selected soundscape stays with setup, story generation, and reading.
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2.1rem] border border-white/20 bg-[#101a33]/84 p-5 shadow-[0_28px_90px_rgba(7,10,26,0.42)] backdrop-blur-md sm:p-6">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/64">
                  Choose the atmosphere
                </div>
                <div className="mt-4 grid gap-3">
                  {moodCards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMood(item.id as Mood)}
                      className={`overflow-hidden rounded-[1.8rem] border text-left transition-all duration-300 ${
                        mood === item.id
                          ? "border-[#d6ddff]/34 bg-[linear-gradient(135deg,rgba(191,219,254,0.16),rgba(129,140,248,0.2),rgba(255,214,153,0.14))] text-white shadow-[0_12px_34px_rgba(129,140,248,0.16)]"
                          : "border-white/14 bg-slate-950/34 text-white/88 hover:bg-slate-950/48"
                      }`}
                    >
                      <div className="p-3">
                        <ScenePoster
                          title={item.label}
                          caption={item.detail}
                          sceneType={item.sceneType}
                        />
                      </div>
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/8">
                            <item.icon size={20} strokeWidth={1.6} />
                          </div>
                          <div>
                            <div className="text-base font-medium">{item.label}</div>
                            <div className="mt-1 text-sm leading-6 text-white/68">{item.detail}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section
                className={`rounded-[2.1rem] border p-5 text-white shadow-[0_18px_40px_rgba(7,10,26,0.22)] backdrop-blur-xl sm:p-6 ${illustrationPanelClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${illustrationBadgeClass}`}
                    >
                      {illustrationStatus.badge}
                    </div>
                    <p className="text-lg font-medium text-white">{illustrationStatus.title}</p>
                    <p className="text-sm leading-6 text-white/78">{illustrationStatus.detail}</p>
                  </div>
                  <div className="rounded-full border border-white/18 bg-slate-950/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/82">
                    {usage?.subscribed
                      ? "Unlimited"
                      : usage
                        ? `${usage.remainingFreeImages}/${usage.dailyLimit}`
                        : "..."}
                  </div>
                </div>

                {subscriptionStatus?.actions.canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void openSubscriptionPortal();
                      }}
                      disabled={billingPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/24 bg-slate-950/54 px-4 py-2.5 text-sm text-white transition hover:bg-slate-950/68 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {billingPending ? "Opening..." : "Manage subscription"}
                    </button>
                  </div>
                ) : null}

                {subscriptionStatus?.actions.canCheckout && usage && !usage.canGenerate ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void startSubscriptionCheckout();
                      }}
                      disabled={billingPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#ffd59c]/30 bg-[#ffd59c]/18 px-4 py-2.5 text-sm text-[#fff4e1] transition hover:bg-[#ffd59c]/24 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {billingPending ? "Opening..." : "Start paid subscription"}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[2.1rem] border border-white/20 bg-[#101a33]/84 p-5 text-sm text-white/78 shadow-[0_28px_90px_rgba(7,10,26,0.42)] backdrop-blur-md sm:p-6">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/64">
                  Featured bedtime ideas
                </div>
                <p className="mt-3 leading-7">
                  Drop in a stronger starting point when you want the app to feel more like a curated library than a blank textbox.
                </p>

                <div className="mt-4 grid gap-3">
                  {featuredIdeas.map((idea) => (
                    <button
                      key={idea.title}
                      type="button"
                      onClick={() => setPrompt(idea.starter)}
                      className="overflow-hidden rounded-[1.6rem] border border-white/14 bg-slate-950/34 text-left transition hover:border-white/20 hover:bg-slate-950/46"
                    >
                      <div className="p-3">
                        <ScenePoster
                          title={idea.title}
                          caption={idea.caption}
                          sceneType={idea.sceneType}
                        />
                      </div>
                      <div className="px-4 pb-4">
                        <div className="text-base font-medium text-white">{idea.title}</div>
                        <div className="mt-1 text-sm leading-6 text-white/66">{idea.caption}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="mt-4 leading-7">{serviceStatusMessage}</p>
              </section>

              {error ? (
                <div className="flex items-start gap-2 rounded-[1.6rem] border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <PoodleCompanion cueKey={cueKey} visible />
    </motion.div>
  );
}
