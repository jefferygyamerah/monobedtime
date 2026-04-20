"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AmbientBackground } from "@/components/ambient-background";
import { GlassMenu } from "@/components/glass-menu";
import { PoodleCompanion } from "@/components/poodle-companion";
import { ScenePoster } from "@/components/scene-poster";
import type { Soundscape } from "@/components/use-bedtime-audio";
import type {
  BedtimeResponse,
  IllustrationResponse,
  ImageUsage,
} from "@/lib/story-contract";

type ReaderPage = {
  pageNumber: number;
  title: string;
  text: string;
  ambientColor: string;
  sceneType: keyof typeof ambientColorByScene;
  triggerLuffyYawn: boolean;
  imageDataUrl: string | null;
  attribution?: IllustrationResponse["attribution"];
  isCover: boolean;
};

const ambientColorByScene = {
  moon: "#b7c4ff",
  clouds: "#d8dfff",
  village: "#f5bc8a",
  forest: "#9dc8a7",
  jungle: "#77bf9f",
  ocean: "#88c1dd",
  mountains: "#cab8e7",
  city: "#f0b087",
} as const;

function buildReaderPages(
  story: BedtimeResponse,
  coverArt: IllustrationResponse | null,
  blockArt: Record<number, IllustrationResponse | null>,
) {
  const pages: ReaderPage[] = [
    {
      pageNumber: 0,
      title: story.title,
      text: story.coverScene.text,
      ambientColor: ambientColorByScene[story.coverScene.sceneType],
      sceneType: story.coverScene.sceneType,
      triggerLuffyYawn: true,
      imageDataUrl: coverArt?.imageDataUrl ?? null,
      attribution: coverArt?.attribution,
      isCover: true,
    },
  ];

  story.storyBlocks.forEach((block, index) => {
    pages.push({
      pageNumber: index + 1,
      title: block.heading,
      text: block.text,
      ambientColor: ambientColorByScene[block.sceneType],
      sceneType: block.sceneType,
      triggerLuffyYawn:
        index === story.storyBlocks.length - 1 ||
        block.sceneType === "moon" ||
        block.sceneType === "clouds",
      imageDataUrl: blockArt[index]?.imageDataUrl ?? null,
      attribution: blockArt[index]?.attribution,
      isCover: false,
    });
  });

  return pages;
}

function pageVariants(direction: number) {
  return {
    enter: {
      x: direction > 0 ? 360 : -360,
      opacity: 0,
      rotateY: direction > 0 ? 12 : -12,
      scale: 0.96,
    },
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      scale: 1,
    },
    exit: {
      x: direction > 0 ? -360 : 360,
      opacity: 0,
      rotateY: direction > 0 ? -10 : 10,
      scale: 0.98,
    },
  };
}

