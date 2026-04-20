"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MonkeyMark } from "@/components/monkey-mark";
import { ScenePoster } from "@/components/scene-poster";
import { SoundDock } from "@/components/sound-dock";
import type { Soundscape } from "@/components/use-bedtime-audio";

export type SetupProfile = {
  childName: string;
  age: string;
  language: string;
  culture: string;
};

export function SetupWizard({
  activeSoundscape,
  onComplete,
  onSelectSoundscape,
}: {
  activeSoundscape: Soundscape | null;
  onComplete: (profile: SetupProfile) => void;
  onSelectSoundscape: (soundscape: Soundscape) => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<SetupProfile>({
    childName: "",
    age: "",
    language: "",
    culture: "",
  });

  const canContinue = useMemo(() => {
    if (step === 1) {
      return formData.childName.trim().length > 0;
    }

    if (step === 2) {
      return formData.age.trim().length > 0 && formData.language.trim().length > 0;
    }

    return true;
  }, [formData, step]);

  const stepCopy = [
    {
      eyebrow: "Step 1 of 3",
      title: "Who is this bedtime made for?",
      description:
        "Tell Mono the child's name so every story feels warm, personal, and easy to recognize.",
      helper: "A first name is enough.",
      buttonLabel: "Continue",
    },
    {
      eyebrow: "Step 2 of 3",
      title: "How should the story pace itself?",
      description:
        "Age and language help Mono choose the right rhythm, vocabulary, and bedtime tone.",
      helper: "You can keep this simple or make it specific.",
      buttonLabel: "Continue",
    },
    {
      eyebrow: "Step 3 of 3",
      title: "Any roots, places, or traditions to keep close?",
      description:
        "Optional details help stories carry familiar settings, family language, and little cultural touches.",
      helper: "Leave this blank if you want a more general story.",
      buttonLabel: "Enter Mono",
    },
  ] as const;

  const activeStep = stepCopy[Math.min(step, stepCopy.length) - 1] ?? stepCopy[0];
  const heroScene = step === 1 ? "moon" : step === 2 ? "clouds" : "village";
  const heroTitle =
    step === 1
      ? "Set the profile for tonight's premiere"
      : step === 2
        ? "Tune the pacing before the story rolls"
        : "Add roots, places, and familiar details";
  const heroCaption =
    step === 1
      ? "A little name, a gentle room, and a story world that feels like it belongs to your child."
      : step === 2
        ? "Language and age help Mono choose the right rhythm, vocabulary, and sleepy softness."
        : "Familiar places and cultural details help the story feel more personal without making setup heavy.";
  const setupGallery = [
    {
      title: "Moon room",
      caption: "A silver nursery glow for the softest opening scene.",
      sceneType: "moon" as const,
    },
    {
      title: "Sea drift",
      caption: "A calmer horizon with a little motion and a safe landing.",
      sceneType: "ocean" as const,
    },
    {
      title: "Lantern trees",
      caption: "A tiny forest path that still feels warm and tucked in.",
      sceneType: "forest" as const,
    },
  ] as const;

  function updateForm(field: keyof SetupProfile, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleNext() {
    if (!canContinue) {
      return;
    }

    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    window.localStorage.setItem("mono_settings", JSON.stringify(formData));
    onComplete(formData);
  }

  const slideVariants = {
    enter: { x: 36, opacity: 0, filter: "blur(10px)" },
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: { x: -36, opacity: 0, filter: "blur(10px)" },
  };

  return (
    <div className="relative min-h-dvh w-full overflow-y-auto bg-[#040915] font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(83,122,255,0.34),rgba(5,11,24,0.94)_40%,#030711_100%)]" />
      <div className="absolute left-[12%] top-0 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-[6%] h-80 w-80 rounded-full bg-indigo-500/12 blur-3xl" />

      <div className="safe-top safe-bottom-lg safe-left safe-right relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MonkeyMark className="rounded-[24px] border-white/16 bg-white/16 p-2.5" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#a9c5ff]">
                monobedtime
              </div>
              <div className="mt-1 text-sm text-white/72">
                Nightly originals for little sleepers
              </div>
            </div>
          </div>

          <div className="rounded-full border border-white/14 bg-white/6 px-4 py-2 text-right">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white/46">
              setup progress
            </div>
            <div className="mt-1 text-sm font-medium text-white/88">{step}/3</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.14fr_0.86fr]">
          <section className="overflow-hidden rounded-[2.5rem] border border-white/14 bg-[#07111f]/82 p-5 shadow-[0_38px_110px_rgba(2,6,23,0.52)] sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9ab8ff]">
                  featured setup
                </div>
                <div className="max-w-[36rem]">
                  <h1 className="text-balance text-[2.25rem] font-light leading-[1.02] text-white sm:text-[3.25rem]">
                    Start tonight like a featured bedtime premiere.
                  </h1>
                  <p className="mt-4 max-w-[32rem] text-base leading-7 text-white/74">
                    We&apos;re opening on a calmer entrance: clear story setup, visible artwork,
                    and room sound that stays in sight from the first tap.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
                <ScenePoster
                  title={heroTitle}
                  caption={heroCaption}
                  sceneType={heroScene}
                  variant="hero"
                />

                <div className="flex flex-col gap-4">
                  <div className="rounded-[1.8rem] border border-white/12 bg-white/6 p-4">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 overflow-hidden rounded-full border border-white/14 bg-white/8">
                        <Image
                          src="/luffy.svg"
                          alt="Luffy, the bedtime companion"
                          width={56}
                          height={56}
                          className="h-14 w-14 object-cover"
                          priority
                        />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/52">
                          Tonight&apos;s companion
                        </div>
                        <div className="mt-1 text-lg font-medium text-white">
                          Luffy keeps the room gentle.
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                          A familiar face helps the first story feel warm instead of clinical.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {stepCopy.map((item, index) => {
                      const isActive = step === index + 1;
                      const isComplete = step > index + 1;

                      return (
                        <div
                          key={item.eyebrow}
                          className={`rounded-[1.5rem] border p-4 ${
                            isActive
                              ? "border-[#9fc0ff]/26 bg-[linear-gradient(135deg,rgba(114,154,255,0.16),rgba(255,255,255,0.06))]"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-white/52">
                              {item.eyebrow}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                                isComplete
                                  ? "bg-emerald-300/16 text-emerald-100"
                                  : isActive
                                    ? "bg-white/12 text-white"
                                    : "bg-transparent text-white/50"
                              }`}
                            >
                              {isComplete ? "Done" : isActive ? "Live" : "Next"}
                            </span>
                          </div>
                          <div className="mt-3 text-base font-medium text-white">{item.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/54">
                  Tonight&apos;s worlds
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {setupGallery.map((item) => (
                    <div
                      key={item.title}
                      className="overflow-hidden rounded-[1.7rem] border border-white/12 bg-white/6 p-3"
                    >
                      <ScenePoster
                        title={item.title}
                        caption={item.caption}
                        sceneType={item.sceneType}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <SoundDock
                activeSoundscape={activeSoundscape}
                onSelectSoundscape={onSelectSoundscape}
                compact
              />
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-white/14 bg-[#08111f]/88 p-5 shadow-[0_38px_110px_rgba(2,6,23,0.48)] sm:p-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    step >= index
                      ? "w-12 bg-[#b8cbff] shadow-[0_0_18px_rgba(191,219,254,0.24)]"
                      : "w-5 bg-white/18"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 rounded-[1.9rem] border border-white/12 bg-white/6 p-4 sm:p-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a9c5ff]">
                  {activeStep.eyebrow}
                </p>
                <h2 className="text-[1.85rem] font-light leading-tight text-white sm:text-[2rem]">
                  {activeStep.title}
                </h2>
                <p className="max-w-[32rem] text-sm leading-6 text-white/74">
                  {activeStep.description}
                </p>
              </div>

              <div className="mt-5 min-h-[248px] sm:min-h-[260px]">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.38 }}
                      className="space-y-5 sm:space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white/92" htmlFor="child-name">
                          Child name
                        </label>
                        <input
                          id="child-name"
                          type="text"
                          autoFocus
                          value={formData.childName}
                          onChange={(event) => updateForm("childName", event.target.value)}
                          placeholder="For example, Luna"
                          className="w-full rounded-[1.55rem] border border-white/18 bg-[#030711]/88 px-4 py-4 text-[1.4rem] text-white placeholder:text-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#a9c5ff]/60 focus:bg-[#030711] focus:ring-2 focus:ring-[#7ea6ff]/16"
                        />
                        <p className="text-xs leading-5 text-white/58">{activeStep.helper}</p>
                      </div>
                    </motion.div>
                  ) : null}

                  {step === 2 ? (
                    <motion.div
                      key="step2"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.38 }}
                      className="space-y-5 sm:space-y-6"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-white/92" htmlFor="child-age">
                            Age
                          </label>
                          <input
                            id="child-age"
                            type="text"
                            autoFocus
                            value={formData.age}
                            onChange={(event) => updateForm("age", event.target.value)}
                            placeholder="2 months old"
                            className="w-full rounded-[1.55rem] border border-white/18 bg-[#030711]/88 px-4 py-4 text-lg text-white placeholder:text-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#a9c5ff]/60 focus:bg-[#030711] focus:ring-2 focus:ring-[#7ea6ff]/16"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-sm font-medium text-white/92" htmlFor="language">
                            Language
                          </label>
                          <input
                            id="language"
                            type="text"
                            value={formData.language}
                            onChange={(event) => updateForm("language", event.target.value)}
                            placeholder="Spanish and English"
                            className="w-full rounded-[1.55rem] border border-white/18 bg-[#030711]/88 px-4 py-4 text-lg text-white placeholder:text-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#a9c5ff]/60 focus:bg-[#030711] focus:ring-2 focus:ring-[#7ea6ff]/16"
                          />
                        </div>
                      </div>

                      <p className="text-xs leading-5 text-white/58">{activeStep.helper}</p>
                    </motion.div>
                  ) : null}

                  {step === 3 ? (
                    <motion.div
                      key="step3"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.38 }}
                      className="space-y-5 sm:space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white/92" htmlFor="culture">
                          Family roots or places
                        </label>
                        <input
                          id="culture"
                          type="text"
                          autoFocus
                          value={formData.culture}
                          onChange={(event) => updateForm("culture", event.target.value)}
                          placeholder="Optional: Panama City, Colombian heritage"
                          className="w-full rounded-[1.55rem] border border-white/18 bg-[#030711]/88 px-4 py-4 text-lg text-white placeholder:text-white/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-[#a9c5ff]/60 focus:bg-[#030711] focus:ring-2 focus:ring-[#7ea6ff]/16"
                        />
                        <p className="text-xs leading-5 text-white/58">{activeStep.helper}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={handleNext}
              disabled={!canContinue}
              data-testid="setup-continue"
              className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] border border-[#b9cbff]/22 bg-[linear-gradient(135deg,rgba(140,170,255,0.34),rgba(44,83,188,0.34),rgba(255,214,155,0.18))] px-5 py-4 text-white shadow-[0_20px_44px_rgba(8,18,42,0.38)] transition hover:border-[#dbe5ff]/34 hover:shadow-[0_24px_54px_rgba(49,93,225,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="text-sm font-semibold tracking-[0.18em] uppercase">
                {activeStep.buttonLabel}
              </span>
              {step === 3 ? (
                <Check size={18} className="opacity-75" />
              ) : (
                <ChevronRight
                  size={18}
                  className="opacity-75 transition-transform group-hover:translate-x-1"
                />
              )}
            </motion.button>
          </section>
        </div>
      </div>
    </div>
  );
}
