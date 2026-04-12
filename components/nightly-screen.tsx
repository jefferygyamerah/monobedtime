"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Flame, LoaderCircle, Moon, Sparkles, Wind } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonkeyMark } from "@/components/monkey-mark";
import { PoodleCompanion } from "@/components/poodle-companion";
import { SetupWizard, type SetupProfile } from "@/components/setup-wizard";
import { StoryBookReader } from "@/components/story-book-reader";
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

function createLocalDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSessionId() {
  if (typeof window === "undefined") {
    return "guest-session";
  }

  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function ensureSessionId() {
  if (typeof window === "undefined") {
    return "guest-session";
  }

  const existing = window.localStorage.getItem("monobedtime-session-id");
  if (existing) {
    return existing;
  }

  const next = createSessionId();
  window.localStorage.setItem("monobedtime-session-id", next);
  return next;
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
    sessionIdRef.current = ensureSessionId();
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
    return <SetupWizard onComplete={handleSetupComplete} />;
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

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key="ui-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-[2rem] border border-white/24 bg-[#101a33]/82 px-5 py-6 shadow-[0_28px_90px_rgba(7,10,26,0.48)] backdrop-blur-md sm:gap-8 sm:px-6 sm:py-8"
          >
            <div className="space-y-2 text-center">
              <div className="mb-3 flex justify-center">
                <MonkeyMark className="rounded-[24px] border-white/20 bg-white/30 p-2.5" />
              </div>
                <h1 className="text-[2rem] font-light tracking-wide text-white sm:text-3xl">
                  Good evening, {profile?.childName || "Little One"}.
                </h1>
              <p className="text-sm text-white/90">
                Start from a blank canvas and generate a full 10-minute story.
              </p>
            </div>

            <div className="rounded-xl border border-white/22 bg-slate-950/46 px-4 py-3 text-xs text-white/95">
              <p>Profile: {profile?.age || "0 years"}, {profileLanguageLabel}</p>
              <p className="mt-1">Roots: {profile?.culture || "family bedtime traditions"}</p>
              <button
                type="button"
                onClick={restartSetup}
                className="mt-3 inline-flex rounded-full border border-white/28 bg-slate-950/50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-slate-950/68"
              >
                Edit profile
              </button>
            </div>

            <div className="flex justify-between gap-2 sm:gap-3">
              {[
                { id: "calm", icon: Wind, label: "Calm" },
                { id: "warm", icon: Flame, label: "Warm" },
                { id: "adventure", icon: Moon, label: "Adventure" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMood(item.id as Mood)}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all duration-300 ease-out sm:py-4 ${
                    mood === item.id
                      ? "border-white/45 bg-white/18 text-white shadow-[0_0_20px_rgba(255,255,255,0.09)]"
                      : "border-white/22 bg-slate-950/42 text-white/90 hover:bg-slate-950/58 hover:text-white"
                  }`}
                  aria-label={`Set mood to ${item.label}`}
                >
                  <item.icon size={24} strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] sm:text-xs sm:tracking-wider">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <label className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-white/95">
                  Story seed
                </span>
                <span className="rounded-full border border-white/18 bg-slate-950/48 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/82">
                  Detailed mode
                </span>
              </div>
              <textarea
                rows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Share the bedtime idea. Example: Mono helps the nursery settle while little Luffy watches the moon through the window."
                className="min-h-[132px] w-full resize-none rounded-2xl border border-white/22 bg-slate-950/76 px-4 py-4 text-sm leading-6 text-white placeholder:text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all focus:border-indigo-100/80 focus:bg-slate-950/88 focus:outline-none sm:px-5"
                aria-label="Story prompt input"
              />
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200/55 bg-indigo-300/28 py-5 text-white transition-all hover:border-indigo-100 hover:bg-indigo-300/36 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} className="opacity-50 transition-opacity group-hover:opacity-100" />
              )}
              <span className="font-medium tracking-wide">
                {isGenerating ? "Waking up the stars..." : "Generate tonight's story"}
              </span>
            </button>

            <div
              className={`rounded-[1.4rem] border px-4 py-4 text-white shadow-[0_18px_40px_rgba(7,10,26,0.22)] backdrop-blur-xl ${illustrationPanelClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${illustrationBadgeClass}`}
                  >
                    {illustrationStatus.badge}
                  </div>
                  <p className="text-sm font-medium text-white">{illustrationStatus.title}</p>
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
            </div>

            <div className="rounded-xl border border-white/22 bg-slate-950/46 px-4 py-3 text-xs text-white/95">
              <p>Target: 10 minutes and exactly 600 story words across the reading pages.</p>
              <p className="mt-1">{serviceStatusMessage}</p>
              <p className="mt-1">
                Story text always comes first. Cover art follows only when tonight&apos;s illustration access allows it.
              </p>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <PoodleCompanion cueKey={cueKey} visible />
    </motion.div>
  );
}