function compactCaption(text: string, maxLength = 140) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function StoryBookReader({
  story,
  coverArt,
  blockArt,
  artNote,
  usage,
  statusState,
  loadingCover,
  loadingBlocks,
  billingPending,
  subscriptionConfigured,
  actionError,
  activeSoundscape,
  onNewStory,
  onGenerateCoverArt,
  onGenerateBlockArt,
  onSelectSoundscape,
  onStartSubscription,
  onManageSubscription,
}: {
  story: BedtimeResponse;
  coverArt: IllustrationResponse | null;
  blockArt: Record<number, IllustrationResponse | null>;
  artNote: string | null;
  usage: ImageUsage | null;
  statusState: "loading" | "ready" | "error";
  loadingCover: boolean;
  loadingBlocks: Record<number, boolean>;
  billingPending: boolean;
  subscriptionConfigured: boolean;
  actionError: string | null;
  activeSoundscape: Soundscape | null;
  onNewStory: () => void;
  onGenerateCoverArt: () => void;
  onGenerateBlockArt: (index: number) => void;
  onSelectSoundscape: (soundscape: Soundscape) => void;
  onStartSubscription?: () => void;
  onManageSubscription?: () => void;
}) {
  const pages = useMemo(
    () => buildReaderPages(story, coverArt, blockArt),
    [blockArt, coverArt, story],
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [cueKey, setCueKey] = useState(0);
  const [audioDrawerOpen, setAudioDrawerOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const page = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;
  const isFirstPage = currentPage === 0;
  const currentImageLoading = page.isCover
    ? loadingCover
    : Boolean(loadingBlocks[currentPage - 1]);
  const canGenerateImages = !usage || usage.canGenerate || usage.subscribed;
  const currentSoundLabel = activeSoundscape
    ? `${activeSoundscape.charAt(0).toUpperCase()}${activeSoundscape.slice(1)} playing`
    : "Sound off";

  const imageStatus = statusState === "loading"
    ? {
        label: "Checking your illustration credits...",
        detail: "Your story still generates while we confirm what illustration access is available tonight.",
        tone: "pending",
      }
    : statusState === "error"
      ? {
          label: "Could not check illustration status.",
          detail: "Your story still generates; illustration will try its best.",
          tone: "error",
        }
      : !usage
        ? {
            label: "Checking your illustration credits...",
            detail: "Your story still generates while we confirm what illustration access is available tonight.",
            tone: "pending",
          }
    : !subscriptionConfigured && !usage.subscribed
      ? {
          label: "Illustration subscription coming soon",
          detail: "Your full story still generates, and checkout stays hidden until billing is ready.",
          tone: "muted",
        }
      : usage.subscribed
        ? {
            label: "Premium: unlimited story illustrations active.",
            detail: "Generate cover and page art whenever you want tonight.",
            tone: "premium",
          }
        : usage.canGenerate
          ? {
              label: `Free: ${usage.remainingFreeImages} of ${usage.dailyLimit} daily illustrations remaining.`,
              detail: "Story text always comes first. Illustration follows when you want it.",
              tone: "ready",
            }
          : {
              label: `Today's ${usage.dailyLimit} free illustrations are used up.`,
              detail: "Your story is complete - illustration resumes tomorrow.",
              tone: "limited",
            };

  const generateButtonLabel = currentImageLoading
    ? "Generating..."
    : page.imageDataUrl
      ? "Refresh image"
      : page.isCover
        ? "Generate cover art"
        : "Generate page art";

  const actionNote = artNote ?? "Generate art page by page, or keep the story text-only and relaxed.";
  const revealControls = useCallback(() => {
    setControlsVisible(true);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCueKey((value) => value + 1);
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentPage]);

  useEffect(() => {
    if (!page.triggerLuffyYawn) {
      return;
    }

    setCueKey((value) => value + 1);
  }, [page.pageNumber, page.triggerLuffyYawn]);

  useEffect(() => {
    revealControls();
  }, [currentPage, revealControls]);

  useEffect(() => {
    if (audioDrawerOpen) {
      setControlsVisible(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [audioDrawerOpen, controlsVisible, currentPage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && audioDrawerOpen) {
        setAudioDrawerOpen(false);
        setControlsVisible(true);
        return;
      }

      if (event.key === "ArrowLeft" && !isFirstPage) {
        event.preventDefault();
        revealControls();
        setDirection(-1);
        setCurrentPage((current) => current - 1);
        return;
      }

      if (event.key === "ArrowRight" && !isLastPage) {
        event.preventDefault();
        revealControls();
        setDirection(1);
        setCurrentPage((current) => current + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [audioDrawerOpen, isFirstPage, isLastPage, revealControls]);

  function paginate(nextDirection: number) {
    const nextPage = currentPage + nextDirection;

    if (nextPage < 0 || nextPage >= pages.length) {
      return;
    }

    revealControls();
    setDirection(nextDirection);
    setCurrentPage(nextPage);

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
  }

  function jumpToPage(nextPage: number) {
    if (nextPage < 0 || nextPage >= pages.length || nextPage === currentPage) {
      return;
    }

    revealControls();
    setDirection(nextPage > currentPage ? 1 : -1);
    setCurrentPage(nextPage);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const swipePower = Math.abs(info.offset.x) * Math.max(1, Math.abs(info.velocity.x));

    if (info.offset.x < -50 && swipePower > 50 && !isLastPage) {
      paginate(1);
      return;
    }

    if (info.offset.x > 50 && swipePower > 50 && !isFirstPage) {
      paginate(-1);
    }
  }

  function handleGenerateCurrentImage() {
    if (page.isCover) {
      onGenerateCoverArt();
      return;
    }

    onGenerateBlockArt(currentPage - 1);
  }

  return (
    <motion.div
      className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto text-white"
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onTouchStart={revealControls}
    >
      <AmbientBackground pageIndex={currentPage} />
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(circle at 50% 34%, ${page.ambientColor}36 0%, rgba(13,16,38,0) 58%)`,
        }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      {page.imageDataUrl ? (
        <motion.div
          key={page.imageDataUrl}
          className="absolute inset-0 bg-cover bg-center"
          initial={{ opacity: 0.06, scale: 1.03 }}
          animate={{ opacity: 0.22, scale: 1.08 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10, 12, 28, 0.34), rgba(10, 12, 28, 0.78)), url(${page.imageDataUrl})`,
          }}
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_80%_10%,rgba(255,199,137,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(7,10,24,0.2)_48%,rgba(7,10,24,0.62))]" />

      <button
        type="button"
        aria-label="Previous page"
        onClick={() => paginate(-1)}
        disabled={isFirstPage}
        className="absolute inset-y-0 left-0 z-20 w-1/5 disabled:pointer-events-none"
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={() => paginate(1)}
        disabled={isLastPage}
        className="absolute inset-y-0 right-0 z-20 w-1/5 disabled:pointer-events-none"
      />

      <GlassMenu
        activeSoundscape={activeSoundscape}
        audioDrawerOpen={audioDrawerOpen}
        canGoNext={!isLastPage}
        canGoPrev={!isFirstPage}
        currentPage={currentPage}
        onAudioToggle={() => {
          setAudioDrawerOpen((current) => !current);
          setControlsVisible(true);
        }}
        onNext={() => paginate(1)}
        onPrev={() => paginate(-1)}
        onSelectSoundscape={onSelectSoundscape}
        totalPages={pages.length}
        visible={controlsVisible}
      />

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 flex min-h-dvh flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-6">
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-14 sm:py-16">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            className="w-full touch-pan-y"
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.article
                key={page.pageNumber}
                custom={direction}
                variants={pageVariants(direction)}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 120, damping: 20 },
                  opacity: { duration: 0.45 },
                  rotateY: { duration: 0.45 },
                  scale: { duration: 0.45 },
                }}
                className="story-paper mx-auto max-h-[min(60dvh,42rem)] max-w-xl overflow-y-auto rounded-[2rem] border border-white/24 bg-slate-950/42 px-5 py-6 shadow-[0_32px_110px_rgba(7,10,26,0.5)] backdrop-blur-2xl sm:max-h-none sm:rounded-[2.4rem] sm:px-10 sm:py-11"
              >
                <div className="space-y-5 text-center sm:space-y-6">
                  <ScenePoster
                    title={page.title}
                    caption={compactCaption(page.isCover ? story.summary : page.text)}
                    sceneType={page.sceneType}
                    imageDataUrl={page.imageDataUrl}
                    variant="reader"
                  />

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/62">
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">
                        {page.isCover ? "Tonight's story" : `Page ${currentPage}`}
                      </span>
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1">
                        {currentSoundLabel}
                      </span>
                    </div>
                    <h1 className="sleepy-text text-balance text-[1.9rem] font-light leading-tight text-white sm:text-4xl">
                      {page.title}
                    </h1>
                  </div>

                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`sleepy-text text-balance text-base leading-8 text-white/92 sm:text-[1.45rem] sm:leading-10 ${
                      currentPage >= 2 ? "sleepy-text-dim" : ""
                    }`}
                  >
                    {page.text}
                  </motion.p>

                  <div className="flex justify-center gap-2">
                    {pages.map((readerPage) => (
                      <span
                        key={readerPage.pageNumber}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          readerPage.pageNumber === currentPage
                            ? "w-8 bg-white/90"
                            : "w-2 bg-white/24"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="overflow-hidden rounded-[1.8rem] border border-white/18 bg-slate-950/30 p-3 backdrop-blur-xl sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/56">
                  Story gallery
                </div>
                <div className="mt-1 text-sm text-white/76">
                  Jump by image instead of only swiping page by page.
                </div>
              </div>
              <div className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/74">
                {pages.length} scenes
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {pages.map((readerPage, index) => (
                <button
                  key={`preview-${readerPage.pageNumber}`}
                  type="button"
                  onClick={() => jumpToPage(index)}
                  className={`min-w-[220px] overflow-hidden rounded-[1.5rem] border p-2 text-left transition ${
                    currentPage === index
                      ? "border-[#d8e4ff]/32 bg-white/10 shadow-[0_16px_34px_rgba(129,140,248,0.14)]"
                      : "border-white/12 bg-white/6 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <ScenePoster
                    title={readerPage.title}
                    caption={compactCaption(
                      readerPage.isCover ? story.summary : readerPage.text,
                      90,
                    )}
                    sceneType={readerPage.sceneType}
                    imageDataUrl={readerPage.imageDataUrl}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/18 bg-slate-950/34 p-3 backdrop-blur-xl sm:p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/78">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      imageStatus.tone === "premium"
                        ? "bg-[#ffd59c]"
                        : imageStatus.tone === "ready"
                          ? "bg-emerald-300"
                          : imageStatus.tone === "limited"
                            ? "bg-amber-300"
                            : imageStatus.tone === "error"
                              ? "bg-rose-300"
                            : imageStatus.tone === "muted"
                              ? "bg-white/35"
                              : "bg-sky-300"
                    }`}
                  />
                  {imageStatus.label}
                </div>
                <p className="text-sm leading-6 text-white/88">{imageStatus.detail}</p>
                <p className="text-[11px] leading-5 text-white/70">Room sound: {currentSoundLabel}.</p>
                <p className="text-[11px] leading-5 text-white/70">
                  {actionNote}
                </p>
                {page.attribution?.provider === "unsplash" ? (
                  <p className="text-[11px] leading-5 text-white/60">
                    Photo by{" "}
                    <a
                      href={page.attribution.photographerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-white/30 underline-offset-4 hover:decoration-white/60"
                    >
                      {page.attribution.photographerName}
                    </a>{" "}
                    on{" "}
                    <a
                      href={page.attribution.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-white/30 underline-offset-4 hover:decoration-white/60"
                    >
                      Unsplash
                    </a>
                    .
                  </p>
                ) : null}
                {actionError ? (
                  <p className="rounded-2xl border border-rose-300/24 bg-rose-300/10 px-3 py-2 text-[12px] leading-5 text-rose-50">
                    {actionError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onNewStory}
                  data-testid="reader-new-story"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2.5 text-sm text-white transition hover:bg-white/12 sm:px-4"
                >
                  <RotateCcw className="h-4 w-4" />
                  New story
                </button>

                <button
                  type="button"
                  onClick={handleGenerateCurrentImage}
                  disabled={currentImageLoading || !canGenerateImages}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2.5 text-sm text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                >
                  {currentImageLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {generateButtonLabel}
                </button>

                {usage?.subscribed && onManageSubscription ? (
                  <button
                    type="button"
                    onClick={onManageSubscription}
                    disabled={billingPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2.5 text-sm text-white transition hover:bg-white/12 disabled:opacity-50 sm:px-4"
                  >
                    <Sparkles className="h-4 w-4" />
                    {billingPending ? "Opening..." : "Manage subscription"}
                  </button>
                ) : null}

                {!usage?.subscribed && !canGenerateImages ? (
                  subscriptionConfigured && onStartSubscription ? (
                    <button
                      type="button"
                      onClick={onStartSubscription}
                      disabled={billingPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#ffd59c]/30 bg-[#ffd59c]/18 px-4 py-2.5 text-sm text-[#fff4e1] transition hover:bg-[#ffd59c]/24 disabled:opacity-50 sm:px-4"
                    >
                      <Sparkles className="h-4 w-4" />
                      {billingPending ? "Opening..." : "Start paid subscription"}
                    </button>
                  ) : (
                    <div className="rounded-full border border-white/16 bg-white/8 px-4 py-2.5 text-sm text-white/78">
                      Illustration checkout is not available yet.
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PoodleCompanion cueKey={cueKey} visible={controlsVisible || audioDrawerOpen} />
    </motion.div>
  );
}
