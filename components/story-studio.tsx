"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MonkeyMark } from "@/components/monkey-mark";
import { ScenePoster } from "@/components/scene-poster";
import type {
  BedtimeRequest,
  BedtimeResponse,
  IllustrationResponse,
  SubscriptionStatus,
} from "@/lib/story-contract";

const initialForm: BedtimeRequest = {
  kidName: "",
  age: 0,
  language: "en",
  culturalBackground: "your family's bedtime traditions",
  location: "home",
  theme: "moonlight and cuddles",
  bedtimeMood: "calm",
  moralLesson: "",
  favoriteAnimal: "monkey",
  favoriteColor: "apricot",
  premium: true,
};

function toApiPayload(form: BedtimeRequest) {
  return {
    ...form,
    age: Number(form.age),
  };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type IllustrationState = {
  cover: IllustrationResponse | null;
  blocks: Record<number, IllustrationResponse | null>;
  loading: boolean;
  note: string | null;
};

type AIStatus = {
  storyWriterConfigured: boolean;
  storyReviewerConfigured: boolean;
  imageGeneratorConfigured: boolean;
  subscriptionConfigured: boolean;
};

const panelClass =
  "rounded-[32px] border border-black/8 bg-white/72 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:p-8";

const fieldClass =
  "w-full rounded-2xl border border-black/8 bg-white/72 px-4 py-3 text-black outline-none transition placeholder:text-black/35 focus:border-[#FF7A00] focus:bg-white";

function getSessionId() {
  if (typeof window === "undefined") return "guest-session";
  try {
    let id = sessionStorage.getItem("mb_session_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("mb_session_id", id);
    }
    return id;
  } catch {
    return "guest-session";
  }
}

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildStatusHeaders() {
  return {
    "x-monobedtime-session-id": getSessionId(),
    "x-monobedtime-day-key": getDayKey(),
  };
}

export function StoryStudio() {
  const [form, setForm] = useState<BedtimeRequest>(initialForm);
  const [story, setStory] = useState<BedtimeResponse | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [subscriptionStatusLoading, setSubscriptionStatusLoading] =
    useState(true);
  const [subscriptionStatusError, setSubscriptionStatusError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasGeneratedStory, setHasGeneratedStory] = useState(false);
  const [illustrations, setIllustrations] = useState<IllustrationState>({
    cover: null,
    blocks: {},
    loading: false,
    note: "Add the story details first. The story and scene art appear only after generation.",
  });
  const deferredName = useDeferredValue(form.kidName);

  const previewBadge = useMemo(() => {
    const label =
      form.language === "es"
        ? "Spanish"
        : form.language === "en"
          ? "English"
          : "Bilingual";

    return `${label} | age ${form.age} | ${form.location}`;
  }, [form.age, form.language, form.location]);

  const storyWordCount = useMemo(() => {
    if (!story) {
      return 0;
    }

    return story.storyBlocks.reduce(
      (total, block) => total + countWords(block.text),
      0,
    );
  }, [story]);

  const keyStatusMessage = useMemo(() => {
    if (!aiStatus) {
      return "Checking story generation…";
    }

    if (!aiStatus.storyWriterConfigured) {
      return "Story generation is not available.";
    }

    return "Story generation is ready.";
  }, [aiStatus]);

  // Derive illustration permission: default to allowing if status unknown
  const canGenerateIllustrations =
    subscriptionStatus?.usage.canGenerate ?? true;

  // Derive billing state label for display
  const illustrationStatusMessage = useMemo(() => {
    if (subscriptionStatusLoading) {
      return "Checking your illustration credits…";
    }
    if (subscriptionStatusError || !subscriptionStatus) {
      return "Could not check illustration status. Your story still generates; illustration will try its best.";
    }
    const { usage, billingConfigured } = subscriptionStatus;
    if (!billingConfigured) {
      return "Illustration service coming soon — your full story still generates.";
    }
    if (usage.subscribed) {
      return "Premium: unlimited story illustrations active.";
    }
    if (!usage.canGenerate) {
      return `Today's ${usage.dailyLimit} free illustrations are used up. Your story is complete — illustration resumes tomorrow.`;
    }
    return `Free: ${usage.remainingFreeImages} of ${usage.dailyLimit} daily illustrations remaining.`;
  }, [
    subscriptionStatus,
    subscriptionStatusLoading,
    subscriptionStatusError,
  ]);

  function updateField<K extends keyof BedtimeRequest>(
    key: K,
    value: BedtimeRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const fetchSubscriptionStatus = useCallback(async () => {
    setSubscriptionStatusError(false);
    try {
      const response = await fetch("/api/subscription/status", {
        cache: "no-store",
        headers: buildStatusHeaders(),
      });
      if (response.ok) {
        const data = (await response.json()) as SubscriptionStatus;
        setSubscriptionStatus(data);
      } else {
        setSubscriptionStatusError(true);
      }
    } catch {
      setSubscriptionStatusError(true);
    } finally {
      setSubscriptionStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAIStatus() {
      try {
        const response = await fetch("/api/ai-status", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!cancelled && response.ok) {
          setAIStatus(data as AIStatus);
        }
      } catch {
        if (!cancelled) {
          setAIStatus(null);
        }
      }
    }

    void loadAIStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    let cancelled = false;

    if (!story || !form.premium || !hasGeneratedStory) {
      setIllustrations({
        cover: null,
        blocks: {},
        loading: false,
        note: hasGeneratedStory
          ? null
          : "Add the story details first. The story and scene art appear only after generation.",
      });
      return;
    }

    // Block illustration requests when the free limit is known to be exhausted
    if (!canGenerateIllustrations) {
      const s = subscriptionStatus;
      const billingConfigured = s?.billingConfigured ?? false;
      const exhaustedNote = billingConfigured
        ? `Today's ${s?.usage.dailyLimit ?? 3} free illustrations are used up. Your story is complete — illustration resumes tomorrow or with a subscription.`
        : "Illustration credits are unavailable. Your story is complete and reads fully without images.";
      setIllustrations({
        cover: null,
        blocks: {},
        loading: false,
        note: exhaustedNote,
      });
      return;
    }

    const activeStory = story;

    async function fetchIllustrations() {
      setIllustrations({
        cover: null,
        blocks: {},
        loading: true,
        note: "Preparing story art in the background…",
      });

      const targets = [
        {
          kind: "cover" as const,
          index: -1,
          title: activeStory.title,
          prompt: activeStory.coverScene.imagePrompt,
          sceneType: activeStory.coverScene.sceneType,
        },
        ...activeStory.storyBlocks.slice(0, 2).map((block, index) => ({
          kind: "block" as const,
          index,
          title: block.heading,
          prompt: block.imagePrompt,
          sceneType: block.sceneType,
        })),
      ];

      const results = await Promise.all(
        targets.map(async (target) => {
          try {
            const response = await fetch("/api/generate-illustration", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildStatusHeaders(),
              },
              body: JSON.stringify({
                title: target.title,
                prompt: target.prompt,
                sceneType: target.sceneType,
                language: form.language,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.error || "We could not create the illustration.",
              );
            }

            return {
              ...target,
              illustration: data as IllustrationResponse,
            };
          } catch {
            return {
              ...target,
              illustration: null,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const blockIllustrations: Record<number, IllustrationResponse | null> =
        {};
      let coverIllustration: IllustrationResponse | null = null;
      let successful = 0;

      for (const result of results) {
        if (result.kind === "cover") {
          coverIllustration = result.illustration;
        } else {
          blockIllustrations[result.index] = result.illustration;
        }

        if (result.illustration?.imageDataUrl) {
          successful += 1;
        }
      }

      // Refresh status after illustration run so the credit count stays current
      void fetchSubscriptionStatus();

      setIllustrations({
        cover: coverIllustration,
        blocks: blockIllustrations,
        loading: false,
        note:
          successful > 0
            ? null
            : "The built-in scene art is carrying the experience while the illustration service is unavailable.",
      });
    }

    void fetchIllustrations();

    return () => {
      cancelled = true;
    };
  }, [
    canGenerateIllustrations,
    fetchSubscriptionStatus,
    form.language,
    form.premium,
    hasGeneratedStory,
    story,
    subscriptionStatus,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setHasGeneratedStory(true);
    setIllustrations({
      cover: null,
      blocks: {},
      loading: false,
      note: null,
    });

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toApiPayload(form)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not prepare tonight's story.");
      }

      startTransition(() => {
        setStory(data as BedtimeResponse);
      });

      // Refresh subscription status after story generates so credit counts are fresh
      void fetchSubscriptionStatus();
    } catch (caughtError) {
      setStory(null);
      setHasGeneratedStory(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: buildStatusHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Checkout is unavailable right now.");
      }
      window.location.href = data.url as string;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout is unavailable right now.",
      );
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(
          data.error || "Could not open the subscription manager.",
        );
      }
      window.location.href = data.url as string;
    } catch (err) {
      setPortalError(
        err instanceof Error
          ? err.message
          : "Could not open the subscription manager.",
      );
      setPortalLoading(false);
    }
  }

  function resetCanvas() {
    setForm(initialForm);
    setStory(null);
    setError(null);
    setLoading(false);
    setHasGeneratedStory(false);
    setIllustrations({
      cover: null,
      blocks: {},
      loading: false,
      note: "Add the story details first. The story and scene art appear only after generation.",
    });
  }

  const showCheckoutCta =
    subscriptionStatus?.actions.canCheckout &&
    !subscriptionStatus.usage.subscribed;

  const showPortalCta = subscriptionStatus?.actions.canManage;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr]">
      <section className={panelClass}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <MonkeyMark />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF7A00]">
                bedtime studio
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-black">
                Start with a blank canvas, then generate a 10-minute story.
              </h2>
            </div>
          </div>
          <div className="hidden rounded-full border border-black/8 bg-white/72 px-4 py-2 text-xs font-medium text-black/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] md:block">
            {previewBadge}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-black/8 bg-white/76 px-4 py-3 text-sm text-black/66 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
          <p className="font-medium text-black">
            Story target: exactly 600 words in the story body.
          </p>
          <p className="mt-1">{keyStatusMessage}</p>
          <p className="mt-1">{illustrationStatusMessage}</p>

          {showCheckoutCta ? (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => void handleCheckout()}
                className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#FF7A00] px-5 text-sm font-semibold text-white transition hover:bg-[#e06a00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading
                  ? "Starting checkout…"
                  : "Unlock unlimited illustrations"}
              </button>
              {checkoutError ? (
                <p className="text-xs text-red-600">{checkoutError}</p>
              ) : null}
            </div>
          ) : null}

          {showPortalCta ? (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={portalLoading}
                onClick={() => void handlePortal()}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 text-sm font-medium text-black/72 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalLoading
                  ? "Opening subscription manager…"
                  : "Manage subscription"}
              </button>
              {portalError ? (
                <p className="text-xs text-red-600">{portalError}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-black/62">Child name</span>
              <input
                value={form.kidName}
                onChange={(event) => updateField("kidName", event.target.value)}
                className={fieldClass}
                placeholder="Luna"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-black/62">Age</span>
              <input
                value={form.age}
                onChange={(event) =>
                  updateField("age", Number(event.target.value))
                }
                className={fieldClass}
                min={0}
                max={12}
                type="number"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-black/62">Language</span>
              <select
                value={form.language}
                onChange={(event) =>
                  updateField(
                    "language",
                    event.target.value as BedtimeRequest["language"],
                  )
                }
                className={fieldClass}
              >
                <option value="es">Spanish</option>
                <option value="en">English</option>
                <option value="bilingual">Bilingual</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-black/62">Mood</span>
              <select
                value={form.bedtimeMood}
                onChange={(event) =>
                  updateField(
                    "bedtimeMood",
                    event.target.value as BedtimeRequest["bedtimeMood"],
                  )
                }
                className={fieldClass}
              >
                <option value="calm">Very calm</option>
                <option value="cozy">Warm and cozy</option>
                <option value="adventurous">Soft adventure</option>
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-black/62">Cultural background</span>
            <input
              value={form.culturalBackground}
              onChange={(event) =>
                updateField("culturalBackground", event.target.value)
              }
              className={fieldClass}
              placeholder="Afrolatino, Dominicana, Andina, Mexicana..."
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-black/62">Location</span>
              <input
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className={fieldClass}
                placeholder="Panama City, Quito, Miami..."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-black/62">Core theme</span>
              <input
                value={form.theme}
                onChange={(event) => updateField("theme", event.target.value)}
                className={fieldClass}
                placeholder="A curious moon, a gentle forest..."
                required
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-white/74 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-black">
                  More bedtime details
                </p>
                <p className="mt-1 text-sm text-black/56">
                  These help the story feel more personal without making the
                  setup heavy on mobile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateField("premium", !form.premium)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  form.premium
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white/80 text-black/68"
                }`}
              >
                {form.premium ? "Detailed mode" : "Simple mode"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-black/62">Favorite animal</span>
                <input
                  value={form.favoriteAnimal ?? ""}
                  onChange={(event) =>
                    updateField("favoriteAnimal", event.target.value)
                  }
                  className={fieldClass}
                  placeholder="Monkey, rabbit, whale..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-black/62">Favorite color</span>
                <input
                  value={form.favoriteColor ?? ""}
                  onChange={(event) =>
                    updateField("favoriteColor", event.target.value)
                  }
                  className={fieldClass}
                  placeholder="Orange"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-black/62">Value or lesson</span>
                <input
                  value={form.moralLesson ?? ""}
                  onChange={(event) =>
                    updateField("moralLesson", event.target.value)
                  }
                  className={fieldClass}
                  placeholder="Kindness, patience..."
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-black px-6 text-base font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Writing your 10-minute story..."
                : "Create 10-minute story"}
            </button>
            <p className="text-sm text-black/52">
              The story writes first. Scene art follows when illustration
              credits are available. Built-in scenes stay ready if the art
              service is unavailable.
            </p>
          </div>

          <button
            type="button"
            onClick={resetCanvas}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/78 px-5 text-sm font-medium text-black/72 transition hover:bg-white"
          >
            Clear canvas
          </button>

          {illustrations.note ? (
            <div className="rounded-2xl border border-black/8 bg-white/74 px-4 py-3 text-sm text-black/68 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {illustrations.note}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </form>
      </section>

      <section className="space-y-5">
        <div className={panelClass}>
          <div className="flex items-start gap-4">
            <MonkeyMark className="p-2.5" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF7A00]">
                story canvas
              </div>
              <h3 className="mt-3 text-3xl font-semibold text-black">
                {deferredName || "Your little one"} gets a coherent and gentle
                bedtime story with Mono.
              </h3>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-base leading-7 text-black/62">
            This area stays blank until you generate a story. The story writes
            first, then scene art is added where illustration credits are
            available.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/8 bg-white/74 px-4 py-4 text-sm text-black/66 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              Target length: exactly 600 words across story pages.
            </div>
            <div className="rounded-2xl border border-black/8 bg-white/74 px-4 py-4 text-sm text-black/66 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              Companion system: Mono leads the story, Luffy cues interaction
              quietly.
            </div>
          </div>
        </div>

        {story && hasGeneratedStory ? (
          <div className="space-y-5">
            <ScenePoster
              title={story.title}
              caption={story.summary}
              sceneType={story.coverScene.sceneType}
              imageDataUrl={illustrations.cover?.imageDataUrl}
            />

            <div className={panelClass}>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {story.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-black/8 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-black/56"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-black/8 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="text-xs uppercase tracking-[0.18em] text-black/44">
                        Language
                      </div>
                      <div className="mt-2 text-lg font-medium text-black">
                        {story.languageLabel}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/8 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="text-xs uppercase tracking-[0.18em] text-black/44">
                        Reading time
                      </div>
                      <div className="mt-2 text-lg font-medium text-black">
                        {story.readingTimeMinutes} min
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/8 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="text-xs uppercase tracking-[0.18em] text-black/44">
                        Story words
                      </div>
                      <div className="mt-2 text-lg font-medium text-black">
                        {storyWordCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/8 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="text-xs uppercase tracking-[0.18em] text-black/44">
                        Moral
                      </div>
                      <div className="mt-2 text-sm leading-6 text-black/62">
                        {story.moral}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/8 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-4">
                    <MonkeyMark className="p-2.5" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
                        tonight&apos;s guide
                      </div>
                      <h4 className="mt-2 text-xl font-semibold text-black">
                        Mono
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-black/62">
                        Mono is the calm monkey companion who makes every
                        Monobedtime story feel like part of the same world.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {story.storyBlocks.map((block, index) => (
              <div
                key={`${block.heading}-${index}`}
                className="grid gap-4 rounded-[36px] border border-black/8 bg-white/68 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:grid-cols-[0.78fr_1fr]"
              >
                <ScenePoster
                  title={block.heading}
                  caption={block.imagePrompt}
                  sceneType={block.sceneType}
                  imageDataUrl={illustrations.blocks[index]?.imageDataUrl}
                />
                <div className="flex flex-col justify-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
                    scene {index + 1}
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold text-black">
                    {block.heading}
                  </h4>
                  <p className="mt-4 whitespace-pre-line text-base leading-8 text-black/66">
                    {block.text}
                  </p>
                </div>
              </div>
            ))}

            <div className={panelClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
                caregiver note
              </div>
              <p className="mt-3 text-2xl font-semibold text-black">
                {story.caregiverTip}
              </p>
              {illustrations.loading ? (
                <p className="mt-3 text-sm text-black/50">
                  Scene art is still being prepared in the background.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[36px] border border-dashed border-black/10 bg-white/48 p-8 text-black/54 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF7A00]">
              blank canvas
            </p>
            <p className="mt-4 text-lg leading-8">
              Your generated story appears here after you submit the form.
              Target output: 10 minutes and exactly 600 story words.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
